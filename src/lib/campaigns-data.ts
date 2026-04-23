import { unstable_cache } from 'next/cache';
import prisma from "@/lib/prisma";
import { getStoredDonationCreditUsd } from "@/lib/currency";

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
  },
  ['campaigns-list'],
  { revalidate: 60 }
);
