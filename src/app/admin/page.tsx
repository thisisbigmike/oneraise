'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '../components';

type PlatformStats = {
  totalUserCount: number;
  totalVolumeUsd: number;
  monthVolumeUsd: number;
  platformRevenue: number;
  activeCampaignCount: number;
  totalCampaignCount: number;
  campaignStatuses: Record<string, number>;
  userRoles: Record<string, number>;
  verifiedUserCount: number;
  unverifiedUserCount: number;
  pendingKycUserCount: number;
  creatorCount: number;
  backerCount: number;
  creatorsWithCampaigns: number;
  backersWithCompletedDonations: number;
  uniqueBackers: number;
  openReportCount: number;
  pendingDonationCount: number;
  failedDonationCount: number;
  pendingPayoutCount: number;
  pendingPayoutUsd: number;
  successRate: number;
  totalPayoutUsd: number;
  conversion: {
    creatorActivationRate: number;
    backerActivationRate: number;
  };
};

type PendingApproval = {
  id: string;
  title: string;
  slug: string;
  goal: number;
  category: string;
  createdAt: string;
  creatorName: string;
};

type RecentDonation = {
  id: string;
  donorName: string;
  amount: number;
  provider: string;
  campaignTitle: string;
  campaignSlug: string;
  createdAt: string;
};

type MonthlyFunding = {
  key: string;
  label: string;
  volumeUsd: number;
  donationCount: number;
};

type ProviderBreakdown = {
  provider: string;
  volumeUsd: number;
  count: number;
};

type TrendingCampaign = {
  id: string;
  title: string;
  slug: string;
  category: string;
  creatorName: string;
  raised: number;
  goal: number;
  pct: number;
  backers: number;
  createdAt: string;
};

type ActivityItem = {
  id: string;
  type: string;
  title: string;
  desc: string;
  href: string;
  dateIso: string;
};

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const PROVIDER_COLORS: Record<string, string> = {
  stripe: '#635BFF',
  moonpay: '#7B3FE4',
  busha: '#EF9F27',
  solana: '#9945FF',
  jupiter: '#9945FF',
  solana_jupiter: '#9945FF',
  busha_crypto: '#EF9F27',
  busha_ng: '#EF9F27',
  busha_ke: '#EF9F27',
};

export default function AdminOverview() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [recentDonations, setRecentDonations] = useState<RecentDonation[]>([]);
  const [monthlyFunding, setMonthlyFunding] = useState<MonthlyFunding[]>([]);
  const [providerBreakdown, setProviderBreakdown] = useState<ProviderBreakdown[]>([]);
  const [trendingCampaigns, setTrendingCampaigns] = useState<TrendingCampaign[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [approveLoading, setApproveLoading] = useState('');

  const load = async () => {
    try {
      const res = await fetch('/api/admin/stats', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStats(data.stats);
      setPendingApprovals(data.pendingApprovals || []);
      setRecentDonations(data.recentDonations || []);
      setMonthlyFunding(data.monthlyFunding || []);
      setProviderBreakdown(data.providerBreakdown || []);
      setTrendingCampaigns(data.trendingCampaigns || []);
      setActivityFeed(data.activityFeed || []);
      setLoadStatus('ready');
    } catch {
      setLoadStatus('error');
    }
  };

  useEffect(() => { load(); }, []);

  const approveCampaign = async (slug: string) => {
    setApproveLoading(slug);
    try {
      const res = await fetch('/api/admin/campaigns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignSlug: slug, action: 'approve' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Campaign approved and set to live.', 'success');
      await load();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Failed to approve campaign.', 'error');
    } finally {
      setApproveLoading('');
    }
  };

  const dbOnline = loadStatus === 'ready';
  const maxMonthlyVolume = Math.max(1, ...monthlyFunding.map((month) => month.volumeUsd));
  const platformHealthItems = stats
    ? [
        { label: 'Verified users', value: stats.verifiedUserCount.toLocaleString(), note: `${stats.pendingKycUserCount.toLocaleString()} pending KYC` },
        { label: 'Creator activation', value: `${stats.conversion.creatorActivationRate}%`, note: `${stats.creatorsWithCampaigns.toLocaleString()} creators launched campaigns` },
        { label: 'Backer activation', value: `${stats.conversion.backerActivationRate}%`, note: `${stats.backersWithCompletedDonations.toLocaleString()} backers completed donations` },
        { label: 'Pending payouts', value: fmt(stats.pendingPayoutUsd), note: `${stats.pendingPayoutCount.toLocaleString()} payout requests` },
      ]
    : [];

  return (
    <div className="overview-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Overview</h1>
          <div className="page-sub">Live platform metrics, approvals queue, and recent activity.</div>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={load} style={{ padding: '8px 16px', fontSize: 13 }}>
            Refresh
          </button>
          <Link href="/admin/reports" className="btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>
            Reports
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="stat-card">
          <div className="sc-label">Total Volume</div>
          <div className="sc-value" style={{ fontSize: 26, marginTop: 8, color: 'var(--amber)' }}>
            {loadStatus === 'loading' ? '...' : fmt(stats?.totalVolumeUsd ?? 0)}
          </div>
          {stats && <div className="sc-trend positive" style={{ marginTop: 6 }}>{fmt(stats.monthVolumeUsd)} this month</div>}
        </div>
        <div className="stat-card">
          <div className="sc-label">Active Campaigns</div>
          <div className="sc-value" style={{ fontSize: 26, marginTop: 8 }}>
            {loadStatus === 'loading' ? '...' : fmtCount(stats?.activeCampaignCount ?? 0)}
          </div>
          {stats && <div style={{ fontSize: 12, color: 'var(--w30)', marginTop: 6 }}>{fmtCount(stats.totalCampaignCount)} total</div>}
        </div>
        <div className="stat-card">
          <div className="sc-label">Total Users</div>
          <div className="sc-value" style={{ fontSize: 26, marginTop: 8 }}>
            {loadStatus === 'loading' ? '...' : fmtCount(stats?.totalUserCount ?? 0)}
          </div>
          {stats && <div style={{ fontSize: 12, color: 'var(--w30)', marginTop: 6 }}>{fmtCount(stats.creatorCount)} creators · {fmtCount(stats.backerCount)} backers</div>}
        </div>
        <div className="stat-card">
          <div className="sc-label">Platform Revenue (1.5%)</div>
          <div className="sc-value" style={{ fontSize: 26, marginTop: 8, color: 'var(--teal-200)' }}>
            {loadStatus === 'loading' ? '...' : fmt(stats?.platformRevenue ?? 0)}
          </div>
          {stats && <div style={{ fontSize: 12, color: 'var(--w30)', marginTop: 6 }}>{fmt(stats.totalPayoutUsd)} paid out</div>}
        </div>
        <div className="stat-card">
          <div className="sc-label">Open Reports</div>
          <div className="sc-value" style={{ fontSize: 26, marginTop: 8, color: stats?.openReportCount ? 'var(--amber)' : 'inherit' }}>
            {loadStatus === 'loading' ? '...' : stats?.openReportCount ?? 0}
          </div>
          {stats && <div style={{ fontSize: 12, color: 'var(--w30)', marginTop: 6 }}>{stats.successRate}% campaign success rate</div>}
        </div>
      </div>

      {stats && (
        <div className="content-grid" style={{ gridTemplateColumns: 'minmax(0, 1.1fr) minmax(320px, 0.9fr)', marginBottom: 24 }}>
          <div className="content-card">
            <div className="cc-header">
              <div>
                <div className="cc-title">Funding Trend</div>
                <div style={{ color: 'var(--w50)', fontSize: 13, marginTop: 4 }}>Completed donation volume for the last 6 months.</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(monthlyFunding.length, 1)}, minmax(42px, 1fr))`, gap: 12, alignItems: 'end', height: 190 }}>
              {monthlyFunding.map((month) => (
                <div key={month.key} style={{ display: 'grid', gap: 8, alignItems: 'end', height: '100%' }}>
                  <div style={{ alignSelf: 'end', display: 'grid', alignItems: 'end', height: 132 }}>
                    <div
                      title={`${fmt(month.volumeUsd)} · ${month.donationCount} donations`}
                      style={{
                        minHeight: 8,
                        height: `${Math.max(8, Math.round((month.volumeUsd / maxMonthlyVolume) * 132))}px`,
                        borderRadius: '8px 8px 4px 4px',
                        background: 'linear-gradient(180deg, var(--teal-200), rgba(29,158,117,0.5))',
                      }}
                    />
                  </div>
                  <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--w50)' }}>{month.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="content-card">
            <div className="cc-header"><div className="cc-title">Platform Health</div></div>
            <div style={{ display: 'grid', gap: 14 }}>
              {platformHealthItems.map((item) => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, paddingBottom: 14, borderBottom: '1px solid rgba(245,250,247,0.06)' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--w40)', marginTop: 3 }}>{item.note}</div>
                  </div>
                  <div style={{ fontWeight: 800, color: 'var(--teal-200)' }}>{item.value}</div>
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                <Link href="/admin/users" className="btn-secondary" style={{ justifyContent: 'center' }}>Manage users</Link>
                <Link href="/admin/transactions" className="btn-secondary" style={{ justifyContent: 'center' }}>Review payouts</Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="content-grid">
        {/* Pending Approvals */}
        <div className="content-card">
          <div className="cc-header">
            <div className="cc-title">Pending Approvals</div>
            <Link href="/admin/campaigns?status=draft" className="cc-link" style={{ fontSize: 13, color: 'var(--amber)', textDecoration: 'none', fontWeight: 500 }}>
              View all drafts →
            </Link>
          </div>

          {loadStatus === 'loading' && <div style={{ color: 'var(--w50)', fontSize: 14 }}>Loading...</div>}
          {loadStatus === 'error' && <div style={{ color: 'var(--amber)', fontSize: 14 }}>Failed to load.</div>}
          {loadStatus === 'ready' && pendingApprovals.length === 0 && (
            <div style={{ color: 'var(--w50)', fontSize: 14, padding: '12px 0' }}>No draft campaigns pending review.</div>
          )}

          {pendingApprovals.length > 0 && (
            <div className="txn-table-wrap">
              <table className="txn-table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Creator</th>
                    <th>Goal</th>
                    <th>Submitted</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingApprovals.map(row => (
                    <tr key={row.id}>
                      <td style={{ fontWeight: 500 }}>
                        <Link href={`/campaign/${row.slug}`} style={{ color: 'inherit', textDecoration: 'none' }} target="_blank">
                          {row.title}
                        </Link>
                      </td>
                      <td style={{ color: 'var(--w50)' }}>{row.creatorName}</td>
                      <td>${row.goal.toLocaleString()}</td>
                      <td style={{ color: 'var(--w50)', fontSize: 12 }}>{timeAgo(row.createdAt)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="btn-primary"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            disabled={approveLoading === row.slug}
                            onClick={() => approveCampaign(row.slug)}
                          >
                            {approveLoading === row.slug ? '...' : 'Approve'}
                          </button>
                          <Link href={`/admin/campaigns`} className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }}>
                            Review
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="content-side">
          <div className="content-card" style={{ marginBottom: 24 }}>
            <div className="cc-header">
              <div className="cc-title">Operations Queue</div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                { label: 'Draft campaigns', value: stats?.campaignStatuses?.draft ?? 0, href: '/admin/campaigns?status=draft', tone: 'var(--amber)' },
                { label: 'Open reports', value: stats?.openReportCount ?? 0, href: '/admin/reports', tone: 'var(--amber)' },
                { label: 'Pending donations', value: stats?.pendingDonationCount ?? 0, href: '/admin/transactions?type=donations&status=pending', tone: '#85B7EB' },
                { label: 'Failed donations', value: stats?.failedDonationCount ?? 0, href: '/admin/transactions?type=donations&status=failed', tone: '#F09595' },
              ].map((item) => (
                <Link key={item.label} href={item.href} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'inherit', textDecoration: 'none', padding: '10px 12px', border: '1px solid rgba(245,250,247,0.07)', borderRadius: 8 }}>
                  <span style={{ fontSize: 13 }}>{item.label}</span>
                  <strong style={{ color: item.tone }}>{item.value.toLocaleString()}</strong>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Donations */}
          <div className="content-card" style={{ marginBottom: 24 }}>
            <div className="cc-header">
              <div className="cc-title">Recent Donations</div>
              <Link href="/admin/transactions" className="cc-link" style={{ fontSize: 13, color: 'var(--teal-200)', textDecoration: 'none', fontWeight: 500 }}>
                View all →
              </Link>
            </div>
            {recentDonations.length === 0 && loadStatus === 'ready' && (
              <div style={{ color: 'var(--w50)', fontSize: 14 }}>No donations yet.</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentDonations.map((d, i) => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: i < recentDonations.length - 1 ? 12 : 0, borderBottom: i < recentDonations.length - 1 ? '1px solid rgba(245,250,247,0.05)' : 'none' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{d.donorName}</div>
                    <div style={{ fontSize: 12, color: 'var(--w50)', marginTop: 2 }}>{d.campaignTitle}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--teal-200)' }}>${d.amount.toFixed(0)}</div>
                    <div style={{ fontSize: 11, color: PROVIDER_COLORS[d.provider] || 'var(--w30)', marginTop: 2, textTransform: 'uppercase' }}>{d.provider}</div>
                    <div style={{ fontSize: 11, color: 'var(--w30)', marginTop: 1 }}>{timeAgo(d.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="content-card" style={{ marginBottom: 24 }}>
            <div className="cc-header">
              <div className="cc-title">Payment Mix</div>
            </div>
            {providerBreakdown.length === 0 && <div style={{ color: 'var(--w50)', fontSize: 14 }}>No completed payment volume yet.</div>}
            <div style={{ display: 'grid', gap: 12 }}>
              {providerBreakdown.slice(0, 5).map((provider) => (
                <div key={provider.provider}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: PROVIDER_COLORS[provider.provider] || 'var(--w80)', textTransform: 'uppercase', fontWeight: 700 }}>{provider.provider}</span>
                    <span>{fmt(provider.volumeUsd)} · {provider.count}</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(245,250,247,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, Math.round((provider.volumeUsd / Math.max(1, stats?.totalVolumeUsd || 1)) * 100))}%`, height: '100%', background: PROVIDER_COLORS[provider.provider] || 'var(--teal-200)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Status */}
          <div className="content-card">
            <div className="cc-header">
              <div className="cc-title">System Status</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Database', up: dbOnline },
                { label: 'Payments (Stripe / MoonPay)', up: true },
                { label: 'Busha API', up: true },
                { label: 'Solana / Jupiter', up: true },
              ].map((sys) => (
                <div key={sys.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14 }}>{sys.label}</span>
                  <span style={{
                    fontSize: 12, padding: '4px 8px', borderRadius: 4,
                    background: sys.up ? 'rgba(93,202,165,0.12)' : 'rgba(239,159,39,0.12)',
                    color: sys.up ? 'var(--teal-200)' : 'var(--amber)',
                  }}>
                    {sys.up ? 'Operational' : 'Check needed'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="content-grid" style={{ marginTop: 24 }}>
        <div className="content-card">
          <div className="cc-header">
            <div className="cc-title">Trending Active Campaigns</div>
            <Link href="/admin/campaigns?status=active" className="cc-link" style={{ color: 'var(--teal-200)', textDecoration: 'none', fontSize: 13 }}>View active →</Link>
          </div>
          {trendingCampaigns.length === 0 && <div style={{ color: 'var(--w50)', fontSize: 14 }}>No active campaign funding yet.</div>}
          <div style={{ display: 'grid', gap: 12 }}>
            {trendingCampaigns.map((campaign) => (
              <div key={campaign.id} style={{ display: 'grid', gap: 8, paddingBottom: 12, borderBottom: '1px solid rgba(245,250,247,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <div>
                    <Link href={`/campaign/${campaign.slug}`} target="_blank" style={{ color: 'inherit', textDecoration: 'none', fontWeight: 700 }}>{campaign.title}</Link>
                    <div style={{ color: 'var(--w40)', fontSize: 12, marginTop: 3 }}>{campaign.category} · {campaign.creatorName} · {campaign.backers} backers</div>
                  </div>
                  <div style={{ textAlign: 'right', color: 'var(--teal-200)', fontWeight: 800 }}>{fmt(campaign.raised)}</div>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: 'rgba(245,250,247,0.06)', overflow: 'hidden' }}>
                  <div style={{ width: `${campaign.pct}%`, height: '100%', background: 'var(--teal-200)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="content-card">
          <div className="cc-header"><div className="cc-title">Activity Feed</div></div>
          {activityFeed.length === 0 && <div style={{ color: 'var(--w50)', fontSize: 14 }}>No platform activity loaded yet.</div>}
          <div style={{ display: 'grid', gap: 12 }}>
            {activityFeed.map((item) => (
              <Link key={item.id} href={item.href} style={{ display: 'grid', gap: 3, color: 'inherit', textDecoration: 'none', paddingBottom: 12, borderBottom: '1px solid rgba(245,250,247,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <strong style={{ fontSize: 13 }}>{item.title}</strong>
                  <span style={{ fontSize: 11, color: 'var(--w30)' }}>{timeAgo(item.dateIso)}</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--w50)', lineHeight: 1.45 }}>{item.desc}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
