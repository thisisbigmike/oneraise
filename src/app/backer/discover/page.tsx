import React from 'react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { getCampaignPct } from '@/lib/campaign-seeds';
import { authOptions } from '@/lib/auth';
import { rankCampaignsForDiscovery } from '@/lib/campaign-recommendations';
import { getCachedPublicCampaignsList } from '@/lib/campaigns-data';
import { getBackerRecommendationContext } from '@/lib/discovery-preferences';
import CampaignCard from '@/components/ui/CampaignCard';

type SessionUser = {
  id?: string | null;
};

function getSessionUser(session: unknown): SessionUser {
  if (!session || typeof session !== 'object' || !('user' in session)) return {};
  return ((session as { user?: unknown }).user as SessionUser | undefined) ?? {};
}

export default async function DiscoverPage() {
  const session = await getServerSession(authOptions);
  const userId = getSessionUser(session).id ?? null;
  const [allCampaigns, recommendationContext] = await Promise.all([
    getCachedPublicCampaignsList(),
    getBackerRecommendationContext(userId),
  ]);
  const campaigns = allCampaigns.filter(
    (campaign) => campaign.status === 'active' && !campaign.isEnded,
  );
  const recommendations = rankCampaignsForDiscovery(campaigns, recommendationContext);

  return (
    <div className="overview-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Discover Campaigns</h1>
          <div className="page-sub">Find and support projects that matter to you.</div>
        </div>
      </div>

      <div className="campaign-grid">
        {recommendations.map(({ campaign: c }) => {
          const pct = c.pct ?? getCampaignPct(c.raised, c.goal);

          return (
            <CampaignCard
              key={c.slug || c.id}
              title={c.title}
              goal={c.goal}
              raised={c.raised}
              backers={c.backers || 0}
              daysLeft={c.daysLeft || 0}
              status={c.status || 'active'}
              category={c.category}
              image={c.image}
              pct={pct}
              creator={c.creator}
              creatorInitials={c.creatorInitials}
              creatorImage={c.creatorImage}
              actions={
                <Link href={`/backer/donate/${c.slug || c.id}`} className="ucc-btn ucc-btn-primary">
                  Support this campaign
                </Link>
              }
            />
          );
        })}
      </div>
    </div>
  );
}
