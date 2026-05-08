import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getCachedCampaignsList, getNumericCampaignId, getUserCampaignsList } from "@/lib/campaigns-data";

const MAX_IMAGE_DATA_URL_LENGTH = 7 * 1024 * 1024;

type SessionUser = {
  id?: string;
  role?: string;
};

type RequestedMilestone = {
  title?: unknown;
  description?: unknown;
};

function getSessionUser(session: unknown): SessionUser {
  if (!session || typeof session !== "object" || !("user" in session)) return {};
  return ((session as { user?: unknown }).user as SessionUser | undefined) ?? {};
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
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

function revalidateCampaignViews() {
  revalidatePath("/");
  revalidatePath("/explore");
  revalidatePath("/backer/discover");
}

function parseCampaignType(value: unknown) {
  if (value === "protected_crowdfunding" || value === "emergency_aid" || value === "grant_distribution") {
    return value;
  }

  return "standard";
}

function parseMilestones(value: unknown): { title: string; description?: string | null }[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item: RequestedMilestone) => ({
      title: String(item?.title || "").trim(),
      description: String(item?.description || "").trim() || null,
    }))
    .filter((item) => item.title)
    .slice(0, 8);
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
    const userId = getSessionUser(session).id ?? null;

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
    const sessionUser = getSessionUser(session);
    const userId = sessionUser.id ?? null;
    const role = sessionUser.role ?? null;

    if (!userId) {
      return NextResponse.json({ error: "Please sign in to create a campaign." }, { status: 401 });
    }

    if (role !== "creator") {
      return NextResponse.json({ error: "Only creator accounts can create campaigns." }, { status: 403 });
    }

    const { title, goal, category, description, status, image, type, milestones } = await req.json();
    const parsedTitle = String(title || "").trim();
    const parsedGoal = Number(goal);
    const parsedImage = parseCampaignImage(image);
    const parsedType = parseCampaignType(type);
    const parsedMilestones = parseMilestones(milestones);

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
        type: parsedType,
        protectStatus: "funding",
        milestones: parsedMilestones.length
          ? {
              create: parsedMilestones,
            }
          : undefined,
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });

    revalidateCampaignViews();

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
        type: campaign.type,
        protectStatus: campaign.protectStatus,
      },
    });
  } catch (error: unknown) {
    console.error("Create campaign error:", error);
    return NextResponse.json({ error: getErrorMessage(error, "Unable to create campaign.") }, { status: 500 });
  }
}
