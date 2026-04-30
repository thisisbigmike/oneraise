import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { CAMPAIGN_SEEDS } from "@/lib/campaign-seeds";

const REPORT_REASONS = new Set([
  "fake",
  "misleading",
  "prohibited",
  "suspicious-payment",
  "other",
]);

function getReportReason(value: unknown) {
  if (typeof value !== "string") return null;
  const reason = value.trim();
  return REPORT_REASONS.has(reason) ? reason : null;
}

function getTrimmedString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to report this campaign.";
}

export async function POST(
  req: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const body = await req.json();
    const reason = getReportReason(body.reason);

    if (!reason) {
      return NextResponse.json({ error: "Choose a valid report reason." }, { status: 400 });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        slug: true,
      },
    });
    const seed = CAMPAIGN_SEEDS[slug];

    if (!campaign && !seed) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { id?: string; email?: string | null } | undefined;
    const userId = sessionUser?.id;
    const reporterEmail =
      sessionUser?.email || getTrimmedString(body.reporterEmail, 160) || null;
    const reportId = crypto.randomUUID();
    const campaignSlug = campaign?.slug || seed?.slug || slug;
    const campaignTitle =
      campaign?.title || seed?.title || getTrimmedString(body.campaignTitle, 180) || "Untitled campaign";
    const details = getTrimmedString(body.details, 800) || null;

    await prisma.$executeRaw`
      INSERT INTO "CampaignReport" (
        "id",
        "campaignSlug",
        "campaignTitle",
        "reason",
        "details",
        "status",
        "reporterEmail",
        "reporterUserId",
        "campaignId",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${reportId},
        ${campaignSlug},
        ${campaignTitle},
        ${reason},
        ${details},
        ${"open"},
        ${reporterEmail},
        ${userId || null},
        ${campaign?.id || null},
        NOW(),
        NOW()
      )
    `;

    return NextResponse.json({
      success: true,
      report: {
        id: reportId,
        status: "open",
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error("Create campaign report error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
