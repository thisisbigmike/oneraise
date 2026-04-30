'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

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

export default function AdminReportsPage() {
  const [reports, setReports] = useState<CampaignReport[]>([]);
  const [openReportCount, setOpenReportCount] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

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
          setStatus('ready');
        }
      } catch {
        if (!ignore) {
          setStatus('error');
        }
      }
    }

    loadReports();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="overview-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Campaign Reports</h1>
          <div className="page-sub">User-submitted flags for fake, misleading, or suspicious campaigns.</div>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="stat-card">
          <div className="sc-label">Open Reports</div>
          <div className="sc-value" style={{ fontSize: 28, marginTop: 8, color: 'var(--amber)' }}>
            {status === 'loading' ? '...' : openReportCount}
          </div>
        </div>
        <div className="stat-card">
          <div className="sc-label">Total Loaded</div>
          <div className="sc-value" style={{ fontSize: 28, marginTop: 8 }}>{reports.length}</div>
        </div>
      </div>

      <div className="content-card">
        <div className="cc-header">
          <div className="cc-title">Latest Flags</div>
        </div>

        {status === 'loading' && <div style={{ color: 'var(--w50)' }}>Loading reports...</div>}
        {status === 'error' && <div style={{ color: 'var(--amber)' }}>Unable to load report flags.</div>}
        {status === 'ready' && reports.length === 0 && <div style={{ color: 'var(--w50)' }}>No campaign reports yet.</div>}

        {reports.length > 0 && (
          <div className="txn-table-wrap">
            <table className="txn-table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Reason</th>
                  <th>Details</th>
                  <th>Reporter</th>
                  <th>Status</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td style={{ fontWeight: 600 }}>
                      <Link href={`/campaign/${report.campaignSlug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        {report.campaignTitle}
                      </Link>
                    </td>
                    <td>{report.reasonLabel}</td>
                    <td style={{ color: 'var(--w50)', maxWidth: 260 }}>{report.details || '-'}</td>
                    <td style={{ color: 'var(--w50)' }}>{report.reporterEmail || 'Anonymous'}</td>
                    <td>
                      <span style={{ fontSize: 12, padding: '4px 8px', borderRadius: 4, background: 'rgba(239,159,39,0.14)', color: 'var(--amber)' }}>
                        {report.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--w50)' }}>{new Date(report.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
