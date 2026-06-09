import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getStoredDonationCreditUsd } from "@/lib/currency";

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

function revalidateProtectViews(slug?: string) {
  revalidatePath("/admin/protect");
  revalidatePath("/admin");
  if (slug) {
    revalidatePath(`/campaign/${slug}`);
    revalidatePath(`/backer/donate/${slug}`);
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = getSessionUser(session);
    if (sessionUser.role !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const campaigns = await prisma.campaign.findMany({
      where: {
        type: {
          in: ["protected_crowdfunding", "emergency_aid", "grant_distribution"],
        },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        type: true,
        protectStatus: true,
        goal: true,
        raised: true,
        category: true,
        user: { select: { name: true, email: true } },
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

    const queue = campaigns.map((campaign) => ({
      ...campaign,
      creatorName: campaign.user?.name || campaign.user?.email || "OneRaise Creator",
      milestones: campaign.milestones.map((milestone) => ({
        ...milestone,
        createdAt: milestone.createdAt.toISOString(),
        updatedAt: milestone.updatedAt.toISOString(),
      })),
    }));

    return NextResponse.json({
      success: true,
      campaigns: queue,
      pendingCount: queue.reduce(
        (sum, campaign) => sum + campaign.milestones.filter((milestone) => milestone.status === "submitted").length,
        0,
      ),
      protectedCount: queue.length,
    });
  } catch (error: unknown) {
    console.error("List Protect queue error:", error);
    return NextResponse.json({ error: getErrorMessage(error, "Unable to load Protect queue.") }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = getSessionUser(session);

    if (sessionUser.role !== "admin") {
      return NextResponse.json({ error: "Only admin accounts can approve Protect actions." }, { status: 403 });
    }

    const { campaignSlug, milestoneId, action } = await req.json();

    if (!campaignSlug || typeof campaignSlug !== "string") {
      return NextResponse.json({ error: "Campaign slug is required." }, { status: 400 });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { slug: campaignSlug },
      select: {
        id: true,
        slug: true,
        goal: true,
        protectStatus: true,
        milestones: {
          select: {
            id: true,
            status: true,
            proofUrl: true,
          },
        },
        donations: {
          where: { status: "completed" },
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

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    if (action === "approve-milestone" || action === "reject-milestone") {
      if (!milestoneId || typeof milestoneId !== "string") {
        return NextResponse.json({ error: "Milestone ID is required." }, { status: 400 });
      }

      const milestone = await prisma.milestone.findUnique({
        where: { id: milestoneId },
        select: { id: true, campaignId: true, status: true, proofUrl: true },
      });

      if (!milestone || milestone.campaignId !== campaign.id) {
        return NextResponse.json({ error: "Milestone not found for this campaign." }, { status: 404 });
      }
      if (milestone.status !== "submitted") {
        return NextResponse.json({ error: "Only submitted milestones can be reviewed." }, { status: 409 });
      }
      if (action === "approve-milestone" && !milestone.proofUrl) {
        return NextResponse.json({ error: "Milestone proof is required before approval." }, { status: 409 });
      }

      const updated = await prisma.$transaction(async (tx) => {
        const nextMilestone = await tx.milestone.update({
          where: { id: milestoneId },
          data: {
            status: action === "approve-milestone" ? "approved" : "rejected",
          },
        });

        const remainingSubmitted = await tx.milestone.count({
          where: {
            campaignId: campaign.id,
            status: "submitted",
          },
        });

        if (remainingSubmitted === 0) {
          await tx.campaign.update({
            where: { id: campaign.id },
            data: {
              protectStatus:
                action === "approve-milestone"
                  ? "locked"
                  : "funding",
            },
          });
        }

        return nextMilestone;
      });

      revalidateProtectViews(campaign.slug);

      return NextResponse.json({
        success: true,
        milestone: {
          ...updated,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
      });
    }

    if (action === "release-campaign" || action === "refund-campaign" || action === "lock-campaign") {
      const raised = campaign.donations.reduce((sum, donation) => sum + getStoredDonationCreditUsd(donation), 0);
      const allMilestonesApproved =
        campaign.milestones.length > 0 &&
        campaign.milestones.every((milestone) => milestone.status === "approved");
      const hasReleased = campaign.protectStatus === "unlocked";

      if (action === "release-campaign") {
        if (campaign.protectStatus === "unlocked") {
          return NextResponse.json({ error: "Campaign funds have already been released." }, { status: 409 });
        }
        if (!allMilestonesApproved) {
          return NextResponse.json({ error: "All milestones must be approved before release." }, { status: 409 });
        }
        if (raised < campaign.goal) {
          return NextResponse.json({ error: "Campaign goal must be reached before release." }, { status: 409 });
        }
      }

      if (action === "refund-campaign") {
        if (hasReleased) {
          return NextResponse.json({ error: "Released campaigns cannot be refunded." }, { status: 409 });
        }
        if (raised >= campaign.goal && allMilestonesApproved) {
          return NextResponse.json({ error: "Campaign is eligible for release, not refund." }, { status: 409 });
        }
      }

      const protectStatus =
        action === "release-campaign"
          ? "unlocked"
          : action === "refund-campaign"
            ? "refunded"
            : "locked";

      const updated = await prisma.campaign.update({
        where: { id: campaign.id },
        data: { protectStatus },
      });

      revalidateProtectViews(updated.slug);

      return NextResponse.json({
        success: true,
        campaign: {
          id: updated.id,
          slug: updated.slug,
          protectStatus: updated.protectStatus,
        },
      });
    }

    return NextResponse.json({ error: "Unsupported Protect action." }, { status: 400 });
  } catch (error: unknown) {
    console.error("Update Protect queue error:", error);
    return NextResponse.json({ error: getErrorMessage(error, "Unable to update Protect status.") }, { status: 500 });
  }
}
