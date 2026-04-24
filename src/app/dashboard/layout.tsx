'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { ToastProvider, ThemeProvider, useTheme } from '../components';
import '../shared-dashboard.css';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userName = session?.user?.name || 'Creator';
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [campaignCount, setCampaignCount] = useState<number | null>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Fetch campaign count
  useEffect(() => {
    let ignore = false;
    const fetchCampaigns = async () => {
      try {
        const res = await fetch('/api/campaigns?mine=true', { cache: 'no-store' });
        const data = await res.json();
        if (!ignore && res.ok && Array.isArray(data.campaigns)) {
          setCampaignCount(data.campaigns.length);
        }
      } catch (err) {
        // fail silently
      }
    };
    fetchCampaigns();
    return () => { ignore = true; };
  }, [pathname]); // Re-fetch occasionally, e.g. when navigating around


  type NavItem = { name: string; path: string; icon: React.ReactNode; badge?: string; dot?: boolean };
  const navItems: { section: string; items: NavItem[] }[] = [
    { section: 'MAIN', items: [
      { name: 'Overview', path: '/dashboard', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg> },
      { name: 'Campaigns', path: '/dashboard/campaigns', badge: campaignCount !== null ? campaignCount.toString() : undefined, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg> },
      { name: 'Analytics', path: '/dashboard/analytics', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg> },
      { name: 'Transactions', path: '/dashboard/transactions', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 4h18"/><path d="M3 8h18"/><path d="M3 12h18"/><path d="M3 16h18"/><path d="M3 20h18"/></svg> }
    ]},
    { section: 'COMMUNICATE', items: [
      { name: 'Notifications', path: '/dashboard/notifications', dot: true, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg> }
    ]},
    { section: 'ACCOUNT', items: [
      { name: 'Payouts', path: '/dashboard/payouts', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"/><path d="M2 10h20"/></svg> },
      { name: 'Settings', path: '/dashboard/settings', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg> },
      { name: 'Sign Out', path: '#', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> }
    ]}
  ];

  return (
    <ThemeProvider>
    <ToastProvider>
    <div className="dash-wrapper">
      {/* MOBILE TOP BAR */}
      <div className="mobile-topbar">
        <Link href="/" className="logo">One<span>Raise</span></Link>
        <button
          className={`hamburger-btn ${mobileMenuOpen ? 'open' : ''}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
      </div>

      {/* MOBILE OVERLAY */}
      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* SIDEBAR */}
      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-mobile-open' : ''}`}>
        <div className="sidebar-header">
          <Link href="/" className="logo">One<span>Raise</span></Link>
          <div className="logo-sub">CREATOR DASHBOARD</div>
        </div>

        <div className="sidebar-nav">
          {navItems.map((sec, idx) => (
            <div key={idx} className="nav-section">
              <div className="nav-eyebrow">{sec.section}</div>
              {sec.items.map(item => {
                const isActive = pathname === item.path || (pathname.startsWith(item.path) && item.path !== '/dashboard' && item.path !== '#');
                if (item.name === 'Sign Out') {
                  return (
                    <button key={item.name} onClick={() => { setMobileMenuOpen(false); signOut({ callbackUrl: '/' }); }} className="nav-link" style={{ background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}>
                      <div className="nl-left">
                        <span className="nl-icon">{item.icon}</span>
                        <span className="nl-text" style={{ color: '#F09595' }}>{item.name}</span>
                      </div>
                    </button>
                  );
                }
                return (
                  <Link key={item.name} href={item.path} className={`nav-link ${isActive ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                    <div className="nl-left">
                      <span className="nl-icon">{item.icon}</span>
                      <span className="nl-text">{item.name}</span>
                    </div>
                    {item.badge && <span className="nl-badge">{item.badge}</span>}
                    {item.dot && <span className="nl-dot"></span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        <ThemeToggle />

        <div className="sidebar-footer">
          <Link href="/dashboard/settings" className="user-profile" onClick={() => setMobileMenuOpen(false)}>
            <div className="up-avatar">{userInitials}</div>
            <div className="up-info">
              <div className="up-name">{userName} <svg className="verified-badge" width="16" height="16" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="11" fill="#1D9BF0"/><path d="M9.5 14.25L6.25 11l-1.02 1.02L9.5 16.29l10-10-1.02-1.02L9.5 14.25z" fill="#fff"/></svg></div>
              <div className="up-role">Creator</div>
            </div>
            <svg className="up-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="dash-main">
        {children}
      </main>
    </div>
    </ToastProvider>
    </ThemeProvider>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="theme-toggle">
      <button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
      </button>
      <button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
      </button>
      <button className={theme === 'system' ? 'active' : ''} onClick={() => setTheme('system')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
      </button>
    </div>
  );
}
