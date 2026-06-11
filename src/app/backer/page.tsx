import React from 'react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getStoredDonationCreditUsd } from '@/lib/currency';
import { getCachedPublicCampaignsList, type CampaignListItem } from '@/lib/campaigns-data';
import CampaignCard from '@/components/ui/CampaignCard';

type SessionUser = {
  id?: string | null;
};

type BackerDonation = {
  amount: number;
  currency: string | null;
  coverFee: boolean | null;
  provider: string | null;
  providerDataJson: string | null;
  campaignId: string;
};

type RecentUpdate = {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  campaign: {
    title: string;
  };
};

export default async function BackerOverview() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as SessionUser | undefined)?.id;
  const firstName = session?.user?.name?.split(' ')[0] || 'Backer';

  let userDonations: BackerDonation[] = [];
  let recentUpdates: RecentUpdate[] = [];
  let allCampaigns: CampaignListItem[] = [];

  try {
    // Fetch real statistics for the logged-in user
    userDonations = userId 
      ? await prisma.donation.findMany({
          where: { userId, status: 'completed' },
          select: { amount: true, currency: true, coverFee: true, provider: true, providerDataJson: true, campaignId: true }
        })
      : [];

    const supportedCampaignIds = new Set(userDonations.map(d => d.campaignId));

    // Fetch real milestones from supported campaigns
    recentUpdates = supportedCampaignIds.size > 0
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

    // Fetch live campaigns for the "Discover" section
    allCampaigns = await getCachedPublicCampaignsList();
  } catch (error) {
    console.error('Database connection error in BackerOverview:', error);
    // Fallback data remains empty arrays from initialization
  }

  const totalDonated = userDonations.reduce((sum, d) => sum + getStoredDonationCreditUsd(d), 0);
  const supportedCampaignIds = new Set(userDonations.map(d => d.campaignId));
  const campaignsSupportedCount = supportedCampaignIds.size;
  const impactScore = campaignsSupportedCount > 5 ? 'Top 5%' : campaignsSupportedCount > 2 ? 'Top 15%' : 'Rising Star';

  const liveCampaigns = allCampaigns
    .filter(c => c.status === 'active' && !c.isEnded)
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
          <div className="sc-top">
            <div className="sc-label">Impact Score</div>
            <div className="sc-icon impact-score-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3l2.4 5.1 5.6.7-4.1 3.9 1 5.5L12 15.5 7.1 18.2l1-5.5L4 8.8l5.6-.7L12 3z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path d="M19 3v4M21 5h-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </div>
          </div>
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
              <div key={c.slug} style={{ marginBottom: 16 }}>
                <CampaignCard
                  title={c.title}
                  goal={c.goal}
                  raised={c.raised}
                  backers={c.backers || 0}
                  daysLeft={c.daysLeft || 0}
                  status={c.status || 'active'}
                  category={c.category}
                  image={c.image}
                  pct={c.pct}
                  creator={c.creator}
                  creatorInitials={c.creatorInitials}
                  creatorImage={c.creatorImage}
                  actions={
                    <Link href={`/backer/donate/${c.slug}`} className="ucc-btn ucc-btn-primary">
                      Support Campaign
                    </Link>
                  }
                />
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
