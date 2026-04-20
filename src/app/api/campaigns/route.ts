import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
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

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `campaign-${Date.now()}`;
}

function getNumericCampaignId(slug: string) {
  return slug.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

async function createUniqueSlug(title: string) {
  const baseSlug = slugify(title);
  let slug = baseSlug;
  let suffix = 2;

  while (await prisma.campaign.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
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

export async function GET() {
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
    formatSeedWithLiveData(seed, campaignBySlug.get(seed.slug)),
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

  return NextResponse.json({
    success: true,
    campaigns: [...customCampaigns, ...seededCampaigns],
  });
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? ((session.user as any).id as string) : null;
    const role = session?.user ? ((session.user as any).role as string | undefined) : null;

    if (!userId) {
      return NextResponse.json({ error: "Please sign in to create a campaign." }, { status: 401 });
    }

    if (role !== "creator") {
      return NextResponse.json({ error: "Only creator accounts can create campaigns." }, { status: 403 });
    }

    const { title, goal, category, description, status } = await req.json();
    const parsedTitle = String(title || "").trim();
    const parsedGoal = Number(goal);

    if (!parsedTitle || !Number.isFinite(parsedGoal) || parsedGoal <= 0) {
      return NextResponse.json({ error: "Campaign title and a valid goal amount are required." }, { status: 400 });
    }

    const slug = await createUniqueSlug(parsedTitle);
    const campaign = await prisma.campaign.create({
      data: {
        title: parsedTitle,
        slug,
        description: String(description || "").trim() || null,
        goal: parsedGoal,
        category: String(category || "General").trim() || "General",
        status: status === "active" ? "active" : "draft",
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      campaign: {
        id: Number(campaign.slug) || getNumericCampaignId(campaign.slug),
        dbId: campaign.id,
        slug: campaign.slug,
        title: campaign.title,
        status: campaign.status,
        raised: 0,
        goal: campaign.goal,
        pct: 0,
        backers: 0,
        daysLeft: campaign.status === "active" ? 30 : 0,
        category: campaign.category,
      },
    });
  } catch (error: any) {
    console.error("Create campaign error:", error);
    return NextResponse.json({ error: error?.message || "Unable to create campaign." }, { status: 500 });
  }
}
