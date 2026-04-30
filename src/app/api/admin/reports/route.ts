import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const REASON_LABELS: Record<string, string> = {
  fake: "Fake campaign",
  misleading: "Misleading information",
  prohibited: "Prohibited content",
  "suspicious-payment": "Suspicious payment activity",
  other: "Other",
};

type CampaignReportRow = {
  id: string;
  campaignSlug: string;
  campaignTitle: string;
  reason: string;
  details: string | null;
  status: string;
  reporterEmail: string | null;
  createdAt: Date;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load campaign reports.";
}

export async function GET() {
  try {
    const reports = await prisma.$queryRaw<CampaignReportRow[]>`
      SELECT
        "id",
        "campaignSlug",
        "campaignTitle",
        "reason",
        "details",
        "status",
        "reporterEmail",
        "createdAt"
      FROM "CampaignReport"
      ORDER BY "createdAt" DESC
      LIMIT 50
    `;

    const countRows = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM "CampaignReport"
      WHERE "status" = ${"open"}
    `;
    const openCount = Number(countRows[0]?.count || 0);

    return NextResponse.json({
      success: true,
      openCount,
      reports: reports.map((report) => ({
        ...report,
        createdAt: report.createdAt.toISOString(),
        reasonLabel: REASON_LABELS[report.reason] || report.reason,
      })),
    });
  } catch (error: unknown) {
    console.error("List campaign reports error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
