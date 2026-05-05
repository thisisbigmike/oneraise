import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { JUPITER_USDC } from "@/lib/jupiter";
import { markDonationStatus } from "@/lib/payment-records";
import {
  getSolanaConnection,
  getTokenAccountDelta,
} from "@/lib/solana-payments";

type StoredJupiterProviderData = {
  quote?: unknown;
  wallet?: string;
  treasury?: {
    owner?: string;
    usdcTokenAccount?: string;
    source?: string;
  };
  expectedOutputRaw?: string;
  signature?: string;
  confirmation?: unknown;
};

function safeJsonParse<T>(value?: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function revalidateDonationViews(campaignSlug?: string | null) {
  revalidatePath("/");
  revalidatePath("/explore");
  revalidatePath("/backer/discover");
  revalidatePath("/backer/donations");
  if (campaignSlug) {
    revalidatePath(`/campaign/${campaignSlug}`);
    revalidatePath(`/backer/donate/${campaignSlug}`);
  }
}

export async function POST(req: Request) {
  try {
    const { donationId, signature } = await req.json();
    const parsedDonationId = String(donationId || "");
    const parsedSignature = String(signature || "").trim();

    if (!parsedDonationId) {
      return NextResponse.json({ error: "donationId is required." }, { status: 400 });
    }

    if (!parsedSignature) {
      return NextResponse.json({ error: "signature is required." }, { status: 400 });
    }

    const donation = await prisma.donation.findUnique({
      where: { id: parsedDonationId },
      include: {
        campaign: {
          select: {
            slug: true,
          },
        },
      },
    });

    if (!donation) {
      return NextResponse.json({ error: "Donation not found." }, { status: 404 });
    }

    if (donation.provider !== "solana_jupiter") {
      return NextResponse.json({ error: "Donation is not a Jupiter donation." }, { status: 400 });
    }

    const providerData =
      safeJsonParse<StoredJupiterProviderData>(donation.providerDataJson) || {};
    const treasuryTokenAccount = providerData.treasury?.usdcTokenAccount;
    const expectedOutputRaw = providerData.expectedOutputRaw;

    if (!treasuryTokenAccount || !expectedOutputRaw) {
      return NextResponse.json(
        { error: "Donation is missing Jupiter verification metadata." },
        { status: 400 },
      );
    }

    if (!donation.solanaTxSignature) {
      await prisma.donation.update({
        where: { id: donation.id },
        data: {
          solanaTxSignature: parsedSignature,
          providerRef: parsedSignature,
          providerStatus: "submitted",
          providerDataJson: JSON.stringify({
            ...providerData,
            signature: parsedSignature,
          }),
        },
      });
    }

    const connection = getSolanaConnection();
    const signatureStatuses = await connection.getSignatureStatuses([parsedSignature], {
      searchTransactionHistory: true,
    });
    const signatureStatus = signatureStatuses.value[0];

    if (signatureStatus?.err) {
      const failed = await markDonationStatus({
        donationId: donation.id,
        status: "failed",
        providerStatus: "failed",
        providerData: {
          ...providerData,
          signature: parsedSignature,
          confirmation: signatureStatus,
        },
      });

      return NextResponse.json({
        success: true,
        donation: failed,
        status: "failed",
      });
    }

    if (!signatureStatus || !signatureStatus.confirmationStatus) {
      return NextResponse.json({
        success: true,
        status: "pending",
        donation: {
          id: donation.id,
          status: "pending",
          providerStatus: "submitted",
        },
      });
    }

    const transaction = await connection.getParsedTransaction(parsedSignature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (!transaction?.meta) {
      return NextResponse.json({
        success: true,
        status: "pending",
        donation: {
          id: donation.id,
          status: "pending",
          providerStatus: signatureStatus.confirmationStatus,
        },
      });
    }

    if (transaction.meta.err) {
      const failed = await markDonationStatus({
        donationId: donation.id,
        status: "failed",
        providerStatus: "failed",
        providerData: {
          ...providerData,
          signature: parsedSignature,
          confirmation: signatureStatus,
          transactionError: transaction.meta.err,
        },
      });

      return NextResponse.json({
        success: true,
        donation: failed,
        status: "failed",
      });
    }

    const receivedRaw = getTokenAccountDelta({
      transaction,
      tokenAccount: treasuryTokenAccount,
      mint: JUPITER_USDC.mint,
    });
    const expectedRaw = BigInt(expectedOutputRaw);

    if (receivedRaw < expectedRaw) {
      return NextResponse.json(
        {
          error: "Transaction did not deliver the expected USDC amount to the campaign treasury.",
          receivedRaw: receivedRaw.toString(),
          expectedRaw: expectedRaw.toString(),
        },
        { status: 400 },
      );
    }

    const completed = await markDonationStatus({
      donationId: donation.id,
      status: "completed",
      providerStatus: signatureStatus.confirmationStatus || "confirmed",
      providerData: {
        ...providerData,
        signature: parsedSignature,
        confirmation: signatureStatus,
        receivedRaw: receivedRaw.toString(),
        slot: transaction.slot,
      },
    });

    revalidateDonationViews(donation.campaign.slug);

    return NextResponse.json({
      success: true,
      status: "completed",
      donation: completed,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Unable to confirm Jupiter donation.") },
      { status: 500 },
    );
  }
}
