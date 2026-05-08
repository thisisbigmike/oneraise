'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[v0] Dashboard error:', error);
  }, [error]);

  const isDbError =
    error?.message?.includes('DATABASE_URL') ||
    error?.message?.includes('database') ||
    error?.message?.includes('prisma') ||
    error?.message?.includes('connect') ||
    error?.message?.includes('ECONNREFUSED');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '40px 20px',
        textAlign: 'center',
        gap: '16px',
      }}
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        style={{ color: 'var(--w30, #888)', marginBottom: '8px' }}
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>

      <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>
        {isDbError ? 'Database not connected' : 'Something went wrong'}
      </h2>

      <p style={{ color: 'var(--w50, #666)', fontSize: '14px', maxWidth: '420px', lineHeight: 1.6 }}>
        {isDbError
          ? 'The database connection is not configured. Please add your DATABASE_URL and DIRECT_URL environment variables in the project settings (Vars tab).'
          : 'An unexpected error occurred while loading the dashboard. You can try refreshing the page.'}
      </p>

      {isDbError && (
        <div
          style={{
            background: 'var(--surface2, #f5f5f5)',
            border: '1px solid var(--border, #e0e0e0)',
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '13px',
            color: 'var(--w40, #777)',
            maxWidth: '420px',
            textAlign: 'left',
          }}
        >
          <strong>How to fix:</strong> Open project Settings → Vars and add:
          <br />
          <code style={{ display: 'block', marginTop: '6px' }}>DATABASE_URL=postgresql://...</code>
          <code style={{ display: 'block', marginTop: '4px' }}>DIRECT_URL=postgresql://...</code>
        </div>
      )}

      <button
        onClick={reset}
        style={{
          marginTop: '8px',
          padding: '10px 24px',
          borderRadius: '8px',
          border: 'none',
          background: 'var(--primary, #000)',
          color: 'var(--primary-fg, #fff)',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  );
}
