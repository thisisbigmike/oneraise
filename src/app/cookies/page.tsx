import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy & Settings | OneRaise',
  description: 'Learn how OneRaise uses essential session, security, and performance cookies.',
};

export default function CookiesPage() {
  return (
    <div style={{ background: 'var(--bg-main, #0a110e)', color: 'var(--fg, #f5faf7)', minHeight: '100vh', padding: '60px 24px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
        <Link href="/" style={{ color: 'var(--teal-200, #5dcaa5)', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
          ← Back to OneRaise
        </Link>

        <h1 style={{ fontSize: 36, fontWeight: 800, marginTop: 24, marginBottom: 12, letterSpacing: '-0.02em' }}>
          Cookie Policy & Settings
        </h1>
        <div style={{ color: 'var(--w50, rgba(245,250,247,0.5))', fontSize: 14, marginBottom: 40 }}>
          Last Updated: July 25, 2026
        </div>

        <div style={{ lineHeight: 1.7, fontSize: 15, display: 'flex', flexDirection: 'column', gap: 28, color: 'var(--w80, rgba(245,250,247,0.85))' }}>
          <section>
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 12 }}>1. What Are Cookies?</h2>
            <p>
              Cookies are small text files stored on your browser or device when you visit websites.
              They allow us to recognize your session, keep you logged in securely, and protect the platform against fraud and bot abuse.
            </p>
          </section>

          <section>
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 12 }}>2. Cookies We Use</h2>
            <div style={{ display: 'grid', gap: 16, marginTop: 12 }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 18 }}>
                <div style={{ fontWeight: 700, color: '#fff', fontSize: 16 }}>Essential Security & Session Cookies</div>
                <p style={{ fontSize: 14, color: 'var(--w80)', marginTop: 6 }}>
                  Required for core site functionality, including authentication tokens, CSRF protection, and Cloudflare Turnstile anti-bot verification. These cannot be disabled.
                </p>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 18 }}>
                <div style={{ fontWeight: 700, color: '#fff', fontSize: 16 }}>Preferences & Functional Cookies</div>
                <p style={{ fontSize: 14, color: 'var(--w80)', marginTop: 6 }}>
                  Remember your account preferences, country selection, and dark mode UI state.
                </p>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 18 }}>
                <div style={{ fontWeight: 700, color: '#fff', fontSize: 16 }}>Analytics & Performance</div>
                <p style={{ fontSize: 14, color: 'var(--w80)', marginTop: 6 }}>
                  Helps us measure page speed, aggregate platform statistics, and improve user experience across browsers.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 12 }}>3. Managing Your Cookies</h2>
            <p>
              You can control and delete cookies through your browser settings. Note that disabling essential cookies may impact your ability to log in or complete contributions on OneRaise.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
