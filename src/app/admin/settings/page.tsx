'use client';

import React, { useEffect, useState } from 'react';
import { useToast } from '../../components';

type PlatformConfig = {
  totalVolumeUsd: number;
  platformRevenue: number;
  creatorCount: number;
  backerCount: number;
  activeCampaignCount: number;
  successRate: number;
};

export default function AdminSettingsPage() {
  const { showToast } = useToast();
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // Admin password change
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    fetch('/api/admin/stats', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (data.stats) {
          setConfig(data.stats);
          setLoadStatus('ready');
        } else {
          setLoadStatus('error');
        }
      })
      .catch(() => setLoadStatus('error'));
  }, []);

  const handlePwChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    if (newPw.length < 8) {
      showToast('New password must be at least 8 characters.', 'error');
      return;
    }
    setPwLoading(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password.');
      showToast('Password updated successfully.', 'success');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err: any) {
      showToast(err.message || 'Failed to change password.', 'error');
    } finally {
      setPwLoading(false);
    }
  };

  const paymentProviders = [
    { name: 'Stripe', description: 'Card payments (USD, EUR, GBP, etc.)', enabled: true, color: '#635BFF' },
    { name: 'MoonPay', description: 'Crypto on-ramp and fiat payments', enabled: true, color: '#7B3FE4' },
    { name: 'Busha', description: 'Africa-focused crypto and fiat payouts', enabled: true, color: '#EF9F27' },
    { name: 'Solana / Jupiter', description: 'Native SOL and SPL token donations', enabled: true, color: '#9945FF' },
  ];

  return (
    <div className="overview-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <div className="page-sub">Platform configuration and admin account management.</div>
        </div>
      </div>

      <div className="content-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        {/* Platform Configuration */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="content-card">
            <div className="cc-header"><div className="cc-title">Platform Configuration</div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Platform fee', value: '1.5%', note: 'Applied to all completed donations' },
                { label: 'Payout provider', value: 'Busha', note: 'Primary payout rail for creators' },
                { label: 'Payout cooldown', value: '7 days', note: 'After campaign ends before withdrawal' },
                { label: 'Max campaign image', value: '5 MB', note: 'Enforced at upload' },
                { label: 'Max profile image', value: '3 MB', note: 'Enforced at upload' },
                { label: 'Campaign cache TTL', value: '60 seconds', note: 'getCachedCampaignsList revalidation' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 14, borderBottom: '1px solid rgba(245,250,247,0.06)' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--w30)', marginTop: 2 }}>{item.note}</div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--teal-200)', background: 'rgba(93,202,165,0.1)', padding: '4px 10px', borderRadius: 6 }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--w30)' }}>
              To change platform fee or payout settings, update the relevant env variables and redeploy.
            </div>
          </div>

          {/* Live platform stats */}
          <div className="content-card">
            <div className="cc-header"><div className="cc-title">Live Platform Stats</div></div>
            {loadStatus === 'loading' && <div style={{ color: 'var(--w50)', fontSize: 14 }}>Loading...</div>}
            {loadStatus === 'error' && <div style={{ color: 'var(--amber)', fontSize: 14 }}>Failed to load stats.</div>}
            {config && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Total volume', value: `$${config.totalVolumeUsd.toFixed(2)}` },
                  { label: 'Platform revenue (1.5%)', value: `$${config.platformRevenue.toFixed(2)}` },
                  { label: 'Creators', value: config.creatorCount.toLocaleString() },
                  { label: 'Backers', value: config.backerCount.toLocaleString() },
                  { label: 'Active campaigns', value: config.activeCampaignCount.toLocaleString() },
                  { label: 'Campaign success rate', value: `${config.successRate}%` },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span style={{ color: 'var(--w50)' }}>{row.label}</span>
                    <span style={{ fontWeight: 600 }}>{row.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Payment Providers */}
          <div className="content-card">
            <div className="cc-header"><div className="cc-title">Payment Providers</div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {paymentProviders.map(p => (
                <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: p.color }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--w30)', marginTop: 2 }}>{p.description}</div>
                  </div>
                  <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 4, background: p.enabled ? 'rgba(93,202,165,0.12)' : 'rgba(245,250,247,0.06)', color: p.enabled ? 'var(--teal-200)' : 'var(--w30)' }}>
                    {p.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, fontSize: 12, color: 'var(--w30)' }}>
              Enable / disable providers via env vars: STRIPE_SECRET_KEY, MOONPAY_API_KEY, BUSHA_API_KEY, NEXT_PUBLIC_SOLANA_RPC_URL.
            </div>
          </div>

          {/* Admin Account */}
          <div className="content-card">
            <div className="cc-header"><div className="cc-title">Change Admin Password</div></div>
            <form onSubmit={handlePwChange} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="s-field">
                <label className="s-label">Current password</label>
                <input className="s-input" type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} required />
              </div>
              <div className="s-field">
                <label className="s-label">New password</label>
                <input className="s-input" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} minLength={8} required />
              </div>
              <div className="s-field">
                <label className="s-label">Confirm new password</label>
                <input className="s-input" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required />
              </div>
              <button className="btn-primary" type="submit" disabled={pwLoading}>
                {pwLoading ? 'Updating...' : 'Update password'}
              </button>
            </form>
          </div>

          {/* Danger Zone */}
          <div className="content-card" style={{ border: '1px solid rgba(240,149,149,0.2)' }}>
            <div className="cc-header"><div className="cc-title" style={{ color: '#F09595' }}>Danger Zone</div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Force-expire all pending donations', desc: 'Marks all pending payment sessions as expired. Use if payment provider webhooks are delayed.' },
                { label: 'Flush campaign cache', desc: 'Forces an immediate cache revalidation for all campaign list pages.' },
              ].map(action => (
                <div key={action.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, paddingBottom: 14, borderBottom: '1px solid rgba(245,250,247,0.04)' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{action.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--w30)', marginTop: 4, lineHeight: 1.5 }}>{action.desc}</div>
                  </div>
                  <button
                    className="btn-secondary"
                    style={{ flexShrink: 0, padding: '6px 12px', fontSize: 12, color: '#F09595', borderColor: 'rgba(240,149,149,0.3)' }}
                    onClick={() => showToast('This action is not yet wired up. Contact engineering.', 'warning')}
                  >
                    Run
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
