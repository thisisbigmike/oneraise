import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getStoredDonationCreditUsd } from '@/lib/currency';
import { getUserBadges } from '@/lib/badges';

type SessionUser = {
  id?: string;
};

function formatCurrency(value: number) {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(value);
}

function getProviderLabel(provider: string, asset?: string | null) {
  if (provider === 'moonpay') return 'MoonPay (Card)';
  if (provider.startsWith('busha_crypto')) return `Busha (${asset || 'Crypto'})`;
  if (provider.startsWith('busha_ng')) return 'Busha (NGN transfer)';
  if (provider.startsWith('busha_ke')) return 'Busha (M-Pesa)';
  return provider;
}

export default async function BackerDonations() {
  const session = await getServerSession(authOptions);
  const sessionUser = (session?.user as SessionUser | undefined) ?? {};
  const userId = sessionUser.id;

  if (!userId) {
    redirect('/auth?mode=signin');
  }

  const donations = await prisma.donation.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      campaign: {
        include: {
          user: {
            select: { name: true },
          },
        },
      },
    },
  });

  const completed = donations.filter((donation) => donation.status === 'completed');
  const pending = donations.filter((donation) => donation.status === 'pending');
  const totalContributions = completed.reduce(
    (sum, donation) => sum + getStoredDonationCreditUsd(donation),
    0,
  );
  const supportedCampaigns = new Set(completed.map((donation) => donation.campaignId)).size;
  const categoryCounts = completed.reduce<Record<string, number>>((counts, donation) => {
    const category = donation.campaign.category || 'Community';
    counts[category] = (counts[category] || 0) + 1;
    return counts;
  }, {});
  const favoriteCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None yet';

  // Donation-month streak: consecutive calendar months ending this month.
  const donationMonths = new Set(
    completed.map((donation) => {
      const date = donation.createdAt;
      return date.getFullYear() * 12 + date.getMonth();
    }),
  );
  const thisMonthOrdinal = new Date().getFullYear() * 12 + new Date().getMonth();
  let streakMonths = 0;
  while (donationMonths.has(thisMonthOrdinal - streakMonths)) {
    streakMonths += 1;
  }

  // F3: earned badges. F2: impact timeline (milestone/release/refund events).
  const [badges, impact] = await Promise.all([
    getUserBadges(userId),
    prisma.notification.findMany({
      where: { userId, type: { in: ['milestone', 'release', 'refund'] } },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
  ]);

  const impactDateFmt = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="overview-page" style={{ padding: '32px 40px' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 className="page-title">My Donations</h1>
          <div className="page-sub">Manage and track all the campaigns you have supported.</div>
        </div>
        <div className="header-actions">
          <Link href="/backer/discover" className="btn-primary">Find more campaigns</Link>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 40 }}>
        <div className="stat-card">
          <div className="sc-label">Total Contributions</div>
          <div className="sc-value" style={{ fontSize: 28, marginTop: 8 }}>{formatCurrency(totalContributions)}</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">Campaigns Supported</div>
          <div className="sc-value" style={{ fontSize: 28, marginTop: 8 }}>{supportedCampaigns}</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">Pending Verifications</div>
          <div className="sc-value" style={{ fontSize: 28, marginTop: 8, color: 'var(--amber)' }}>{pending.length}</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">Favorite Category</div>
          <div className="sc-value" style={{ fontSize: 24, marginTop: 8, color: 'var(--teal-200)' }}>{favoriteCategory}</div>
        </div>
      </div>

      <div className="content-card" style={{ marginBottom: 24 }}>
        <div className="cc-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="cc-title">Your Badges</div>
          {streakMonths > 0 && (
            <span className="st-badge st-ok" style={{ fontSize: 13 }}>
              🔥 {streakMonths}-month streak
            </span>
          )}
        </div>
        {badges.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
            {badges.map((badge) => (
              <div
                key={badge.id}
                title={badge.description}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: 'rgba(29,158,117,0.10)',
                  border: '1px solid rgba(29,158,117,0.25)',
                }}
              >
                <span style={{ fontSize: 22 }}>{badge.emoji}</span>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--white)', fontSize: 14 }}>{badge.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--w50)' }}>{badge.description}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '16px 0', color: 'var(--w50)' }}>
            Make a donation to earn your first badge. 🌱
          </div>
        )}
      </div>

      <div className="content-card" style={{ marginBottom: 24 }}>
        <div className="cc-header">
          <div className="cc-title">Impact Timeline</div>
          <div className="sc-sub">Milestones verified and funds released on campaigns you backed.</div>
        </div>
        {impact.length > 0 ? (
          <div className="notif-list" style={{ marginTop: 8 }}>
            {impact.map((event) => (
              <div key={event.id} className="notif-item">
                <div
                  className="notif-icon"
                  style={{
                    background: event.type === 'refund' ? 'rgba(239,159,39,0.15)' : 'rgba(29,158,117,0.15)',
                    color: event.type === 'refund' ? 'var(--amber)' : 'var(--teal-200)',
                  }}
                >
                  {event.type === 'refund' ? '↩' : '✓'}
                </div>
                <div className="notif-info">
                  <div className="notif-title">{event.title}</div>
                  <div className="notif-desc">{event.body}</div>
                </div>
                <div className="notif-meta">
                  <div className="notif-time">{impactDateFmt.format(event.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '16px 0', color: 'var(--w50)' }}>
            No impact updates yet. You will see milestone and release events here.
          </div>
        )}
      </div>

      <div className="content-card">
        <div className="cc-header">
          <div className="cc-title">Donation History</div>
        </div>
        <div className="txn-table-wrap">
          <table className="txn-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Campaign</th>
                <th>Date</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {donations.map((donation) => {
                const amount = getStoredDonationCreditUsd(donation);
                const creator = donation.campaign.user?.name || 'OneRaise Creator';

                return (
                  <tr key={donation.id}>
                    <td style={{ fontFamily: 'monospace', color: 'var(--w50)' }}>
                      {donation.paymentId || donation.id.slice(0, 10)}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--white)' }}>{donation.campaign.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--w50)' }}>by {creator}</div>
                    </td>
                    <td style={{ color: 'var(--w50)' }}>{formatDate(donation.createdAt)}</td>
                    <td><div className="s-hint">{getProviderLabel(donation.provider, donation.asset)}</div></td>
                    <td style={{ fontWeight: 600, color: 'var(--teal-200)' }}>{formatCurrency(amount)}</td>
                    <td>
                      {donation.status === 'completed' && <span className="st-badge st-ok">Completed</span>}
                      {donation.status === 'pending' && <span className="st-badge st-pend">Pending</span>}
                      {donation.status === 'failed' && <span className="st-badge st-bad">Failed</span>}
                    </td>
                  </tr>
                );
              })}
              {donations.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--w50)' }}>
                    No donations yet. Discover a campaign to support.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
