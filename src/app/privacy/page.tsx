import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | OneRaise',
  description: 'Learn how OneRaise collects, uses, protects, and handles your personal data, identity verification records, and transaction security.',
};

export default function PrivacyPage() {
  return (
    <div style={{ background: 'var(--bg-main, #0a110e)', color: 'var(--fg, #f5faf7)', minHeight: '100vh', padding: '60px 24px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
        <Link href="/" style={{ color: 'var(--teal-200, #5dcaa5)', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
          ← Back to OneRaise
        </Link>

        <h1 style={{ fontSize: 36, fontWeight: 800, marginTop: 24, marginBottom: 12, letterSpacing: '-0.02em' }}>
          Privacy Policy
        </h1>
        <div style={{ color: 'var(--w50, rgba(245,250,247,0.5))', fontSize: 14, marginBottom: 40 }}>
          Last Updated: July 25, 2026 · Effective Date: July 25, 2026
        </div>

        <div style={{ lineHeight: 1.7, fontSize: 15, display: 'flex', flexDirection: 'column', gap: 28, color: 'var(--w80, rgba(245,250,247,0.85))' }}>
          <section>
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 12 }}>1. Introduction</h2>
            <p>
              Welcome to <strong>OneRaise</strong> (&quot;Company&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;). We operate the global crowdfunding platform available at <code>oneraiseapp.com</code> and related services.
              We are committed to respecting your privacy and protecting the personal data you share with us when launching campaigns, making contributions, or utilizing our blockchain and fiat infrastructure.
            </p>
          </section>

          <section>
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 12 }}>2. Data We Collect</h2>
            <p>Depending on your interaction with OneRaise, we collect the following categories of information:</p>
            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
              <li><strong>Account & Contact Data:</strong> Full name, email address, password hash, role selection (creator or backer), and country of origin.</li>
              <li><strong>Identity Verification (KYC) Data:</strong> Government-issued ID images, full legal name, and document metadata submitted during creator verification. Uploaded documents are stored securely in non-public storage with strict access controls.</li>
              <li><strong>Financial & Payment Data:</strong> Bank account resolution details, transaction references, wallet addresses (Solana/USDC), and payment status via integrated processors (Paystack, Busha, MoonPay, Jupiter).</li>
              <li><strong>Security & Technical Data:</strong> IP address, browser type, device identifiers, Cloudflare Turnstile security tokens, and access logs used for rate-limiting and anti-fraud protection.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 12 }}>3. How We Use Your Data</h2>
            <p>We process your personal information for the following legitimate purposes:</p>
            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
              <li>Facilitating crowdfunding campaigns, processing donor payments, and releasing creator payouts.</li>
              <li>Verifying creator identity and compliance with Anti-Money Laundering (AML) and Know Your Customer (KYC) regulations.</li>
              <li>Protecting the platform against brute-force attacks, spam, bot abuse, and unauthorized access using Cloudflare security infrastructure.</li>
              <li>Sending essential account notifications, email verification links, and campaign status updates.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 12 }}>4. Storage, Security & Retention</h2>
            <p>
              We implement industry-standard administrative, physical, and technical security measures. Identity verification images are stored in protected, non-public storage locations and are served strictly through authenticated API endpoints restricted to authorized account owners and platform administrators.
            </p>
            <p style={{ marginTop: 12 }}>
              We retain personal data only for as long as necessary to fulfill the purposes outlined in this policy or to satisfy legal, accounting, and regulatory obligations.
            </p>
          </section>

          <section>
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 12 }}>5. Third-Party Service Providers</h2>
            <p>We share data with trusted third-party service providers solely to perform essential platform operations:</p>
            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
              <li><strong>Payment & Crypto Partners:</strong> Paystack, Busha, MoonPay, and Solana RPC nodes for payment routing and settlement.</li>
              <li><strong>Security & Infrastructure:</strong> Cloudflare (Turnstile bot verification and edge network security).</li>
              <li><strong>Email Providers:</strong> Resend / Brevo for sending operational notifications and transactional verification emails.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 12 }}>6. Your Privacy Rights</h2>
            <p>
              Depending on your location (e.g. EU GDPR, UK GDPR, California CCPA/CPRA, or NDPR), you have rights regarding your personal data, including:
            </p>
            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
              <li>The right to access, request a copy, or rectify your personal information.</li>
              <li>The right to request erasure of personal data where legal retention rules permit.</li>
              <li>The right to object to or restrict processing of your data.</li>
            </ul>
            <p style={{ marginTop: 12 }}>
              To exercise your rights, please contact our Data Protection Officer at <a href="mailto:privacy@oneraiseapp.com" style={{ color: 'var(--teal-200, #5dcaa5)' }}>privacy@oneraiseapp.com</a>.
            </p>
          </section>

          <section>
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 12 }}>7. Contact Us</h2>
            <p>
              If you have questions, concerns, or requests regarding this Privacy Policy, please email us at <a href="mailto:privacy@oneraiseapp.com" style={{ color: 'var(--teal-200, #5dcaa5)' }}>privacy@oneraiseapp.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
