'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ToastProvider, ThemeProvider, useTheme } from '../components';
import '../shared-dashboard.css';

type SessionUser = {
  role?: string | null;
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    const role = (session?.user as SessionUser | undefined)?.role;
    if (status === 'unauthenticated' || role !== 'admin') {
      router.replace('/auth?mode=signin');
    }
  }, [status, session, router]);

  useEffect(() => {
    const id = window.setTimeout(() => setMobileMenuOpen(false), 0);
    return () => window.clearTimeout(id);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--ink)', color: 'var(--w50)', fontSize: 14 }}>
        Verifying access...
      </div>
    );
  }
  if ((session?.user as SessionUser | undefined)?.role !== 'admin') return null;

  type NavItem = { name: string; path: string; icon: React.ReactNode; badge?: string; dot?: boolean };
  const navItems: { section: string; items: NavItem[] }[] = [
    { section: 'PLATFORM', items: [
      { name: 'Overview', path: '/admin', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg> },
      { name: 'Users', path: '/admin/users', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg> },
      { name: 'Campaigns', path: '/admin/campaigns', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg> },
      { name: 'Protect Queue', path: '/admin/protect', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg> },
      { name: 'Transactions', path: '/admin/transactions', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 4h18"/><path d="M3 8h18"/><path d="M3 12h18"/><path d="M3 16h18"/><path d="M3 20h18"/></svg> }
    ]},
    { section: 'SYSTEM', items: [
      { name: 'Reports & Exports', path: '/admin/reports', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg> },
      { name: 'Settings', path: '/admin/settings', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg> }
    ]}
  ];

  return (
    <ThemeProvider>
    <ToastProvider>
      <div className="dash-wrapper">
        <div className="mobile-topbar admin-mobile-topbar">
          <Link href="/" className="logo">One<span>Raise</span></Link>
          <div className="mobile-topbar-actions">
            <span className="mobile-topbar-label">Admin</span>
            <button
              type="button"
              className={`hamburger-btn ${mobileMenuOpen ? 'open' : ''}`}
              onClick={() => setMobileMenuOpen(open => !open)}
              aria-label={mobileMenuOpen ? 'Close admin navigation' : 'Open admin navigation'}
              aria-expanded={mobileMenuOpen}
              aria-controls="admin-sidebar"
            >
              <span className="hamburger-line" aria-hidden="true" />
              <span className="hamburger-line" aria-hidden="true" />
              <span className="hamburger-line" aria-hidden="true" />
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <button
            type="button"
            className="mobile-overlay"
            aria-label="Close navigation menu"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <aside
          id="admin-sidebar"
          className={`sidebar ${mobileMenuOpen ? 'sidebar-mobile-open' : ''}`}
          style={{ borderRightColor: 'rgba(239,159,39,0.1)' }}
          aria-label="Admin navigation"
        >
          <div className="sidebar-header">
            <Link href="/" className="logo">One<span>Raise</span></Link>
            <div className="logo-sub" style={{ color: 'var(--amber)' }}>ADMIN PORTAL</div>
          </div>
          <div className="sidebar-nav">
            {navItems.map((sec, idx) => (
              <div key={idx} className="nav-section">
                <div className="nav-eyebrow">{sec.section}</div>
                {sec.items.map(item => {
                  const isActive = pathname === item.path || (pathname.startsWith(item.path) && item.path !== '/admin');
                  return (
                    <Link key={item.name} href={item.path} className={`nav-link ${isActive ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                      <div className="nl-left"><span className="nl-icon">{item.icon}</span><span className="nl-text">{item.name}</span></div>
                      {item.badge && <span className="nl-badge" style={{ background: 'var(--amber)', color: 'var(--ink)' }}>{item.badge}</span>}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>

          <ThemeToggle />

          <div className="sidebar-footer">
            <Link href="/admin/settings" className="user-profile" onClick={() => setMobileMenuOpen(false)}>
              <div className="up-avatar" style={{background: 'var(--amber)', color: 'var(--ink)'}}>SYS</div>
              <div className="up-info">
                <div className="up-name">System Admin</div>
                <div className="up-role">Superuser</div>
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
      <button type="button" aria-label="Use light theme" className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
      </button>
      <button type="button" aria-label="Use dark theme" className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
      </button>
      <button type="button" aria-label="Use system theme" className={theme === 'system' ? 'active' : ''} onClick={() => setTheme('system')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
      </button>
    </div>
  );
}
