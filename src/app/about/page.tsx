'use client';

import { useState } from 'react';
import Link from 'next/link';
import './about.css';

export default function AboutPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      question: "What is OneRaise?",
      answer: "OneRaise is a global crowdfunding platform that connects creators, entrepreneurs, and changemakers with a global community of backers. We make it easy to raise funds for your ideas, regardless of your location."
    },
    {
      question: "How do the fees work?",
      answer: "Your first campaign on OneRaise runs with a 0% platform fee. We believe in helping you get off the ground. For subsequent campaigns, we charge a competitive 5% platform fee. Standard payment processing fees (typically 2.9% + $0.30) still apply."
    },
    {
      question: "Is my payment information secure?",
      answer: "Yes. All payments are processed securely through industry-leading providers like Stripe and Moonpay. We never store your full credit card information on our servers, and all connections use 256-bit SSL encryption."
    },
    {
      question: "When do creators get their funds?",
      answer: "Funds are transferred directly to the creator's account as soon as they are processed, with no delays. Depending on the payment method, this can take anywhere from instantly to a few business days."
    },
    {
      question: "What is the Verified Creator badge?",
      answer: "The Verified Creator badge indicates that the campaign creator has undergone our strict identity and background verification process. This boosts trust and typically leads to higher backer conversion."
    }
  ];

  return (
    <div className="about-page">
      <nav id="main-nav" style={{ position: 'sticky', top: 0, background: '#0a0a0a', borderBottom: '1px solid rgba(255,255,255,0.05)', zIndex: 100 }}>
        <Link href="/" className="nav-logo">One<span>Raise</span></Link>
        <ul className="nav-links">
          <li><Link href="/explore">Explore</Link></li>
          <li><Link href="/about" className="active">How it works</Link></li>
          <li><Link href="/#features">Features</Link></li>
          <li><Link href="/#community">Community</Link></li>
        </ul>
        <div className="nav-actions">
          <Link href="/auth?mode=signin" className="btn-ghost-nav">Sign in</Link>
          <Link href="/join" className="btn-primary-nav">Start a campaign</Link>
        </div>
      </nav>

      <main className="about-container">
        {/* Header */}
        <section className="about-header text-center">
          <span className="section-eyebrow">How it works</span>
          <h1 className="about-title">Fund your vision.<br />Change the world.</h1>
          <p className="about-subtitle">We believe great ideas can come from anywhere. Our mission is to ensure they can be funded from everywhere.</p>
        </section>

        {/* Steps Section */}
        <section className="about-steps">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>Create your campaign</h3>
            <p>Tell your story, set your funding goal, and add compelling images or video. Our editor makes it simple.</p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3>Share with the world</h3>
            <p>Launch your campaign and share it with your network. We'll also promote it to our global community.</p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3>Get funded securely</h3>
            <p>Receive funds directly to your account as backers support your idea. No hidden delays.</p>
          </div>
        </section>

        {/* Trust & Safety Section */}
        <section className="about-trust">
          <div className="trust-content">
            <span className="section-eyebrow">Trust & Safety</span>
            <h2>Built on a foundation of trust.</h2>
            <p className="trust-desc">We employ advanced security measures and strict verification processes so you can back projects with confidence.</p>
            
            <div className="trust-features">
              <div className="trust-feature">
                <div className="trust-icon">🔒</div>
                <div>
                  <h4>Bank-level Security</h4>
                  <p>256-bit SSL encryption and secure payment gateways protect every transaction.</p>
                </div>
              </div>
              <div className="trust-feature">
                <div className="trust-icon">🛡️</div>
                <div>
                  <h4>Verified Creators</h4>
                  <p>Our comprehensive identity verification ensures creators are who they say they are.</p>
                </div>
              </div>
              <div className="trust-feature">
                <div className="trust-icon">🌐</div>
                <div>
                  <h4>Global Compliance</h4>
                  <p>We comply with international regulations to ensure safe cross-border funding.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="trust-image">
            <div className="shield-graphic">
              <svg viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
            </div>
          </div>
        </section>

        {/* Fees Section */}
        <section className="about-fees text-center">
          <span className="section-eyebrow">Pricing</span>
          <h2>Transparent, creator-first pricing.</h2>
          
          <div className="fees-cards">
            <div className="fee-card featured-fee">
              <div className="fee-badge">First Campaign</div>
              <div className="fee-amount">0%</div>
              <div className="fee-label">Platform Fee</div>
              <p>We only grow when you grow. Start your first campaign with zero platform fees.</p>
              <div className="fee-divider"></div>
              <p className="fee-small">+ standard payment processing fees (2.9% + $0.30)</p>
            </div>
            
            <div className="fee-card">
              <div className="fee-amount">5%</div>
              <div className="fee-label">Platform Fee</div>
              <p>For your second campaign onwards, we charge a competitive flat fee.</p>
              <div className="fee-divider"></div>
              <p className="fee-small">+ standard payment processing fees (2.9% + $0.30)</p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="about-faq">
          <div className="faq-header text-center">
            <span className="section-eyebrow">FAQ</span>
            <h2>Frequently Asked Questions</h2>
          </div>
          
          <div className="faq-list">
            {faqs.map((faq, index) => (
              <div 
                key={index} 
                className={`faq-item ${openFaq === index ? 'open' : ''}`}
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
              >
                <div className="faq-question">
                  <h3>{faq.question}</h3>
                  <div className="faq-toggle">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {openFaq === index ? <polyline points="18 15 12 9 6 15"></polyline> : <polyline points="6 9 12 15 18 9"></polyline>}
                    </svg>
                  </div>
                </div>
                <div className="faq-answer">
                  <p>{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="about-cta text-center">
          <h2>Ready to bring your idea to life?</h2>
          <p>Join thousands of creators who have successfully funded their projects.</p>
          <Link href="/join" className="btn-primary-nav" style={{ padding: '16px 32px', fontSize: '1.1rem', marginTop: '20px' }}>
            Start your campaign
          </Link>
        </section>
      </main>
    </div>
  );
}
