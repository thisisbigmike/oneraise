import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getStoredDonationCreditUsd } from "@/lib/currency";
import { getDonationBackerKey } from "@/lib/backers";

type SessionUser = {
  id?: string;
  role?: string | null;
};

function getSessionUser(session: unknown) {
  if (!session || typeof session !== "object" || !("user" in session)) return {};
  return ((session as { user?: unknown }).user as SessionUser | undefined) ?? {};
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleString("en-US", { month: "short" });
}

function statusMap(rows: { status: string | null; _count: { _all: number } }[]) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.status || "unknown"] = row._count._all;
    return acc;
  }, {});
}

function roleMap(rows: { role: string | null; _count: { _all: number } }[]) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.role || "unassigned"] = row._count._all;
    return acc;
  }, {});
}

async function fetchAdminStats() {
    const [
      totalUserCount,
      activeCampaignCount,
      totalCampaignCount,
      campaignStatusRows,
      userRoleRows,
      verifiedUserCount,
      pendingVerificationUserCount,
      creatorCount,
      backerCount,
      creatorsWithCampaigns,
      backersWithCompletedDonations,
      openReportCount,
      pendingDonationCount,
      failedDonationCount,
      pendingPayoutCount,
      pendingPayoutSum,
      allDonations,
      completedCampaigns,
      draftCampaigns,
      recentDonations,
      recentCampaigns,
      recentReports,
      pendingPayouts,
      trendingCampaigns,
      payoutTotal,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.campaign.count({ where: { status: "active" } }),
      prisma.campaign.count(),
      prisma.campaign.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
      prisma.user.count({ where: { kycStatus: "verified" } }),
      prisma.user.count({ where: { kycStatus: "pending" } }),
      prisma.user.count({ where: { role: "creator" } }),
      prisma.user.count({ where: { role: "backer" } }),
      prisma.user.count({ where: { role: "creator", campaigns: { some: {} } } }),
      prisma.user.count({ where: { donations: { some: { status: "completed" } } } }),
      prisma.campaignReport.count({ where: { status: "open" } }),
      prisma.donation.count({ where: { status: "pending" } }),
      prisma.donation.count({ where: { status: "failed" } }),
      prisma.payout.count({ where: { status: { in: ["pending", "processing"] } } }),
      prisma.payout.aggregate({
        where: { status: { in: ["pending", "processing"] } },
        _sum: { amount: true },
      }),
      prisma.donation.findMany({
        where: { status: "completed" },
        select: {
          amount: true,
          currency: true,
          coverFee: true,
          provider: true,
          providerDataJson: true,
          userId: true,
          donorEmail: true,
          createdAt: true,
        },
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
      prisma.campaign.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
        },
      }),
      prisma.campaignReport.findMany({
        where: { status: "open" },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          campaignSlug: true,
          campaignTitle: true,
          reason: true,
          createdAt: true,
        },
      }),
      prisma.payout.findMany({
        where: { status: { in: ["pending", "processing"] } },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          amount: true,
          targetCurrency: true,
          status: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
          campaign: { select: { title: true, slug: true } },
        },
      }),
      prisma.campaign.findMany({
        where: { status: "active" },
        take: 8,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          slug: true,
          goal: true,
          category: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
          donations: {
            where: { status: "completed" },
            select: {
              id: true,
              amount: true,
              currency: true,
              coverFee: true,
              provider: true,
              providerDataJson: true,
              userId: true,
              donorEmail: true,
            },
          },
        },
      }),
      prisma.payout.aggregate({ where: { status: "completed" }, _sum: { amount: true } }),
    ]);

    const totalVolumeUsd = allDonations.reduce((s, d) => s + getStoredDonationCreditUsd(d), 0);
    const uniqueBackers = new Set(allDonations.map(getDonationBackerKey).filter(Boolean)).size;
    const platformRevenue = totalVolumeUsd * 0.015;
    const campaignStatuses = statusMap(campaignStatusRows);
    const userRoles = roleMap(userRoleRows);
    const successRate = completedCampaigns.length > 0
      ? Math.round(completedCampaigns.filter(c => c.raised >= c.goal).length / completedCampaigns.length * 100)
      : 0;

    // 30-day volume
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const monthDonations = allDonations.filter(d => new Date(d.createdAt) >= thirtyDaysAgo);
    const monthVolumeUsd = monthDonations.reduce((s, d) => s + getStoredDonationCreditUsd(d), 0);
    const monthKeys = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index));
      return monthKey(date);
    });
    const monthlyFunding = monthKeys.map((key) => {
      const donations = allDonations.filter((donation) => monthKey(donation.createdAt) === key);
      return {
        key,
        label: monthLabel(key),
        volumeUsd: donations.reduce((sum, donation) => sum + getStoredDonationCreditUsd(donation), 0),
        donationCount: donations.length,
      };
    });
    const providerBreakdown = Object.values(
      allDonations.reduce<Record<string, { provider: string; volumeUsd: number; count: number }>>((acc, donation) => {
        const provider = donation.provider || "unknown";
        if (!acc[provider]) acc[provider] = { provider, volumeUsd: 0, count: 0 };
        acc[provider].volumeUsd += getStoredDonationCreditUsd(donation);
        acc[provider].count += 1;
        return acc;
      }, {}),
    ).sort((a, b) => b.volumeUsd - a.volumeUsd);
    const activeTrendingCampaigns = trendingCampaigns
      .map((campaign) => {
        const raised = campaign.donations.reduce((sum, donation) => sum + getStoredDonationCreditUsd(donation), 0);
        return {
          id: campaign.id,
          title: campaign.title,
          slug: campaign.slug,
          category: campaign.category,
          creatorName: campaign.user?.name || campaign.user?.email || "Unknown",
          raised,
          goal: campaign.goal,
          pct: campaign.goal > 0 ? Math.min(Math.round((raised / campaign.goal) * 100), 100) : 0,
          backers: new Set(campaign.donations.map(getDonationBackerKey).filter(Boolean)).size,
          createdAt: campaign.createdAt.toISOString(),
        };
      })
      .sort((a, b) => b.raised - a.raised)
      .slice(0, 5);
    const activityFeed = [
      ...recentCampaigns.map((campaign) => ({
        id: `campaign-${campaign.id}`,
        type: "campaign",
        title: "Campaign created",
        desc: `${campaign.title} by ${campaign.user?.name || campaign.user?.email || "Unknown"}`,
        href: `/admin/campaigns?status=${campaign.status}`,
        dateIso: campaign.createdAt.toISOString(),
      })),
      ...recentReports.map((report) => ({
        id: `report-${report.id}`,
        type: "report",
        title: "Report submitted",
        desc: `${report.campaignTitle} was flagged for ${report.reason.replace("-", " ")}`,
        href: `/admin/reports`,
        dateIso: report.createdAt.toISOString(),
      })),
      ...recentDonations.map((donation) => ({
        id: `donation-${donation.id}`,
        type: "donation",
        title: "Donation completed",
        desc: `${donation.isAnonymous ? "Anonymous" : donation.donorName || donation.donorEmail?.split("@")[0] || "Supporter"} backed ${donation.campaign.title}`,
        href: `/admin/transactions`,
        dateIso: donation.createdAt.toISOString(),
      })),
      ...pendingPayouts.map((payout) => ({
        id: `payout-${payout.id}`,
        type: "payout",
        title: "Payout needs review",
        desc: `${payout.user?.name || payout.user?.email || "Unknown"} requested ${payout.amount.toLocaleString()} ${payout.targetCurrency}`,
        href: `/admin/transactions`,
        dateIso: payout.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime())
      .slice(0, 12);

    return {
      success: true,
      stats: {
        totalUserCount,
        totalVolumeUsd,
        monthVolumeUsd,
        platformRevenue,
        activeCampaignCount,
        totalCampaignCount,
        campaignStatuses,
        userRoles,
        verifiedUserCount,
        unverifiedUserCount: Math.max(0, totalUserCount - verifiedUserCount - pendingVerificationUserCount),
        pendingVerificationUserCount,
        creatorCount,
        backerCount,
        creatorsWithCampaigns,
        backersWithCompletedDonations,
        uniqueBackers,
        openReportCount,
        pendingDonationCount,
        failedDonationCount,
        pendingPayoutCount,
        pendingPayoutUsd: pendingPayoutSum._sum.amount ?? 0,
        successRate,
        totalPayoutUsd: payoutTotal._sum.amount ?? 0,
        conversion: {
          creatorActivationRate: creatorCount > 0 ? Math.round((creatorsWithCampaigns / creatorCount) * 100) : 0,
          backerActivationRate: backerCount > 0 ? Math.round((backersWithCompletedDonations / backerCount) * 100) : 0,
        },
      },
      monthlyFunding,
      providerBreakdown,
      trendingCampaigns: activeTrendingCampaigns,
      activityFeed,
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
    };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = getSessionUser(session);
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }
    const data = await fetchAdminStats();
    return NextResponse.json(data);
  } catch (error) {
    console.error("admin/stats error", error);
    return NextResponse.json({ error: "Unable to load platform stats." }, { status: 500 });
  }
}
