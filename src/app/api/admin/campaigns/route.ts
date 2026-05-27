import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getStoredDonationCreditUsd } from "@/lib/currency";
import { getUniqueBackerCount } from "@/lib/backers";

type SessionUser = {
  role?: string | null;
};

function getSessionUser(session: unknown) {
  if (!session || typeof session !== "object" || !("user" in session)) return {};
  return ((session as { user?: unknown }).user as SessionUser | undefined) ?? {};
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = getSessionUser(session);
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = 50;

    const where: Prisma.CampaignWhereInput = {};
    if (status && status !== "all") where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          slug: true,
          category: true,
          status: true,
          type: true,
          goal: true,
          createdAt: true,
          image: true,
          user: { select: { name: true, email: true, id: true } },
          donations: {
            where: { status: "completed" },
            select: { amount: true, currency: true, coverFee: true, provider: true, providerDataJson: true, userId: true, donorEmail: true },
          },
          _count: { select: { donations: { where: { status: "completed" } } } },
        },
      }),
      prisma.campaign.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      campaigns: campaigns.map(c => {
        const raised = c.donations.reduce((s, d) => s + getStoredDonationCreditUsd(d), 0);
        return {
          id: c.id,
          title: c.title,
          slug: c.slug,
          category: c.category,
          status: c.status,
          type: c.type,
          goal: c.goal,
          raised,
          backers: getUniqueBackerCount(c.donations),
          pct: c.goal > 0 ? Math.min(Math.round((raised / c.goal) * 100), 100) : 0,
          createdAt: c.createdAt.toISOString(),
          image: c.image,
          creatorName: c.user?.name || c.user?.email || "Unknown",
          creatorId: c.user?.id,
        };
      }),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("admin/campaigns GET error", error);
    return NextResponse.json({ error: "Unable to load campaigns." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = getSessionUser(session);
    if (sessionUser.role !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const { campaignSlug, action } = await req.json();
    if (!campaignSlug || typeof campaignSlug !== "string") {
      return NextResponse.json({ error: "campaignSlug required." }, { status: 400 });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { slug: campaignSlug },
      select: { id: true, status: true },
    });
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    let newStatus: string | undefined;
    if (action === "approve") newStatus = "active";
    else if (action === "reject") newStatus = "suspended";
    else if (action === "pause") newStatus = "paused";
    else if (action === "resume") newStatus = "active";
    else if (action === "suspend") newStatus = "suspended";
    else if (action === "unsuspend") newStatus = "active";
    else if (action === "complete") newStatus = "completed";
    else {
      return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
    }

    const updated = await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: newStatus },
    });

    revalidatePath("/admin/campaigns");
    revalidatePath("/admin");
    revalidatePath(`/campaign/${updated.slug}`);
    revalidatePath("/explore");

    return NextResponse.json({ success: true, campaign: { id: updated.id, slug: updated.slug, status: updated.status } });
  } catch (error) {
    console.error("admin/campaigns PATCH error", error);
    return NextResponse.json({ error: "Unable to update campaign." }, { status: 500 });
  }
}
