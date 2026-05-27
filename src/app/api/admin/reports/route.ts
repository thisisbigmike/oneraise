import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
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

type SessionUser = {
  role?: string | null;
};

function getSessionUser(session: unknown): SessionUser {
  if (!session || typeof session !== "object" || !("user" in session)) return {};
  return ((session as { user?: unknown }).user as SessionUser | undefined) ?? {};
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load campaign reports.";
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = getSessionUser(session).role;
  return role === "admin";
}

export async function GET(req: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "all";

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
      WHERE (${status} = ${"all"} OR "status" = ${status})
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

export async function PATCH(req: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const { reportId, action } = await req.json();
    if (!reportId || typeof reportId !== "string") {
      return NextResponse.json({ error: "reportId required." }, { status: 400 });
    }

    const nextStatus =
      action === "resolve" ? "resolved"
        : action === "dismiss" ? "dismissed"
          : action === "reopen" ? "open"
            : null;

    if (!nextStatus) {
      return NextResponse.json({ error: "Unsupported report action." }, { status: 400 });
    }

    const report = await prisma.campaignReport.update({
      where: { id: reportId },
      data: { status: nextStatus },
    });

    revalidatePath("/admin/reports");
    revalidatePath("/admin");

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        status: report.status,
      },
    });
  } catch (error: unknown) {
    console.error("Update campaign report error:", error);
    return NextResponse.json({ error: "Unable to update campaign report." }, { status: 500 });
  }
}
