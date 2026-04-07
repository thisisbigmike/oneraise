'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast, Modal } from '../components';

export default function DashboardClient({
  firstName,
  role,
  totalRaised,
  totalBackers,
  recentDonations,
  availablePayout,
  campaignCount
}: any) {
  const { showToast } = useToast();
  const router = useRouter();
  const [shareOpen, setShareOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('0.00');
  const [updateOpen, setUpdateOpen] = useState(false);
  const [updateText, setUpdateText] = useState('');

  const handleShare = () => {
    navigator.clipboard.writeText('https://oneraise.com');
    showToast('Link copied to clipboard!', 'success');
    setShareOpen(false);
  };

  const handleWithdraw = () => {
    showToast(`Withdrawal of $${withdrawAmount} initiated. Processing in 1-3 business days.`, 'success');
    setWithdrawOpen(false);
  };

  const handlePostUpdate = () => {
    if (!updateText.trim()) { showToast('Please write something first.', 'warning'); return; }
    showToast('Campaign update posted! All backers have been notified.', 'success');
    setUpdateText('');
    setUpdateOpen(false);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="overview-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Overview</h1>
          <div className="page-sub">
            Welcome back, {firstName}. 
            {campaignCount === 0 && role === 'creator' ? " Ready to launch your first campaign?" : ""}
          </div>
        </div>
        <div className="header-actions">
          {role === 'creator' && (
            <button className="btn-secondary" onClick={() => router.push('/dashboard/campaigns')}>
              {campaignCount > 0 ? "Edit campaign" : "Create campaign"}
            </button>
          )}
          <button className="btn-primary" onClick={() => setShareOpen(true)}>Share</button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="sc-top">
            <div className="sc-label">{role === 'backer' ? 'Total Donated' : 'Total Raised'}</div>
            <div className="sc-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
          </div>
          <div className="sc-value">{formatAmount(totalRaised)}</div>
        </div>

        <div className="stat-card">
          <div className="sc-top">
            <div className="sc-label">{role === 'backer' ? 'Campaigns Supported' : 'Total Backers'}</div>
            <div className="sc-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></div>
          </div>
          <div className="sc-value">{totalBackers}</div>
        </div>

        <div className="stat-card">
          <div className="sc-top">
            <div className="sc-label">Campaign Views</div>
            <div className="sc-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></div>
          </div>
          <div className="sc-value">0</div>
        </div>
      </div>

      <div className="content-grid">
        <div className="content-card">
          <div className="cc-header">
            <div className="cc-title">Recent Donations</div>
            <Link href="/dashboard/transactions" className="cc-link">View all</Link>
          </div>
          <div className="donations-list">
            {recentDonations.length === 0 ? (
              <div style={{ color: 'var(--w40)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
                No recent donations to show.
              </div>
            ) : (
              recentDonations.map((d: any, i: number) => (
                <div key={i} className="donation-item">
                  <div className="d-avatar">{d.donorName ? d.donorName.charAt(0).toUpperCase() : 'A'}</div>
                  <div className="d-info">
                    <div className="d-name">{d.donorName || 'Anonymous'}</div>
                    <div className="d-time">{new Date(d.createdAt).toLocaleDateString()}</div>
                    {d.donorMessage && <div className="d-msg">"{d.donorMessage}"</div>}
                  </div>
                  <div className="d-amount">{formatAmount(d.amount)}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {role === 'creator' && (
          <div className="content-side">
            <div className="content-card">
              <div className="cc-header">
                <div className="cc-title">Available for Payout</div>
              </div>
              <div className="payout-box">
                <div className="pb-amount" style={{ fontSize: 24, fontWeight: 600 }}>{formatAmount(availablePayout)}</div>
                <div className="pb-sub">Settled and ready to withdraw</div>
                <button className="btn-primary w-full" style={{marginTop: 16}} onClick={() => setWithdrawOpen(true)} disabled={availablePayout <= 0}>
                  Withdraw funds
                </button>
              </div>
            </div>

            <div className="content-card" style={{marginTop: 24}}>
              <div className="cc-header">
                <div className="cc-title">Quick Actions</div>
              </div>
              <div className="quick-actions">
                <button className="qa-btn" onClick={() => setUpdateOpen(true)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"/></svg>
                  Post an update
                </button>
                <button className="qa-btn" onClick={() => router.push('/dashboard/payouts')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                  Manage banking
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="Share Now">
        <p style={{ color: 'var(--w50)', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
          Share your link with your audience!
        </p>
        <div className="share-link-row">
          <input className="share-link-input" readOnly value="https://oneraise.com" />
          <button className="btn-primary" style={{ flexShrink: 0 }} onClick={handleShare}>Copy</button>
        </div>
      </Modal>

      <Modal open={withdrawOpen} onClose={() => setWithdrawOpen(false)} title="Withdraw Funds">
        <p style={{ color: 'var(--w50)', fontSize: 14, marginBottom: 20 }}>Enter the amount to withdraw to your linked bank account.</p>
        <div className="s-field" style={{ marginBottom: 20 }}>
          <label className="s-label">Amount (USD)</label>
          <input className="s-input" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-primary" style={{ flex: 1 }} onClick={handleWithdraw}>Confirm</button>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setWithdrawOpen(false)}>Cancel</button>
        </div>
      </Modal>

      <Modal open={updateOpen} onClose={() => setUpdateOpen(false)} title="Post Update">
        <p style={{ color: 'var(--w50)', fontSize: 14, marginBottom: 16 }}>Write an update for your backers.</p>
        <textarea className="s-textarea" rows={5} placeholder="Share some exciting news..." value={updateText} onChange={e => setUpdateText(e.target.value)} />
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="btn-primary" style={{ flex: 1 }} onClick={handlePostUpdate}>Post Update</button>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setUpdateOpen(false)}>Cancel</button>
        </div>
      </Modal>
    </div>
  );
}
