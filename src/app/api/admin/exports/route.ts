import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getStoredDonationCreditUsd } from "@/lib/currency";
import prisma from "@/lib/prisma";

type SessionUser = {
  role?: string | null;
};

function getSessionUser(session: unknown): SessionUser {
  if (!session || typeof session !== "object" || !("user" in session)) return {};
  return ((session as { user?: unknown }).user as SessionUser | undefined) ?? {};
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function csv(rows: unknown[][]) {
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvResponse(kind: string, rows: unknown[][]) {
  return new Response(`${csv(rows)}\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="oneraise-${kind}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = getSessionUser(session);
    if (sessionUser.role !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const kind = searchParams.get("kind") || "summary";

    if (kind === "users") {
      const users = await prisma.user.findMany({
        orderBy: { email: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          kycStatus: true,
          emailNotifications: true,
          pushNotifications: true,
          campaignUpdates: true,
          marketingEmails: true,
          _count: { select: { campaigns: true, donations: true, payouts: true } },
        },
      });

      return csvResponse("users", [
        ["id", "name", "email", "role", "verification_status", "campaigns", "donations", "payouts", "email_notifications", "push_notifications", "campaign_updates", "marketing_emails"],
        ...users.map((user) => [
          user.id,
          user.name,
          user.email,
          user.role,
          user.kycStatus,
          user._count.campaigns,
          user._count.donations,
          user._count.payouts,
          user.emailNotifications,
          user.pushNotifications,
          user.campaignUpdates,
          user.marketingEmails,
        ]),
      ]);
    }

    if (kind === "campaigns") {
      const campaigns = await prisma.campaign.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          slug: true,
          category: true,
          status: true,
          type: true,
          protectStatus: true,
          goal: true,
          raised: true,
          createdAt: true,
          updatedAt: true,
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
      });

      return csvResponse("campaigns", [
        ["id", "title", "slug", "creator", "creator_email", "category", "status", "type", "protect_status", "goal_usd", "raised_usd", "completed_donations", "created_at", "updated_at"],
        ...campaigns.map((campaign) => [
          campaign.id,
          campaign.title,
          campaign.slug,
          campaign.user?.name,
          campaign.user?.email,
          campaign.category,
          campaign.status,
          campaign.type,
          campaign.protectStatus,
          campaign.goal,
          campaign.donations.reduce((sum, donation) => sum + getStoredDonationCreditUsd(donation), 0),
          campaign.donations.length,
          campaign.createdAt.toISOString(),
          campaign.updatedAt.toISOString(),
        ]),
      ]);
    }

    if (kind === "donations") {
      const donations = await prisma.donation.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          provider: true,
          providerStatus: true,
          providerDataJson: true,
          coverFee: true,
          donorName: true,
          donorEmail: true,
          isAnonymous: true,
          asset: true,
          network: true,
          completedAt: true,
          createdAt: true,
          campaign: { select: { title: true, slug: true } },
        },
      });

      return csvResponse("donations", [
        ["id", "campaign", "campaign_slug", "donor_name", "donor_email", "status", "provider", "provider_status", "amount", "currency", "credit_usd", "asset", "network", "created_at", "completed_at"],
        ...donations.map((donation) => [
          donation.id,
          donation.campaign.title,
          donation.campaign.slug,
          donation.isAnonymous ? "Anonymous" : donation.donorName,
          donation.isAnonymous ? "" : donation.donorEmail,
          donation.status,
          donation.provider,
          donation.providerStatus,
          donation.amount,
          donation.currency,
          getStoredDonationCreditUsd(donation),
          donation.asset,
          donation.network,
          donation.createdAt.toISOString(),
          donation.completedAt?.toISOString() ?? "",
        ]),
      ]);
    }

    if (kind === "payouts") {
      const payouts = await prisma.payout.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          amount: true,
          sourceCurrency: true,
          targetCurrency: true,
          status: true,
          provider: true,
          paymentId: true,
          completedAt: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
          campaign: { select: { title: true, slug: true } },
          payoutMethod: { select: { label: true, type: true, currency: true } },
        },
      });

      return csvResponse("payouts", [
        ["id", "creator", "creator_email", "campaign", "campaign_slug", "amount", "source_currency", "target_currency", "status", "provider", "payment_id", "method", "method_type", "created_at", "completed_at"],
        ...payouts.map((payout) => [
          payout.id,
          payout.user.name,
          payout.user.email,
          payout.campaign?.title ?? "",
          payout.campaign?.slug ?? "",
          payout.amount,
          payout.sourceCurrency,
          payout.targetCurrency,
          payout.status,
          payout.provider,
          payout.paymentId,
          payout.payoutMethod?.label ?? "",
          payout.payoutMethod?.type ?? "",
          payout.createdAt.toISOString(),
          payout.completedAt?.toISOString() ?? "",
        ]),
      ]);
    }

    if (kind === "reports") {
      const reports = await prisma.campaignReport.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          campaignSlug: true,
          campaignTitle: true,
          reason: true,
          details: true,
          status: true,
          reporterEmail: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return csvResponse("reports", [
        ["id", "campaign", "campaign_slug", "reason", "details", "status", "reporter_email", "created_at", "updated_at"],
        ...reports.map((report) => [
          report.id,
          report.campaignTitle,
          report.campaignSlug,
          report.reason,
          report.details,
          report.status,
          report.reporterEmail,
          report.createdAt.toISOString(),
          report.updatedAt.toISOString(),
        ]),
      ]);
    }

    const [users, campaigns, donations, payouts, openReports] = await Promise.all([
      prisma.user.count(),
      prisma.campaign.count(),
      prisma.donation.findMany({
        where: { status: "completed" },
        select: { amount: true, currency: true, coverFee: true, provider: true, providerDataJson: true },
      }),
      prisma.payout.aggregate({ where: { status: "completed" }, _sum: { amount: true } }),
      prisma.campaignReport.count({ where: { status: "open" } }),
    ]);

    const totalRaisedUsd = donations.reduce((sum, donation) => sum + getStoredDonationCreditUsd(donation), 0);
    return csvResponse("summary", [
      ["metric", "value"],
      ["users", users],
      ["campaigns", campaigns],
      ["completed_donations", donations.length],
      ["total_raised_usd", totalRaisedUsd],
      ["platform_revenue_usd", totalRaisedUsd * 0.015],
      ["completed_payout_usd", payouts._sum.amount ?? 0],
      ["open_reports", openReports],
    ]);
  } catch (error) {
    console.error("admin/exports error", error);
    return NextResponse.json({ error: "Unable to export report." }, { status: 500 });
  }
}
