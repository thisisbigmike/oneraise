'use client';

import React, { useState } from 'react';
import { useToast } from '../../components';

const TRANSACTIONS = [
  { id: 'TXN-001', donor: 'Amara Kone', email: 'amara.k@gmail.com', amount: 50, currency: 'USDT', status: 'confirmed', campaign: 'SolarPack Mini', date: 'Mar 29, 2026', time: '2:41 PM' },
  { id: 'TXN-002', donor: 'Jana Dvořák', email: 'jana.d@email.cz', amount: 120, currency: 'USDT', status: 'confirmed', campaign: 'SolarPack Mini', date: 'Mar 29, 2026', time: '12:18 PM' },
  { id: 'TXN-003', donor: 'Anonymous', email: '—', amount: 500, currency: 'USDT', status: 'confirmed', campaign: 'SolarPack Mini', date: 'Mar 29, 2026', time: '9:05 AM' },
  { id: 'TXN-004', donor: 'Tom Carter', email: 'tom.c@gmail.com', amount: 25, currency: 'USDT', status: 'confirmed', campaign: 'Clean Water for Kano', date: 'Mar 28, 2026', time: '11:32 PM' },
  { id: 'TXN-005', donor: 'Sarah O.', email: 'sarah.o@pm.me', amount: 100, currency: 'USDT', status: 'pending', campaign: 'SolarPack Mini', date: 'Mar 28, 2026', time: '6:15 PM' },
  { id: 'TXN-006', donor: 'Michael B.', email: 'mike.b@outlook.com', amount: 75, currency: 'USDT', status: 'confirmed', campaign: 'Clean Water for Kano', date: 'Mar 27, 2026', time: '4:20 PM' },
  { id: 'TXN-007', donor: 'Liya Abera', email: 'liya.a@gmail.com', amount: 200, currency: 'USDT', status: 'failed', campaign: 'SolarPack Mini', date: 'Mar 27, 2026', time: '1:08 PM' },
];

export default function TransactionsPage() {
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = TRANSACTIONS
    .filter(t => statusFilter === 'all' || t.status === statusFilter)
    .filter(t => t.donor.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase()));

  const handleExport = () => {
    const header = 'ID,Donor,Email,Amount,Currency,Status,Campaign,Date,Time\n';
    const rows = TRANSACTIONS.map(t => `${t.id},${t.donor},${t.email},$${t.amount},${t.currency},${t.status},${t.campaign},${t.date},${t.time}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'oneraise-transactions.csv'; a.click();
    URL.revokeObjectURL(url);
    showToast('Transactions exported as CSV!', 'success');
  };

  return (
    <div className="overview-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <div className="page-sub">Full history of all incoming donations and outgoing payouts.</div>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={handleExport}>Export CSV</button>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <div className="sc-label">Total Volume</div>
          <div className="sc-value" style={{ fontSize: 24, marginTop: 8 }}>$68,420</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">Confirmed</div>
          <div className="sc-value" style={{ fontSize: 24, marginTop: 8, color: 'var(--teal-200)' }}>$67,970</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">Pending</div>
          <div className="sc-value" style={{ fontSize: 24, marginTop: 8, color: 'var(--amber)' }}>$100</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">Failed</div>
          <div className="sc-value" style={{ fontSize: 24, marginTop: 8, color: '#F09595' }}>$200</div>
        </div>
      </div>

      <div className="txn-filters">
        <div className="txn-search-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input className="txn-search" placeholder="Search by name or TXN ID..." value={search} onChange={e => setSearch(e.target.value)} />
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
                <th>Donor</th>
                <th>Campaign</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id}>
                  <td><span className="txn-id">{t.id}</span></td>
                  <td>
                    <div className="txn-donor">{t.donor}</div>
                    <div className="txn-email">{t.email}</div>
                  </td>
                  <td><span className="txn-campaign">{t.campaign}</span></td>
                  <td><span className="txn-amount">${t.amount}</span></td>
                  <td><span className={`txn-status ${t.status}`}>{t.status}</span></td>
                  <td>
                    <div className="txn-date">{t.date}</div>
                    <div className="txn-email">{t.time}</div>
                  </td>
                </tr>
              ))}
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
