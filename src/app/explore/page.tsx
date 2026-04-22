import Link from 'next/link';
import './explore.css';
import { getCachedCampaignsList } from '@/lib/campaigns-data';
import ExploreClient from './ExploreClient';

export default async function ExplorePage(props: { searchParams?: Promise<{ q?: string }> }) {
  const searchParams = await props.searchParams;
  const initialQuery = searchParams?.q || '';
  const allCampaigns = await getCachedCampaignsList();
  
  // Cast campaigns to the type expected by ExploreClient
  const campaigns = allCampaigns.map(c => ({
    ...c,
    slug: c.slug,
    daysLeft: c.daysLeft || 30, // Mock days left if undefined
  }));

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

      <ExploreClient initialQuery={initialQuery} campaigns={campaigns} />
    </div>
  );
}
