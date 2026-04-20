'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

function getRequestedRole() {
  const oauthMode = window.sessionStorage.getItem('oneraiseOAuthMode');
  const storedRole = window.sessionStorage.getItem('oneraiseRoleChoice');

  if (oauthMode !== 'signup') return null;
  return storedRole === 'creator' || storedRole === 'backer' ? storedRole : null;
}

function clearOAuthState() {
  window.sessionStorage.removeItem('oneraiseOAuthMode');
  window.sessionStorage.removeItem('oneraiseOAuthProvider');
  window.sessionStorage.removeItem('oneraiseRoleChoice');
}

export default function OAuthCompletePage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const sessionRole = session?.user ? (((session.user as any).role as string | undefined) ?? null) : null;
  const [message, setMessage] = useState('Completing your sign in...');
  const [detail, setDetail] = useState('We are securing your account and routing you to the right dashboard.');
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current || status === 'loading') return;

    if (status === 'unauthenticated') {
      router.replace('/auth?mode=signin');
      return;
    }

    const finalizeOAuth = async () => {
      handledRef.current = true;

      const requestedRole = getRequestedRole();
      const oauthMode = window.sessionStorage.getItem('oneraiseOAuthMode');

      setMessage(oauthMode === 'signup' ? 'Finalizing your account...' : 'Signing you in...');
      setDetail(
        oauthMode === 'signup'
          ? 'Setting up your OneRaise profile so we know whether you are joining as a creator or donor.'
          : 'Checking your account and sending you to the right dashboard.',
      );

      try {
        const res = await fetch('/api/auth/oauth-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: requestedRole }),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Unable to complete social sign in.');
        }

        const finalRole =
          data.role === 'creator' || data.role === 'backer'
            ? data.role
            : sessionRole;

        if (finalRole === 'creator' || finalRole === 'backer') {
          await update({ role: finalRole });

          if (data.conflict) {
            setDetail(`This email already belongs to your ${finalRole === 'creator' ? 'creator' : 'donor'} account, so we signed you in there.`);
          }

          clearOAuthState();
          router.replace(finalRole === 'creator' ? '/dashboard' : '/backer');
          return;
        }

        clearOAuthState();
        router.replace('/join');
      } catch (error: any) {
        const requiresRoleChoice = typeof error?.message === 'string' && error.message.includes('Choose whether');
        const fallbackPath = requestedRole || requiresRoleChoice ? '/join' : '/auth?mode=signin';
        setMessage('We hit a small snag.');
        setDetail(error?.message || 'Please try again, or use email sign in if the provider keeps failing.');
        clearOAuthState();
        window.setTimeout(() => {
          router.replace(fallbackPath);
        }, 1800);
      }
    };

    finalizeOAuth();
  }, [router, sessionRole, status, update]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--ink)',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          borderRadius: '24px',
          border: '1px solid rgba(245,250,247,0.08)',
          background: 'linear-gradient(180deg, rgba(11,27,21,0.98), rgba(8,22,17,0.98))',
          boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
          padding: '32px',
        }}
      >
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--w80)',
            textDecoration: 'none',
            fontSize: '14px',
            marginBottom: '24px',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to website
        </Link>

        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '999px',
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(29,158,117,0.12)',
            border: '1px solid rgba(93,202,165,0.2)',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '999px',
              border: '3px solid rgba(93,202,165,0.18)',
              borderTopColor: 'var(--teal-200)',
              animation: 'spin 0.9s linear infinite',
            }}
          />
        </div>

        <div
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: '32px',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: 'var(--white)',
            marginBottom: '12px',
          }}
        >
          {message}
        </div>
        <p
          style={{
            color: 'var(--w50)',
            fontSize: '15px',
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          {detail}
        </p>

        <style jsx>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
