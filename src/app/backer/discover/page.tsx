'use client';

import React from 'react';
import Link from 'next/link';

const LIVE_CAMPAIGNS = [
  { id: 1, title: 'SolarPack Mini', creator: 'Tunde Coker', raised: 68420, goal: 100000, category: 'Technology', desc: 'A portable, affordable solar generator for small businesses in West Africa.' },
  { id: 2, title: 'Clean Water for Kano', creator: 'Aisha Malik', raised: 24800, goal: 50000, category: 'Social Impact', desc: 'Building 50 solar-powered boreholes to provide clean drinking water.' },
  { id: 3, title: 'Tech Start: Lagos', creator: 'Chidi Nweke', raised: 15000, goal: 100000, category: 'Education', desc: 'Funding laptops and coding bootcamps for 500 underserved youths.' },
  { id: 4, title: 'Rural Clinic Solar', creator: 'Dr. Santos', raised: 8200, goal: 15000, category: 'Health', desc: 'Installing solar panels to keep vaccines refrigerated at our rural clinic.' },
];

export default function DiscoverPage() {
  return (
    <div className="overview-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Discover Campaigns</h1>
          <div className="page-sub">Find and support projects that matter to you.</div>
        </div>
      </div>

      <div className="campaign-grid">
        {LIVE_CAMPAIGNS.map(c => (
          <div key={c.id} className="campaign-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="cmp-header">
              <span className="cmp-category">{c.category}</span>
              <span className="cmp-status active">● Live</span>
            </div>
            <h3 className="cmp-title" style={{ marginTop: 12, marginBottom: 4 }}>{c.title}</h3>
            <div className="s-hint" style={{ marginBottom: 12 }}>by {c.creator}</div>
            
            <p style={{ color: 'var(--w50)', fontSize: 14, lineHeight: 1.5, marginBottom: 20, flex: 1 }}>
              {c.desc}
            </p>

            <div className="cmp-progress-wrap" style={{ marginBottom: 16 }}>
              <div className="sc-progress-bar"><div className="sc-progress-fill" style={{ width: `${Math.round((c.raised/c.goal)*100)}%` }}></div></div>
              <div className="cmp-progress-nums">
                <span>${c.raised.toLocaleString()} raised</span>
                <span>{Math.round((c.raised/c.goal)*100)}%</span>
              </div>
            </div>

            <Link href={`/backer/donate/${c.id}`} className="btn-primary" style={{ width: '100%', textAlign: 'center', justifyContent: 'center', display: 'flex', textDecoration: 'none' }}>
              Support this campaign
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
