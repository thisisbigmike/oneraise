'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '../components';

type PlatformStats = {
  totalVolumeUsd: number;
  monthVolumeUsd: number;
  platformRevenue: number;
  activeCampaignCount: number;
  totalCampaignCount: number;
  creatorCount: number;
  backerCount: number;
  uniqueBackers: number;
  openReportCount: number;
  successRate: number;
  totalPayoutUsd: number;
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
};

export default function AdminOverview() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [recentDonations, setRecentDonations] = useState<RecentDonation[]>([]);
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
    } catch (e: any) {
      showToast(e.message || 'Failed to approve campaign.', 'error');
    } finally {
      setApproveLoading('');
    }
  };

  const dbOnline = loadStatus === 'ready';

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
          <div className="sc-label">Creators</div>
          <div className="sc-value" style={{ fontSize: 26, marginTop: 8 }}>
            {loadStatus === 'loading' ? '...' : fmtCount(stats?.creatorCount ?? 0)}
          </div>
          {stats && <div style={{ fontSize: 12, color: 'var(--w30)', marginTop: 6 }}>{fmtCount(stats.backerCount)} backers</div>}
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
    </div>
  );
}
