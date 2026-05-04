import Link from 'next/link';
import HomeScripts from '../HomeScripts';
import './how-it-works.css';

const creatorSteps = [
  {
    label: 'Build',
    title: 'Create your campaign',
    text: 'Add your story, funding goal, category, image, and payout preference. OneRaise gives every campaign a clean page that is ready to share.',
  },
  {
    label: 'Verify',
    title: 'Earn trust before launch',
    text: 'Creators can add identity, payout, and campaign details so backers understand who is raising money and how funds will be used.',
  },
  {
    label: 'Launch',
    title: 'Share one global link',
    text: 'Send supporters to one page where they can donate by card, local transfer, crypto, or Jupiter-routed Solana tokens.',
  },
  {
    label: 'Receive',
    title: 'Track and withdraw funds',
    text: 'The dashboard records donations, backers, settlement assets, payout methods, and withdrawal status in one place.',
  },
];

const backerSteps = [
  'Choose a campaign and donation amount.',
  'Pick a payment method that works in your region.',
  'Review the processing details before confirming.',
  'Track your donation and campaign progress after payment.',
];

const rails = [
  {
    name: 'Card checkout',
    detail: 'MoonPay-backed card flow for supporters who want a familiar payment experience.',
  },
  {
    name: 'Local transfers',
    detail: 'Busha-powered local rails for supported regional bank and mobile money flows.',
  },
  {
    name: 'Crypto deposits',
    detail: 'Support for stablecoin and crypto deposits with generated instructions and status checks.',
  },
  {
    name: 'Any-token donations',
    detail: 'Jupiter quotes let donors route SOL, JUP, BONK, WIF, USDC, or custom Solana mints into campaign USDC.',
  },
];

const trustItems = [
  'Creator and payout verification',
  'Donation status tracking',
  'Campaign reports for suspicious activity',
  'Optional protected escrow flows',
  'Clear donor records and receipts',
  'Transparent campaign progress',
];

export const metadata = {
  title: 'How OneRaise Works',
  description: 'Learn how creators raise funds and backers donate globally on OneRaise.',
};

export default function HowItWorksPage() {
  return (
    <main className="how-page">
      <HomeScripts />

      <nav id="main-nav" className="how-nav">
        <Link href="/" className="nav-logo">One<span>Raise</span></Link>
        <ul className="nav-links">
          <li><Link href="/explore">Explore</Link></li>
          <li><Link href="/protect">Protect</Link></li>
          <li><Link href="/how-it-works" className="active">How it works</Link></li>
          <li><Link href="/#features">Features</Link></li>
          <li><Link href="/#community">Community</Link></li>
        </ul>
        <div className="nav-actions">
          <Link href="/auth?mode=signin" className="btn-ghost-nav">Sign in</Link>
          <Link href="/join" className="btn-primary-nav">Start a campaign</Link>
        </div>
        <button className="hamburger" id="hamburger" aria-label="Menu" aria-expanded="false" aria-controls="mobile-menu">
          <span></span><span></span><span></span>
        </button>
      </nav>

      <div className="mobile-menu" id="mobile-menu">
        <Link href="/explore">Explore</Link>
        <Link href="/protect">Protect</Link>
        <Link href="/how-it-works">How it works</Link>
        <Link href="/#features">Features</Link>
        <Link href="/#community">Community</Link>
        <div className="mob-btns">
          <Link href="/auth?mode=signin" className="btn-ghost-nav">Sign in</Link>
          <Link href="/join" className="btn-primary-nav">Start campaign</Link>
        </div>
      </div>

      <section className="how-hero">
        <div className="how-hero-copy">
          <span className="how-eyebrow">How it works</span>
          <h1>From campaign page to confirmed donation.</h1>
          <p>
            OneRaise helps creators raise from global supporters without forcing every donor into the same currency, country, or payment method.
          </p>
          <div className="how-actions">
            <Link href="/join" className="how-primary">
              Start a campaign
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
            <Link href="/explore" className="how-secondary">Explore campaigns</Link>
          </div>
        </div>

        <div className="how-summary-panel" aria-label="OneRaise funding flow preview">
          <div className="summary-header">
            <span>Donation route</span>
            <strong>Any token to campaign funds</strong>
          </div>
          <div className="route-stack">
            <div><span>Donor pays</span><strong>SOL, card, bank, or crypto</strong></div>
            <div><span>OneRaise records</span><strong>Campaign, donor, provider, status</strong></div>
            <div><span>Creator receives</span><strong>Tracked balance and payout options</strong></div>
          </div>
          <div className="summary-meter"><span /></div>
        </div>
      </section>

      <section className="how-section">
        <div className="how-section-heading">
          <span className="how-eyebrow">For creators</span>
          <h2>Launch with the pieces backers expect.</h2>
        </div>
        <div className="creator-flow">
          {creatorSteps.map((step, index) => (
            <article className="creator-step" key={step.title}>
              <div className="step-index">{index + 1}</div>
              <span>{step.label}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="how-section split-section">
        <div>
          <span className="how-eyebrow">For backers</span>
          <h2>Donation flow stays simple.</h2>
          <p className="section-copy">
            Backers should not need to understand your payout setup. They choose an amount, pick a rail, and OneRaise handles the payment instructions, quote, or checkout handoff.
          </p>
        </div>
        <div className="backer-checklist">
          {backerSteps.map((step, index) => (
            <div className="check-row" key={step}>
              <span>{index + 1}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="how-section">
        <div className="how-section-heading wide">
          <span className="how-eyebrow">Payment rails</span>
          <h2>Multiple ways to support one campaign.</h2>
          <p>OneRaise is built for cross-border fundraising, so campaigns can accept support from donors who have different wallets, banks, and currencies.</p>
        </div>
        <div className="rails-grid">
          {rails.map((rail) => (
            <article className="rail-card" key={rail.name}>
              <h3>{rail.name}</h3>
              <p>{rail.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="how-section trust-band">
        <div>
          <span className="how-eyebrow">Trust layer</span>
          <h2>Backers need confidence before they give.</h2>
          <p>
            Campaign pages, payment records, reports, and verification flows work together so the platform can show progress without hiding risk.
          </p>
        </div>
        <div className="trust-grid">
          {trustItems.map((item) => (
            <div className="trust-pill" key={item}>{item}</div>
          ))}
        </div>
      </section>

      <section className="how-final">
        <span className="how-eyebrow">Ready</span>
        <h2>Create the page, share the link, track every donation.</h2>
        <p>Start with a standard campaign, then add protected funding and advanced payout flows when the campaign needs more oversight.</p>
        <Link href="/join" className="how-primary">Start a campaign</Link>
      </section>
    </main>
  );
}
