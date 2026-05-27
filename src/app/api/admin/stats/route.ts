import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getStoredDonationCreditUsd } from "@/lib/currency";
import { getDonationBackerKey } from "@/lib/backers";

function getSessionUser(session: unknown) {
  if (!session || typeof session !== "object" || !("user" in session)) return {};
  return (session as { user?: any }).user ?? {};
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = getSessionUser(session);
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const [
      activeCampaignCount,
      totalCampaignCount,
      creatorCount,
      backerCount,
      openReportCount,
      allDonations,
      completedCampaigns,
      draftCampaigns,
      recentDonations,
      payoutTotal,
    ] = await Promise.all([
      prisma.campaign.count({ where: { status: "active" } }),
      prisma.campaign.count(),
      prisma.user.count({ where: { role: "creator" } }),
      prisma.user.count({ where: { role: "backer" } }),
      prisma.campaignReport.count({ where: { status: "open" } }),
      prisma.donation.findMany({
        where: { status: "completed" },
        select: { amount: true, currency: true, coverFee: true, provider: true, providerDataJson: true, userId: true, donorEmail: true, createdAt: true },
      }),
      prisma.campaign.findMany({
        where: { status: "completed" },
        select: { raised: true, goal: true },
      }),
      prisma.campaign.findMany({
        where: { status: "draft" },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, title: true, slug: true, goal: true, category: true, createdAt: true,
          user: { select: { name: true, email: true } },
        },
      }),
      prisma.donation.findMany({
        where: { status: "completed" },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, amount: true, currency: true, coverFee: true, provider: true,
          providerDataJson: true, donorName: true, donorEmail: true, isAnonymous: true, createdAt: true,
          campaign: { select: { title: true, slug: true } },
        },
      }),
      prisma.payout.aggregate({ where: { status: "completed" }, _sum: { amount: true } }),
    ]);

    const totalVolumeUsd = allDonations.reduce((s, d) => s + getStoredDonationCreditUsd(d), 0);
    const uniqueBackers = new Set(allDonations.map(getDonationBackerKey).filter(Boolean)).size;
    const platformRevenue = totalVolumeUsd * 0.015;
    const successRate = completedCampaigns.length > 0
      ? Math.round(completedCampaigns.filter(c => c.raised >= c.goal).length / completedCampaigns.length * 100)
      : 0;

    // 30-day volume
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const monthDonations = allDonations.filter(d => new Date(d.createdAt) >= thirtyDaysAgo);
    const monthVolumeUsd = monthDonations.reduce((s, d) => s + getStoredDonationCreditUsd(d), 0);

    return NextResponse.json({
      success: true,
      stats: {
        totalVolumeUsd,
        monthVolumeUsd,
        platformRevenue,
        activeCampaignCount,
        totalCampaignCount,
        creatorCount,
        backerCount,
        uniqueBackers,
        openReportCount,
        successRate,
        totalPayoutUsd: payoutTotal._sum.amount ?? 0,
      },
      pendingApprovals: draftCampaigns.map(c => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        goal: c.goal,
        category: c.category,
        createdAt: c.createdAt.toISOString(),
        creatorName: c.user?.name || c.user?.email || "Unknown",
      })),
      recentDonations: recentDonations.map(d => ({
        id: d.id,
        donorName: d.isAnonymous ? "Anonymous" : (d.donorName || d.donorEmail?.split("@")[0] || "Supporter"),
        amount: getStoredDonationCreditUsd(d),
        provider: d.provider,
        campaignTitle: d.campaign.title,
        campaignSlug: d.campaign.slug,
        createdAt: d.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("admin/stats error", error);
    return NextResponse.json({ error: "Unable to load platform stats." }, { status: 500 });
  }
}
