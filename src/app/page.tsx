import Link from 'next/link';
import { getCachedCampaignsList, type CampaignListItem } from '@/lib/campaigns-data';
import HomeScripts from './HomeScripts';
import prisma from "@/lib/prisma";
import { CAMPAIGN_SEED_LIST } from "@/lib/campaign-seeds";
import { getStoredDonationCreditUsd } from "@/lib/currency";

type HomeDonation = {
  id: string;
  amount: number;
  currency: string | null;
  coverFee: boolean | null;
  provider: string | null;
  providerDataJson: string | null;
  donorEmail: string | null;
  createdAt: Date;
  donorName: string | null;
  isAnonymous: boolean;
  campaign: {
    title: string;
  };
};

async function getHomeStats() {
  try {
    const [activeCampaignsCount, allCompletedDonations] = await Promise.all([
      prisma.campaign.count({ where: { status: 'active' } }),
      prisma.donation.findMany({
        where: { status: 'completed' },
        select: { amount: true, currency: true, coverFee: true, provider: true, providerDataJson: true, donorEmail: true, id: true, createdAt: true, donorName: true, isAnonymous: true, campaign: { select: { title: true } } },
        orderBy: { createdAt: 'desc' }
      }),
    ]);

    const totalRaisedUsd = allCompletedDonations.reduce((sum, d) => sum + getStoredDonationCreditUsd(d), 0);
    const uniqueBackers = new Set(allCompletedDonations.map(d => d.donorEmail || d.id)).size;

    return {
      activeCampaignsCount,
      totalRaisedUsd,
      uniqueBackers,
      recentDonations: allCompletedDonations.slice(0, 5),
    };
  } catch (error) {
    console.warn("Unable to load live home stats; using seed campaign totals.", error);
    return {
      activeCampaignsCount: CAMPAIGN_SEED_LIST.filter((campaign) => campaign.status === 'active').length,
      totalRaisedUsd: CAMPAIGN_SEED_LIST.reduce((sum, campaign) => sum + campaign.raised, 0),
      uniqueBackers: CAMPAIGN_SEED_LIST.reduce((sum, campaign) => sum + campaign.backers, 0),
      recentDonations: [] as HomeDonation[],
    };
  }
}

export default async function Home() {
  const [allCampaigns, homeStats] = await Promise.all([
    getCachedCampaignsList(),
    getHomeStats(),
  ]);
  const landingCampaigns = allCampaigns.filter((campaign) => campaign.status !== 'draft').slice(0, 3);

  const formatStat = (num: number) => {
    if (num >= 1000000000) return { count: (num / 1000000000).toFixed(1), suffix: 'B' };
    if (num >= 1000000) return { count: (num / 1000000).toFixed(1), suffix: 'M' };
    if (num >= 1000) return { count: (num / 1000).toFixed(1), suffix: 'K' };
    return { count: num.toString(), suffix: '' };
  };

  const raisedStat = formatStat(homeStats.totalRaisedUsd);
  const campaignsStat = formatStat(homeStats.activeCampaignsCount);
  const backersStat = formatStat(homeStats.uniqueBackers);
  const successRate = homeStats.totalRaisedUsd > 0 ? 100 : 0; 

  const recentDonations = homeStats.recentDonations;

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    return `${Math.floor(hours / 24)} days ago`;
  };

  const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'OR';

  const campaignPct = (campaign: CampaignListItem) => campaign.pct;
  const formatCompactGoal = (value: number) => (value >= 1000 && value % 1000 === 0 ? `$${value / 1000}k goal` : `$${value?.toLocaleString()} goal`);

  return (
    <main>
      <HomeScripts />


{/*  NAV  */}
<nav id="main-nav">
  <Link href="/" className="nav-logo">One<span>Raise</span></Link>
  <ul className="nav-links">
    <li><Link href="/explore">Explore</Link></li>
    <li><Link href="/protect">Protect</Link></li>
    <li><Link href="/how-it-works">How it works</Link></li>
    <li><a href="#features">Features</a></li>
    <li><a href="#community">Community</a></li>
  </ul>
  <div className="nav-actions">
    <Link href="/auth?mode=signin" className="btn-ghost-nav">Sign in</Link>
    <Link href="/join" className="btn-primary-nav">Start a campaign</Link>
  </div>
  <button className="hamburger" id="hamburger" aria-label="Menu" aria-expanded="false" aria-controls="mobile-menu">
    <span></span><span></span><span></span>
  </button>
</nav>

{/*  MOBILE MENU  */}
<div className="mobile-menu" id="mobile-menu">
  <Link href="/explore">Explore</Link>
  <Link href="/protect">Protect</Link>
  <Link href="/how-it-works">How it works</Link>
  <a href="#features">Features</a>
  <a href="#community">Community</a>
  <div className="mob-btns">
    <Link href="/auth?mode=signin" className="btn-ghost-nav" style={{flex: '1', textAlign: 'center', justifyContent: 'center'}}>Sign in</Link>
    <Link href="/join" className="btn-primary-nav" style={{flex: '1', textAlign: 'center', justifyContent: 'center'}}>Start campaign</Link>
  </div>
</div>

{/*  HERO  */}
<section className="hero">
  <div className="aurora">
    <div className="blob blob1"></div>
    <div className="blob blob2"></div>
    <div className="blob blob3"></div>
  </div>
  <div className="hero-content">
    <div className="hero-eyebrow">
      <span className="dot"></span>
      Now live in 78 countries
    </div>
    <h1 className="hero-headline">
      Fund your<br/>
      <span className="hero-headline-rotate">
        <span className="rotate-words">
          <span className="rotate-word">idea.</span>
          <span className="rotate-word">dream.</span>
          <span className="rotate-word">startup.</span>
          <span className="rotate-word">community.</span>
        </span>
      </span>
    </h1>
    <p className="hero-sub">OneRaise connects creators, entrepreneurs, and changemakers with a global community of 2.1 million backers — across every border, currency, and timezone.</p>
    
    <form className="hero-search-form" action="/explore" method="GET">
      <div className="hero-search-row">
        <input className="hero-search-input" type="text" name="q" placeholder="Search campaigns, categories, or locations..." />
        <button type="submit" className="hero-search-submit">Search</button>
      </div>
    </form>

    <div className="hero-actions">
      <Link href="/join" className="btn-hero-primary">
        Start a campaign
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </Link>
      <Link href="/explore" className="btn-hero-secondary">
        Explore campaigns
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </Link>
    </div>
    <div className="hero-trust">
      <div className="trust-item">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.5 4h4.2l-3.4 2.5 1.3 4L7 9 3.4 11.5l1.3-4L1.3 5H5.5z" fill="#1D9E75"/></svg>
        Trusted by 148K creators
      </div>
      <div className="trust-sep"></div>
      <div className="trust-item">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="4" width="10" height="8" rx="2" stroke="#1D9E75" strokeWidth="1.2"/><path d="M5 4V3a2 2 0 014 0v1" stroke="#1D9E75" strokeWidth="1.2" strokeLinecap="round"/></svg>
        256-bit SSL secured
      </div>
      <div className="trust-sep"></div>
      <div className="trust-item">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="#1D9E75" strokeWidth="1.2"/><path d="M4.5 7l2 2 3-3" stroke="#1D9E75" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        0% platform fee first campaign
      </div>
    </div>
  </div>
</section>

{/*  STATS  */}
<div className="stats-section">
  <div className="stats-strip">
    <div className="stat-cell reveal">
      <div className="stat-num" data-count={raisedStat.count} data-suffix={raisedStat.suffix} data-prefix="$"><span className="accent">$</span>0</div>
      <div className="stat-lbl">Total raised</div>
      <div className="stat-delta">↑ True database metrics</div>
    </div>
    <div className="stat-cell reveal reveal-delay-1">
      <div className="stat-num" data-count={campaignsStat.count} data-suffix={campaignsStat.suffix}>0</div>
      <div className="stat-lbl">Active campaigns</div>
      <div className="stat-delta">↑ True database metrics</div>
    </div>
    <div className="stat-cell reveal reveal-delay-2">
      <div className="stat-num" data-count={backersStat.count} data-suffix={backersStat.suffix}>0</div>
      <div className="stat-lbl">Global backers</div>
      <div className="stat-delta">↑ True database metrics</div>
    </div>
    <div className="stat-cell reveal reveal-delay-3">
      <div className="stat-num" data-count={successRate.toString()} data-suffix="%">0%</div>
      <div className="stat-lbl">Success rate</div>
      <div className="stat-delta">Industry avg is 42%</div>
    </div>
  </div>
</div>

{/*  MARQUEE  */}
<div className="marquee-section">
  <div className="marquee-track" id="marquee">
    <div className="marquee-item"><span className="flag">🇳🇬</span> Nigeria</div>
    <div className="marquee-item"><span className="flag">🇩🇪</span> Germany</div>
    <div className="marquee-item"><span className="flag">🇧🇷</span> Brazil</div>
    <div className="marquee-item"><span className="flag">🇯🇵</span> Japan</div>
    <div className="marquee-item"><span className="flag">🇮🇳</span> India</div>
    <div className="marquee-item"><span className="flag">🇺🇸</span> United States</div>
    <div className="marquee-item"><span className="flag">🇿🇦</span> South Africa</div>
    <div className="marquee-item"><span className="flag">🇨🇿</span> Czech Republic</div>
    <div className="marquee-item"><span className="flag">🇦🇺</span> Australia</div>
    <div className="marquee-item"><span className="flag">🇰🇪</span> Kenya</div>
    <div className="marquee-item"><span className="flag">🇫🇷</span> France</div>
    <div className="marquee-item"><span className="flag">🇦🇷</span> Argentina</div>
    <div className="marquee-item"><span className="flag">🇳🇬</span> Nigeria</div>
    <div className="marquee-item"><span className="flag">🇩🇪</span> Germany</div>
    <div className="marquee-item"><span className="flag">🇧🇷</span> Brazil</div>
    <div className="marquee-item"><span className="flag">🇯🇵</span> Japan</div>
    <div className="marquee-item"><span className="flag">🇮🇳</span> India</div>
    <div className="marquee-item"><span className="flag">🇺🇸</span> United States</div>
    <div className="marquee-item"><span className="flag">🇿🇦</span> South Africa</div>
    <div className="marquee-item"><span className="flag">🇨🇿</span> Czech Republic</div>
    <div className="marquee-item"><span className="flag">🇦🇺</span> Australia</div>
    <div className="marquee-item"><span className="flag">🇰🇪</span> Kenya</div>
    <div className="marquee-item"><span className="flag">🇫🇷</span> France</div>
    <div className="marquee-item"><span className="flag">🇦🇷</span> Argentina</div>
  </div>
</div>

{/*  HOW IT WORKS  */}
<section className="how-section" id="how">
  <div className="how-grid">
    <div>
      <span className="section-eyebrow reveal">How it works</span>
      <h2 className="section-title reveal reveal-delay-1">From idea to funded<br/>in 4 steps.</h2>
      <p className="section-sub reveal reveal-delay-2">No experience needed. No hidden fees. Just your idea and our global community of backers.</p>
      <div className="steps-list" style={{marginTop: '40px'}}>
        <div className="step-item reveal reveal-delay-1">
          <div className="step-connector"></div>
          <div className="step-num-wrap"><div className="step-num done">✓</div></div>
          <div className="step-body">
            <div className="step-title">Create your account</div>
            <div className="step-desc">Verified in 30 seconds. No credit card required to get started.</div>
          </div>
        </div>
        <div className="step-item reveal reveal-delay-2">
          <div className="step-connector"></div>
          <div className="step-num-wrap"><div className="step-num done">✓</div></div>
          <div className="step-body">
            <div className="step-title">Build your campaign</div>
            <div className="step-desc">Add your story, set a goal, and choose your duration — our editor makes it easy.</div>
          </div>
        </div>
        <div className="step-item reveal reveal-delay-3">
          <div className="step-connector"></div>
          <div className="step-num-wrap"><div className="step-num">3</div></div>
          <div className="step-body">
            <div className="step-title">Launch to the world</div>
            <div className="step-desc">Go live instantly — 2.1M backers across 78 countries can discover your campaign immediately.</div>
          </div>
        </div>
        <div className="step-item reveal reveal-delay-4">
          <div className="step-num-wrap"><div className="step-num">4</div></div>
          <div className="step-body">
            <div className="step-title">Collect your funds</div>
            <div className="step-desc">Funds transfer directly to your account. No delays, no middlemen, no surprises.</div>
          </div>
        </div>
      </div>
    </div>
    <div className="reveal reveal-delay-2">
      <div className="globe-wrap">
        <div className="globe-ring"></div>
        <div className="globe-ring globe-ring2"></div>
        <div className="globe-canvas-wrap">
          <canvas id="globe"></canvas>
        </div>
      </div>
    </div>
  </div>
</section>

{/*  CAMPAIGNS  */}
<section className="campaigns-section" id="campaigns">
  <div className="campaigns-header">
    <div>
      <span className="section-eyebrow reveal">Live now</span>
      <h2 className="section-title reveal reveal-delay-1">Ideas finding<br/>their backers.</h2>
    </div>
    <a href="/explore" className="see-all reveal reveal-delay-2">View all campaigns →</a>
  </div>
  {landingCampaigns.length > 0 ? (
    <div className="campaigns-grid">
      {landingCampaigns.map((campaign, index) => (
        <div key={campaign.id} className={`c-card ${index === 0 ? 'featured reveal' : `reveal reveal-delay-${index}`}`}>
          <div className={`c-card-img c${index + 1}`}>
            {campaign.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={campaign.image} alt={`${campaign.title} cover`} />
            ) : index === 0 && (
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="40" r="32" stroke="#1D9E75" strokeWidth="1.5" strokeOpacity="0.4"/>
                <circle cx="40" cy="40" r="20" stroke="#5DCAA5" strokeWidth="1" strokeOpacity="0.3"/>
                <path d="M40 20v28M40 20l-8 8M40 20l8 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="40" cy="52" r="4" fill="#1D9E75" opacity="0.8"/>
              </svg>
            )}
            {!campaign.image && index === 1 && (
              <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                <path d="M10 50L30 10l20 40H10z" stroke="#5DCAA5" strokeWidth="1.5" strokeOpacity="0.5"/>
                <path d="M20 50L30 30l10 20H20z" fill="#1D9E75" opacity="0.4"/>
              </svg>
            )}
            {!campaign.image && index === 2 && (
              <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                <circle cx="30" cy="24" r="12" stroke="#EF9F27" strokeWidth="1.5" strokeOpacity="0.5"/>
                <path d="M18 50c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="#EF9F27" strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round"/>
              </svg>
            )}
          </div>
          <div className="c-card-body">
            <div className="c-card-top">
              <span className="c-tag">{campaign.category}</span>
              <span className="c-flag">🌍 Global</span>
            </div>
            <div className="c-title">{campaign.title}</div>
            <div className="c-desc">{campaign.desc}</div>
            <div className="c-progress-track"><div className="c-progress-fill" style={{width: `${campaignPct(campaign)}%`}}></div></div>
            <div className="c-stats">
              <div>
                <div className="c-raised">${campaign.raised.toLocaleString()}</div>
                <div className="c-raised-sub">raised of {formatCompactGoal(campaign.goal)}</div>
              </div>
              <div style={{textAlign: 'right'}}>
                <div className="c-pct">{campaignPct(campaign)}%</div>
                <div className="c-days">{campaign.daysLeft} days left</div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--w50)' }}>
      <p>No active campaigns found in the database yet.</p>
      <Link href="/join" className="btn-hero-primary" style={{ marginTop: '20px', display: 'inline-flex' }}>Start the first campaign</Link>
    </div>
  )}
</section>

{/*  BACKER FEED + TESTIMONIALS  */}
<section className="feed-section" id="community">
  <div>
    <span className="section-eyebrow reveal">Live activity</span>
    <h2 className="section-title reveal reveal-delay-1">A community backing<br/>the world&apos;s ideas.</h2>
  </div>
  <div className="feed-layout">
    <div>
      <div className="feed-list" id="feed-list">
        {recentDonations.length > 0 ? (
          recentDonations.map((d, i) => {
            const name = d.isAnonymous ? 'Anonymous' : (d.donorName || 'Backer');
            return (
              <div className="feed-item" key={d.id}>
                <div className={`feed-avatar av-${['a', 'b', 'c', 'd'][i % 4]}`}>{getInitials(name)}</div>
                <div className="feed-text">
                  <div className="feed-name">{name}</div>
                  <div className="feed-action">backed {d.campaign.title}</div>
                </div>
                <div>
                  <div className="feed-amount">${getStoredDonationCreditUsd(d).toLocaleString()}</div>
                  <div className="feed-time">{formatTimeAgo(d.createdAt)}</div>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ color: 'var(--w50)', fontSize: '14px', fontStyle: 'italic', padding: '20px' }}>
            No recent activity yet. Be the first to back a campaign!
          </div>
        )}
      </div>
    </div>
    <div className="testimonials">
      <div className="testi-card reveal">
        <div className="testi-stars">★★★★★</div>
        <div className="testi-quote">&quot;OneRaise made it effortless to support ideas from across Africa. My money reached the creator in minutes — not weeks.&quot;</div>
        <div className="testi-person">
          <div className="feed-avatar av-a" style={{width: '38px', height: '38px'}}>AK</div>
          <div>
            <div className="testi-name">Amara Kone</div>
            <div className="testi-meta">Backer · Lagos, Nigeria · 12 campaigns backed</div>
          </div>
        </div>
      </div>
      <div className="testi-card reveal reveal-delay-1">
        <div className="testi-stars">★★★★★</div>
        <div className="testi-quote">&quot;I backed a solar project in Kenya from my living room in Prague. This is what global community actually looks like.&quot;</div>
        <div className="testi-person">
          <div className="feed-avatar av-b" style={{width: '38px', height: '38px'}}>JD</div>
          <div>
            <div className="testi-name">Jana Dvořák</div>
            <div className="testi-meta">Backer · Prague, Czech Republic · 8 campaigns</div>
          </div>
        </div>
      </div>
      <div className="testi-card reveal reveal-delay-2">
        <div className="testi-stars">★★★★★</div>
        <div className="testi-quote">&quot;We raised $68k in 16 days. The campaign tools are intuitive and the backer community is genuinely engaged.&quot;</div>
        <div className="testi-person">
          <div className="feed-avatar av-c" style={{width: '38px', height: '38px'}}>TC</div>
          <div>
            <div className="testi-name">Tunde Coker</div>
            <div className="testi-meta">Creator · SolarPack Mini Campaign</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

{/*  FEATURES  */}
<section className="features-section" id="features">
  <div style={{maxWidth: '600px'}}>
    <span className="section-eyebrow reveal">Why OneRaise</span>
    <h2 className="section-title reveal reveal-delay-1">Built for every creator,<br/>every country.</h2>
  </div>
  <div className="features-grid">
    <div className="feat-card reveal">
      <div className="feat-icon">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#1D9E75" strokeWidth="1.5" strokeOpacity="0.6"/><path d="M7 11l3 3 5-5" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <div className="feat-title">Zero fees, first campaign</div>
      <div className="feat-desc">Your first campaign runs with 0% platform fee. We only grow when you grow.</div>
    </div>
    <div className="feat-card reveal reveal-delay-1">
      <div className="feat-icon">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="5" width="16" height="12" rx="2" stroke="#1D9E75" strokeWidth="1.5"/><path d="M3 9h16" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </div>
      <div className="feat-title">Multi-currency payouts</div>
      <div className="feat-desc">Accept funding in 40+ currencies. Receive your payout in your local currency.</div>
    </div>
    <div className="feat-card reveal reveal-delay-2">
      <div className="feat-icon">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 3l2 6h6l-5 3.5 2 6L11 15l-5 3.5 2-6L3 9h6z" stroke="#1D9E75" strokeWidth="1.5" strokeLinejoin="round"/></svg>
      </div>
      <div className="feat-title">Smart campaign tools</div>
      <div className="feat-desc">AI-powered title, description, and goal suggestions based on successful campaigns in your category.</div>
    </div>
    <div className="feat-card reveal reveal-delay-1">
      <div className="feat-icon">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#1D9E75" strokeWidth="1.5"/><path d="M11 7v4l3 2" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </div>
      <div className="feat-title">Real-time analytics</div>
      <div className="feat-desc">Live dashboard tracking your backer locations, conversion rates, and funding velocity.</div>
    </div>
    <div className="feat-card reveal reveal-delay-2">
      <div className="feat-icon">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 11a7 7 0 1014 0A7 7 0 004 11z" stroke="#1D9E75" strokeWidth="1.5"/><path d="M9 11c0-3.5 1.5-6 2-6s2 2.5 2 6-1.5 6-2 6-2-2.5-2-6z" stroke="#1D9E75" strokeWidth="1.5"/><path d="M4 11h14" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </div>
      <div className="feat-title">Global discovery</div>
      <div className="feat-desc">Automatic translation and regional promotion puts your campaign in front of the right backers worldwide.</div>
    </div>
    <div className="feat-card reveal reveal-delay-3">
      <div className="feat-icon">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 3l1.5 4h4.5L13.5 10l1.5 4.5L11 12l-4 2.5L8.5 10 5 7h4.5z" stroke="#1D9E75" strokeWidth="1.5" strokeLinejoin="round"/></svg>
      </div>
      <div className="feat-title">Verified badge program</div>
      <div className="feat-desc">Earn a Verified Creator badge that boosts trust and increases backer conversion by up to 3×.</div>
    </div>
  </div>
</section>

{/*  CTA  */}
<section className="cta-section">
  <div className="cta-inner">
    <h2 className="cta-title reveal">Your idea deserves<br/><em>the world&apos;s</em> backing.</h2>
    <p className="cta-sub reveal reveal-delay-1">Join 148,000 creators who&apos;ve already launched on OneRaise. Your first campaign is free.</p>
    <div className="cta-actions reveal reveal-delay-2">
      <Link href="/join" className="btn-hero-primary" style={{fontSize: '15px', padding: '14px 28px'}}>Start your campaign →</Link>
      <a href="#" className="btn-hero-secondary" style={{fontSize: '15px', padding: '14px 28px'}}>Talk to our team</a>
    </div>
  </div>
</section>

{/*  FOOTER  */}
<footer>
  <div className="footer-grid">
    <div>
      <div className="footer-brand-name">One<span>Raise</span></div>
      <div className="footer-tagline">Fund anything, everywhere. Connecting creators and backers across every border since 2024.</div>
      <div className="footer-socials">
        <a href="#" className="social-btn">X</a>
        <a href="#" className="social-btn">in</a>
        <a href="#" className="social-btn">IG</a>
        <a href="#" className="social-btn">YT</a>
      </div>
    </div>
    <div>
      <div className="footer-col-title">Platform</div>
      <ul className="footer-links">
        <li><Link href="/explore">Explore campaigns</Link></li>
        <li><Link href="/protect">OneRaise Protect</Link></li>
        <li><Link href="/join">Start a campaign</Link></li>
        <li><Link href="/how-it-works">How it works</Link></li>
        <li><a href="#">Pricing</a></li>
        <li><a href="#">Success stories</a></li>
      </ul>
    </div>
    <div>
      <div className="footer-col-title">Company</div>
      <ul className="footer-links">
        <li><Link href="/about">About us</Link></li>
        <li><a href="#">Blog</a></li>
        <li><a href="#">Careers</a></li>
        <li><a href="#">Press kit</a></li>
        <li><a href="#">Partners</a></li>
      </ul>
    </div>
    <div>
      <div className="footer-col-title">Support</div>
      <ul className="footer-links">
        <li><a href="#">Help centre</a></li>
        <li><a href="#">Creator guide</a></li>
        <li><a href="#">Backer FAQs</a></li>
        <li><a href="#">Contact us</a></li>
        <li><a href="#">Trust & safety</a></li>
      </ul>
    </div>
  </div>
  <div className="footer-bottom">
    <div className="footer-copy">© 2026 OneRaise Inc. All rights reserved.</div>
    <div className="footer-legal">
      <a href="#">Privacy Policy</a>
      <a href="#">Terms of Service</a>
      <a href="#">Cookie Settings</a>
    </div>
  </div>
</footer>



    </main>
  );
}
