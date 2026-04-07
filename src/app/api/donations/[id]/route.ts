import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseInstructionsJson } from "@/lib/payment-records";

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
    createdAt: donation.createdAt,
    instructions: parseInstructionsJson(donation.instructionsJson),
    campaign: donation.campaign
      ? {
          id: donation.campaign.id,
          title: donation.campaign.title,
          slug: donation.campaign.slug,
        }
      : null,
  };
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const donation = await prisma.donation.findUnique({
    where: { id },
    include: {
      campaign: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
    },
  });

  if (!donation) {
    return NextResponse.json({ error: "Donation not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    donation: formatDonationResponse(donation),
  });
}
