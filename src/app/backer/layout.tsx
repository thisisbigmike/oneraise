'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { ToastProvider, ThemeProvider, useTheme } from '../components';
import '../shared-dashboard.css';

export default function BackerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userName = session?.user?.name || 'Backer';
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  type NavItem = { name: string; path: string; icon: React.ReactNode; badge?: string; dot?: boolean };
  const navItems: { section: string; items: NavItem[] }[] = [
    { section: 'MAIN', items: [
      { name: 'Overview', path: '/backer', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg> },
      { name: 'Discover', path: '/backer/discover', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg> },
      { name: 'My Donations', path: '/backer/donations', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg> },
      { name: 'Saved', path: '/backer/saved', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg> }
    ]},
    { section: 'ACCOUNT', items: [
      { name: 'Settings', path: '/backer/settings', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg> },
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

        <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-mobile-open' : ''}`}>
          <div className="sidebar-header">
            <Link href="/" className="logo">One<span>Raise</span></Link>
            <div className="logo-sub">BACKER DASHBOARD</div>
          </div>
          <div className="sidebar-nav">
            {navItems.map((sec, idx) => (
              <div key={idx} className="nav-section">
                <div className="nav-eyebrow">{sec.section}</div>
                {sec.items.map(item => {
                  const isActive = pathname === item.path || (pathname.startsWith(item.path) && item.path !== '/backer' && item.path !== '#');
                  if (item.name === 'Sign Out') {
                    return (
                      <button key={item.name} onClick={() => { setMobileMenuOpen(false); signOut({ callbackUrl: '/' }); }} className="nav-link" style={{ background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}>
                        <div className="nl-left">
                          <span className="nl-icon" style={{ color: '#F09595' }}>{item.icon}</span>
                          <span className="nl-text" style={{ color: '#F09595' }}>{item.name}</span>
                        </div>
                      </button>
                    );
                  }
                  return (
                    <Link key={item.name} href={item.path} className={`nav-link ${isActive ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                      <div className="nl-left"><span className="nl-icon">{item.icon}</span><span className="nl-text">{item.name}</span></div>
                      {item.badge && <span className="nl-badge">{item.badge}</span>}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>

          <ThemeToggle />

          <div className="sidebar-footer">
            <Link href="/backer/settings" className="user-profile" onClick={() => setMobileMenuOpen(false)}>
              <div className="up-avatar" style={{background: 'rgba(55,138,221,0.2)', color: '#85B7EB'}}>{userInitials}</div>
              <div className="up-info">
                <div className="up-name">{userName}</div>
                <div className="up-role">Backer</div>
              </div>
              <svg className="up-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
          </div>
        </aside>
        <main className="dash-main">{children}</main>
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
