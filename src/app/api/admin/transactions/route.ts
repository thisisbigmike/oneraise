import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getStoredDonationCreditUsd } from "@/lib/currency";

function getSessionUser(session: unknown) {
  if (!session || typeof session !== "object" || !("user" in session)) return {};
  return (session as { user?: any }).user ?? {};
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = getSessionUser(session);
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "donations"; // donations | payouts
    const status = searchParams.get("status") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = 50;

    if (type === "payouts") {
      const where: any = {};
      if (status && status !== "all") where.status = status;

      const [payouts, total] = await Promise.all([
        prisma.payout.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
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
            payoutMethod: { select: { label: true, type: true, bankName: true, walletAddress: true } },
          },
        }),
        prisma.payout.count({ where }),
      ]);

      return NextResponse.json({
        success: true,
        type: "payouts",
        items: payouts.map(p => ({
          id: p.id,
          amount: p.amount,
          sourceCurrency: p.sourceCurrency,
          targetCurrency: p.targetCurrency,
          status: p.status,
          provider: p.provider,
          paymentId: p.paymentId,
          completedAt: p.completedAt?.toISOString() ?? null,
          createdAt: p.createdAt.toISOString(),
          creatorName: p.user?.name || p.user?.email || "Unknown",
          campaignTitle: p.campaign?.title ?? "—",
          campaignSlug: p.campaign?.slug ?? null,
          methodLabel: p.payoutMethod?.label ?? "—",
          methodType: p.payoutMethod?.type ?? "—",
        })),
        total,
        page,
        pages: Math.ceil(total / limit),
      });
    }

    // Default: donations
    const whereD: any = {};
    if (status && status !== "all") whereD.status = status;

    const [donations, total] = await Promise.all([
      prisma.donation.findMany({
        where: whereD,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          amount: true,
          currency: true,
          coverFee: true,
          provider: true,
          providerDataJson: true,
          status: true,
          donorName: true,
          donorEmail: true,
          donorMessage: true,
          isAnonymous: true,
          asset: true,
          network: true,
          solanaTxSignature: true,
          completedAt: true,
          createdAt: true,
          campaign: { select: { title: true, slug: true } },
          user: { select: { name: true, email: true } },
        },
      }),
      prisma.donation.count({ where: whereD }),
    ]);

    return NextResponse.json({
      success: true,
      type: "donations",
      items: donations.map(d => ({
        id: d.id,
        amountUsd: getStoredDonationCreditUsd(d),
        rawAmount: d.amount,
        currency: d.currency,
        provider: d.provider,
        status: d.status,
        donorName: d.isAnonymous ? "Anonymous" : (d.donorName || d.donorEmail?.split("@")[0] || "Supporter"),
        donorEmail: d.isAnonymous ? null : d.donorEmail,
        donorMessage: d.donorMessage,
        asset: d.asset,
        network: d.network,
        solanaTx: d.solanaTxSignature,
        campaignTitle: d.campaign.title,
        campaignSlug: d.campaign.slug,
        completedAt: d.completedAt?.toISOString() ?? null,
        createdAt: d.createdAt.toISOString(),
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("admin/transactions GET error", error);
    return NextResponse.json({ error: "Unable to load transactions." }, { status: 500 });
  }
}
