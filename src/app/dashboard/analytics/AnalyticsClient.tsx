'use client';

import React, { useMemo, useState } from 'react';

export type AnalyticsEvent = {
  id: string;
  campaign: string;
  provider: string;
  amountUsd: number;
  status: 'completed' | 'pending' | 'failed';
  dateIso: string;
};

type RangeId = '7d' | '30d' | '90d';

const ranges: { id: RangeId; label: string; days: number }[] = [
  { id: '7d', label: 'Last 7 days', days: 7 },
  { id: '30d', label: 'Last 30 days', days: 30 },
  { id: '90d', label: 'Last 90 days', days: 90 },
];

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const compactUsd = (value: number) => {
  if (value >= 1000) return `$${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return usd.format(value);
};

export default function AnalyticsClient({ events }: { events: AnalyticsEvent[] }) {
  const [range, setRange] = useState<RangeId>('7d');
  const rangeConfig = ranges.find(r => r.id === range) || ranges[0];

  const data = useMemo(() => {
    const now = new Date();
    const since = new Date(now);
    since.setDate(now.getDate() - rangeConfig.days);
    const scoped = events.filter(event => new Date(event.dateIso) >= since);
    const completed = scoped.filter(event => event.status === 'completed');
    const totalRaised = completed.reduce((sum, event) => sum + event.amountUsd, 0);
    const conversionRate = scoped.length ? (completed.length / scoped.length) * 100 : 0;
    const averageDonation = completed.length ? totalRaised / completed.length : 0;

    const bucketCount = 7;
    const bucketSizeMs = (rangeConfig.days * 24 * 60 * 60 * 1000) / bucketCount;
    const buckets = Array.from({ length: bucketCount }, (_, index) => {
      const start = new Date(since.getTime() + index * bucketSizeMs);
      const end = new Date(since.getTime() + (index + 1) * bucketSizeMs);
      const amount = completed
        .filter(event => {
          const date = new Date(event.dateIso);
          return date >= start && date < end;
        })
        .reduce((sum, event) => sum + event.amountUsd, 0);

      return {
        label: start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        amount,
      };
    });

    const campaigns = new Map<string, { campaign: string; donors: number; amount: number }>();
    completed.forEach(event => {
      const current = campaigns.get(event.campaign) || { campaign: event.campaign, donors: 0, amount: 0 };
      current.donors += 1;
      current.amount += event.amountUsd;
      campaigns.set(event.campaign, current);
    });
    const topCampaigns = [...campaigns.values()]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map(item => ({ ...item, pct: totalRaised ? Math.round((item.amount / totalRaised) * 100) : 0 }));

    const channels = new Map<string, { source: string; attempts: number; conversions: number; amount: number }>();
    scoped.forEach(event => {
      const current = channels.get(event.provider) || { source: event.provider, attempts: 0, conversions: 0, amount: 0 };
      current.attempts += 1;
      if (event.status === 'completed') {
        current.conversions += 1;
        current.amount += event.amountUsd;
      }
      channels.set(event.provider, current);
    });
    const paymentChannels = [...channels.values()].sort((a, b) => b.amount - a.amount);

    return {
      scoped,
      completed,
      totalRaised,
      conversionRate,
      averageDonation,
      buckets,
      topCampaigns,
      paymentChannels,
    };
  }, [events, rangeConfig.days]);

  const maxAmount = Math.max(...data.buckets.map(d => d.amount), 1);

  const handleRange = () => {
    const idx = ranges.findIndex(r => r.id === range);
    const next = ranges[(idx + 1) % ranges.length];
    setRange(next.id);
  };

  return (
    <div className="overview-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <div className="page-sub">Track donation performance across your campaigns.</div>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={handleRange}>{rangeConfig.label} ▾</button>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <div className="sc-label">Donation Events</div>
          <div className="sc-value" style={{ fontSize: 24, marginTop: 8 }}>{data.scoped.length.toLocaleString()}</div>
          <div className="sc-sub">All statuses</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">Completed Donations</div>
          <div className="sc-value" style={{ fontSize: 24, marginTop: 8 }}>{data.completed.length.toLocaleString()}</div>
          <div className="sc-sub sc-pos">{usd.format(data.totalRaised)} raised</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">Completion Rate</div>
          <div className="sc-value" style={{ fontSize: 24, marginTop: 8 }}>{data.conversionRate.toFixed(1)}%</div>
          <div className="sc-sub">Completed vs attempted</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">Avg. Donation</div>
          <div className="sc-value" style={{ fontSize: 24, marginTop: 8 }}>{usd.format(data.averageDonation)}</div>
          <div className="sc-sub">Completed donations</div>
        </div>
      </div>

      <div className="content-grid">
        <div className="content-card">
          <div className="cc-header">
            <div className="cc-title">Completed Donation Volume</div>
            <div className="sc-sub">Total: {usd.format(data.totalRaised)}</div>
          </div>
          <div className="chart-bars">
            {data.buckets.map(d => (
              <div key={d.label} className="chart-bar-col">
                <div className="chart-bar-value">{compactUsd(d.amount)}</div>
                <div className="chart-bar-track">
                  <div className="chart-bar-fill" style={{ height: `${(d.amount / maxAmount) * 100}%` }}></div>
                </div>
                <div className="chart-bar-label">{d.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="content-card">
          <div className="cc-header">
            <div className="cc-title">Top Campaigns</div>
          </div>
          <div className="country-list">
            {data.topCampaigns.map(c => (
              <div key={c.campaign} className="country-item">
                <div className="country-info">
                  <span className="country-name">{c.campaign}</span>
                  <span className="country-donors">{c.donors} donation{c.donors === 1 ? '' : 's'}</span>
                </div>
                <div className="country-bar-wrap">
                  <div className="country-bar"><div className="country-bar-fill" style={{ width: `${c.pct}%` }}></div></div>
                </div>
                <span className="country-amount">{usd.format(c.amount)}</span>
              </div>
            ))}
            {data.topCampaigns.length === 0 && (
              <div style={{ padding: '20px 0', color: 'var(--w40)' }}>No completed donations in this range.</div>
            )}
          </div>
        </div>
      </div>

      <div className="content-card" style={{ marginTop: 24, overflow: 'hidden', padding: 0 }}>
        <div style={{ padding: '24px 24px 0' }}>
          <div className="cc-title">Payment Channels</div>
        </div>
        <div className="txn-table-wrap">
          <table className="txn-table">
            <thead>
              <tr>
                <th>Channel</th>
                <th>Attempts</th>
                <th>Completed</th>
                <th>Completion Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.paymentChannels.map(channel => {
                const rate = channel.attempts ? (channel.conversions / channel.attempts) * 100 : 0;

                return (
                  <tr key={channel.source}>
                    <td style={{ fontWeight: 600 }}>{channel.source}</td>
                    <td>{channel.attempts.toLocaleString()}</td>
                    <td>{channel.conversions.toLocaleString()}</td>
                    <td><span style={{ color: 'var(--teal-200)' }}>{rate.toFixed(1)}%</span></td>
                  </tr>
                );
              })}
              {data.paymentChannels.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: 'var(--w30)' }}>No analytics data in this range.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
