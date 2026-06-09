import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rankCampaignsForDiscovery } from "@/lib/campaign-recommendations";
import { getCachedPublicCampaignsList } from "@/lib/campaigns-data";
import { getBackerRecommendationContext } from "@/lib/discovery-preferences";

type SessionUser = {
  id?: string | null;
};

function getSessionUser(session: unknown): SessionUser {
  if (!session || typeof session !== "object" || !("user" in session)) return {};
  return ((session as { user?: unknown }).user as SessionUser | undefined) ?? {};
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 12), 1), 50);
    const includeEnded = searchParams.get("includeEnded") === "true";
    const session = await getServerSession(authOptions);
    const userId = getSessionUser(session).id ?? null;
    const context = await getBackerRecommendationContext(userId);
    const campaigns = await getCachedPublicCampaignsList();
    const recommendations = rankCampaignsForDiscovery(
      campaigns,
      { ...context, query },
      { includeEnded, limit },
    );

    return NextResponse.json({
      success: true,
      recommendations: recommendations.map((recommendation) => ({
        ...recommendation.campaign,
        recommendation: {
          score: recommendation.score,
          label: recommendation.label,
          reasons: recommendation.reasons,
          factors: recommendation.factors,
        },
      })),
    });
  } catch (error) {
    console.error("recommended campaigns error", error);
    return NextResponse.json({ error: "Unable to load campaign recommendations." }, { status: 500 });
  }
}

