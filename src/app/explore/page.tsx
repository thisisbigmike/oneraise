'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CAMPAIGN_SEED_LIST, getCampaignPct } from '@/lib/campaign-seeds';
import './explore.css';

export default function ExplorePage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [category, setCategory] = useState('All');
  const [sortOrder, setSortOrder] = useState('Trending');

  const categories = ['All', 'Technology', 'Social Impact', 'Education', 'Health'];
  const sortOptions = ['Trending', 'Newest', 'Most Funded', 'Ending Soon'];

  // Filter and sort the campaigns
  const filteredCampaigns = useMemo(() => {
    let result = [...CAMPAIGN_SEED_LIST];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.title.toLowerCase().includes(q) || 
        c.desc.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      );
    }

    if (category !== 'All') {
      result = result.filter(c => c.category === category);
    }

    // Sorting logic mock
    if (sortOrder === 'Newest') {
      result = result.sort((a, b) => b.id - a.id);
    } else if (sortOrder === 'Most Funded') {
      result = result.sort((a, b) => b.raised - a.raised);
    } else if (sortOrder === 'Ending Soon') {
      result = result.sort((a, b) => a.daysLeft - b.daysLeft);
    }

    return result;
  }, [searchQuery, category, sortOrder]);

  const formatCompactGoal = (value: number) => (value >= 1000 && value % 1000 === 0 ? `$${value / 1000}k goal` : `$${value.toLocaleString()} goal`);

  return (
    <div className="explore-page">
      <nav id="main-nav" style={{ position: 'sticky', top: 0, background: '#0a0a0a', borderBottom: '1px solid rgba(255,255,255,0.05)', zIndex: 100 }}>
        <Link href="/" className="nav-logo">One<span>Raise</span></Link>
        <ul className="nav-links">
          <li><Link href="/explore" className="active">Explore</Link></li>
          <li><Link href="/about">How it works</Link></li>
          <li><Link href="/#features">Features</Link></li>
          <li><Link href="/#community">Community</Link></li>
        </ul>
        <div className="nav-actions">
          <Link href="/auth?mode=signin" className="btn-ghost-nav">Sign in</Link>
          <Link href="/join" className="btn-primary-nav">Start a campaign</Link>
        </div>
      </nav>

      <main className="explore-container">
        <div className="explore-header">
          <h1 className="explore-title">Discover Campaigns</h1>
          <p className="explore-subtitle">Find and support the ideas that matter to you.</p>
        </div>

        <div className="explore-filters">
          <div className="filter-group search-group">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input 
              type="text" 
              placeholder="Search campaigns..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="explore-search-input"
            />
          </div>

          <div className="filter-group">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="explore-select">
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="explore-select">
              {sortOptions.map(sort => <option key={sort} value={sort}>{sort}</option>)}
            </select>
          </div>
        </div>

        <div className="campaigns-grid" style={{ marginTop: '40px' }}>
          {filteredCampaigns.length > 0 ? (
            filteredCampaigns.map((campaign, i) => (
              <Link href={`/campaign/${campaign.id}`} key={campaign.id} className={`c-card reveal visible`} style={{ animationDelay: `${i * 0.1}s` }}>
                <div className={`c-card-img c${(i % 3) + 1}`}>
                  {/* Generic placeholder for campaign image */}
                </div>
                <div className="c-card-body">
                  <div className="c-card-top">
                    <span className="c-tag">{campaign.category}</span>
                    <span className="c-flag">🌍 Global</span>
                  </div>
                  <div className="c-title">{campaign.title}</div>
                  <div className="c-desc">{campaign.desc}</div>
                  <div className="c-progress-track">
                    <div className="c-progress-fill" style={{ width: `${getCampaignPct(campaign.raised, campaign.goal)}%` }}></div>
                  </div>
                  <div className="c-stats">
                    <div>
                      <div className="c-raised">${campaign.raised.toLocaleString()}</div>
                      <div className="c-raised-sub">of {formatCompactGoal(campaign.goal)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="c-pct">{getCampaignPct(campaign.raised, campaign.goal)}%</div>
                      <div className="c-days">{campaign.daysLeft} days left</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="no-results">
              <h3>No campaigns found.</h3>
              <p>Try adjusting your search or filters.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
