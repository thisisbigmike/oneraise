import React from 'react';
import Link from 'next/link';
import { getCampaignPct } from '@/lib/campaign-seeds';
import { getCachedCampaignsList } from '@/lib/campaigns-data';
import CampaignCard from '@/components/ui/CampaignCard';

type CampaignCardType = {
  id: number;
  slug: string;
  title: string;
  creator: string;
  raised: number;
  goal: number;
  pct?: number;
  category: string;
  desc: string;
  status?: string;
};

export default async function DiscoverPage() {
  const allCampaigns = await getCachedCampaignsList();
  const campaigns = allCampaigns.filter((campaign) => campaign.status !== 'draft');

  return (
    <div className="overview-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Discover Campaigns</h1>
          <div className="page-sub">Find and support projects that matter to you.</div>
        </div>
      </div>

      <div className="campaign-grid">
        {campaigns.map(c => {
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
