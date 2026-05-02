'use client';

import React, { useMemo, useState } from 'react';
import { useToast } from '../../components';

export type TransactionRow = {
  id: string;
  displayId: string;
  type: 'donation' | 'payout';
  actor: string;
  actorDetail: string;
  campaign: string;
  amount: number;
  amountUsd: number;
  currency: string;
  status: 'confirmed' | 'pending' | 'failed';
  provider: string;
  dateIso: string;
};

export type TransactionStats = {
  total: number;
  confirmed: number;
  pending: number;
  failed: number;
};

type Props = {
  rows: TransactionRow[];
  stats: TransactionStats;
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const amountFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
});

const formatAmount = (row: TransactionRow) => {
  const prefix = row.type === 'payout' ? '-' : '';
  return `${prefix}${amountFormatter.format(row.amount)} ${row.currency}`;
};

const csvEscape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

export default function TransactionsClient({ rows, stats }: Props) {
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return rows
      .filter((row) => statusFilter === 'all' || row.status === statusFilter)
      .filter((row) => {
        if (!term) return true;

        return [
          row.displayId,
          row.actor,
          row.actorDetail,
          row.campaign,
          row.provider,
          row.type,
        ].some((value) => value.toLowerCase().includes(term));
      });
  }, [rows, search, statusFilter]);

  const handleExport = () => {
    const header = ['ID', 'Type', 'Name', 'Detail', 'Amount', 'Currency', 'Status', 'Campaign', 'Provider', 'Date'];
    const csvRows = rows.map((row) => {
      const date = new Date(row.dateIso);
      return [
        row.displayId,
        row.type,
        row.actor,
        row.actorDetail,
        row.amount,
        row.currency,
        row.status,
        row.campaign,
        row.provider,
        date.toLocaleString(),
      ].map(csvEscape).join(',');
    });

    const blob = new Blob([[header.map(csvEscape).join(','), ...csvRows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'oneraise-transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Transactions exported as CSV.', 'success');
  };

  return (
    <div className="overview-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <div className="page-sub">Full history of all incoming donations and outgoing payouts.</div>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={handleExport} disabled={rows.length === 0}>
            Export CSV
          </button>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <div className="sc-label">Total Volume</div>
          <div className="sc-value" style={{ fontSize: 24, marginTop: 8 }}>{currencyFormatter.format(stats.total)}</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">Confirmed</div>
          <div className="sc-value" style={{ fontSize: 24, marginTop: 8, color: 'var(--teal-200)' }}>{currencyFormatter.format(stats.confirmed)}</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">Pending</div>
          <div className="sc-value" style={{ fontSize: 24, marginTop: 8, color: 'var(--amber)' }}>{currencyFormatter.format(stats.pending)}</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">Failed</div>
          <div className="sc-value" style={{ fontSize: 24, marginTop: 8, color: '#F09595' }}>{currencyFormatter.format(stats.failed)}</div>
        </div>
      </div>

      <div className="txn-filters">
        <div className="txn-search-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input className="txn-search" placeholder="Search by name or transaction ID..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="settings-tabs" style={{ marginBottom: 0 }}>
          {['all', 'confirmed', 'pending', 'failed'].map(s => (
            <button key={s} className={`stab ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="content-card" style={{ overflow: 'hidden', padding: 0 }}>
        <div className="txn-table-wrap">
          <table className="txn-table">
            <thead>
              <tr>
                <th>Transaction</th>
                <th>Name</th>
                <th>Campaign</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const date = new Date(row.dateIso);

                return (
                  <tr key={row.id}>
                    <td>
                      <span className="txn-id">{row.displayId}</span>
                      <div className="txn-email">{row.type}</div>
                    </td>
                    <td>
                      <div className="txn-donor">{row.actor}</div>
                      <div className="txn-email">{row.actorDetail}</div>
                    </td>
                    <td><span className="txn-campaign">{row.campaign}</span></td>
                    <td>
                      <span className={`txn-amount ${row.type === 'payout' ? 'txn-amount-out' : ''}`}>
                        {formatAmount(row)}
                      </span>
                    </td>
                    <td><span className={`txn-status ${row.status}`}>{row.status}</span></td>
                    <td>
                      <div className="txn-date">{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      <div className="txn-email">{date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--w30)' }}>No transactions found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
