'use client';

import React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

export default function BackerOverview() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(' ')[0] || 'Backer';
  return (
    <div className="overview-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {firstName}.</h1>
          <div className="page-sub">You're making a difference. Here's your impact so far.</div>
        </div>
        <div className="header-actions">
          <Link href="/backer/discover" className="btn-primary">Browse campaigns</Link>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="sc-label">Total Donated</div>
          <div className="sc-value" style={{ fontSize: 28, marginTop: 8, color: 'var(--teal-200)' }}>$1,275</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">Campaigns Supported</div>
          <div className="sc-value" style={{ fontSize: 28, marginTop: 8 }}>8</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">Impact Score</div>
          <div className="sc-value" style={{ fontSize: 28, marginTop: 8, color: 'var(--amber)' }}>Top 5%</div>
        </div>
      </div>

      <div className="content-grid">
        <div className="content-card">
          <div className="cc-header">
            <div className="cc-title">Active Campaigns You Support</div>
          </div>
          <div className="campaign-grid" style={{ gridTemplateColumns: '1fr', gap: 16 }}>
            {[
              { title: 'SolarPack Mini', creator: 'Tunde Coker', amount: '$500', progress: 68 },
              { title: 'CodeBridge: Mexico City', creator: 'Elena Ruiz', amount: '$75', progress: 82 }
            ].map((c, i) => (
              <div key={i} className="campaign-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 className="cmp-title" style={{ fontSize: 16, marginBottom: 4 }}>{c.title}</h3>
                    <div className="s-hint">by {c.creator}</div>
                  </div>
                  <div style={{ background: 'rgba(29,158,117,0.1)', color: 'var(--teal-200)', padding: '4px 10px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                    You gave {c.amount}
                  </div>
                </div>
                <div className="cmp-progress-wrap" style={{ marginTop: 8 }}>
                  <div className="sc-progress-bar"><div className="sc-progress-fill" style={{ width: `${c.progress}%` }}></div></div>
                  <div className="cmp-progress-nums">
                    <span>Funding progress</span>
                    <span>{c.progress}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="content-side">
          <div className="content-card">
            <div className="cc-header">
              <div className="cc-title">Recent Updates</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { camp: 'SolarPack Mini', date: '2 days ago', msg: 'We just secured a new manufacturing partner in Lagos! This means faster delivery relative to...' },
                { camp: 'CodeBridge', date: '1 week ago', msg: 'The first cohort of 50 students has officially graduated. Thank you to all our backers!' }
              ].map((u, i) => (
                <div key={i} style={{ borderBottom: i === 0 ? '1px solid rgba(245,250,247,0.06)' : 'none', paddingBottom: i === 0 ? 16 : 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{u.camp}</div>
                  <div className="s-hint" style={{ fontSize: 12, marginBottom: 8 }}>{u.date}</div>
                  <div style={{ fontSize: 14, color: 'var(--w50)', lineHeight: 1.5 }}>"{u.msg}"</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
