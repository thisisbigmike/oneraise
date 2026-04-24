'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { CAMPAIGN_SEED_LIST, getCampaignPct } from '@/lib/campaign-seeds';

type SupportedCampaign = {
  id: number;
  slug: string;
  title: string;
  creator: string;
  raised: number;
  goal: number;
  pct?: number;
};

const INITIAL_SUPPORTED: SupportedCampaign[] = CAMPAIGN_SEED_LIST.slice(0, 2).map((campaign) => ({
  ...campaign,
  pct: getCampaignPct(campaign.raised, campaign.goal),
}));

export default function BackerOverview() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(' ')[0] || 'Backer';
  const [supportedCampaigns, setSupportedCampaigns] = useState(INITIAL_SUPPORTED);

  useEffect(() => {
    let ignore = false;

    const loadCampaigns = async () => {
      try {
        const res = await fetch('/api/campaigns', { cache: 'no-store' });
        const data = await res.json();

        if (!ignore && res.ok && Array.isArray(data.campaigns)) {
          setSupportedCampaigns(
            data.campaigns
              .filter((campaign: SupportedCampaign & { status?: string }) => campaign.status !== 'draft')
              .slice(0, 2)
              .map((campaign: SupportedCampaign) => campaign),
          );
        }
      } catch {
        // Keep the seeded campaign cards if live data is temporarily unavailable.
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
          <h1 className="page-title">Welcome back, {firstName}.</h1>
          <div className="page-sub">You're making a difference. Here's your impact so far.</div>
        </div>
        <div className="header-actions">
          <Link href="/backer/discover" className="btn-primary">Browse campaigns</Link>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="sc-label">Total Donated</div>
          <div className="sc-value" style={{ fontSize: 28, marginTop: 8, color: 'var(--teal-200)' }}>$1,275</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">Campaigns Supported</div>
          <div className="sc-value" style={{ fontSize: 28, marginTop: 8 }}>8</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">Impact Score</div>
          <div className="sc-value" style={{ fontSize: 28, marginTop: 8, color: 'var(--amber)' }}>Top 5%</div>
        </div>
      </div>

      <div className="content-grid">
        <div className="content-card">
          <div className="cc-header">
            <div className="cc-title">Live Campaigns</div>
          </div>
          <div className="campaign-grid" style={{ gridTemplateColumns: '1fr', gap: 16 }}>
            {supportedCampaigns.map((c) => {
              const pct = c.pct ?? getCampaignPct(c.raised, c.goal);

              return (
              <div key={c.slug || c.id} className="campaign-card" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 className="cmp-title" style={{ fontSize: 16, marginBottom: 4 }}>{c.title}</h3>
                    <div className="s-hint">by {c.creator}</div>
                  </div>
                  <div style={{ background: 'rgba(29,158,117,0.1)', color: 'var(--teal-200)', padding: '4px 10px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                    ${c.goal.toLocaleString()} goal
                  </div>
                </div>
                <div className="cmp-progress-wrap" style={{ marginTop: 8 }}>
                  <div className="sc-progress-bar"><div className="sc-progress-fill" style={{ width: `${pct}%` }}></div></div>
                  <div className="cmp-progress-nums" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--white)', marginTop: 8 }}>
                    <span>Funding progress</span>
                    <span style={{ fontWeight: 600, color: 'var(--teal-200)' }}>{pct}%</span>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>

        <div className="content-side">
          <div className="content-card">
            <div className="cc-header">
              <div className="cc-title">Recent Updates</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { camp: 'SolarPack Mini', date: '2 days ago', msg: 'We just secured a new manufacturing partner in Lagos! This means faster delivery relative to...' },
                { camp: 'CodeBridge', date: '1 week ago', msg: 'The first cohort of 50 students has officially graduated. Thank you to all our backers!' }
              ].map((u, i) => (
                <div key={i} style={{ borderBottom: i === 0 ? '1px solid rgba(245,250,247,0.06)' : 'none', paddingBottom: i === 0 ? 16 : 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{u.camp}</div>
                  <div className="s-hint" style={{ fontSize: 12, marginBottom: 8 }}>{u.date}</div>
                  <div style={{ fontSize: 14, color: 'var(--w50)', lineHeight: 1.5 }}>"{u.msg}"</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
