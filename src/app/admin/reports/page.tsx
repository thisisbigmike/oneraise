'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '../../components';

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
  const { showToast } = useToast();
  const [reports, setReports] = useState<CampaignReport[]>([]);
  const [openReportCount, setOpenReportCount] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busyReport, setBusyReport] = useState('');

  const loadReports = useCallback(async (ignore = false) => {
    setStatus('loading');
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const response = await fetch(`/api/admin/reports?${params}`, { cache: 'no-store' });
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
  }, [statusFilter]);

  useEffect(() => {
    let ignore = false;
    loadReports(ignore);
    return () => {
      ignore = true;
    };
  }, [loadReports]);

  const runReportAction = async (reportId: string, action: 'resolve' | 'dismiss' | 'reopen') => {
    setBusyReport(`${action}:${reportId}`);
    try {
      const response = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, action }),
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result?.error || 'Unable to update report.');

      showToast(`Report ${action === 'reopen' ? 'reopened' : action + 'ed'}.`, 'success');
      await loadReports();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Unable to update report.', 'error');
    } finally {
      setBusyReport('');
    }
  };

  const suspendCampaign = async (campaignSlug: string) => {
    setBusyReport(`suspend:${campaignSlug}`);
    try {
      const response = await fetch('/api/admin/campaigns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignSlug, action: 'suspend' }),
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result?.error || 'Unable to suspend campaign.');

      showToast('Campaign suspended for review.', 'success');
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Unable to suspend campaign.', 'error');
    } finally {
      setBusyReport('');
    }
  };

  const exportHref = `/api/admin/exports?kind=reports`;

  return (
    <div className="overview-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Campaign Reports</h1>
          <div className="page-sub">User-submitted flags for fake, misleading, or suspicious campaigns.</div>
        </div>
        <div className="header-actions">
          <a href={exportHref} className="btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>
            Export CSV
          </a>
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

      <div className="content-card" style={{ marginBottom: 24 }}>
        <div className="cc-header">
          <div>
            <div className="cc-title">CSV Exports</div>
            <div style={{ color: 'var(--w50)', fontSize: 13, marginTop: 4 }}>Download operational reports for finance, moderation, and platform review.</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            ['summary', 'Platform summary'],
            ['users', 'Users'],
            ['campaigns', 'Campaigns'],
            ['donations', 'Donations'],
            ['payouts', 'Payouts'],
            ['reports', 'Reports'],
          ].map(([kind, label]) => (
            <a key={kind} href={`/api/admin/exports?kind=${kind}`} className="btn-secondary" style={{ padding: '8px 12px', fontSize: 13 }}>
              {label}
            </a>
          ))}
        </div>
      </div>

      <div className="content-card">
        <div className="cc-header" style={{ alignItems: 'center', gap: 16 }}>
          <div>
            <div className="cc-title">Latest Flags</div>
            <div style={{ color: 'var(--w50)', fontSize: 13, marginTop: 4 }}>Resolve, dismiss, reopen, or suspend campaigns from the moderation queue.</div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['all', 'open', 'resolved', 'dismissed'].map((item) => (
              <button
                key={item}
                onClick={() => setStatusFilter(item)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid',
                  borderColor: statusFilter === item ? 'var(--amber)' : 'rgba(245,250,247,0.1)',
                  background: statusFilter === item ? 'rgba(239,159,39,0.12)' : 'transparent',
                  color: statusFilter === item ? 'var(--amber)' : 'var(--w50)',
                  cursor: 'pointer',
                  fontSize: 12,
                  textTransform: 'capitalize',
                }}
              >
                {item}
              </button>
            ))}
          </div>
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
                  <th>Actions</th>
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
                      <span style={{
                        fontSize: 12,
                        padding: '4px 8px',
                        borderRadius: 4,
                        background: report.status === 'open' ? 'rgba(239,159,39,0.14)' : 'rgba(93,202,165,0.12)',
                        color: report.status === 'open' ? 'var(--amber)' : 'var(--teal-200)',
                      }}>
                        {report.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--w50)' }}>{new Date(report.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {report.status === 'open' ? (
                          <>
                            <button
                              className="btn-primary"
                              style={{ padding: '4px 8px', fontSize: 11 }}
                              disabled={busyReport === `resolve:${report.id}`}
                              onClick={() => runReportAction(report.id, 'resolve')}
                            >
                              Resolve
                            </button>
                            <button
                              className="btn-secondary"
                              style={{ padding: '4px 8px', fontSize: 11 }}
                              disabled={busyReport === `dismiss:${report.id}`}
                              onClick={() => runReportAction(report.id, 'dismiss')}
                            >
                              Dismiss
                            </button>
                            <button
                              className="btn-secondary"
                              style={{ padding: '4px 8px', fontSize: 11, color: '#F09595' }}
                              disabled={busyReport === `suspend:${report.campaignSlug}`}
                              onClick={() => suspendCampaign(report.campaignSlug)}
                            >
                              Suspend
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn-secondary"
                            style={{ padding: '4px 8px', fontSize: 11 }}
                            disabled={busyReport === `reopen:${report.id}`}
                            onClick={() => runReportAction(report.id, 'reopen')}
                          >
                            Reopen
                          </button>
                        )}
                      </div>
                    </td>
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
