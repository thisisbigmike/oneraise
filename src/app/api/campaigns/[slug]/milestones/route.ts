import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

type SessionUser = {
  id?: string;
  role?: string;
};

function getSessionUser(session: unknown): SessionUser {
  if (!session || typeof session !== "object" || !("user" in session)) return {};
  return ((session as { user?: unknown }).user as SessionUser | undefined) ?? {};
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function revalidateCampaign(slug: string) {
  revalidatePath(`/campaign/${slug}`);
  revalidatePath(`/backer/donate/${slug}`);
  revalidatePath("/dashboard/campaigns");
  revalidatePath("/admin/protect");
}

async function getOwnedCampaign(slug: string, userId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { slug },
    select: { id: true, slug: true, userId: true, type: true },
  });

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  if (campaign.userId && campaign.userId !== userId) {
    throw new Error("You can only update milestones on your own campaign.");
  }

  return campaign;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const campaign = await prisma.campaign.findUnique({
      where: { slug },
      select: {
        milestones: {
          orderBy: { createdAt: "asc" },
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
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      milestones: campaign.milestones.map((milestone) => ({
        ...milestone,
        createdAt: milestone.createdAt.toISOString(),
        updatedAt: milestone.updatedAt.toISOString(),
      })),
    });
  } catch (error: unknown) {
    console.error("List milestones error:", error);
    return NextResponse.json({ error: getErrorMessage(error, "Unable to load milestones.") }, { status: 500 });
  }
}

export async function POST(
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
      return NextResponse.json({ error: "Please sign in to add milestones." }, { status: 401 });
    }

    if (role !== "creator") {
      return NextResponse.json({ error: "Only creator accounts can add milestones." }, { status: 403 });
    }

    const campaign = await getOwnedCampaign(slug, userId);
    const { title, description } = await req.json();
    const parsedTitle = String(title || "").trim();
    const parsedDescription = String(description || "").trim() || null;

    if (!parsedTitle) {
      return NextResponse.json({ error: "Milestone title is required." }, { status: 400 });
    }

    const milestone = await prisma.milestone.create({
      data: {
        title: parsedTitle,
        description: parsedDescription,
        campaignId: campaign.id,
      },
    });

    revalidateCampaign(slug);

    return NextResponse.json({
      success: true,
      milestone: {
        ...milestone,
        createdAt: milestone.createdAt.toISOString(),
        updatedAt: milestone.updatedAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error("Create milestone error:", error);
    return NextResponse.json({ error: getErrorMessage(error, "Unable to create milestone.") }, { status: 500 });
  }
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
      return NextResponse.json({ error: "Please sign in to update milestone proof." }, { status: 401 });
    }

    if (role !== "creator") {
      return NextResponse.json({ error: "Only creator accounts can submit milestone proof." }, { status: 403 });
    }

    const campaign = await getOwnedCampaign(slug, userId);
    const { milestoneId, proofUrl, action } = await req.json();
    const parsedProofUrl = String(proofUrl || "").trim();

    if (action !== "submit-proof") {
      return NextResponse.json({ error: "Unsupported milestone action." }, { status: 400 });
    }

    if (!milestoneId || typeof milestoneId !== "string") {
      return NextResponse.json({ error: "Milestone ID is required." }, { status: 400 });
    }

    if (!parsedProofUrl) {
      return NextResponse.json({ error: "Proof URL or note is required before submission." }, { status: 400 });
    }

    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      select: { id: true, campaignId: true },
    });

    if (!milestone || milestone.campaignId !== campaign.id) {
      return NextResponse.json({ error: "Milestone not found for this campaign." }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const nextMilestone = await tx.milestone.update({
        where: { id: milestoneId },
        data: {
          proofUrl: parsedProofUrl,
          status: "submitted",
        },
      });

      await tx.campaign.update({
        where: { id: campaign.id },
        data: { protectStatus: "pending_verification" },
      });

      return nextMilestone;
    });

    revalidateCampaign(slug);

    return NextResponse.json({
      success: true,
      milestone: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error("Submit milestone proof error:", error);
    return NextResponse.json({ error: getErrorMessage(error, "Unable to submit milestone proof.") }, { status: 500 });
  }
}
