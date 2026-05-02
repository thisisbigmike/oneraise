import Link from 'next/link';
import HomeScripts from '../HomeScripts';
import './protect.css';

const modes = [
  {
    title: 'Protected Crowdfunding',
    desc: 'Backers fund a campaign in USDT while funds stay refundable until the project reaches its threshold or passes verification.',
    stat: 'Refundable before unlock',
  },
  {
    title: 'Emergency Aid Escrow',
    desc: 'Medical and urgent community campaigns release funds only after document, vendor, or verifier approval.',
    stat: 'Verifier-controlled release',
  },
  {
    title: 'Grant Distribution',
    desc: 'DAOs, NGOs, and hackathons distribute stablecoin grants with proof-of-work, milestones, and payout tracking.',
    stat: 'Milestone-based payouts',
  },
];

const flow = [
  { label: 'Deposit', value: 'Backers or sponsors fund escrow in USDT' },
  { label: 'Verify', value: 'Threshold, documents, or proof-of-work is reviewed' },
  { label: 'Release', value: 'Approved funds unlock to creator, vendor, or grantee' },
  { label: 'Refund', value: 'Failed campaigns keep refunds available to backers' },
];

const ledger = [
  { name: 'Medical Aid: Abuja surgery', status: 'Under review', amount: '$18,420', tone: 'pending' },
  { name: 'Solar creator campaign', status: 'Threshold met', amount: '$42,900', tone: 'ready' },
  { name: 'Builder grant cohort', status: 'Milestone 2 paid', amount: '$12,000', tone: 'paid' },
];

export const metadata = {
  title: 'OneRaise Protect',
  description: 'USDT escrow, verification, refunds, and milestone payouts for trusted crowdfunding and grant distribution.',
};

export default function ProtectPage() {
  return (
    <main className="protect-page">
      <HomeScripts />

      <nav id="main-nav" className="protect-nav">
        <Link href="/" className="nav-logo">One<span>Raise</span></Link>
        <ul className="nav-links">
          <li><Link href="/explore">Explore</Link></li>
          <li><Link href="/protect" className="active">Protect</Link></li>
          <li><Link href="/about">How it works</Link></li>
          <li><Link href="/#features">Features</Link></li>
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
        <Link href="/about">How it works</Link>
        <Link href="/#features">Features</Link>
        <div className="mob-btns">
          <Link href="/auth?mode=signin" className="btn-ghost-nav">Sign in</Link>
          <Link href="/join" className="btn-primary-nav">Start campaign</Link>
        </div>
      </div>

      <section className="protect-hero">
        <div className="protect-grid-bg" aria-hidden="true" />
        <div className="protect-hero-copy">
          <div className="protect-eyebrow">
            <span className="protect-dot" />
            OneRaise Protect
          </div>
          <h1>
            Backer-protected
            <br />
            funding for
            <br />
            high-trust
            <br />
            campaigns.
          </h1>
          <p>
            Add USDT escrow, verification, milestone releases, refunds, and Raenest-ready payout destinations to crowdfunding, emergency aid, and grant distribution.
          </p>
          <div className="protect-actions">
            <Link href="/join" className="protect-primary">
              Start protected campaign
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
            <Link href="#protect-flow" className="protect-secondary">See how it works</Link>
          </div>
        </div>

        <div className="protect-console" aria-label="OneRaise Protect escrow preview">
          <div className="console-header">
            <div>
              <span className="console-kicker">Escrow balance</span>
              <strong>$73,320 USDT</strong>
            </div>
            <span className="console-status">Protected</span>
          </div>
          <div className="console-meter">
            <span style={{ width: '72%' }} />
          </div>
          <div className="console-stats">
            <div><span>Refundable</span><strong>$18.4k</strong></div>
            <div><span>Unlocked</span><strong>$42.9k</strong></div>
            <div><span>Paid</span><strong>$12.0k</strong></div>
          </div>
          <div className="ledger-list">
            {ledger.map((item) => (
              <div className="ledger-row" key={item.name}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.status}</span>
                </div>
                <div className={`ledger-pill ${item.tone}`}>{item.amount}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="protect-section" id="protect-flow">
        <div className="section-heading">
          <span className="protect-eyebrow">One escrow engine</span>
          <h2>Three ways to move funds with accountability.</h2>
          <p>Each mode uses the same protected funding lifecycle, so OneRaise can support creators, urgent aid cases, and grant programs without fragmenting the product.</p>
        </div>

        <div className="protect-modes">
          {modes.map((mode) => (
            <article className="protect-mode" key={mode.title}>
              <div className="mode-stat">{mode.stat}</div>
              <h3>{mode.title}</h3>
              <p>{mode.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="protect-section protect-flow-band">
        <div className="section-heading compact">
          <span className="protect-eyebrow">Escrow lifecycle</span>
          <h2>Clear rules before money moves.</h2>
        </div>

        <div className="flow-grid">
          {flow.map((step, index) => (
            <div className="flow-step" key={step.label}>
              <div className="flow-index">{index + 1}</div>
              <h3>{step.label}</h3>
              <p>{step.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="protect-section protect-proof">
        <div>
          <span className="protect-eyebrow">Built for the hackathon tracks</span>
          <h2>USDT escrow first. Raenest and Busha where they make sense.</h2>
        </div>
        <div className="proof-grid">
          <div className="proof-item">
            <strong>Tether track</strong>
            <span>USDT is the escrow and grant distribution asset.</span>
          </div>
          <div className="proof-item">
            <strong>Raenest track</strong>
            <span>Recipients can use Raenest Solana stablecoin addresses for settlement and off-ramp.</span>
          </div>
          <div className="proof-item">
            <strong>Busha integration</strong>
            <span>Keep Busha for payment instructions, status tracking, and supported local rails.</span>
          </div>
        </div>
      </section>

      <section className="protect-cta">
        <div>
          <span className="protect-eyebrow">Next product step</span>
          <h2>Launch trusted campaigns with refunds, verification, and milestone payouts.</h2>
        </div>
        <Link href="/join" className="protect-primary">Create with Protect</Link>
      </section>
    </main>
  );
}
