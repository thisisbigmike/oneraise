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

  // Fetch real milestones from supported campaigns
  const recentUpdates = supportedCampaignIds.size > 0
    ? await prisma.milestone.findMany({
        where: {
          campaignId: { in: Array.from(supportedCampaignIds) },
          status: 'completed'
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: { campaign: { select: { title: true } } }
      })
    : [];

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
          <div className="cc-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="cc-title">Live Campaigns</div>
            <Link href="/backer/discover" className="cc-link" style={{ fontSize: 13, color: 'var(--teal-200)', textDecoration: 'none', fontWeight: 500 }}>See all</Link>
          </div>
          <div className="campaign-grid" style={{ gridTemplateColumns: '1fr', gap: 16 }}>
            {liveCampaigns.map((c) => (
              <Link key={c.slug} href={`/backer/donate/${c.slug}`} className="campaign-card" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 24, textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
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
              </Link>
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
              {recentUpdates.length > 0 ? (
                recentUpdates.map((u, i) => (
                  <div key={u.id} style={{ borderBottom: i < recentUpdates.length - 1 ? '1px solid rgba(245,250,247,0.06)' : 'none', paddingBottom: i < recentUpdates.length - 1 ? 16 : 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{u.campaign.title}</div>
                    <div className="s-hint" style={{ fontSize: 12, marginBottom: 8 }}>
                      {new Date(u.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                    <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--white)', marginBottom: 4 }}>{u.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--w50)', lineHeight: 1.5 }}>{u.description}</div>
                  </div>
                ))
              ) : (
                <div className="s-hint" style={{ fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                  No updates from your campaigns yet. When creators post milestones, they will appear here.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
}
