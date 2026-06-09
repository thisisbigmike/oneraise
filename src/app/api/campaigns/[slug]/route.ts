import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath, revalidateTag } from "next/cache";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getCampaignPct } from "@/lib/campaign-seeds";
import { getStoredDonationCreditUsd } from "@/lib/currency";
import { isPublicCampaign } from "@/lib/campaigns-data";
import { getUniqueBackerCount } from "@/lib/backers";
import { finalizeEndedCampaigns, getCampaignOutcome, getCampaignTiming } from "@/lib/campaign-lifecycle";

const MAX_IMAGE_DATA_URL_LENGTH = 7 * 1024 * 1024;
const PROTECTED_CAMPAIGN_TYPES = new Set([
  "protected_crowdfunding",
  "emergency_aid",
  "grant_distribution",
]);

type SessionUser = {
  id?: string;
  role?: string;
};

const campaignSelect = {
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
      image: true,
      kycStatus: true,
      emailVerified: true,
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
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      amount: true,
      currency: true,
      coverFee: true,
      provider: true,
      providerDataJson: true,
      userId: true,
      donorName: true,
      donorEmail: true,
      isAnonymous: true,
      createdAt: true,
    },
  },
} satisfies Prisma.CampaignSelect;

type CampaignRecord = Prisma.CampaignGetPayload<{ select: typeof campaignSelect }>;

function getSessionUser(session: unknown): SessionUser {
  if (!session || typeof session !== "object" || !("user" in session)) return {};
  return ((session as { user?: unknown }).user as SessionUser | undefined) ?? {};
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getNumericCampaignId(slug: string) {
  return slug.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function parseCampaignImage(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new Error("Campaign image must be a valid image URL.");
  }

  const image = value.trim();
  if (!image) return null;
  if (image.length > MAX_IMAGE_DATA_URL_LENGTH) {
    throw new Error("Campaign image is too large. Please upload an image under 5MB.");
  }
  if (!image.startsWith("data:image/") && !image.startsWith("/") && !image.startsWith("https://")) {
    throw new Error("Campaign image must be a valid image URL.");
  }

  return image;
}

function revalidateCampaignViews(slug?: string) {
  revalidatePath("/");
  revalidatePath("/explore");
  revalidatePath("/backer/discover");
  revalidateTag("campaigns-list", "max");
  revalidateTag("admin-stats", "max");
  if (slug) {
    revalidatePath(`/backer/donate/${slug}`);
    revalidatePath(`/campaign/${slug}`);
    revalidateTag(`campaign-${slug}`, "max");
  }
}

function parseCampaignType(value: unknown) {
  if (value === "protected_crowdfunding" || value === "emergency_aid" || value === "grant_distribution") {
    return value;
  }

  if (value === "standard") return "standard";
  return undefined;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;


  // Try to fetch from database with a timeout so the page never hangs
  let campaign: CampaignRecord | null = null;
  try {
    await finalizeEndedCampaigns();

    const dbPromise = prisma.campaign.findUnique({
      where: { slug },
      select: campaignSelect,
    });

    // 5-second timeout to prevent hanging when DB is slow
    const timeoutPromise = new Promise<CampaignRecord | null>((resolve) => setTimeout(() => resolve(null), 5000));
    campaign = await Promise.race([dbPromise, timeoutPromise]);
  } catch {
    // Database unavailable — fall through to seed data
  }

  if (!campaign || !isPublicCampaign(campaign)) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const liveRaised = campaign.donations.reduce(
    (sum, donation) => sum + getStoredDonationCreditUsd(donation),
    0,
  );
  const liveBackers = getUniqueBackerCount(campaign.donations);
  const goal = campaign.goal || 0;
  const raised = liveRaised;
  const pct = getCampaignPct(raised, goal);
  const creatorName = campaign.user?.name || "OneRaise Creator";
  const creatorImage = campaign.user?.image || null;
  const timing = getCampaignTiming(campaign);
  const outcome = getCampaignOutcome({
    goal,
    raised,
    type: campaign.type,
  });
  const recentDonors = campaign.donations.slice(0, 8).map((donation, index) => {
    const donorName = donation.isAnonymous
      ? "Anonymous"
      : donation.donorName?.trim() || donation.donorEmail?.split("@")[0] || "Supporter";

    return {
      id: `${campaign.id}-${donation.createdAt.toISOString()}-${index}`,
      name: donorName,
      amount: getStoredDonationCreditUsd(donation),
      time: donation.createdAt.toISOString(),
      initial: donorName.slice(0, 1).toUpperCase() || "S",
    };
  }) ?? [];

  return NextResponse.json({
    success: true,
    campaign: {
      id: campaign.slug ? Number(campaign.slug) || getNumericCampaignId(campaign.slug) : 0,
      dbId: campaign.id,
      slug: campaign.slug,
      title: campaign.title,
      image: campaign.image,
      creator: creatorName,
      creatorImage,
      creatorInitials:
        creatorName
          .split(" ")
          .map((part: string) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase() ||
        "OR",
      raised,
      goal,
      pct,
      category: campaign.category,
      desc: campaign.description || "",
      backers: liveBackers,
      daysLeft: timing.daysLeft,
      endDate: timing.endDate.toISOString(),
      isEnded: timing.isEnded,
      goalMet: outcome.goalMet,
      outcomeLabel: outcome.label,
      verified: campaign.user?.kycStatus === "verified" && !!campaign.user?.emailVerified,
      status: campaign.status,
      type: campaign.type || "standard",
      protectStatus: campaign.protectStatus || "funding",
      milestones: campaign.milestones.map((milestone) => ({
        ...milestone,
        createdAt: milestone.createdAt.toISOString(),
        updatedAt: milestone.updatedAt.toISOString(),
      })),
      recentDonors,
    },
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
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
    const sessionUser = getSessionUser(session);
    const userId = sessionUser.id ?? null;
    const role = sessionUser.role ?? null;

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

    const { title, goal, category, description, status, image, type } = await req.json();
    const data: {
      title?: string;
      image?: string | null;
      goal?: number;
      category?: string;
      description?: string | null;
      status?: string;
      type?: string;
      protectStatus?: string;
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
    if (image !== undefined) data.image = parseCampaignImage(image) ?? null;
    const parsedType = parseCampaignType(type);
    if (parsedType) {
      data.type = parsedType;
      if (!PROTECTED_CAMPAIGN_TYPES.has(parsedType)) data.protectStatus = "funding";
    }

    const updated = await prisma.campaign.update({
      where: { slug },
      data,
    });
    const timing = getCampaignTiming(updated);

    revalidateCampaignViews(updated.slug);

    return NextResponse.json({
      success: true,
      campaign: {
        id: Number(updated.slug) || getNumericCampaignId(updated.slug),
        dbId: updated.id,
        slug: updated.slug,
        title: updated.title,
        image: updated.image,
        status: updated.status,
        raised: updated.raised,
        goal: updated.goal,
        pct: getCampaignPct(updated.raised, updated.goal),
        backers: 0,
        daysLeft: timing.daysLeft,
        endDate: timing.endDate.toISOString(),
        isEnded: timing.isEnded,
        category: updated.category,
        type: updated.type,
        protectStatus: updated.protectStatus,
      },
    });
  } catch (error: unknown) {
    console.error("Update campaign error:", error);
    return NextResponse.json({ error: getErrorMessage(error, "Unable to update campaign.") }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const session = await getServerSession(authOptions);
    const sessionUser = getSessionUser(session);
    const userId = sessionUser.id ?? null;
    const role = sessionUser.role ?? null;

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

    await prisma.$transaction([
      prisma.milestone.deleteMany({ where: { campaignId: campaign.id } }),
      prisma.payout.deleteMany({ where: { campaignId: campaign.id } }),
      prisma.donation.deleteMany({ where: { campaignId: campaign.id } }),
      prisma.campaign.delete({ where: { id: campaign.id } }),
    ]);
    revalidateCampaignViews(slug);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Delete campaign error:", error);
    return NextResponse.json({ error: getErrorMessage(error, "Unable to delete campaign.") }, { status: 500 });
  }
}
