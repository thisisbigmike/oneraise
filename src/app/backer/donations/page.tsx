'use client';

import React from 'react';
import Link from 'next/link';

export default function BackerDonations() {
  const donations = [
    {
      id: 'TX-9182',
      campaign: 'SolarPack Mini',
      creator: 'Tunde Coker',
      date: 'Oct 24, 2024',
      amount: '$500.00',
      status: 'completed', // 'completed', 'pending'
      method: 'Busha (USDT)'
    },
    {
      id: 'TX-8291',
      campaign: 'Green Wheels Project',
      creator: 'Leo Martins',
      date: 'Oct 20, 2024',
      amount: '$250.00',
      status: 'pending',
      method: 'MoonPay (Card)'
    },
    {
      id: 'TX-7215',
      campaign: 'CodeBridge: Mexico City',
      creator: 'Elena Ruiz',
      date: 'Sep 12, 2024',
      amount: '$75.00',
      status: 'completed',
      method: 'MoonPay (Card)'
    },
    {
      id: 'TX-6321',
      campaign: 'AquaClean Filters',
      creator: 'David Chen',
      date: 'Jul 04, 2024',
      amount: '$120.00',
      status: 'completed',
      method: 'MoonPay (Apple Pay)'
    },
    {
      id: 'TX-5104',
      campaign: 'EduVR Initiative',
      creator: 'Sarah Jenkins',
      date: 'May 18, 2024',
      amount: '$580.00',
      status: 'completed',
      method: 'Busha (USDC)'
    }
  ];

  return (
    <div className="overview-page" style={{ padding: '32px 40px' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 className="page-title">My Donations</h1>
          <div className="page-sub">Manage and track all the campaigns you've supported.</div>
        </div>
        <div className="header-actions">
          <Link href="/backer/discover" className="btn-primary">Find more campaigns</Link>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 40 }}>
        <div className="stat-card">
          <div className="sc-label">Total Contributions</div>
          <div className="sc-value" style={{ fontSize: 28, marginTop: 8 }}>$1,525.00</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">Campaigns Supported</div>
          <div className="sc-value" style={{ fontSize: 28, marginTop: 8 }}>5</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">Pending Verifications</div>
          <div className="sc-value" style={{ fontSize: 28, marginTop: 8, color: 'var(--amber)' }}>1</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">Favorite Category</div>
          <div className="sc-value" style={{ fontSize: 24, marginTop: 8, color: 'var(--teal-200)' }}>Technology</div>
        </div>
      </div>

      <div className="content-card">
        <div className="cc-header">
          <div className="cc-title">Donation History</div>
        </div>
        <div className="txn-table-wrap">
          <table className="txn-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Campaign</th>
                <th>Date</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {donations.map((txn, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'monospace', color: 'var(--w50)' }}>{txn.id}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--white)' }}>{txn.campaign}</div>
                    <div style={{ fontSize: 12, color: 'var(--w50)' }}>by {txn.creator}</div>
                  </td>
                  <td style={{ color: 'var(--w50)' }}>{txn.date}</td>
                  <td><div className="s-hint">{txn.method}</div></td>
                  <td style={{ fontWeight: 600, color: 'var(--teal-200)' }}>{txn.amount}</td>
                  <td>
                    {txn.status === 'completed' && <span className="st-badge st-ok">Completed</span>}
                    {txn.status === 'pending' && <span className="st-badge st-pend">Pending</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
