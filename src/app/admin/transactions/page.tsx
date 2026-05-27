'use client';

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type DonationItem = {
  id: string;
  amountUsd: number;
  rawAmount: number;
  currency: string;
  provider: string;
  status: string;
  donorName: string;
  donorEmail: string | null;
  donorMessage: string | null;
  asset: string | null;
  network: string | null;
  solanaTx: string | null;
  campaignTitle: string;
  campaignSlug: string;
  completedAt: string | null;
  createdAt: string;
};

type PayoutItem = {
  id: string;
  amount: number;
  sourceCurrency: string;
  targetCurrency: string;
  status: string;
  provider: string;
  paymentId: string | null;
  completedAt: string | null;
  createdAt: string;
  creatorName: string;
  campaignTitle: string;
  campaignSlug: string | null;
  methodLabel: string;
  methodType: string;
};

const STATUS_COLORS: Record<string, string> = {
  completed: 'var(--teal-200)',
  pending: 'var(--amber)',
  failed: '#F09595',
  expired: 'var(--w30)',
  processing: '#85B7EB',
};

const PROVIDER_COLORS: Record<string, string> = {
  stripe: '#635BFF',
  moonpay: '#7B3FE4',
  busha: '#EF9F27',
  solana: '#9945FF',
  jupiter: '#9945FF',
};

function isDonationItem(item: DonationItem | PayoutItem): item is DonationItem {
  return 'amountUsd' in item;
}

function isPayoutItem(item: DonationItem | PayoutItem): item is PayoutItem {
  return 'sourceCurrency' in item;
}

function formatAmount(value: number | null | undefined) {
  return Number.isFinite(value) ? Number(value).toFixed(2) : '0.00';
}

export default function AdminTransactionsPage() {
  return <Suspense><AdminTransactionsContent /></Suspense>;
}

function AdminTransactionsContent() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get('type') === 'payouts' ? 'payouts' : 'donations';
  const initialStatus = searchParams.get('status') || 'all';
  const [tab, setTab] = useState<'donations' | 'payouts'>(initialType);
  const [items, setItems] = useState<(DonationItem | PayoutItem)[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [statusFilter, setStatusFilter] = useState(initialStatus);

  const load = useCallback(async () => {
    setLoadStatus('loading');
    setItems([]);
    try {
      const params = new URLSearchParams({ type: tab, page: String(page) });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/admin/transactions?${params}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItems(data.items);
      setTotal(data.total);
      setPages(data.pages);
      setLoadStatus('ready');
    } catch {
      setLoadStatus('error');
    }
  }, [tab, page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const switchTab = (t: 'donations' | 'payouts') => {
    setTab(t);
    setItems([]);
    setTotal(0);
    setPages(1);
    setPage(1);
    setStatusFilter('all');
  };

  const donationStatuses = ['all', 'completed', 'pending', 'failed', 'expired'];
  const payoutStatuses = ['all', 'completed', 'pending', 'processing', 'failed'];
  const donationRows = tab === 'donations' ? items.filter(isDonationItem) : [];
  const payoutRows = tab === 'payouts' ? items.filter(isPayoutItem) : [];

  return (
    <div className="overview-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <div className="page-sub">{total.toLocaleString()} {tab} total</div>
        </div>
        <div className="header-actions">
          <a href={`/api/admin/exports?kind=${tab === 'donations' ? 'donations' : 'payouts'}`} className="btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>
            Export CSV
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid rgba(245,250,247,0.08)', paddingBottom: 0 }}>
        {(['donations', 'payouts'] as const).map(t => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            style={{
              padding: '10px 20px', fontSize: 14, border: 'none', cursor: 'pointer',
              borderBottom: tab === t ? '2px solid var(--teal-200)' : '2px solid transparent',
              background: 'transparent',
              color: tab === t ? 'var(--teal-200)' : 'var(--w50)',
              fontWeight: tab === t ? 700 : 400,
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Status filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {(tab === 'donations' ? donationStatuses : payoutStatuses).map(s => (
          <button
            key={s}
            onClick={() => { setItems([]); setStatusFilter(s); setPage(1); }}
            style={{
              padding: '5px 10px', fontSize: 12, borderRadius: 6, border: '1px solid', cursor: 'pointer',
              borderColor: statusFilter === s ? (STATUS_COLORS[s] ?? 'var(--teal-200)') : 'rgba(245,250,247,0.1)',
              background: statusFilter === s ? `${STATUS_COLORS[s] ?? 'var(--teal-200)'}18` : 'transparent',
              color: statusFilter === s ? (STATUS_COLORS[s] ?? 'var(--teal-200)') : 'var(--w50)',
              textTransform: 'capitalize',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="content-card">
        {loadStatus === 'loading' && <div style={{ color: 'var(--w50)', padding: 20 }}>Loading {tab}...</div>}
        {loadStatus === 'error' && <div style={{ color: 'var(--amber)', padding: 20 }}>Failed to load {tab}.</div>}
        {loadStatus === 'ready' && items.length === 0 && (
          <div style={{ color: 'var(--w50)', padding: 20 }}>No {tab} found.</div>
        )}

        {/* Donations table */}
        {tab === 'donations' && donationRows.length > 0 && (
          <div className="txn-table-wrap">
            <table className="txn-table">
              <thead>
                <tr>
                  <th>Donor</th>
                  <th>Campaign</th>
                  <th>Amount (USD)</th>
                  <th>Provider</th>
                  <th>Status</th>
                  <th>Asset / Network</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {donationRows.map(d => (
                  <tr key={d.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{d.donorName}</div>
                      {d.donorEmail && <div style={{ fontSize: 11, color: 'var(--w30)' }}>{d.donorEmail}</div>}
                      {d.donorMessage && <div style={{ fontSize: 11, color: 'var(--w50)', marginTop: 2, fontStyle: 'italic' }}>&quot;{d.donorMessage}&quot;</div>}
                    </td>
                    <td>
                      <Link href={`/campaign/${d.campaignSlug}`} target="_blank" style={{ color: 'var(--teal-200)', textDecoration: 'none', fontSize: 13 }}>
                        {d.campaignTitle}
                      </Link>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--teal-200)' }}>${formatAmount(d.amountUsd)}</td>
                    <td>
                      <span style={{ fontSize: 12, textTransform: 'uppercase', color: PROVIDER_COLORS[d.provider] || 'var(--w50)', fontWeight: 600 }}>
                        {d.provider}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, padding: '3px 7px', borderRadius: 4, background: `${STATUS_COLORS[d.status] ?? 'var(--w30)'}18`, color: STATUS_COLORS[d.status] ?? 'var(--w30)', fontWeight: 700, textTransform: 'capitalize' }}>
                        {d.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--w50)' }}>
                      {d.asset ? `${d.asset}${d.network ? ` / ${d.network}` : ''}` : '—'}
                      {d.solanaTx && (
                        <a href={`https://solscan.io/tx/${d.solanaTx}`} target="_blank" rel="noreferrer" style={{ display: 'block', fontSize: 11, color: '#9945FF', marginTop: 2 }}>
                          Solscan ↗
                        </a>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--w50)' }}>
                      {new Date(d.createdAt).toLocaleDateString()}
                      {d.completedAt && <div style={{ fontSize: 11, color: 'var(--w30)' }}>✓ {new Date(d.completedAt).toLocaleDateString()}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Payouts table */}
        {tab === 'payouts' && payoutRows.length > 0 && (
          <div className="txn-table-wrap">
            <table className="txn-table">
              <thead>
                <tr>
                  <th>Creator</th>
                  <th>Campaign</th>
                  <th>Amount</th>
                  <th>Currencies</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {payoutRows.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{p.creatorName}</td>
                    <td>
                      {p.campaignSlug
                        ? <Link href={`/campaign/${p.campaignSlug}`} target="_blank" style={{ color: 'var(--teal-200)', textDecoration: 'none', fontSize: 13 }}>{p.campaignTitle}</Link>
                        : <span style={{ fontSize: 13, color: 'var(--w50)' }}>{p.campaignTitle}</span>
                      }
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--teal-200)' }}>{formatAmount(p.amount)}</td>
                    <td style={{ fontSize: 12, color: 'var(--w50)' }}>{p.sourceCurrency} → {p.targetCurrency}</td>
                    <td>
                      <div style={{ fontSize: 13 }}>{p.methodLabel}</div>
                      <div style={{ fontSize: 11, color: 'var(--w30)', textTransform: 'capitalize' }}>{p.methodType}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, padding: '3px 7px', borderRadius: 4, background: `${STATUS_COLORS[p.status] ?? 'var(--w30)'}18`, color: STATUS_COLORS[p.status] ?? 'var(--w30)', fontWeight: 700, textTransform: 'capitalize' }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--w50)' }}>
                      {new Date(p.createdAt).toLocaleDateString()}
                      {p.completedAt && <div style={{ fontSize: 11, color: 'var(--w30)' }}>✓ {new Date(p.completedAt).toLocaleDateString()}</div>}
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
