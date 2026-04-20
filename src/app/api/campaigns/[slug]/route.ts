import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { CAMPAIGN_SEEDS, getCampaignPct } from "@/lib/campaign-seeds";
import { getStoredDonationCreditUsd } from "@/lib/currency";

function getNumericCampaignId(slug: string) {
  return slug.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const seed = CAMPAIGN_SEEDS[slug];
  const campaign = await prisma.campaign.findUnique({
    where: { slug },
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
  });

  if (!campaign && !seed) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const baseRaised = seed ? seed.raised : 0;
  const liveRaised = campaign?.donations.reduce(
    (sum, donation) => sum + getStoredDonationCreditUsd(donation),
    0,
  ) ?? 0;
  const baseBackers = seed ? seed.backers : 0;
  const liveBackers = campaign?._count.donations ?? 0;
  const goal = campaign?.goal || seed?.goal || 0;
  const raised = baseRaised + liveRaised;
  const pct = getCampaignPct(raised, goal);
  const creatorName = campaign?.user?.name || seed?.creator || "OneRaise Creator";

  return NextResponse.json({
    success: true,
    campaign: {
      id: seed?.id ?? (campaign?.slug ? Number(campaign.slug) || getNumericCampaignId(campaign.slug) : 0),
      dbId: campaign?.id,
      slug: campaign?.slug || slug,
      title: seed?.title || campaign?.title || `Campaign ${slug}`,
      creator: creatorName,
      creatorInitials:
        seed?.creatorInitials ||
        creatorName
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase() ||
        "OR",
      raised,
      goal,
      pct,
      category: seed?.category || campaign?.category || "Community",
      desc: seed?.desc || campaign?.description || "",
      backers: baseBackers + liveBackers,
      daysLeft: seed?.daysLeft ?? 0,
      verified: seed?.verified ?? true,
      status: campaign?.status || seed?.status || "active",
    },
  });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const session = await getServerSession(authOptions);
    const userId = session?.user ? ((session.user as any).id as string) : null;
    const role = session?.user ? ((session.user as any).role as string | undefined) : null;

    if (!userId) {
      return NextResponse.json({ error: "Please sign in to update this campaign." }, { status: 401 });
    }

    if (role !== "creator") {
      return NextResponse.json({ error: "Only creator accounts can update campaigns." }, { status: 403 });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { slug },
      select: { id: true, userId: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.userId && campaign.userId !== userId) {
      return NextResponse.json({ error: "You can only update your own campaigns." }, { status: 403 });
    }

    const { title, goal, category, description, status } = await req.json();
    const data: {
      title?: string;
      goal?: number;
      category?: string;
      description?: string | null;
      status?: string;
    } = {};

    if (typeof title === "string" && title.trim()) data.title = title.trim();
    if (goal !== undefined) {
      const parsedGoal = Number(goal);
      if (!Number.isFinite(parsedGoal) || parsedGoal <= 0) {
        return NextResponse.json({ error: "Goal amount must be greater than 0." }, { status: 400 });
      }
      data.goal = parsedGoal;
    }
    if (typeof category === "string") data.category = category.trim() || "General";
    if (typeof description === "string") data.description = description.trim() || null;
    if (status === "active" || status === "draft" || status === "completed") data.status = status;

    const updated = await prisma.campaign.update({
      where: { slug },
      data,
    });

    return NextResponse.json({
      success: true,
      campaign: {
        id: Number(updated.slug) || getNumericCampaignId(updated.slug),
        dbId: updated.id,
        slug: updated.slug,
        title: updated.title,
        status: updated.status,
        raised: updated.raised,
        goal: updated.goal,
        pct: getCampaignPct(updated.raised, updated.goal),
        backers: 0,
        daysLeft: updated.status === "active" ? 30 : 0,
        category: updated.category,
      },
    });
  } catch (error: any) {
    console.error("Update campaign error:", error);
    return NextResponse.json({ error: error?.message || "Unable to update campaign." }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const session = await getServerSession(authOptions);
    const userId = session?.user ? ((session.user as any).id as string) : null;
    const role = session?.user ? ((session.user as any).role as string | undefined) : null;

    if (!userId) {
      return NextResponse.json({ error: "Please sign in to delete this campaign." }, { status: 401 });
    }

    if (role !== "creator") {
      return NextResponse.json({ error: "Only creator accounts can delete campaigns." }, { status: 403 });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { slug },
      select: { id: true, userId: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.userId && campaign.userId !== userId) {
      return NextResponse.json({ error: "You can only delete your own campaigns." }, { status: 403 });
    }

    await prisma.campaign.delete({ where: { slug } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete campaign error:", error);
    return NextResponse.json({ error: error?.message || "Unable to delete campaign." }, { status: 500 });
  }
}
