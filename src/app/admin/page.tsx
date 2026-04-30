'use client';

import React, { useEffect, useState } from 'react';

type CampaignReport = {
  id: string;
  campaignSlug: string;
  campaignTitle: string;
  reasonLabel: string;
  details: string | null;
  status: string;
  reporterEmail: string | null;
  createdAt: string;
};

export default function AdminOverview() {
  const [reports, setReports] = useState<CampaignReport[]>([]);
  const [openReportCount, setOpenReportCount] = useState(0);
  const [reportsStatus, setReportsStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let ignore = false;

    async function loadReports() {
      try {
        const response = await fetch('/api/admin/reports');
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error || 'Unable to load campaign reports.');
        }

        if (!ignore) {
          setReports(result.reports || []);
          setOpenReportCount(result.openCount || 0);
          setReportsStatus('ready');
        }
      } catch {
        if (!ignore) {
          setReportsStatus('error');
        }
      }
    }

    loadReports();

    return () => {
      ignore = true;
    };
  }, []);

  const latestReports = reports.slice(0, 4);

  return (
    <div className="overview-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Overview</h1>
          <div className="page-sub">System health, active campaigns, and total volume.</div>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
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
        <div className="stat-card">
          <div className="sc-label">Open Campaign Reports</div>
          <div className="sc-value" style={{ fontSize: 28, marginTop: 8, color: 'var(--amber)' }}>
            {reportsStatus === 'loading' ? '...' : openReportCount}
          </div>
          <div className="sc-trend" style={{ marginTop: 8, color: 'var(--w50)' }}>User-submitted fraud flags</div>
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
          <div className="content-card" style={{ marginBottom: 24 }}>
            <div className="cc-header">
              <div className="cc-title">Campaign Reports</div>
              <span style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 600 }}>{openReportCount} open</span>
            </div>

            {reportsStatus === 'loading' && (
              <div style={{ color: 'var(--w50)', fontSize: 14 }}>Loading reports...</div>
            )}

            {reportsStatus === 'error' && (
              <div style={{ color: 'var(--amber)', fontSize: 14 }}>Unable to load report flags.</div>
            )}

            {reportsStatus === 'ready' && latestReports.length === 0 && (
              <div style={{ color: 'var(--w50)', fontSize: 14 }}>No campaign reports yet.</div>
            )}

            {latestReports.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {latestReports.map((report) => (
                  <div
                    key={report.id}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      background: 'rgba(245,250,247,0.04)',
                      border: '1px solid rgba(245,250,247,0.06)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{report.campaignTitle}</div>
                      <span style={{ fontSize: 11, color: 'var(--amber)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {report.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--w80)', marginBottom: 6 }}>{report.reasonLabel}</div>
                    {report.details && (
                      <div style={{ fontSize: 12, color: 'var(--w50)', lineHeight: 1.4 }}>{report.details}</div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--w30)', marginTop: 8 }}>
                      {new Date(report.createdAt).toLocaleDateString()} · /campaign/{report.campaignSlug}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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
