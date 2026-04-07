'use client';

import React, { useState } from 'react';
import { useToast } from '../../components';

const WEEKLY_DATA = [
  { day: 'Mon', amount: 1200 },
  { day: 'Tue', amount: 3400 },
  { day: 'Wed', amount: 2100 },
  { day: 'Thu', amount: 5600 },
  { day: 'Fri', amount: 4300 },
  { day: 'Sat', amount: 7800 },
  { day: 'Sun', amount: 3200 },
];

const TOP_COUNTRIES = [
  { country: '🇳🇬 Nigeria', donors: 142, amount: '$24,500', pct: 36 },
  { country: '🇺🇸 United States', donors: 89, amount: '$18,200', pct: 27 },
  { country: '🇬🇧 United Kingdom', donors: 54, amount: '$9,800', pct: 14 },
  { country: '🇨🇦 Canada', donors: 38, amount: '$6,100', pct: 9 },
  { country: '🇩🇪 Germany', donors: 29, amount: '$4,200', pct: 6 },
];

const TRAFFIC_SOURCES = [
  { source: 'Direct Link', visits: 4820, conversions: 186, rate: '3.9%' },
  { source: 'Twitter/X', visits: 3200, conversions: 98, rate: '3.1%' },
  { source: 'WhatsApp', visits: 2100, conversions: 72, rate: '3.4%' },
  { source: 'Instagram', visits: 1800, conversions: 34, rate: '1.9%' },
  { source: 'Email', visits: 1400, conversions: 22, rate: '1.6%' },
];

export default function AnalyticsPage() {
  const { showToast } = useToast();
  const [range, setRange] = useState('7d');
  const maxAmount = Math.max(...WEEKLY_DATA.map(d => d.amount));

  const ranges = [{ id: '7d', label: 'Last 7 days' }, { id: '30d', label: 'Last 30 days' }, { id: '90d', label: 'Last 90 days' }];
  const handleRange = () => {
    const idx = ranges.findIndex(r => r.id === range);
    const next = ranges[(idx + 1) % ranges.length];
    setRange(next.id);
    showToast(`Showing data for ${next.label}.`, 'info');
  };

  return (
    <div className="overview-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <div className="page-sub">Track your campaign performance and traffic sources.</div>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={handleRange}>{ranges.find(r => r.id === range)?.label} ▾</button>
        </div>
      </div>

      {/* TOP STATS */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <div className="sc-label">Page Views</div>
          <div className="sc-value" style={{ fontSize: 24, marginTop: 8 }}>14,205</div>
          <div className="sc-sub sc-pos">↑ 23% vs last week</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">Unique Visitors</div>
          <div className="sc-value" style={{ fontSize: 24, marginTop: 8 }}>8,412</div>
          <div className="sc-sub sc-pos">↑ 18% vs last week</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">Conversion Rate</div>
          <div className="sc-value" style={{ fontSize: 24, marginTop: 8 }}>4.9%</div>
          <div className="sc-sub sc-pos">↑ 0.6% vs last week</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">Avg. Donation</div>
          <div className="sc-value" style={{ fontSize: 24, marginTop: 8 }}>$166</div>
          <div className="sc-sub">Across all campaigns</div>
        </div>
      </div>

      <div className="content-grid">
        {/* DONATION CHART */}
        <div className="content-card">
          <div className="cc-header">
            <div className="cc-title">Donations This Week</div>
            <div className="sc-sub">Total: $27,600</div>
          </div>
          <div className="chart-bars">
            {WEEKLY_DATA.map(d => (
              <div key={d.day} className="chart-bar-col">
                <div className="chart-bar-value">${(d.amount / 1000).toFixed(1)}k</div>
                <div className="chart-bar-track">
                  <div className="chart-bar-fill" style={{ height: `${(d.amount / maxAmount) * 100}%` }}></div>
                </div>
                <div className="chart-bar-label">{d.day}</div>
              </div>
            ))}
          </div>
        </div>

        {/* TOP COUNTRIES */}
        <div className="content-card">
          <div className="cc-header">
            <div className="cc-title">Top Countries</div>
          </div>
          <div className="country-list">
            {TOP_COUNTRIES.map(c => (
              <div key={c.country} className="country-item">
                <div className="country-info">
                  <span className="country-name">{c.country}</span>
                  <span className="country-donors">{c.donors} donors</span>
                </div>
                <div className="country-bar-wrap">
                  <div className="country-bar"><div className="country-bar-fill" style={{ width: `${c.pct}%` }}></div></div>
                </div>
                <span className="country-amount">{c.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TRAFFIC SOURCES TABLE */}
      <div className="content-card" style={{ marginTop: 24, overflow: 'hidden', padding: 0 }}>
        <div style={{ padding: '24px 24px 0' }}>
          <div className="cc-title">Traffic Sources</div>
        </div>
        <div className="txn-table-wrap">
          <table className="txn-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Visits</th>
                <th>Conversions</th>
                <th>Conv. Rate</th>
              </tr>
            </thead>
            <tbody>
              {TRAFFIC_SOURCES.map(s => (
                <tr key={s.source}>
                  <td style={{ fontWeight: 600 }}>{s.source}</td>
                  <td>{s.visits.toLocaleString()}</td>
                  <td>{s.conversions}</td>
                  <td><span style={{ color: 'var(--teal-200)' }}>{s.rate}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
