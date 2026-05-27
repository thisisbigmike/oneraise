'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useToast } from '../../components';

type AdminCampaign = {
  id: string;
  title: string;
  slug: string;
  category: string;
  status: string;
  type: string;
  goal: number;
  raised: number;
  backers: number;
  pct: number;
  createdAt: string;
  image: string | null;
  creatorName: string;
  creatorId: string | undefined;
};

const STATUS_COLORS: Record<string, string> = {
  active: 'var(--teal-200)',
  draft: 'var(--amber)',
  completed: 'var(--w50)',
  suspended: '#F09595',
};

const TYPE_LABELS: Record<string, string> = {
  standard: 'Standard',
  protected_crowdfunding: 'Protected',
  emergency_aid: 'Emergency',
  grant_distribution: 'Grant',
};

export default function AdminCampaignsPage() {
  return <Suspense><AdminCampaignsContent /></Suspense>;
}

function AdminCampaignsContent() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [campaigns, setCampaigns] = useState<AdminCampaign[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setLoadStatus('loading');
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/campaigns?${params}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCampaigns(data.campaigns);
      setTotal(data.total);
      setPages(data.pages);
      setLoadStatus('ready');
    } catch {
      setLoadStatus('error');
    }
  }, [page, statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  const runAction = async (slug: string, action: string) => {
    setBusy(`${action}:${slug}`);
    try {
      const res = await fetch('/api/admin/campaigns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignSlug: slug, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`Campaign ${action}d.`, 'success');
      await load();
    } catch (e: any) {
      showToast(e.message || 'Failed.', 'error');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="overview-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Campaigns</h1>
          <div className="page-sub">{total.toLocaleString()} total campaigns</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <form onSubmit={e => { e.preventDefault(); setSearch(searchInput); setPage(1); }} style={{ display: 'flex', gap: 8 }}>
          <input
            className="s-input"
            placeholder="Search title or slug..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            style={{ minWidth: 240 }}
          />
          <button type="submit" className="btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>Search</button>
          {search && <button type="button" className="btn-secondary" style={{ padding: '8px 12px', fontSize: 13 }} onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}>Clear</button>}
        </form>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'active', 'draft', 'completed', 'suspended'].map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              style={{
                padding: '6px 12px', fontSize: 12, borderRadius: 6, border: '1px solid',
                borderColor: statusFilter === s ? (STATUS_COLORS[s] ?? 'var(--teal-200)') : 'rgba(245,250,247,0.1)',
                background: statusFilter === s ? `${STATUS_COLORS[s] ?? 'var(--teal-200)'}18` : 'transparent',
                color: statusFilter === s ? (STATUS_COLORS[s] ?? 'var(--teal-200)') : 'var(--w50)',
                cursor: 'pointer', textTransform: 'capitalize',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="content-card">
        {loadStatus === 'loading' && <div style={{ color: 'var(--w50)', padding: 20 }}>Loading campaigns...</div>}
        {loadStatus === 'error' && <div style={{ color: 'var(--amber)', padding: 20 }}>Failed to load campaigns.</div>}
        {loadStatus === 'ready' && campaigns.length === 0 && (
          <div style={{ color: 'var(--w50)', padding: 20 }}>No campaigns found.</div>
        )}

        {campaigns.length > 0 && (
          <div className="txn-table-wrap">
            <table className="txn-table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Creator</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Goal</th>
                  <th>Raised</th>
                  <th>Backers</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {c.image
                          ? <img src={c.image} alt={c.title} style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                          : <div style={{ width: 36, height: 36, borderRadius: 6, background: 'rgba(245,250,247,0.06)', flexShrink: 0 }} />
                        }
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{c.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--w30)' }}>{c.category} · {new Date(c.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--w50)', fontSize: 13 }}>{c.creatorName}</td>
                    <td>
                      <span style={{ fontSize: 11, padding: '3px 6px', borderRadius: 4, background: 'rgba(245,250,247,0.06)', color: 'var(--w80)' }}>
                        {TYPE_LABELS[c.type] || c.type}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 4, background: `${STATUS_COLORS[c.status] ?? 'var(--w50)'}18`, color: STATUS_COLORS[c.status] ?? 'var(--w50)', fontWeight: 700, textTransform: 'capitalize' }}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 13 }}>${c.goal.toLocaleString()}</td>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal-200)' }}>${c.raised.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                      <div style={{ fontSize: 11, color: 'var(--w30)' }}>{c.pct}%</div>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--w80)' }}>{c.backers}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <Link href={`/campaign/${c.slug}`} target="_blank" className="btn-secondary" style={{ padding: '4px 8px', fontSize: 11 }}>View</Link>
                        {c.status === 'draft' && (
                          <button className="btn-primary" style={{ padding: '4px 8px', fontSize: 11 }} disabled={busy === `approve:${c.slug}`} onClick={() => runAction(c.slug, 'approve')}>
                            {busy === `approve:${c.slug}` ? '...' : 'Approve'}
                          </button>
                        )}
                        {c.status === 'active' && (
                          <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: 11, color: '#F09595' }} disabled={busy === `suspend:${c.slug}`} onClick={() => runAction(c.slug, 'suspend')}>
                            {busy === `suspend:${c.slug}` ? '...' : 'Suspend'}
                          </button>
                        )}
                        {c.status === 'suspended' && (
                          <button className="btn-primary" style={{ padding: '4px 8px', fontSize: 11 }} disabled={busy === `unsuspend:${c.slug}`} onClick={() => runAction(c.slug, 'unsuspend')}>
                            {busy === `unsuspend:${c.slug}` ? '...' : 'Restore'}
                          </button>
                        )}
                        {c.status === 'active' && (
                          <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: 11 }} disabled={busy === `complete:${c.slug}`} onClick={() => runAction(c.slug, 'complete')}>
                            {busy === `complete:${c.slug}` ? '...' : 'End'}
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

        {pages > 1 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ fontSize: 13, color: 'var(--w50)' }}>Page {page} of {pages}</span>
            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }} disabled={page === pages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
