import { NextResponse } from "next/server";
import type { Donation } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  extractBushaInstructions,
  fetchBushaTransfer,
  mapBushaTransferStatus,
} from "@/lib/payments";
import { markDonationStatus, parseInstructionsJson } from "@/lib/payment-records";
import { JUPITER_USDC } from "@/lib/jupiter";
import { getSolanaConnection, getTokenAccountDelta } from "@/lib/solana-payments";

function formatDonationResponse(donation: Donation) {
  return {
    id: donation.id,
    amount: donation.amount,
    currency: donation.currency,
    status: donation.status,
    provider: donation.provider,
    providerStatus: donation.providerStatus,
    asset: donation.asset,
    network: donation.network,
    checkoutUrl: donation.checkoutUrl,
    expiresAt: donation.expiresAt,
    completedAt: donation.completedAt,
    instructions: parseInstructionsJson(donation.instructionsJson),
  };
}

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const donation = await prisma.donation.findUnique({
    where: { id },
  });

  if (!donation) {
    return NextResponse.json({ error: "Donation not found" }, { status: 404 });
  }

  if (donation.provider === "solana_jupiter") {
    const providerData = donation.providerDataJson
      ? JSON.parse(donation.providerDataJson) as {
          expectedOutputRaw?: string;
          treasury?: { usdcTokenAccount?: string };
        }
      : {};
    const signature = donation.solanaTxSignature;
    const treasuryTokenAccount = providerData.treasury?.usdcTokenAccount;
    const expectedOutputRaw = providerData.expectedOutputRaw;

    if (!signature || !treasuryTokenAccount || !expectedOutputRaw) {
      return NextResponse.json({
        success: true,
        donation: formatDonationResponse(donation),
      });
    }

    const connection = getSolanaConnection();
    const signatureStatuses = await connection.getSignatureStatuses([signature], {
      searchTransactionHistory: true,
    });
    const signatureStatus = signatureStatuses.value[0];

    if (signatureStatus?.err) {
      const updated = await markDonationStatus({
        donationId: donation.id,
        status: "failed",
        providerStatus: "failed",
        providerData: {
          ...providerData,
          signature,
          confirmation: signatureStatus,
        },
      });

      return NextResponse.json({
        success: true,
        donation: formatDonationResponse(updated || donation),
      });
    }

    if (!signatureStatus?.confirmationStatus) {
      return NextResponse.json({
        success: true,
        donation: formatDonationResponse(donation),
      });
    }

    const transaction = await connection.getParsedTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (!transaction?.meta || transaction.meta.err) {
      return NextResponse.json({
        success: true,
        donation: formatDonationResponse(donation),
      });
    }

    const receivedRaw = getTokenAccountDelta({
      transaction,
      tokenAccount: treasuryTokenAccount,
      mint: JUPITER_USDC.mint,
    });

    if (receivedRaw >= BigInt(expectedOutputRaw)) {
      const updated = await markDonationStatus({
        donationId: donation.id,
        status: "completed",
        providerStatus: signatureStatus.confirmationStatus,
        providerData: {
          ...providerData,
          signature,
          confirmation: signatureStatus,
          receivedRaw: receivedRaw.toString(),
          slot: transaction.slot,
        },
      });

      return NextResponse.json({
        success: true,
        donation: formatDonationResponse(updated || donation),
      });
    }

    return NextResponse.json({
      success: true,
      donation: formatDonationResponse(donation),
    });
  }

  if (!donation.paymentId) {
    return NextResponse.json({
      success: true,
      donation: formatDonationResponse(donation),
    });
  }

  try {
    const transfer = await fetchBushaTransfer(donation.paymentId);
    const instructions = extractBushaInstructions(transfer, donation.asset);
    const providerStatus = String(transfer.status || "pending");
    const status = mapBushaTransferStatus(providerStatus);

    const updated = await markDonationStatus({
      donationId: donation.id,
      status,
      providerStatus,
      providerData: transfer,
      instructions,
    });

    return NextResponse.json({
      success: true,
      donation: formatDonationResponse(updated || donation),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to refresh donation status.";

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
