import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | OneRaise',
  description: 'Terms of Service for OneRaise global crowdfunding platform covering creator campaigns, backer contributions, zero-fee terms, and payout policies.',
};

export default function TermsPage() {
  return (
    <div style={{ background: 'var(--bg-main, #0a110e)', color: 'var(--fg, #f5faf7)', minHeight: '100vh', padding: '60px 24px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
        <Link href="/" style={{ color: 'var(--teal-200, #5dcaa5)', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
          ← Back to OneRaise
        </Link>

        <h1 style={{ fontSize: 36, fontWeight: 800, marginTop: 24, marginBottom: 12, letterSpacing: '-0.02em' }}>
          Terms of Service
        </h1>
        <div style={{ color: 'var(--w50, rgba(245,250,247,0.5))', fontSize: 14, marginBottom: 40 }}>
          Last Updated: July 25, 2026 · Effective Date: July 25, 2026
        </div>

        <div style={{ lineHeight: 1.7, fontSize: 15, display: 'flex', flexDirection: 'column', gap: 28, color: 'var(--w80, rgba(245,250,247,0.85))' }}>
          <section>
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 12 }}>1. Agreement to Terms</h2>
            <p>
              These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you and <strong>OneRaise Inc.</strong> (&quot;OneRaise&quot;, &quot;we&quot;, &quot;us&quot;).
              By accessing or using <code>oneraiseapp.com</code>, creating an account, launching a campaign, or contributing to a campaign, you agree to be bound by these Terms.
            </p>
          </section>

          <section>
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 12 }}>2. Eligibility & Account Security</h2>
            <p>
              You must be at least 18 years old or the legal age of majority in your jurisdiction to create an account or launch a campaign on OneRaise.
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 12 }}>3. Creator Responsibilities & Verification</h2>
            <p>Creators launching campaigns on OneRaise agree to:</p>
            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
              <li>Provide accurate, truthful, and non-misleading information regarding campaign goals, story, and milestones.</li>
              <li>Complete identity verification (KYC) by providing valid government-issued documentation prior to receiving payouts.</li>
              <li>Fulfill all campaign promises, rewards, and milestone commitments made to backers.</li>
              <li>Use campaign funds solely for the stated purpose outlined in the approved campaign listing.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 12 }}>4. Platform Fees & Zero-Fee Offer</h2>
            <p>
              OneRaise offers <strong>0% platform fee on your first campaign</strong>. Standard third-party payment processing fees (e.g., Paystack, Busha, MoonPay, or network gas fees) still apply.
              Subsequent campaigns launched by the same account may be subject to standard platform service fees as displayed prior to campaign publication.
            </p>
          </section>

          <section>
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 12 }}>5. Backer Contributions & Refunds</h2>
            <p>
              Contributions made to campaigns represent voluntary support for creative ideas and projects.
              OneRaise provides automated refund protection for milestone-based campaigns where milestone conditions are not met, subject to platform refund protocols.
              Otherwise, contributions are non-refundable once disbursed to verified creators.
            </p>
          </section>

          <section>
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 12 }}>6. Prohibited Content & Activity</h2>
            <p>You may not use OneRaise to promote or fund:</p>
            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
              <li>Illegal goods, fraudulent schemes, counterfeit products, or money laundering activities.</li>
              <li>Hate speech, violence, harassment, or dangerous activities.</li>
              <li>Investment contracts or securities promises violating financial regulations.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 12 }}>7. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, OneRaise Inc. shall not be liable for any indirect, incidental, special, or consequential damages resulting from your use of the platform, third-party payment rail delays, or campaign outcomes.
            </p>
          </section>

          <section>
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 12 }}>8. Contact Information</h2>
            <p>
              For legal inquiries or notices regarding these Terms of Service, please email <a href="mailto:legal@oneraiseapp.com" style={{ color: 'var(--teal-200, #5dcaa5)' }}>legal@oneraiseapp.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
