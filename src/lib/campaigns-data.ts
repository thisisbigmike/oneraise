import { unstable_cache } from 'next/cache';
import prisma from "@/lib/prisma";
import { CAMPAIGN_SEED_LIST } from "@/lib/campaign-seeds";
import { getStoredDonationCreditUsd } from "@/lib/currency";

export type CampaignListItem = {
  id: number;
  dbId?: string;
  slug: string;
  title: string;
  image?: string | null;
  creator: string;
  creatorInitials: string;
  raised: number;
  goal: number;
  pct: number;
  category: string;
  desc: string;
  backers: number;
  daysLeft: number;
  verified: boolean;
  status: string;
};

function getCampaignPct(raised: number, goal: number) {
  if (goal === 0) return 0;
  return Math.min(Math.floor((raised / goal) * 100), 100);
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "OR"
  );
}

export function getNumericCampaignId(slug: string) {
  return slug.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function getSeedCampaignsList(): CampaignListItem[] {
  return CAMPAIGN_SEED_LIST.map((campaign) => ({
    ...campaign,
    pct: getCampaignPct(campaign.raised, campaign.goal),
  }));
}


async function getLiveCampaignsList(where?: { userId?: string }): Promise<CampaignListItem[]> {
  const campaigns = await prisma.campaign.findMany({
    where,
    select: {
      id: true,
      title: true,
      image: true,
      slug: true,
      description: true,
      goal: true,
      raised: true,
      category: true,
      status: true,
      user: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          donations: {
            where: {
              status: "completed",
            },
          },
        },
      },
      donations: {
        where: {
          status: "completed",
        },
        select: {
          amount: true,
          currency: true,
          coverFee: true,
          provider: true,
          providerDataJson: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const liveCampaigns = campaigns.map((campaign) => {
    const creator = campaign.user?.name || "OneRaise Creator";
    const raised = campaign.donations.reduce(
      (sum, donation) => sum + getStoredDonationCreditUsd(donation),
      0,
    );
    const goal = campaign.goal;

    return {
      id: Number(campaign.slug) || getNumericCampaignId(campaign.slug),
      dbId: campaign.id,
      slug: campaign.slug,
      title: campaign.title,
      image: campaign.image,
      creator,
      creatorInitials: getInitials(creator),
      raised,
      goal,
      pct: getCampaignPct(raised, goal),
      category: campaign.category,
      desc: campaign.description || "",
      backers: campaign._count.donations,
      daysLeft: 30,
      verified: true,
      status: campaign.status,
    };
  });

  return liveCampaigns;
}

const getCachedLiveCampaignsList = unstable_cache(
  async (): Promise<CampaignListItem[]> => {
    return getLiveCampaignsList();
  },
  ['campaigns-list'],
  { revalidate: 60 }
);

export function getUserCampaignsList(userId: string) {
  return getLiveCampaignsList({ userId });
}

export async function getCachedCampaignsList() {
  try {
    return await getCachedLiveCampaignsList();
  } catch (error) {
    console.warn("Unable to load live campaigns; using seed campaigns.", error);
    return getSeedCampaignsList();
  }
}
