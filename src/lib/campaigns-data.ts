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
  type: string;
  protectStatus: string;
  milestones?: CampaignMilestoneItem[];
};

export type CampaignMilestoneItem = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  proofUrl: string | null;
  createdAt: string;
  updatedAt: string;
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
    type: "standard",
    protectStatus: "funding",
    milestones: [],
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
      type: true,
      protectStatus: true,
      createdAt: true,
      user: {
        select: {
          name: true,
        },
      },
      milestones: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          proofUrl: true,
          createdAt: true,
          updatedAt: true,
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
          donorEmail: true,
          donorName: true,
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
    const uniqueDonors = new Set(campaign.donations.map(d => (d.donorEmail || d.donorName || Math.random().toString()).toLowerCase().trim()));

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
      backers: uniqueDonors.size,
      daysLeft: campaign.status === "active" ? Math.max(0, Math.ceil((campaign.createdAt.getTime() + 30 * 86400000 - Date.now()) / 86400000)) : 0,
      verified: true,
      status: campaign.status,
      type: campaign.type,
      protectStatus: campaign.protectStatus,
      milestones: campaign.milestones.map((milestone) => ({
        ...milestone,
        createdAt: milestone.createdAt.toISOString(),
        updatedAt: milestone.updatedAt.toISOString(),
      })),
    };
  });

  return liveCampaigns;
}

const getCachedLiveCampaignsList = unstable_cache(
  async (): Promise<CampaignListItem[]> => {
    // Race against a 5-second timeout so pages never hang
    const timeoutPromise = new Promise<CampaignListItem[]>((_, reject) =>
      setTimeout(() => reject(new Error('DB timeout')), 5000)
    );
    return Promise.race([getLiveCampaignsList(), timeoutPromise]);
  },
  ['campaigns-list'],
  { revalidate: 60 }
);

export function getUserCampaignsList(userId: string) {
  return getLiveCampaignsList({ userId });
}

export async function getCachedCampaignsList() {
  const seeds = getSeedCampaignsList();
  try {
    const live = await getCachedLiveCampaignsList();
    // Merge: use live DB campaigns + any seeds that don't have a matching slug in DB
    const liveSlugs = new Set(live.map(c => c.slug));
    const extraSeeds = seeds.filter(s => !liveSlugs.has(s.slug));
    return [...live, ...extraSeeds];
  } catch (error) {
    console.warn("Unable to load live campaigns; using seed campaigns.", error);
    return seeds;
  }
}
