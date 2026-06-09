import type { RecommendationContext } from "@/lib/campaign-recommendations";
import prisma from "@/lib/prisma";

function topCategories(rows: { campaign: { category: string } }[]) {
  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    const category = row.campaign.category;
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category)
    .slice(0, 3);
}

export async function getBackerRecommendationContext(userId?: string | null): Promise<RecommendationContext> {
  if (!userId) return {};

  try {
    const [donations, bookmarks] = await Promise.all([
      prisma.donation.findMany({
        where: {
          userId,
          status: "completed",
        },
        take: 50,
        orderBy: { createdAt: "desc" },
        select: {
          campaignId: true,
          campaign: {
            select: {
              category: true,
            },
          },
        },
      }),
      prisma.bookmark.findMany({
        where: { userId },
        take: 50,
        orderBy: { createdAt: "desc" },
        select: {
          campaignId: true,
          campaign: {
            select: {
              category: true,
            },
          },
        },
      }),
    ]);

    return {
      preferredCategories: topCategories([...donations, ...bookmarks]),
      supportedCampaignIds: donations.map((donation) => donation.campaignId),
      savedCampaignIds: bookmarks.map((bookmark) => bookmark.campaignId),
    };
  } catch (error) {
    console.warn("Unable to load discovery preferences", error);
    return {};
  }
}

