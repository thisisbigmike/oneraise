import { unstable_cache } from 'next/cache';
import prisma from "@/lib/prisma";
import { getStoredDonationCreditUsd } from "@/lib/currency";
import {
  CAMPAIGN_SEED_LIST,
  CAMPAIGN_SEEDS,
  CampaignSeed,
  getCampaignPct,
} from "@/lib/campaign-seeds";

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

function formatSeedWithLiveData(
  seed: CampaignSeed,
  campaign?: {
    goal: number;
    status: string;
    user?: { name: string | null } | null;
    donations: { amount: number; currency: string; coverFee: boolean; provider: string; providerDataJson: string | null }[];
    _count: { donations: number };
  },
) {
  const liveRaised = campaign?.donations.reduce(
    (sum, donation) => sum + getStoredDonationCreditUsd(donation),
    0,
  ) ?? 0;
  const raised = seed.raised + liveRaised;
  const goal = campaign?.goal || seed.goal;
  const creator = campaign?.user?.name || seed.creator;

  return {
    ...seed,
    creator,
    creatorInitials: campaign?.user?.name ? getInitials(campaign.user.name) : seed.creatorInitials,
    raised,
    goal,
    pct: getCampaignPct(raised, goal),
    backers: seed.backers + (campaign?._count.donations ?? 0),
    status: campaign?.status || seed.status,
  };
}

export const getCachedCampaignsList = unstable_cache(
  async () => {
    const campaigns = await prisma.campaign.findMany({
      select: {
        id: true,
        title: true,
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

    const campaignBySlug = new Map(campaigns.map((campaign) => [campaign.slug, campaign]));
    const seededCampaigns = CAMPAIGN_SEED_LIST.map((seed) =>
      formatSeedWithLiveData(seed, campaignBySlug.get(seed.slug) as any),
    );

    const customCampaigns = campaigns
      .filter((campaign) => !CAMPAIGN_SEEDS[campaign.slug])
      .map((campaign) => {
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

    return [...customCampaigns, ...seededCampaigns];
  },
  ['campaigns-list'],
  { revalidate: 60 }
);
