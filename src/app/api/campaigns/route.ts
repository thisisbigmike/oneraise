import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getCachedCampaignsList, getNumericCampaignId, getUserCampaignsList } from "@/lib/campaigns-data";

const MAX_IMAGE_DATA_URL_LENGTH = 7 * 1024 * 1024;

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

  if (mine) {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? ((session.user as any).id as string) : null;

    if (!userId) {
      return NextResponse.json({ error: "Please sign in to view your campaigns." }, { status: 401 });
    }

    const campaigns = await getUserCampaignsList(userId);
    return NextResponse.json({
      success: true,
      campaigns,
    });
  }

  const campaigns = await getCachedCampaignsList();

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

    const { title, goal, category, description, status, image } = await req.json();
    const parsedTitle = String(title || "").trim();
    const parsedGoal = Number(goal);
    const parsedImage = parseCampaignImage(image);

    if (!parsedTitle || !Number.isFinite(parsedGoal) || parsedGoal <= 0) {
      return NextResponse.json({ error: "Campaign title and a valid goal amount are required." }, { status: 400 });
    }

    const slug = await createUniqueSlug(parsedTitle);
    const campaign = await prisma.campaign.create({
      data: {
        title: parsedTitle,
        slug,
        description: String(description || "").trim() || null,
        image: parsedImage ?? null,
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
        image: campaign.image,
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
