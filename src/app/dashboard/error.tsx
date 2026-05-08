'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard route error:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: '#0A1812',
        color: '#F8FCF9',
      }}
    >
      <div
        style={{
          width: 'min(100%, 620px)',
          border: '1px solid rgba(248,252,249,0.12)',
          borderRadius: 18,
          background: 'rgba(13,26,22,0.92)',
          padding: '28px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(239,159,39,0.14)',
            color: '#EF9F27',
            marginBottom: 18,
          }}
          aria-hidden="true"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
        </div>

        <h1 style={{ fontSize: 30, lineHeight: 1.1, margin: '0 0 10px' }}>Dashboard could not load</h1>
        <p style={{ color: 'rgba(248,252,249,0.72)', lineHeight: 1.6, margin: '0 0 20px' }}>
          OneRaise could not reach the database for this dashboard route. On Vercel, check that your Supabase
          connection strings are configured in project environment variables.
        </p>

        <div
          style={{
            border: '1px solid rgba(248,252,249,0.12)',
            borderRadius: 14,
            padding: 16,
            background: 'rgba(248,252,249,0.04)',
            marginBottom: 20,
          }}
        >
          <div style={{ color: '#5DCAA5', fontSize: 13, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Required Vercel vars
          </div>
          <ul style={{ margin: '12px 0 0', paddingLeft: 18, color: 'rgba(248,252,249,0.8)', lineHeight: 1.7 }}>
            <li><code>DATABASE_URL</code>: Supabase pooled connection string</li>
            <li><code>DIRECT_URL</code>: Supabase direct connection string</li>
          </ul>
        </div>

        <p style={{ color: 'rgba(248,252,249,0.58)', fontSize: 13, lineHeight: 1.5, margin: '0 0 22px' }}>
          Find them in Supabase under Settings, Database, Connection string. Add them in Vercel under Settings,
          Environment Variables, then redeploy.
          {error.digest ? ` Error digest: ${error.digest}` : ''}
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => unstable_retry()}
            style={{
              border: 0,
              borderRadius: 999,
              padding: '12px 18px',
              background: '#1D9E75',
              color: '#F8FCF9',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Retry dashboard
          </button>
          <Link
            href="/"
            style={{
              borderRadius: 999,
              padding: '12px 18px',
              border: '1px solid rgba(248,252,249,0.16)',
              color: '#F8FCF9',
              textDecoration: 'none',
              fontWeight: 800,
            }}
          >
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}
