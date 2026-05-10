import React from 'react';
import Link from 'next/link';
import { getCampaignPct } from '@/lib/campaign-seeds';
import { getCachedPublicCampaignsList } from '@/lib/campaigns-data';
import CampaignCard from '@/components/ui/CampaignCard';

export default async function DiscoverPage() {
  const campaigns = await getCachedPublicCampaignsList();

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
