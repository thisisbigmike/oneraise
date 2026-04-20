import prisma from "@/lib/prisma";
import { getStoredDonationCreditUsd } from "@/lib/currency";
import { safeJsonParse } from "@/lib/payments";

export function stringifyJson(value: unknown) {
  return JSON.stringify(value ?? null);
}

export async function markDonationStatus(args: {
  donationId: string;
  status: "pending" | "completed" | "failed";
  providerStatus?: string | null;
  providerData?: unknown;
  instructions?: unknown;
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.donation.findUnique({
      where: { id: args.donationId },
    });

    if (!existing) {
      return null;
    }

    const updated = await tx.donation.update({
      where: { id: existing.id },
      data: {
        status: args.status,
        providerStatus: args.providerStatus ?? existing.providerStatus,
        providerDataJson:
          args.providerData !== undefined
            ? stringifyJson(args.providerData)
            : existing.providerDataJson,
        instructionsJson:
          args.instructions !== undefined
            ? stringifyJson(args.instructions)
            : existing.instructionsJson,
        completedAt:
          args.status === "completed"
            ? existing.completedAt || new Date()
            : existing.completedAt,
      },
    });

    if (args.status === "completed" && !existing.creditedAt) {
      const creditedUsdAmount = getStoredDonationCreditUsd(existing);

      await tx.campaign.update({
        where: { id: existing.campaignId },
        data: {
          raised: {
            increment: creditedUsdAmount,
          },
        },
      });

      return tx.donation.update({
        where: { id: existing.id },
        data: {
          creditedAt: new Date(),
        },
      });
    }

    return updated;
  });
}

export async function markPayoutStatus(args: {
  payoutId: string;
  status: "pending" | "completed" | "failed";
  providerData?: unknown;
}) {
  return prisma.payout.update({
    where: { id: args.payoutId },
    data: {
      status: args.status,
      providerDataJson:
        args.providerData !== undefined
          ? stringifyJson(args.providerData)
          : undefined,
      completedAt:
        args.status === "completed"
          ? new Date()
          : undefined,
    },
  });
}

export async function getCreatorPayoutSummary(userId: string) {
  const campaigns = await prisma.campaign.findMany({
    where: { userId },
    select: { id: true },
  });

  const campaignIds = campaigns.map((campaign) => campaign.id);

  const donations = campaignIds.length
    ? await prisma.donation.findMany({
        where: {
          campaignId: { in: campaignIds },
        },
      })
    : [];

  const payouts = await prisma.payout.findMany({
    where: { userId },
    include: {
      payoutMethod: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const completedDonations = donations.filter((donation) => donation.status === "completed");
  const pendingDonations = donations.filter((donation) => donation.status === "pending");
  const reservedPayouts = payouts.filter((payout) => payout.status !== "failed");
  const completedPayouts = payouts.filter((payout) => payout.status === "completed");

  const grossRaised = completedDonations.reduce(
    (sum, donation) => sum + getStoredDonationCreditUsd(donation),
    0,
  );
  const pendingRaised = pendingDonations.reduce(
    (sum, donation) => sum + getStoredDonationCreditUsd(donation),
    0,
  );
  const reservedAmount = reservedPayouts.reduce((sum, payout) => sum + payout.amount, 0);
  const totalWithdrawn = completedPayouts.reduce((sum, payout) => sum + payout.amount, 0);
  const availableBalance = Math.max(grossRaised - reservedAmount, 0);

  return {
    availableBalance,
    pendingBalance: pendingRaised,
    totalWithdrawn,
    payouts,
  };
}

export function parseInstructionsJson(value?: string | null) {
  return safeJsonParse<Record<string, unknown>>(value);
}
