import React from 'react';
import Link from 'next/link';
import { getCampaignPct } from '@/lib/campaign-seeds';
import { getCachedCampaignsList } from '@/lib/campaigns-data';

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
            <div key={c.slug || c.id} className="campaign-card" style={{ display: 'flex', flexDirection: 'column', padding: 24 }}>
              <div className="cmp-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="cmp-category" style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal-400)' }}>{c.category}</span>
                <span className={`cmp-status ${c.status || 'active'}`} style={{ fontSize: 12, fontWeight: 600, color: c.status === 'draft' ? 'var(--w50)' : 'var(--teal-200)', background: c.status === 'draft' ? 'rgba(255,255,255,0.05)' : 'rgba(29,158,117,0.1)', padding: '4px 10px', borderRadius: 99 }}>
                  {c.status === 'draft' ? 'Draft' : '● Live'}
                </span>
              </div>
              <h3 className="cmp-title" style={{ marginTop: 12, marginBottom: 4 }}>{c.title}</h3>
              <div className="s-hint" style={{ marginBottom: 12 }}>by {c.creator}</div>

              <p style={{ color: 'var(--w50)', fontSize: 14, lineHeight: 1.5, marginBottom: 20, flex: 1 }}>
                {c.desc}
              </p>

              <div className="cmp-progress-wrap" style={{ marginBottom: 16 }}>
                <div className="sc-progress-bar"><div className="sc-progress-fill" style={{ width: `${pct}%` }}></div></div>
                <div className="cmp-progress-nums" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--white)', marginTop: 8 }}>
                  <span>${c.raised.toLocaleString()} raised</span>
                  <span style={{ fontWeight: 600, color: 'var(--teal-200)' }}>{pct}%</span>
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
