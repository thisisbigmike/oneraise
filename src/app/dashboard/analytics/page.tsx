import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getStoredDonationCreditUsd } from "@/lib/currency";
import { getCreatorPayoutSummary } from "@/lib/payment-records";
import { isProtectedCampaignType } from "@/lib/campaign-lifecycle";
import AnalyticsClient, { AnalyticsEvent } from "./AnalyticsClient";

type SessionUser = {
  id?: string;
  role?: string | null;
};

const providerLabel = (provider?: string | null) => {
  switch (provider) {
    case "moonpay":
      return "Card";
    case "busha_crypto":
      return "Crypto";
    case "busha_ng":
      return "Nigeria bank";
    case "busha_ke":
      return "M-Pesa";
    default:
      return provider || "Other";
  }
};

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as SessionUser | undefined;

  if (!sessionUser?.id) {
    redirect("/auth?mode=signin");
  }

  const role = sessionUser.role || "creator";
  const isCreator = role === "creator";
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const donations = await prisma.donation.findMany({
    where: {
      createdAt: { gte: since },
      ...(isCreator ? { campaign: { userId: sessionUser.id } } : { userId: sessionUser.id }),
    },
    include: {
      campaign: {
        select: {
          title: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const events: AnalyticsEvent[] = donations.map((donation) => ({
    id: donation.id,
    campaign: donation.campaign.title,
    provider: providerLabel(donation.provider),
    amountUsd: getStoredDonationCreditUsd(donation),
    status: donation.status === "completed" ? "completed" : donation.status === "failed" ? "failed" : "pending",
    dateIso: donation.createdAt.toISOString(),
  }));

  if (!isCreator) {
    return <AnalyticsClient events={events} />;
  }

  // ── Creator-only enrichments (F4) ──
  const [withdrawSummary, creatorCampaigns] = await Promise.all([
    getCreatorPayoutSummary(sessionUser.id),
    prisma.campaign.findMany({
      where: { userId: sessionUser.id },
      select: {
        title: true,
        slug: true,
        type: true,
        goal: true,
        raised: true,
        status: true,
        protectStatus: true,
        milestones: { select: { status: true } },
        donations: {
          where: { status: "completed" },
          select: { userId: true },
        },
      },
    }),
  ]);

  const withdraw = {
    available: withdrawSummary.availableBalance,
    pending: withdrawSummary.pendingBalance,
    withdrawn: withdrawSummary.totalWithdrawn,
  };

  const escrow = creatorCampaigns
    .filter((campaign) => isProtectedCampaignType(campaign.type))
    .map((campaign) => ({
      title: campaign.title,
      slug: campaign.slug,
      protectStatus: campaign.protectStatus,
      approved: campaign.milestones.filter((m) => m.status === "approved").length,
      total: campaign.milestones.length,
      goalMet: campaign.goal > 0 && campaign.raised >= campaign.goal,
    }));

  // New vs repeat donors across the creator's campaigns (registered donors only).
  const donorCounts = new Map<string, number>();
  for (const campaign of creatorCampaigns) {
    for (const donation of campaign.donations) {
      if (donation.userId) {
        donorCounts.set(donation.userId, (donorCounts.get(donation.userId) || 0) + 1);
      }
    }
  }
  const donorSplit = {
    newDonors: [...donorCounts.values()].filter((count) => count === 1).length,
    repeatDonors: [...donorCounts.values()].filter((count) => count > 1).length,
  };

  return (
    <AnalyticsClient events={events} withdraw={withdraw} escrow={escrow} donorSplit={donorSplit} />
  );
}
