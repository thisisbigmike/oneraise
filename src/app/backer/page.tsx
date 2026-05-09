import React from 'react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getStoredDonationCreditUsd } from '@/lib/currency';
import { getCachedCampaignsList } from '@/lib/campaigns-data';

export default async function BackerOverview() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const firstName = session?.user?.name?.split(' ')[0] || 'Backer';

  // Fetch real statistics for the logged-in user
  const userDonations = userId 
    ? await prisma.donation.findMany({
        where: { userId, status: 'completed' },
        select: { amount: true, currency: true, coverFee: true, provider: true, providerDataJson: true, campaignId: true }
      })
    : [];

  const totalDonated = userDonations.reduce((sum, d) => sum + getStoredDonationCreditUsd(d), 0);
  const supportedCampaignIds = new Set(userDonations.map(d => d.campaignId));
  const campaignsSupportedCount = supportedCampaignIds.size;
  
  // Dynamic impact score logic (placeholder but based on real count)
  const impactScore = campaignsSupportedCount > 5 ? 'Top 5%' : campaignsSupportedCount > 2 ? 'Top 15%' : 'Rising Star';

  // Fetch live campaigns for the "Discover" section of the overview
  const allCampaigns = await getCachedCampaignsList();
  const liveCampaigns = allCampaigns
    .filter(c => c.status === 'active')
    .slice(0, 2);

  return (
    <div className="overview-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {firstName}.</h1>
          <div className="page-sub">You&apos;re making a difference. Here&apos;s your impact so far.</div>
        </div>
        <div className="header-actions">
          <Link href="/backer/discover" className="btn-primary">Browse campaigns</Link>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="sc-label">Total Donated</div>
          <div className="sc-value" style={{ fontSize: 28, marginTop: 8, color: 'var(--teal-200)' }}>
            ${totalDonated.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>
        <div className="stat-card">
          <div className="sc-label">Campaigns Supported</div>
          <div className="sc-value" style={{ fontSize: 28, marginTop: 8 }}>{campaignsSupportedCount}</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">Impact Score</div>
          <div className="sc-value" style={{ fontSize: 28, marginTop: 8, color: 'var(--amber)' }}>{impactScore}</div>
        </div>
      </div>

      <div className="content-grid">
        <div className="content-card">
          <div className="cc-header">
            <div className="cc-title">Live Campaigns</div>
          </div>
          <div className="campaign-grid" style={{ gridTemplateColumns: '1fr', gap: 16 }}>
            {liveCampaigns.map((c) => (
              <div key={c.slug} className="campaign-card" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 24 }}>
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
                  <div className="sc-progress-bar"><div className="sc-progress-fill" style={{ width: `${c.pct}%` }}></div></div>
                  <div className="cmp-progress-nums" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--white)', marginTop: 8 }}>
                    <span>Funding progress</span>
                    <span style={{ fontWeight: 600, color: 'var(--teal-200)' }}>{c.pct}%</span>
                  </div>
                </div>
              </div>
            ))}
            {liveCampaigns.length === 0 && (
              <div className="s-hint" style={{ textAlign: 'center', padding: 20 }}>No live campaigns at the moment.</div>
            )}
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
                  <div style={{ fontSize: 14, color: 'var(--w50)', lineHeight: 1.5 }}>&quot;{u.msg}&quot;</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
