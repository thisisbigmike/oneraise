'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLogin() {
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode) return;
    
    setError('');
    setLoading(true);

    const res = await signIn('credentials', {
      email: 'admin',
      password: passcode,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError('Invalid passcode.');
    } else {
      router.replace('/admin');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0F1626', fontFamily: "'Instrument Sans', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: '440px', background: '#151D2F', borderRadius: '24px', padding: '48px 32px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: '48px', marginBottom: '24px' }}>🔒</div>
        
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '32px', fontWeight: 800, color: '#fff', marginBottom: '12px', letterSpacing: '-0.02em' }}>Admin Access</h1>
        <p style={{ color: '#8A94A6', fontSize: '15px', marginBottom: '40px' }}>Enter your passcode to view the dashboard.</p>
        
        <form onSubmit={handleUnlock}>
          <div style={{ marginBottom: '24px' }}>
            <input 
              type="password" 
              placeholder="Enter passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              style={{
                width: '100%',
                background: '#0F1626',
                border: error ? '1px solid #F09595' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '16px',
                color: '#fff',
                fontSize: '15px',
                textAlign: 'center',
                outline: 'none',
                transition: 'border-color 0.2s',
                fontFamily: 'inherit'
              }}
              autoFocus
            />
            {error && <div style={{ color: '#F09595', fontSize: '13px', marginTop: '8px' }}>{error}</div>}
          </div>
          
          <button 
            type="submit" 
            disabled={loading || !passcode}
            style={{
              width: '100%',
              background: '#24459C',
              color: '#fff',
              border: 'none',
              borderRadius: '16px',
              padding: '16px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: (loading || !passcode) ? 'not-allowed' : 'pointer',
              opacity: (loading || !passcode) ? 0.7 : 1,
              transition: 'all 0.2s',
              marginBottom: '32px',
              fontFamily: 'inherit'
            }}
          >
            {loading ? 'Verifying...' : 'Unlock Dashboard →'}
          </button>
        </form>

        <Link href="/" style={{ color: '#8A94A6', fontSize: '14px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <span>←</span> Back to site
        </Link>
      </div>
    </div>
  );
}
