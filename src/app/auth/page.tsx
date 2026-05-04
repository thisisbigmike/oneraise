'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getProviders, signIn } from 'next-auth/react';
import Link from 'next/link';
import { useToast } from '../components';
import './auth.css';
import AnimatedButton from '@/components/ui/AnimatedButton';

const TICKER_DATA = [
  {init:'TC',cls:'ta1',name:'Tunde Coker',action:'just received a payout · Lagos',amount:'₦3.6M'},
  {init:'AK',cls:'ta2',name:'Amara Kone',action:'backed SolarPack Mini · Nairobi',amount:'$120'},
  {init:'JD',cls:'ta3',name:'Jana Dvořák',action:'launched new campaign · Prague',amount:'New'},
  {init:'MR',cls:'ta1',name:'Marco Reyes',action:'backed CodeBridge · Mexico City',amount:'$75'},
  {init:'PL',cls:'ta2',name:'Priya Lal',action:'campaign goal reached · Mumbai',amount:'$50K'},
  {init:'EO',cls:'ta3',name:'Emeka Obi',action:'just received a payout · Abuja',amount:'₦1.2M'},
];

const COUNTRIES = [
  { flag: '🇳🇬', name: 'Nigeria' },
  { flag: '🇰🇪', name: 'Kenya' },
  { flag: '🇬🇭', name: 'Ghana' },
  { flag: '🇿🇦', name: 'South Africa' },
  { flag: '🇬🇧', name: 'United Kingdom' },
  { flag: '🇩🇪', name: 'Germany' },
  { flag: '🇫🇷', name: 'France' },
  { flag: '🇺🇸', name: 'United States' },
  { flag: '🇧🇷', name: 'Brazil' },
  { flag: '🇮🇳', name: 'India' },
  { flag: '🇯🇵', name: 'Japan' },
  { flag: '🇦🇺', name: 'Australia' },
  { flag: '🇨🇦', name: 'Canada' },
  { flag: '🇳🇱', name: 'Netherlands' },
  { flag: '🇸🇬', name: 'Singapore' },
  { flag: '🇦🇪', name: 'UAE' },
  { flag: '🌍', name: 'Other' },
];

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const roleParam = searchParams.get('role');
  const oauthError = searchParams.get('error');
  const selectedSignupRole = roleParam === 'creator' || roleParam === 'backer' ? roleParam : null;
  const initialRole = selectedSignupRole || 'backer';
  const initialMode = searchParams.get('mode') === 'signin' ? 'signin' : 'signup';

  const [mode, setMode] = useState<'signup' | 'signin'>(initialMode);
  const [forgotStep, setForgotStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [successState, setSuccessState] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [terms, setTerms] = useState(false);
  
  // UI states
  const [showPw, setShowPw] = useState(false);
  const [showPwConf, setShowPwConf] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const role: 'backer' | 'creator' = initialRole;
  const [adminCode, setAdminCode] = useState('');
  const [availableProviders, setAvailableProviders] = useState<Record<string, boolean>>({});
  
  const isAdminLogin = mode === 'signin' && email.toLowerCase() === 'admin';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(0);

  // Ticker state
  const [tickerItems, setTickerItems] = useState(TICKER_DATA.slice(0, 3));
  const tickerIndexRef = useRef(3);
  const oauthErrorRef = useRef<string | null>(null);
  const countrySelectRef = useRef<HTMLDivElement | null>(null);

  // Ticker Effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTickerItems(prev => {
        const nextItem = TICKER_DATA[tickerIndexRef.current % TICKER_DATA.length];
        tickerIndexRef.current++;
        return [...prev.slice(1), nextItem];
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Redirect if already authenticated has been disabled per user request
  // Users will need to manually log in even if they have an active session
  // when they visit the auth page directly.

  useEffect(() => {
    if (!dropdownOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!countrySelectRef.current?.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDropdownOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [dropdownOpen]);

  useEffect(() => {
    getProviders().then((providers) => {
      if (!providers) return;
      setAvailableProviders(
        Object.keys(providers).reduce<Record<string, boolean>>((acc, providerId) => {
          acc[providerId] = true;
          return acc;
        }, {}),
      );
    });
  }, []);

  useEffect(() => {
    if (mode !== 'signup') return;
    if (oauthError) return; // Do not redirect if there's an error to display

    const storedRole = window.sessionStorage.getItem('oneraiseRoleChoice');
    if (!selectedSignupRole || storedRole !== selectedSignupRole) {
      router.replace('/join');
    }
  }, [mode, router, selectedSignupRole, oauthError]);

  useEffect(() => {
    if (!oauthError) return;
    if (oauthErrorRef.current === oauthError) return;
    oauthErrorRef.current = oauthError;

    const errors: Record<string, { title: string; message: string }> = {
      AccessDenied: {
        title: 'Access Denied',
        message: 'Your social sign-in request was cancelled or denied. Please try again.',
      },
      OAuthEmail: {
        title: 'Email Required',
        message: 'That social account did not return an email address, so we could not complete sign in.',
      },
      OAuthAccountNotLinked: {
        title: 'Use Your Original Login',
        message: 'This email is already linked to another sign-in method. Use the same provider you signed up with first.',
      },
      Configuration: {
        title: 'Provider Setup Needed',
        message: 'That social login is not fully configured yet. Add its OAuth keys and try again.',
      },
    };

    const errorConfig = errors[oauthError] || {
      title: 'Social Sign In Failed',
      message: `We could not complete that social sign-in attempt (${oauthError}). Please try again.`,
    };

    showToast(errorConfig.message, 'error', errorConfig.title);
  }, [oauthError, showToast]);

  // Resend Timer Effect
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  
  const getPwScore = (val: string) => {
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    return score;
  };
  const pwScore = getPwScore(password);
  const pwClasses = ['weak', 'fair', 'good', 'strong'];
  const pwLabels = ['Weak', 'Fair', 'Good', 'Strong'];

  const getSignedInRole = async () => {
    try {
      const res = await fetch('/api/auth/session');
      const session = await res.json();
      const sessionRole = session?.user?.role;
      if (sessionRole === 'creator' || sessionRole === 'backer') return sessionRole;
    } catch {
      // Keep the existing UI fallback if the session endpoint is not ready yet.
    }
    return role;
  };

  const handleSignup = async () => {
    if (!selectedSignupRole || role !== selectedSignupRole) {
      showToast('Choose whether you are signing up as a creator or donor first.', 'warning', 'Choose Account Type');
      router.replace('/join');
      return;
    }
    if (!firstName) { showToast('Please enter your first name', 'warning', 'Missing Details'); return; }
    if (!isValidEmail(email)) { showToast('Please enter a valid email address', 'error', 'Invalid Email'); return; }
    if (password.length < 8) { showToast('Password must be at least 8 characters', 'warning', 'Weak Password'); return; }
    if (!terms) { showToast('You must agree to the Terms of Service', 'error', 'Terms Required'); return; }
    
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password, firstName, lastName, role: selectedSignupRole }),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Registration failed', 'error', 'Sign Up Error');
        setLoading(false);
        return;
      }
      setLoading(false);

      setSuccessState(true);
      showToast('Account created successfully! Please sign in manually.', 'success', 'Welcome to OneRaise');
      setTimeout(() => {
        setSuccessState(false);
        setMode('signin');
      }, 2000);
    } catch {
      setLoading(false);
      showToast('Something went wrong. Please try again.', 'error', 'Error');
    }
  };

  const handleSignin = async () => {
    if (isAdminLogin) {
      if (!adminCode) { showToast('Please enter your admin access code', 'error', 'Missing Code'); return; }
    } else {
      if (!email || !password) { showToast('Please enter your email and password', 'warning', 'Missing Details'); return; }
      if (!isValidEmail(email)) { showToast('Please enter a valid email address', 'error', 'Invalid Email'); return; }
    }
    
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const res = await signIn('credentials', {
        email: isAdminLogin ? 'admin' : normalizedEmail,
        password: isAdminLogin ? adminCode : password,
        redirect: false,
      });

      setLoading(false);

      if (res?.error) {
        showToast('Invalid email or password. Please try again.', 'error', 'Login Failed');
        return;
      }

      setSuccessState(true);
      const signedInRole = isAdminLogin ? 'admin' : await getSignedInRole();
      showToast('Login successful! Redirecting...', 'success', 'Welcome Back');
      setTimeout(() => {
        if (isAdminLogin) window.location.href = '/admin';
        else window.location.href = signedInRole === 'creator' ? '/dashboard' : '/backer';
      }, 1000);
    } catch {
      setLoading(false);
      showToast('Something went wrong. Please try again.', 'error', 'Error');
    }
  };

  const handleOAuth = (provider: string) => {
    const providerMap: Record<string, string> = { 'Google': 'google', 'Apple': 'apple', 'X': 'twitter' };
    const providerId = providerMap[provider] || provider.toLowerCase();

    if (!availableProviders[providerId]) {
      showToast(`${provider} sign-in is not configured yet. Add its OAuth keys in your environment and try again.`, 'warning', `${provider} Not Ready`);
      return;
    }

    if (mode === 'signup') {
      const storedRole = window.sessionStorage.getItem('oneraiseRoleChoice');
      if (!selectedSignupRole || storedRole !== selectedSignupRole) {
        showToast('Choose whether you are signing up as a creator or donor first.', 'warning', 'Choose Account Type');
        router.replace('/join');
        return;
      }
      window.sessionStorage.setItem('oneraiseOAuthMode', 'signup');
    } else {
      window.sessionStorage.setItem('oneraiseOAuthMode', 'signin');
    }

    window.sessionStorage.setItem('oneraiseOAuthProvider', providerId);
    showToast(`Connecting to ${provider}...`, 'info', `${provider} ${mode === 'signup' ? 'Sign Up' : 'Sign In'}`);
    signIn(providerId, { callbackUrl: '/auth/oauth-complete' });
  };

  const handleSendReset = () => {
    if (!isValidEmail(email)) { showToast('Please enter a valid email address to reset your password', 'error'); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setForgotStep(2);
      setResendTimer(60);
    }, 1400);
  };

  const handleVerifyOtp = () => {
    if (otp.some(d => !d)) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setForgotStep(3);
    }, 1200);
  };

  const handleResetPassword = () => {
    if (password.length < 8 || password !== passwordConfirm) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setForgotStep(4);
    }, 1500);
  };

  const filteredCountries = COUNTRIES.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()));

  return (
    <div className="auth-wrapper">
      {/* LEFT PANEL */}
      <div className="left">
        <div className="blob b1"></div>
        <div className="blob b2"></div>
        <div className="left-top">
          <Link href="/" className="logo">One<span>Raise</span></Link>
        </div>
        <div className="left-mid">
          <div className="left-eyebrow">
            <span className="eyebrow-dot"></span>
            Live now · 78 countries
          </div>
          <h1 className="left-headline">
            Where ideas<br/>find their<br/><em>global backing.</em>
          </h1>
          <p className="left-sub">Join 148,000 creators who&apos;ve raised over $4.2B from 2.1 million backers worldwide.</p>
          <div className="ticker">
            {tickerItems.map((item, i) => (
              <div key={i + item.name} className="tick-item" style={{ animationDelay: `0.${4 + i * 2}s` }}>
                <div className={`tick-avatar ${item.cls}`}>{item.init}</div>
                <div className="tick-text">
                  <div className="tick-name">{item.name}</div>
                  <div className="tick-action">{item.action}</div>
                </div>
                <div className="tick-amount">{item.amount}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="stats-row">
          <div className="stat-pill"><div className="sp-num">$4.2<span className="ac">B</span></div><div className="sp-lbl">Raised</div></div>
          <div className="stat-pill"><div className="sp-num">148<span className="ac">K</span></div><div className="sp-lbl">Creators</div></div>
          <div className="stat-pill"><div className="sp-num">78<span className="ac">%</span></div><div className="sp-lbl">Success</div></div>
          <div className="stat-pill"><div className="sp-num">78</div><div className="sp-lbl">Countries</div></div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="right">
        <div className="form-wrap">
          <Link href="/" className="back-link">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> Back to website
          </Link>
          <div className="mobile-logo">
            <Link href="/">One<span>Raise</span></Link>
          </div>

          {!forgotStep && (
            <div className="mode-toggle">
              <Link href="/join" className={`mode-btn ${mode === 'signup' ? 'active' : ''}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Create account</Link>
              <button className={`mode-btn ${mode === 'signin' ? 'active' : ''}`} onClick={() => { setMode('signin'); setSuccessState(false); }}>Sign in</button>
            </div>
          )}

          {/* SIGN UP & SIGN IN */}
          {!forgotStep && !successState && (
            <div className="form-panel active">
              <div className="form-header">
                <div className="form-title">{mode === 'signup' ? 'Start for free.' : 'Welcome back.'}</div>
                <div className="form-sub">{mode === 'signup' ? 'Your first campaign has zero platform fees.' : 'Sign in to manage your campaigns and payouts.'}</div>
                {mode === 'signup' && selectedSignupRole && (
                  <div className="role-context">
                    Creating a {selectedSignupRole === 'creator' ? 'Creator' : 'Donor'} account
                  </div>
                )}
              </div>

              <div className="oauth-row">
                <button className="oauth-btn" onClick={() => handleOAuth('Google')} disabled={loading}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M15.68 8.18c0-.57-.05-1.12-.14-1.64H8v3.1h4.3a3.67 3.67 0 01-1.6 2.41v2h2.6c1.52-1.4 2.38-3.46 2.38-5.87z" fill="#4285F4"/><path d="M8 16c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.14-2.52H1v2.06A8 8 0 008 16z" fill="#34A853"/><path d="M3.56 9.54A4.8 4.8 0 013.3 8c0-.54.09-1.06.26-1.54V4.4H1A8 8 0 000 8c0 1.29.31 2.51.86 3.6l2.7-2.06z" fill="#FBBC05"/><path d="M8 3.18c1.22 0 2.3.42 3.16 1.24l2.36-2.36A8 8 0 001 4.4l2.7 2.06A4.78 4.78 0 018 3.18z" fill="#EA4335"/></svg> Google</button>
                <button className="oauth-btn" onClick={() => handleOAuth('Apple')} disabled={loading}><svg width="14" height="16" viewBox="0 0 384 512" fill="currentColor"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg> Apple</button>
                <button className="oauth-btn" onClick={() => handleOAuth('X')} disabled={loading}><svg width="15" height="14" viewBox="0 0 15 14" fill="currentColor"><path d="M11.96.5h2.32L9.24 5.93 15 13.5H10.4L6.83 8.8 2.72 13.5H.4l5.37-5.79L0 .5h4.7l3.22 4.26L11.96.5zm-.82 11.7h1.29L3.9 1.82H2.51l8.63 10.38z"/></svg> X</button>
              </div>

              <div className="divider">
                <div className="divider-line"></div>
                <div className="divider-text">or continue with email</div>
                <div className="divider-line"></div>
              </div>

              <div className="fields">
                {mode === 'signup' && (
                  <div className="name-row">
                    <div className="field-group fg1">
                      <div className="field-label">First name</div>
                      <div className="field-input-wrap">
                        <input className={`field-input ${firstName.length >= 2 ? 'success' : ''}`} type="text" placeholder="Tunde" value={firstName} onChange={e => setFirstName(e.target.value)} />
                      </div>
                    </div>
                    <div className="field-group fg1">
                      <div className="field-label">Last name</div>
                      <div className="field-input-wrap">
                        <input className={`field-input ${lastName.length >= 2 ? 'success' : ''}`} type="text" placeholder="Coker" value={lastName} onChange={e => setLastName(e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}

                <div className="field-group fg2">
                  <div className="field-label">{isAdminLogin ? 'Admin Username' : 'Email address'}</div>
                  <div className="field-input-wrap">
                    <input className={`field-input ${isValidEmail(email) || isAdminLogin ? 'success' : ''}`} type="text" placeholder="tunde@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                    <svg className="field-icon" width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M1 4l6 4.5L13 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>



                {mode === 'signup' && (
                  <div className="field-group fg3" style={{ position: 'relative', zIndex: 100 }}>
                    <div className="field-label">Country</div>
                    <div className="field-input-wrap">
                      <div className={`custom-select ${dropdownOpen ? 'open' : ''}`} ref={countrySelectRef}>
                        <button
                          type="button"
                          className="cs-display"
                          aria-haspopup="listbox"
                          aria-expanded={dropdownOpen}
                          onClick={() => setDropdownOpen(open => !open)}
                        >
                          {country ? <span className="cs-value">{country}</span> : <span className="cs-placeholder">Select your country</span>}
                          <svg className="cs-arrow" width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                        <div className="cs-dropdown">
                          <div className="cs-search-wrap">
                            <svg className="cs-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                              <path d="M16.2 16.2L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            </svg>
                            <input className="cs-search" type="text" placeholder="Search country..." value={countrySearch} onChange={e => setCountrySearch(e.target.value)} />
                          </div>
                          <div className="cs-list" role="listbox" aria-label="Countries">
                            {filteredCountries.length > 0 ? filteredCountries.map(c => (
                              <button
                                key={c.name}
                                type="button"
                                className={`cs-item ${country === `${c.flag} ${c.name}` ? 'selected' : ''}`}
                                role="option"
                                aria-selected={country === `${c.flag} ${c.name}`}
                                onClick={() => { setCountry(`${c.flag} ${c.name}`); setDropdownOpen(false); setCountrySearch(''); }}
                              >
                                {c.flag} {c.name}
                              </button>
                            )) : (
                              <div className="cs-empty">No countries found</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isAdminLogin ? (
                  <div className="field-group fg4">
                    <div className="field-label">Secret Admin Code</div>
                    <div className="field-input-wrap">
                      <input className="field-input" type="password" placeholder="Enter access code" value={adminCode} onChange={e => setAdminCode(e.target.value)} />
                      <svg className="field-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                    </div>
                  </div>
                ) : (
                  <div className="field-group fg4">
                    <div className="field-label">Password</div>
                    <div className="field-input-wrap">
                      <input className="field-input" type={showPw ? 'text' : 'password'} placeholder={mode === 'signup' ? 'Min. 8 characters' : 'Your password'} value={password} onChange={e => setPassword(e.target.value)} />
                      <button className="toggle-pw" type="button" onClick={() => setShowPw(!showPw)}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{opacity: showPw ? 1 : 0.4}}><ellipse cx="8" cy="8" rx="7" ry="4.5" stroke="currentColor" strokeWidth="1.2"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2"/></svg>
                      </button>
                    </div>
                    {mode === 'signup' && password.length > 0 && (
                      <>
                        <div className="pw-strength">
                          {[0,1,2,3].map(i => <div key={i} className={`pw-bar ${pwScore > i ? pwClasses[Math.max(0, pwScore-1)] : ''}`}></div>)}
                        </div>
                        <div className="pw-label" style={{ color: pwScore <= 1 ? '#F09595' : pwScore === 2 ? 'var(--amber)' : 'var(--teal-200)' }}>
                          {pwLabels[Math.max(0, pwScore-1)]} password
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {mode === 'signin' && (
                <>
                  <div className="forgot-pw"><a href="#" onClick={(e) => { e.preventDefault(); setForgotStep(1); }}>Forgot your password?</a></div>
                  <div className="check-row" style={{marginTop: 16}}>
                    <input className="check-input" type="checkbox" id="remember" defaultChecked />
                    <label className="check-label" htmlFor="remember">Keep me signed in on this device</label>
                  </div>
                </>
              )}

              {mode === 'signup' && (
                <div className="check-row">
                  <input className="check-input" type="checkbox" id="terms" checked={terms} onChange={e => setTerms(e.target.checked)} />
                  <label className="check-label" htmlFor="terms">
                    I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>. I understand my campaign earnings will be processed via Busha API or Stripe.
                  </label>
                </div>
              )}

              <AnimatedButton
                text={loading ? 'Please wait...' : (mode === 'signup' ? 'Create my account' : 'Sign in to OneRaise')}
                onClick={mode === 'signup' ? handleSignup : handleSignin}
                className={loading ? 'loading' : ''}
                disabled={loading}
                style={{ width: '100%', marginTop: '24px' }}
              />

              <div className="switch-link">
                {mode === 'signup' ? 'Already have an account? ' : 'New to OneRaise? '}
                <a href={mode === 'signup' ? '#' : '/join'} onClick={(e) => { if (mode === 'signup') { e.preventDefault(); setMode('signin'); } }}>
                  {mode === 'signup' ? 'Sign in' : 'Create a free account'}
                </a>
              </div>
            </div>
          )}

          {/* SUCCESS STATE */}
          {!forgotStep && successState && (
            <div className="success-state" style={{display:'flex'}}>
              <div className="success-circle">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M7 16l6 6 12-12" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div className="success-title">{mode === 'signup' ? 'Welcome to OneRaise!' : "You're back!"}</div>
              <div className="success-sub">
                {mode === 'signup' ? "Your account is ready. Let's launch your first campaign and get the world behind your idea." : "Taking you to your dashboard now..."}
              </div>
              <button className="success-btn" onClick={() => {
                if (mode === 'signup') window.location.href = role === 'creator' ? '/dashboard' : '/backer';
                else if (isAdminLogin) window.location.href = '/admin';
                else if (email.includes('backer')) window.location.href = '/backer';
                else window.location.href = '/dashboard';
              }}>Go to dashboard →</button>
            </div>
          )}

          {/* FORGOT PWD FLOW */}
          {forgotStep === 1 && (
            <div className="fp-panel active">
              <div className="fp-step active">
                <button className="fp-back" onClick={() => setForgotStep(0)}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> Back to sign in
                </button>
                <div className="fp-progress">
                  <div className="fp-prog-step"><div className="fp-prog-dot fpd-active">1</div><span className="fp-prog-label active">Email</span></div>
                  <div className="fp-prog-line"></div>
                  <div className="fp-prog-step"><div className="fp-prog-dot fpd-idle">2</div><span className="fp-prog-label">Verify</span></div>
                  <div className="fp-prog-line"></div>
                  <div className="fp-prog-step"><div className="fp-prog-dot fpd-idle">3</div><span className="fp-prog-label">Reset</span></div>
                </div>
                <div className="fp-icon-wrap fp-icon-email"><svg width="26" height="26" viewBox="0 0 26 26" fill="none"><rect x="2" y="5" width="22" height="16" rx="3" stroke="#1D9E75" strokeWidth="1.5"/><path d="M2 8l11 8 11-8" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                <div className="fp-title">Forgot your password?</div>
                <div className="fp-sub">No worries. Enter the email address linked to your OneRaise account and we&apos;ll send you a 6-digit reset code.</div>
                
                <div className="fp-fields">
                  <div className="field-group" style={{opacity:1, animation:'none'}}>
                    <div className="field-label">Email address</div>
                    <div className="field-input-wrap">
                      <input className="field-input" type="email" placeholder="tunde@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                      <svg className="field-icon" width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M1 4l6 4.5L13 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </div>
                </div>

                <AnimatedButton
                  text={loading ? 'Sending...' : 'Send reset code'}
                  onClick={handleSendReset}
                  className={loading ? 'loading' : ''}
                  disabled={loading}
                  style={{ width: '100%', marginTop: '0', opacity: 1, animation: 'none' }}
                />
                <div className="switch-link" style={{opacity:1, animation:'none'}}>Remember it? <a href="#" onClick={(e) => { e.preventDefault(); setForgotStep(0); }}>Sign in instead</a></div>
              </div>
            </div>
          )}

          {forgotStep === 2 && (
            <div className="fp-panel active">
              <div className="fp-step active">
                <button className="fp-back" onClick={() => setForgotStep(1)}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> Change email
                </button>
                <div className="fp-progress">
                  <div className="fp-prog-step"><div className="fp-prog-dot fpd-done">✓</div><span className="fp-prog-label">Email</span></div>
                  <div className="fp-prog-line done"></div>
                  <div className="fp-prog-step"><div className="fp-prog-dot fpd-active">2</div><span className="fp-prog-label active">Verify</span></div>
                  <div className="fp-prog-line"></div>
                  <div className="fp-prog-step"><div className="fp-prog-dot fpd-idle">3</div><span className="fp-prog-label">Reset</span></div>
                </div>
                <div className="fp-icon-wrap fp-icon-sent"><svg width="26" height="26" viewBox="0 0 26 26" fill="none"><path d="M3 13l6 6L23 5" stroke="#85B7EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                <div className="fp-title">Check your inbox</div>
                <div className="fp-sub">We sent a 6-digit code to <strong>{email}</strong>. It expires in 10 minutes.</div>
                
                <div className="otp-row">
                  {[0,1,2,3,4,5].map((idx) => (
                    <input key={idx} className={`otp-input ${otp[idx] ? 'filled' : ''}`} type="text" maxLength={1} value={otp[idx]} 
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        const newOtp = [...otp]; newOtp[idx] = val; setOtp(newOtp);
                        if (val && idx < 5) document.getElementById(`otp${idx+1}`)?.focus();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !otp[idx] && idx > 0) document.getElementById(`otp${idx-1}`)?.focus();
                      }}
                      id={`otp${idx}`}
                    />
                  ))}
                </div>

                <div className="resend-row">
                  Didn&apos;t get it? {resendTimer === 0 ? <span className="resend-link" onClick={() => { setOtp(['','','','','','']); setResendTimer(60); }}>Resend code</span> : <span className="resend-timer">Resend in <strong>{resendTimer}</strong>s</span>}
                </div>

                <AnimatedButton
                  text={loading ? 'Verifying...' : 'Verify code'}
                  onClick={handleVerifyOtp}
                  className={loading ? 'loading' : ''}
                  disabled={loading}
                  style={{ width: '100%', marginTop: '0', opacity: 1, animation: 'none' }}
                />
              </div>
            </div>
          )}

          {forgotStep === 3 && (
            <div className="fp-panel active">
              <div className="fp-step active">
                <button className="fp-back" onClick={() => setForgotStep(2)}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> Back
                </button>
                <div className="fp-progress">
                  <div className="fp-prog-step"><div className="fp-prog-dot fpd-done">✓</div><span className="fp-prog-label">Email</span></div>
                  <div className="fp-prog-line done"></div>
                  <div className="fp-prog-step"><div className="fp-prog-dot fpd-done">✓</div><span className="fp-prog-label">Verify</span></div>
                  <div className="fp-prog-line done"></div>
                  <div className="fp-prog-step"><div className="fp-prog-dot fpd-active">3</div><span className="fp-prog-label active">Reset</span></div>
                </div>
                <div className="fp-icon-wrap fp-icon-lock"><svg width="26" height="26" viewBox="0 0 26 26" fill="none"><rect x="4" y="11" width="18" height="13" rx="3" stroke="#EF9F27" strokeWidth="1.5"/><path d="M8 11V8a5 5 0 0110 0v3" stroke="#EF9F27" strokeWidth="1.5" strokeLinecap="round"/><circle cx="13" cy="17" r="2" fill="#EF9F27" opacity="0.6"/></svg></div>
                <div className="fp-title">Set new password</div>
                <div className="fp-sub">Choose a strong password you haven&apos;t used before. At least 8 characters.</div>
                
                <div className="fp-fields">
                  <div className="field-group" style={{opacity:1, animation:'none'}}>
                    <div className="field-label">New password</div>
                    <div className="field-input-wrap">
                      <input className="field-input" type={showPw ? 'text' : 'password'} placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)} />
                      <button className="toggle-pw" type="button" onClick={() => setShowPw(!showPw)}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{opacity: showPw ? 1 : 0.4}}><ellipse cx="8" cy="8" rx="7" ry="4.5" stroke="currentColor" strokeWidth="1.2"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2"/></svg>
                      </button>
                    </div>
                    {password.length > 0 && (
                      <>
                        <div className="pw-strength">
                          {[0,1,2,3].map(i => <div key={i} className={`pw-bar ${pwScore > i ? pwClasses[Math.max(0, pwScore-1)] : ''}`}></div>)}
                        </div>
                        <div className="pw-label" style={{ color: pwScore <= 1 ? '#F09595' : pwScore === 2 ? 'var(--amber)' : 'var(--teal-200)' }}>
                          {pwLabels[Math.max(0, pwScore-1)]} password
                        </div>
                      </>
                    )}
                  </div>
                  <div className="field-group" style={{opacity:1, animation:'none'}}>
                    <div className="field-label">Confirm password</div>
                    <div className="field-input-wrap">
                      <input className={`field-input ${passwordConfirm && password === passwordConfirm ? 'success' : passwordConfirm ? 'error': ''}`} type={showPwConf ? 'text' : 'password'} placeholder="Repeat your password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} />
                      <button className="toggle-pw" type="button" onClick={() => setShowPwConf(!showPwConf)}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{opacity: showPwConf ? 1 : 0.4}}><ellipse cx="8" cy="8" rx="7" ry="4.5" stroke="currentColor" strokeWidth="1.2"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2"/></svg>
                      </button>
                    </div>
                    {passwordConfirm.length > 0 && (
                      <div className={`pw-confirm-hint ${password === passwordConfirm ? 'pch-match' : 'pch-nomatch'}`}>
                        {password === passwordConfirm ? 
                          <><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#5DCAA5" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg> Passwords match</> :
                          <><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="#F09595" strokeWidth="1.4" strokeLinecap="round"/></svg> Passwords don&apos;t match</>
                        }
                      </div>
                    )}
                  </div>
                </div>

                <AnimatedButton
                  text={loading ? 'Resetting...' : 'Reset my password'}
                  onClick={handleResetPassword}
                  className={loading ? 'loading' : ''}
                  disabled={loading}
                  style={{ width: '100%', marginTop: '0', opacity: 1, animation: 'none' }}
                />
              </div>
            </div>
          )}

          {forgotStep === 4 && (
            <div className="fp-panel active">
              <div className="fp-step active" style={{alignItems:'center', textAlign:'center', padding:'20px 0'}}>
                <div className="success-circle" style={{animation:'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1)'}}>
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M7 16l6 6 12-12" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div className="fp-title" style={{marginBottom:8}}>Password reset!</div>
                <div className="fp-sub" style={{textAlign:'center', margin:'0 auto 28px'}}>Your password has been updated successfully. You can now sign in with your new password.</div>
                <AnimatedButton
                  text="Sign in now"
                  onClick={() => { setForgotStep(0); setMode('signin'); setPassword(''); }}
                  style={{ width: '100%', marginTop: '0', opacity: 1, animation: 'none' }}
                />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div style={{ background: 'var(--ink)', minHeight: '100vh' }} />}>
      <AuthPageContent />
    </Suspense>
  );
}
