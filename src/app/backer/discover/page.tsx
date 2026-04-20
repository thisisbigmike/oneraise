'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CAMPAIGN_SEED_LIST, getCampaignPct } from '@/lib/campaign-seeds';

type CampaignCard = {
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

const INITIAL_CAMPAIGNS: CampaignCard[] = CAMPAIGN_SEED_LIST.map((campaign) => ({
  ...campaign,
  pct: getCampaignPct(campaign.raised, campaign.goal),
}));

export default function DiscoverPage() {
  const [campaigns, setCampaigns] = useState<CampaignCard[]>(INITIAL_CAMPAIGNS);

  useEffect(() => {
    let ignore = false;

    const loadCampaigns = async () => {
      try {
        const res = await fetch('/api/campaigns', { cache: 'no-store' });
        const data = await res.json();

        if (!ignore && res.ok && Array.isArray(data.campaigns)) {
          setCampaigns(data.campaigns.filter((campaign: CampaignCard) => campaign.status !== 'draft'));
        }
      } catch {
        // Keep the seeded campaign list if live data is temporarily unavailable.
      }
    };

    loadCampaigns();

    return () => {
      ignore = true;
    };
  }, []);

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
            <div key={c.slug || c.id} className="campaign-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="cmp-header">
                <span className="cmp-category">{c.category}</span>
                <span className={`cmp-status ${c.status || 'active'}`}>{c.status === 'draft' ? 'Draft' : '● Live'}</span>
              </div>
              <h3 className="cmp-title" style={{ marginTop: 12, marginBottom: 4 }}>{c.title}</h3>
              <div className="s-hint" style={{ marginBottom: 12 }}>by {c.creator}</div>

              <p style={{ color: 'var(--w50)', fontSize: 14, lineHeight: 1.5, marginBottom: 20, flex: 1 }}>
                {c.desc}
              </p>

              <div className="cmp-progress-wrap" style={{ marginBottom: 16 }}>
                <div className="sc-progress-bar"><div className="sc-progress-fill" style={{ width: `${pct}%` }}></div></div>
                <div className="cmp-progress-nums">
                  <span>${c.raised.toLocaleString()} raised</span>
                  <span>{pct}%</span>
                </div>
              </div>

              <Link href={`/backer/donate/${c.slug || c.id}`} className="btn-primary" style={{ width: '100%', textAlign: 'center', justifyContent: 'center', display: 'flex', textDecoration: 'none' }}>
                Support this campaign
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
