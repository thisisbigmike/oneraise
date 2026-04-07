'use client';

import React from 'react';

export default function AdminOverview() {
  return (
    <div className="overview-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Overview</h1>
          <div className="page-sub">System health, active campaigns, and total volume.</div>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <div className="sc-label">Total Volume (USDT)</div>
          <div className="sc-value" style={{ fontSize: 28, marginTop: 8, color: 'var(--amber)' }}>$4.2M</div>
          <div className="sc-trend positive" style={{ marginTop: 8 }}>+12.4% this month</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">Active Campaigns</div>
          <div className="sc-value" style={{ fontSize: 28, marginTop: 8 }}>1,284</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">Total Creators</div>
          <div className="sc-value" style={{ fontSize: 28, marginTop: 8 }}>14,902</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">Platform Revenue (1.5%)</div>
          <div className="sc-value" style={{ fontSize: 28, marginTop: 8, color: 'var(--teal-200)' }}>$63,000</div>
        </div>
      </div>

      <div className="content-grid">
        <div className="content-card">
          <div className="cc-header">
            <div className="cc-title">Pending Approvals</div>
            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>View all</button>
          </div>
          <table className="txn-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Creator</th>
                <th>Goal</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {[
                { title: 'Clean Water Initiative', creator: 'Aisha Malik', goal: '$25,000' },
                { title: 'Tech Start: Lagos', creator: 'Chidi Nweke', goal: '$100,000' },
                { title: 'Rural Clinic Solar', creator: 'Dr. Santos', goal: '$15,000' }
              ].map((row, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{row.title}</td>
                  <td style={{ color: 'var(--w50)' }}>{row.creator}</td>
                  <td>{row.goal}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-primary" style={{ padding: '4px 10px', fontSize: 12 }}>Approve</button>
                      <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }}>Review</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="content-side">
          <div className="content-card">
            <div className="cc-header">
              <div className="cc-title">System Status</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { s: 'Busha API', status: 'Operational', color: 'var(--teal-200)' },
                { s: 'Node.js Backend', status: 'Operational', color: 'var(--teal-200)' },
                { s: 'Webhooks', status: 'Degraded', color: 'var(--amber)' },
                { s: 'Database', status: 'Operational', color: 'var(--teal-200)' }
              ].map((sys, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14 }}>{sys.s}</span>
                  <span style={{ fontSize: 12, padding: '4px 8px', borderRadius: 4, background: `${sys.color}20`, color: sys.color }}>
                    {sys.status}
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
