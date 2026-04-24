import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getCachedCampaignsList, getNumericCampaignId } from "@/lib/campaigns-data";

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



export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mine = searchParams.get("mine") === "true";

  let campaigns = await getCachedCampaignsList();

  if (mine) {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? ((session.user as any).id as string) : null;

    if (!userId) {
      return NextResponse.json({ error: "Please sign in to view your campaigns." }, { status: 401 });
    }

    // Filter to only campaigns owned by this user
    const userCampaignIds = await prisma.campaign.findMany({
      where: { userId },
      select: { id: true },
    });
    const userDbIds = new Set(userCampaignIds.map((c) => c.id));
    campaigns = campaigns.filter((c: any) => userDbIds.has(c.dbId));
  }

  return NextResponse.json({
    success: true,
    campaigns,
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
