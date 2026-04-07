import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  extractBushaInstructions,
  fetchBushaTransfer,
  mapBushaTransferStatus,
} from "@/lib/payments";
import { markDonationStatus, parseInstructionsJson } from "@/lib/payment-records";

function formatDonationResponse(donation: any) {
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
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unable to refresh donation status." },
      { status: 500 },
    );
  }
}
