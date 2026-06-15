import prisma from "@/lib/prisma";
import { getStoredDonationCreditUsd } from "@/lib/currency";
import { safeJsonParse } from "@/lib/payments";
import { notifyRecipient, donationReceiptText } from "@/lib/notify";
import { syncBadges } from "@/lib/badges";

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
  let freshlyCreditedDonationId: string | null = null;

  const result = await prisma.$transaction(async (tx) => {
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

      const credited = await tx.donation.update({
        where: { id: existing.id },
        data: {
          creditedAt: new Date(),
        },
      });

      // Idempotent gate: notifications fire only on the one credit transition.
      freshlyCreditedDonationId = existing.id;
      return credited;
    }

    return updated;
  });

  if (freshlyCreditedDonationId) {
    // Best-effort, post-commit. Must never block or fail donation crediting.
    void sendDonationNotifications(freshlyCreditedDonationId);
  }

  return result;
}

/** Fire-and-forget WhatsApp/SMS for a freshly credited donation. Swallows errors. */
async function sendDonationNotifications(donationId: string) {
  try {
    const donation = await prisma.donation.findUnique({
      where: { id: donationId },
      include: {
        campaign: { include: { user: true } },
        user: true,
      },
    });
    if (!donation) return;

    const amountLabel = `${donation.currency} ${donation.amount.toLocaleString()}`;
    const campaignTitle = donation.campaign.title;

    // Donor receipt (registered donor phone, or phone captured at checkout).
    const donorPhone = donation.user?.phone || donation.donorPhone || null;
    if (donorPhone) {
      await notifyRecipient(
        {
          phone: donorPhone,
          whatsappNotifications: donation.user?.whatsappNotifications,
          smsNotifications: donation.user?.smsNotifications,
        },
        donationReceiptText(amountLabel, campaignTitle),
      );
    }

    // Recompute donor badges (may emit a "badge unlocked" feed row + push).
    if (donation.userId) {
      await syncBadges(donation.userId);
    }

    // Creator alert — "you received a donation". High-value real-time nudge.
    const creator = donation.campaign.user;
    if (creator?.phone && creator.campaignUpdates !== false) {
      await notifyRecipient(
        {
          phone: creator.phone,
          whatsappNotifications: creator.whatsappNotifications,
          smsNotifications: creator.smsNotifications,
        },
        `OneRaise: you received ${amountLabel} on "${campaignTitle}". 🎉`,
      );
    }
  } catch (err) {
    console.error(
      `[notify] donation notification failed for ${donationId}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
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
