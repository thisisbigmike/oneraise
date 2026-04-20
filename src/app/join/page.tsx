'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import './join.css';

export default function JoinPage() {
  const { data: session, status, update } = useSession();
  const [loadingRole, setLoadingRole] = useState<string | null>(null);

  const handleRoleSelect = async (role: 'creator' | 'backer') => {
    if (status === 'authenticated') {
      setLoadingRole(role);
      try {
        const res = await fetch('/api/auth/oauth-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        });
        if (res.ok) {
          await update({ role });
          window.location.href = role === 'creator' ? '/dashboard' : '/backer';
          return;
        }
      } catch (e) {
        console.error("Error setting role", e);
      }
      setLoadingRole(null);
    }

    window.sessionStorage.setItem('oneraiseRoleChoice', role);
    window.location.href = `/auth?mode=signup&role=${role}`;
  };

  return (
    <div className="join-wrapper">
      {/* Aurora Background */}
      <div className="join-aurora">
        <div className="join-blob jb1"></div>
        <div className="join-blob jb2"></div>
        <div className="join-blob jb3"></div>
      </div>

      <div className="join-content">
        {/* Back to home */}
        <Link href="/" className="join-back">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back to website
        </Link>

        {/* Logo */}
        <Link href="/" className="join-logo">One<span>Raise</span></Link>

        {/* Header */}
        <div className="join-header">
          <h1 className="join-title">How would you like<br/>to <em>get started?</em></h1>
          <p className="join-subtitle">Choose your path. Whether you&apos;re launching a campaign or supporting great ideas, OneRaise has you covered.</p>
        </div>

        {/* Role Cards */}
        <div className="join-cards">
          {/* Creator Card */}
          <div className="join-role-card" onClick={() => handleRoleSelect('creator')}>
            <div className="join-card-icon creator-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#5DCAA5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <div className="join-card-label creator-label">Creator</div>
            <div className="join-card-title">I want to raise funds</div>
            <p className="join-card-desc">Launch a campaign and connect with a global community of backers ready to support your vision.</p>
            <ul className="join-card-features">
              <li>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4.5 7l2 2 3-3" stroke="#5DCAA5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="7" cy="7" r="5.5" stroke="#5DCAA5" strokeWidth="1.2"/></svg>
                0% platform fee on first campaign
              </li>
              <li>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4.5 7l2 2 3-3" stroke="#5DCAA5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="7" cy="7" r="5.5" stroke="#5DCAA5" strokeWidth="1.2"/></svg>
                Multi-currency payouts
              </li>
              <li>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4.5 7l2 2 3-3" stroke="#5DCAA5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="7" cy="7" r="5.5" stroke="#5DCAA5" strokeWidth="1.2"/></svg>
                Real-time analytics dashboard
              </li>
            </ul>
            <div className="join-card-btn creator-btn">
              {loadingRole === 'creator' ? (
                <div className="spinner" style={{display:'block'}}></div>
              ) : (
                <>
                  Sign up as Creator
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </>
              )}
            </div>
          </div>

          {/* Donor Card */}
          <div className="join-role-card" onClick={() => handleRoleSelect('backer')}>
            <div className="join-card-icon donor-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF9F27" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
            </div>
            <div className="join-card-label donor-label">Donor</div>
            <div className="join-card-title">I want to support</div>
            <p className="join-card-desc">Discover and back campaigns from creators around the world. Make a difference with every donation.</p>
            <ul className="join-card-features">
              <li>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4.5 7l2 2 3-3" stroke="#EF9F27" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="7" cy="7" r="5.5" stroke="#EF9F27" strokeWidth="1.2"/></svg>
                Back campaigns with fiat or crypto
              </li>
              <li>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4.5 7l2 2 3-3" stroke="#EF9F27" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="7" cy="7" r="5.5" stroke="#EF9F27" strokeWidth="1.2"/></svg>
                Track your donations in real-time
              </li>
              <li>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4.5 7l2 2 3-3" stroke="#EF9F27" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="7" cy="7" r="5.5" stroke="#EF9F27" strokeWidth="1.2"/></svg>
                Secure, instant transactions
              </li>
            </ul>
            <div className="join-card-btn donor-btn">
              {loadingRole === 'backer' ? (
                <div className="spinner" style={{display:'block'}}></div>
              ) : (
                <>
                  Sign up as Donor
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="join-footer">
          <p className="join-footer-text">
            Already have an account? <Link href="/auth?mode=signin">Sign in</Link>
          </p>
          <div className="join-trust">
            <div className="join-trust-item">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><rect x="2" y="4" width="10" height="8" rx="2" stroke="#5DCAA5" strokeWidth="1.2"/><path d="M5 4V3a2 2 0 014 0v1" stroke="#5DCAA5" strokeWidth="1.2" strokeLinecap="round"/></svg>
              256-bit SSL
            </div>
            <div className="join-trust-item">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="#5DCAA5" strokeWidth="1.2"/><path d="M4.5 7l2 2 3-3" stroke="#5DCAA5" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              2.1M+ backers
            </div>
            <div className="join-trust-item">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.5 4h4.2l-3.4 2.5 1.3 4L7 9 3.4 11.5l1.3-4L1.3 5H5.5z" fill="#5DCAA5"/></svg>
              78 countries
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
