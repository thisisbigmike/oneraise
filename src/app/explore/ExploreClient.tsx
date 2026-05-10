'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { getCampaignPct } from '@/lib/campaign-seeds';
import CampaignCard from '@/components/ui/CampaignCard';
import CustomSelect from '@/components/ui/CustomSelect';

type ExploreCampaign = {
  id: number;
  slug?: string;
  title: string;
  image?: string | null;
  creator: string;
  raised: number;
  goal: number;
  backers?: number;
  pct?: number;
  category: string;
  desc: string;
  status?: string;
  daysLeft: number;
};

export default function ExploreClient({ initialQuery, campaigns }: { initialQuery: string, campaigns: ExploreCampaign[] }) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [category, setCategory] = useState('All');
  const [sortOrder, setSortOrder] = useState('Trending');

  const categories = ['All', 'Technology', 'Social Impact', 'Education', 'Health'];
  const sortOptions = ['Trending', 'Newest', 'Most Funded', 'Ending Soon'];

  // Filter and sort the campaigns
  const filteredCampaigns = useMemo(() => {
    let result = [...campaigns];

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
  }, [searchQuery, category, sortOrder, campaigns]);

  return (
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

        <div className="filter-group filter-select-group">
          <CustomSelect
            value={category}
            onChange={setCategory}
            options={categories.map(cat => ({ value: cat, label: cat }))}
          />
        </div>

        <div className="filter-group filter-select-group">
          <CustomSelect
            value={sortOrder}
            onChange={setSortOrder}
            options={sortOptions.map(sort => ({ value: sort, label: sort }))}
          />
        </div>
      </div>

      <div className="campaigns-grid" style={{ marginTop: '40px' }}>
        {filteredCampaigns.length > 0 ? (
          filteredCampaigns.map((campaign, i) => (
            <div key={campaign.id} className="reveal visible" style={{ animationDelay: `${i * 0.1}s` }}>
              <CampaignCard
                title={campaign.title}
                goal={campaign.goal}
                raised={campaign.raised}
                backers={campaign.backers || 0}
                daysLeft={campaign.daysLeft}
                status={campaign.status || 'active'}
                category={campaign.category}
                image={campaign.image}
                pct={campaign.pct ?? getCampaignPct(campaign.raised, campaign.goal)}
                actions={
                  <Link href={`/backer/donate/${campaign.slug || campaign.id}`} className="ucc-btn ucc-btn-primary">
                    Support this campaign
                  </Link>
                }
              />
            </div>
          ))
        ) : (
          <div className="no-results">
            <h3>No campaigns found.</h3>
            <p>Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
    </main>
  );
}
