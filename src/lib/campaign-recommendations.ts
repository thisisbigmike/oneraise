import type { CampaignListItem, CampaignMilestoneItem } from "@/lib/campaigns-data";

type DiscoveryCampaign = Pick<
  CampaignListItem,
  | "id"
  | "dbId"
  | "slug"
  | "title"
  | "creator"
  | "raised"
  | "goal"
  | "pct"
  | "category"
  | "desc"
  | "backers"
  | "daysLeft"
  | "isEnded"
  | "verified"
  | "status"
  | "type"
  | "protectStatus"
> & {
  image?: string | null;
  milestones?: CampaignMilestoneItem[];
};

export type RecommendationContext = {
  query?: string;
  preferredCategories?: string[];
  supportedCampaignIds?: string[];
  savedCampaignIds?: string[];
};

export type DiscoveryRecommendation<TCampaign extends DiscoveryCampaign = DiscoveryCampaign> = {
  campaign: TCampaign;
  score: number;
  label: "Recommended" | "Trending" | "Trusted" | "New" | "Ending soon" | "Funded";
  reasons: string[];
  factors: {
    relevance: number;
    affinity: number;
    momentum: number;
    trust: number;
    urgency: number;
    completeness: number;
    penalty: number;
  };
};

const PROTECTED_TYPES = new Set(["protected_crowdfunding", "emergency_aid", "grant_distribution"]);

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function normalize(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function tokenize(value?: string) {
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2)
    .slice(0, 8);
}

function unique(values?: string[]) {
  return Array.from(new Set((values || []).map(normalize).filter(Boolean)));
}

function getRelevanceScore(campaign: DiscoveryCampaign, query?: string) {
  const q = normalize(query);
  if (!q) return { score: 0, reasons: [] as string[] };

  const title = normalize(campaign.title);
  const desc = normalize(campaign.desc);
  const category = normalize(campaign.category);
  const creator = normalize(campaign.creator);
  const tokens = tokenize(q);
  let score = 0;

  if (title.includes(q)) score += 34;
  if (category.includes(q)) score += 24;
  if (desc.includes(q)) score += 14;
  if (creator.includes(q)) score += 8;

  for (const token of tokens) {
    if (title.includes(token)) score += 5;
    if (category.includes(token)) score += 4;
    if (desc.includes(token)) score += 2;
  }

  return {
    score: clamp(score, 0, 42),
    reasons: score > 0 ? ["Matches your search"] : [],
  };
}

function getAffinityScore(campaign: DiscoveryCampaign, context: RecommendationContext) {
  const preferredCategories = unique(context.preferredCategories);
  const supportedCampaignIds = new Set(context.supportedCampaignIds || []);
  const savedCampaignIds = new Set(context.savedCampaignIds || []);
  const campaignKey = campaign.dbId || campaign.slug || String(campaign.id);
  let score = 0;
  const reasons: string[] = [];

  if (preferredCategories.includes(normalize(campaign.category))) {
    score += 20;
    reasons.push("Similar to campaigns you supported");
  }
  if (savedCampaignIds.has(campaignKey)) {
    score += 10;
    reasons.push("Saved by you");
  }
  if (supportedCampaignIds.has(campaignKey)) {
    score -= 16;
  }

  return { score, reasons };
}

function getMomentumScore(campaign: DiscoveryCampaign) {
  const pct = Number.isFinite(campaign.pct)
    ? campaign.pct
    : campaign.goal > 0
      ? Math.round((campaign.raised / campaign.goal) * 100)
      : 0;
  const progressScore = clamp(pct, 0, 100) * 0.22;
  const backerScore = clamp(Math.log10((campaign.backers || 0) + 1) * 9, 0, 18);
  const raisedScore = clamp(Math.log10((campaign.raised || 0) + 1) * 3, 0, 12);
  const score = progressScore + backerScore + raisedScore;
  const reasons: string[] = [];

  if (pct >= 70) reasons.push("Strong funding momentum");
  else if ((campaign.backers || 0) >= 10) reasons.push("Backers are already joining");

  return { score, reasons };
}

function getTrustScore(campaign: DiscoveryCampaign) {
  let score = 0;
  const reasons: string[] = [];

  if (campaign.verified) {
    score += 16;
    reasons.push("Verified creator");
  }

  if (PROTECTED_TYPES.has(campaign.type)) {
    score += 7;
    reasons.push("Protected campaign");
  }

  const milestones = campaign.milestones || [];
  if (milestones.some((milestone) => milestone.status === "approved")) score += 7;
  else if (milestones.some((milestone) => milestone.status === "submitted")) score += 4;

  if (campaign.protectStatus === "unlocked") score += 4;
  if (campaign.protectStatus === "refunded") score -= 10;

  return { score, reasons };
}

function getUrgencyScore(campaign: DiscoveryCampaign) {
  if (campaign.isEnded || campaign.status === "completed") return { score: -16, reasons: [] as string[] };
  if (campaign.daysLeft <= 0) return { score: -8, reasons: [] as string[] };
  if (campaign.daysLeft <= 7 && campaign.pct >= 45) return { score: 12, reasons: ["Ending soon"] };
  if (campaign.daysLeft <= 14 && campaign.pct >= 55) return { score: 7, reasons: ["Close to deadline"] };
  return { score: 0, reasons: [] as string[] };
}

function getCompletenessScore(campaign: DiscoveryCampaign) {
  let score = 0;
  const reasons: string[] = [];
  const descLength = normalize(campaign.desc).length;

  if (campaign.image) score += 6;
  if (descLength >= 120) score += 7;
  else if (descLength >= 50) score += 4;
  if (campaign.goal > 0) score += 3;

  if (score >= 12) reasons.push("Complete campaign profile");
  return { score, reasons };
}

function getPenalty(campaign: DiscoveryCampaign) {
  let penalty = 0;

  if (!campaign.image) penalty += 4;
  if (!normalize(campaign.desc)) penalty += 6;
  if (campaign.status !== "active" && campaign.status !== "completed") penalty += 30;
  if (campaign.isEnded || campaign.status === "completed") penalty += 22;

  return penalty;
}

function getLabel(campaign: DiscoveryCampaign, score: number): DiscoveryRecommendation["label"] {
  if (campaign.isEnded || campaign.status === "completed") return "Funded";
  if (campaign.daysLeft <= 7 && campaign.pct >= 45) return "Ending soon";
  if (campaign.verified && score >= 70) return "Trusted";
  if (campaign.backers >= 10 || campaign.pct >= 55) return "Trending";
  return "Recommended";
}

export function scoreCampaignForDiscovery<TCampaign extends DiscoveryCampaign>(
  campaign: TCampaign,
  context: RecommendationContext = {},
): DiscoveryRecommendation<TCampaign> {
  const relevance = getRelevanceScore(campaign, context.query);
  const affinity = getAffinityScore(campaign, context);
  const momentum = getMomentumScore(campaign);
  const trust = getTrustScore(campaign);
  const urgency = getUrgencyScore(campaign);
  const completeness = getCompletenessScore(campaign);
  const penalty = getPenalty(campaign);
  const score = Math.round(
    relevance.score +
      affinity.score +
      momentum.score +
      trust.score +
      urgency.score +
      completeness.score -
      penalty,
  );
  const reasons = [
    ...relevance.reasons,
    ...affinity.reasons,
    ...momentum.reasons,
    ...trust.reasons,
    ...urgency.reasons,
    ...completeness.reasons,
  ].slice(0, 3);

  return {
    campaign,
    score,
    label: getLabel(campaign, score),
    reasons: reasons.length ? reasons : ["Good fit for discovery"],
    factors: {
      relevance: relevance.score,
      affinity: affinity.score,
      momentum: momentum.score,
      trust: trust.score,
      urgency: urgency.score,
      completeness: completeness.score,
      penalty,
    },
  };
}

export function rankCampaignsForDiscovery<TCampaign extends DiscoveryCampaign>(
  campaigns: TCampaign[],
  context: RecommendationContext = {},
  options: { includeEnded?: boolean; limit?: number } = {},
) {
  const ranked = campaigns
    .filter((campaign) => options.includeEnded || (!campaign.isEnded && campaign.status !== "completed"))
    .map((campaign) => scoreCampaignForDiscovery(campaign, context))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.campaign.backers !== a.campaign.backers) return b.campaign.backers - a.campaign.backers;
      if (b.campaign.raised !== a.campaign.raised) return b.campaign.raised - a.campaign.raised;
      return a.campaign.title.localeCompare(b.campaign.title);
    });

  return typeof options.limit === "number" ? ranked.slice(0, options.limit) : ranked;
}

