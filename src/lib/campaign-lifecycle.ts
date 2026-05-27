import prisma from "@/lib/prisma";

export const CAMPAIGN_DURATION_DAYS = 30;
export const CAMPAIGN_DURATION_MS = CAMPAIGN_DURATION_DAYS * 86400000;

const PROTECTED_CAMPAIGN_TYPES = new Set([
  "protected_crowdfunding",
  "emergency_aid",
  "grant_distribution",
]);

type CampaignTimingInput = {
  createdAt: Date;
  status?: string | null;
};

type CampaignOutcomeInput = {
  goal: number;
  raised: number;
  type?: string | null;
};

export function isProtectedCampaignType(type?: string | null) {
  return type ? PROTECTED_CAMPAIGN_TYPES.has(type) : false;
}

export function getCampaignEndDate(createdAt: Date) {
  return new Date(createdAt.getTime() + CAMPAIGN_DURATION_MS);
}

export function getCampaignTiming(campaign: CampaignTimingInput, now = new Date()) {
  const endDate = getCampaignEndDate(campaign.createdAt);
  const isPastEndDate = now.getTime() >= endDate.getTime();
  const isEnded = campaign.status === "completed" || (campaign.status === "active" && isPastEndDate);
  const daysLeft = campaign.status === "active" && !isPastEndDate
    ? Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / 86400000))
    : 0;

  return {
    endDate,
    daysLeft,
    isEnded,
    shouldComplete: campaign.status === "active" && isPastEndDate,
  };
}

export function getCampaignOutcome({ goal, raised, type }: CampaignOutcomeInput) {
  const goalMet = goal > 0 && raised >= goal;
  const protectedCampaign = isProtectedCampaignType(type);

  if (protectedCampaign) {
    return {
      goalMet,
      label: goalMet ? "Goal met. Funds are awaiting milestone verification." : "Goal not met. Funds remain refundable under Protect rules.",
    };
  }

  return {
    goalMet,
    label: goalMet ? "Goal met. Standard payout can proceed." : "Goal not met. Standard funds can still be released to the creator.",
  };
}

export async function finalizeEndedCampaigns() {
  const cutoff = new Date(Date.now() - CAMPAIGN_DURATION_MS);

  return prisma.campaign.updateMany({
    where: {
      status: "active",
      createdAt: {
        lte: cutoff,
      },
    },
    data: {
      status: "completed",
    },
  });
}

export async function ensureCampaignAcceptsDonations(campaignSlug: string) {
  await finalizeEndedCampaigns();

  const campaign = await prisma.campaign.findUnique({
    where: { slug: campaignSlug },
    select: {
      id: true,
      createdAt: true,
      status: true,
    },
  });

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  const timing = getCampaignTiming(campaign);
  if (campaign.status !== "active" || timing.isEnded) {
    throw new Error("This campaign has ended and is no longer accepting donations.");
  }

  return campaign;
}

export function getDonationBlockedStatus(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("not found")) return 404;
  if (message.includes("no longer accepting donations")) return 409;
  return 500;
}
