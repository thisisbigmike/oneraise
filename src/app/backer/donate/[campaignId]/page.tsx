'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useToast } from '../../../components';
import { CAMPAIGN_SEEDS } from '@/lib/campaign-seeds';
import { JUPITER_INPUT_TOKENS, type JupiterDonationQuote } from '@/lib/jupiter';

type CampaignView = {
  id: number; slug: string; title: string; image?: string | null; creator: string; creatorInitials: string;
  raised: number; goal: number; category: string; desc: string;
  backers: number; daysLeft: number; verified: boolean;
};

const PRESETS = [25, 50, 100, 250];
const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD' },
  { code: 'EUR', symbol: '€', label: 'EUR' },
  { code: 'GBP', symbol: '£', label: 'GBP' },
  { code: 'NGN', symbol: '₦', label: 'NGN' },
  { code: 'KES', symbol: 'KSh', label: 'KES' },
];

type PaymentMethod = 'card' | 'crypto' | 'jupiter' | 'local';
type PaymentStatus = 'idle' | 'processing' | 'pending' | 'confirmed' | 'failed';
type PaymentInstructions = {
  type?: 'local' | 'crypto' | string;
  currency?: string;
  amount?: number | string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  asset?: string;
  address?: string;
  network?: string;
};

export default function DonatePage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const initialCampaign = CAMPAIGN_SEEDS[campaignId] as CampaignView | undefined;
  const [campaign, setCampaign] = useState<CampaignView | undefined>(initialCampaign);
  const [isLoadingCampaign, setIsLoadingCampaign] = useState(!initialCampaign);
  const { showToast } = useToast();

  // Form state
  const [amount, setAmount] = useState('50');
  const [presetActive, setPresetActive] = useState(50);
  const [currency, setCurrency] = useState('USD');
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [message, setMessage] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [coverFee, setCoverFee] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');

  // Payment status
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [paymentInstructions, setPaymentInstructions] = useState<PaymentInstructions | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [currentDonationId, setCurrentDonationId] = useState<string | null>(null);
  const [jupiterQuote, setJupiterQuote] = useState<JupiterDonationQuote | null>(null);

  // Crypto sub-state
  const [cryptoAsset, setCryptoAsset] = useState('USDT');
  const [jupiterInputMint, setJupiterInputMint] = useState(JUPITER_INPUT_TOKENS[0]?.mint || '');

  // Local transfer sub-state
  const [localRegion, setLocalRegion] = useState<'ng' | 'ke'>('ng');

  const currencyObj = CURRENCIES.find(c => c.code === currency)!;
  const numAmount = parseFloat(amount) || 0;
  const feeRate = paymentMethod === 'card' ? 0.039 : paymentMethod === 'crypto' ? 0.01 : paymentMethod === 'jupiter' ? 0 : 0.015;
  const feeAmount = coverFee ? numAmount * feeRate : 0;
  const totalAmount = numAmount + feeAmount;

  // Local Currency Conversions
  const EXCHANGE_RATE_NGN = 1450;
  const EXCHANGE_RATE_KES = 135;
  const isLocalNG = paymentMethod === 'local' && localRegion === 'ng';
  const isLocalKE = paymentMethod === 'local' && localRegion === 'ke';
  const localCurrencyCode = isLocalNG ? 'NGN' : isLocalKE ? 'KES' : '';
  const localRate = isLocalNG ? EXCHANGE_RATE_NGN : isLocalKE ? EXCHANGE_RATE_KES : 1;
  const localTotal = totalAmount * localRate;
  const getCurrencySymbol = (code?: string | null) =>
    CURRENCIES.find(c => c.code === code)?.symbol || code || '';
  const getQrCodeUrl = (value: string) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=12&data=${encodeURIComponent(value)}`;
  const getPaymentMethodLabel = () => {
    if (paymentMethod === 'card') return 'Card (MoonPay)';
    if (paymentMethod === 'crypto') return `Crypto (${cryptoAsset})`;
    if (paymentMethod === 'jupiter') return 'Jupiter any-token swap';
    return `Local Transfer (${localRegion === 'ng' ? 'Nigeria Bank' : 'M-Pesa'})`;
  };

  const refreshCampaignProgress = useCallback(async () => {
    if (!campaignId) return;

    try {
      setIsLoadingCampaign(true);
      const res = await fetch(`/api/campaigns/${campaignId}`, { cache: 'no-store' });
      const data = await res.json();

      if (res.ok && data.campaign) {
        setCampaign(data.campaign);
      }
    } catch {
      // Keep the seeded campaign view if the live progress endpoint is unavailable.
    } finally {
      setIsLoadingCampaign(false);
    }
  }, [campaignId]);

  useEffect(() => {
    refreshCampaignProgress();
  }, [refreshCampaignProgress]);

  const formatAmount = (val: string) => {
    if (!val) return '';
    const parts = val.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const handlePreset = (val: number) => {
    setPresetActive(val);
    setAmount(val.toString());
  };

  const handleAmountChange = (val: string) => {
    const cleanVal = val.replace(/[^0-9.]/g, '');
    const parts = cleanVal.split('.');
    const finalizedVal = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleanVal;
    
    setAmount(finalizedVal);
    const num = parseFloat(finalizedVal);
    if (!isNaN(num) && PRESETS.includes(num)) setPresetActive(num);
    else setPresetActive(0);
  };

  const handleDonate = () => {
    if (numAmount < 5) {
      showToast('Minimum donation is $5', 'warning');
      return;
    }
    if (!anonymous && !donorName.trim()) {
      showToast('Please enter your name', 'warning');
      return;
    }
    if (!donorEmail.trim() || !donorEmail.includes('@')) {
      showToast('Please enter a valid email', 'warning');
      return;
    }

    setStatus('processing');

    const executePayment = async () => {
      try {
        if (paymentMethod === 'jupiter') {
          const res = await fetch('/api/jupiter/quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: Number(totalAmount.toFixed(2)),
              currency,
              inputMint: jupiterInputMint,
              slippageBps: 50,
            }),
          });
          const data = await res.json();

          if (!res.ok || !data.success || !data.quote) {
            throw new Error(data.error || 'Unable to prepare a Jupiter quote.');
          }

          setPaymentInstructions(null);
          setCurrentDonationId(null);
          setJupiterQuote(data.quote);
          setStatus('pending');
          showToast(
            data.quote.mode === 'demo'
              ? 'Demo route ready. Add JUPITER_API_KEY for live Jupiter pricing.'
              : 'Jupiter route ready. Review the swap details before signing.',
            data.quote.mode === 'demo' ? 'warning' : 'success',
          );
          return;
        }

        const requestAmount = paymentMethod === 'local'
          ? Number(localTotal.toFixed(2))
          : Number(totalAmount.toFixed(2));
        const requestCurrency = paymentMethod === 'local' ? localCurrencyCode : currency;
        const payload = {
          amount: requestAmount,
          currency: requestCurrency,
          method: paymentMethod + (paymentMethod === 'local' ? '_' + localRegion : (paymentMethod === 'crypto' ? '_' + cryptoAsset : '')),
          campaignId: params.campaignId,
          donorName: anonymous ? null : donorName,
          donorEmail,
          donorMessage: message,
          isAnonymous: anonymous,
          coverFee: coverFee,
          creditAmount: Number(numAmount.toFixed(2)),
          creditCurrency: currency
        };

        const apiUrl = paymentMethod === 'card' ? '/api/moonpay/pay' : '/api/busha/pay';
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
          setCurrentDonationId(data.transactionId);
          if (paymentMethod === 'card' && data.url) {
             setPaymentInstructions(null);
             setStatus('pending');
             showToast('Redirecting to MoonPay Secure Checkout...', 'info');
             window.location.assign(data.url);
          } else {
             setStatus('pending');
             
             if (data.instructions) {
               setPaymentInstructions(data.instructions);
               showToast('Please follow the generated transfer instructions.', 'info');
             } else {
               showToast('Payment initiated via Busha...', 'info');
             }
          }
        } else {
          setStatus('failed');
          showToast('API Error: ' + (data.error || 'Unknown error'), 'error');
        }
      } catch (e) {
        console.error(e);
        setStatus('failed');
        showToast('Network error processing payment', 'error');
      }
    };
    
    executePayment();
  };

  const handleRetry = () => {
    setCurrentDonationId(null);
    setPaymentInstructions(null);
    setJupiterQuote(null);
    setIsVerifying(false);
    setStatus('idle');
  };

  const refreshDonationStatus = useCallback(async (showPendingToast = false) => {
    if (!currentDonationId) return;

    try {
      const res = await fetch(`/api/donations/${currentDonationId}/refresh`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Unable to refresh donation status');
      }

      if (data.donation?.instructions) {
        setPaymentInstructions(data.donation.instructions);
      }

      if (data.donation?.status === 'completed') {
        setStatus('confirmed');
        setIsVerifying(false);
        refreshCampaignProgress();
        showToast('Payment confirmed! Thank you for your donation.', 'success');
        return;
      }

      if (data.donation?.status === 'failed') {
        setStatus('failed');
        setIsVerifying(false);
        showToast('This payment failed or expired. Please try again.', 'error');
        return;
      }

      setStatus('pending');
      if (showPendingToast) {
        showToast('Payment is still pending. We will keep checking for confirmation.', 'info');
      }
    } catch {
      setIsVerifying(false);
      showToast('Unable to verify payment right now.', 'warning');
    }
  }, [currentDonationId, refreshCampaignProgress, showToast]);

  const handleManualVerify = async () => {
    if (!currentDonationId) return;
    setIsVerifying(true);
    await refreshDonationStatus(true);
  };

  useEffect(() => {
    if (status !== 'pending' || !currentDonationId) {
      return;
    }

    const interval = setInterval(() => {
      refreshDonationStatus(false);
    }, 7000);

    return () => clearInterval(interval);
  }, [status, currentDonationId, refreshDonationStatus]);

  const ctaText = {
    card: 'Continue with Card',
    crypto: 'Continue with Crypto',
    jupiter: 'Prepare Jupiter Quote',
    local: 'Continue with Local Transfer',
  }[paymentMethod];

  if (!campaign && isLoadingCampaign) {
    return (
      <div className="donate-page">
        <div className="donate-form-card" style={{ textAlign: 'center', padding: '64px 32px' }}>
          <h2 className="ps-title">Loading campaign...</h2>
          <p className="ps-desc">Fetching the latest campaign details.</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="donate-page">
        <Link href="/backer/discover" className="donate-back">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 4L6 8l4 4"/></svg>
          Back to discover
        </Link>
        <div className="donate-form-card" style={{ textAlign: 'center', padding: '64px 32px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <h2 className="ps-title">Campaign not found</h2>
          <p className="ps-desc">The campaign you&apos;re looking for doesn&apos;t exist or has been removed.</p>
          <Link href="/backer/discover" className="btn-primary" style={{ display: 'inline-flex' }}>Browse campaigns</Link>
        </div>
      </div>
    );
  }

  const pct = campaign.goal > 0 ? Math.min(Math.round((campaign.raised / campaign.goal) * 100), 100) : 0;

  // ── Payment Status Screen ──
  if (status !== 'idle') {
    return (
      <div className="donate-page">
        <div className="donate-layout">
          <div className="donate-form-card">
            {status === 'processing' && (
              <div className="payment-status">
                <div className="ps-icon-wrap ps-icon-pending">⏳</div>
                <div className="ps-title">Processing your donation...</div>
                <p className="ps-desc">Please wait while we connect to your payment provider.</p>
              </div>
            )}
            {status === 'pending' && (
              <div className="payment-status">
                <div className="ps-icon-wrap ps-icon-pending">⏳</div>
                <div className="ps-title">{paymentMethod === 'jupiter' ? 'Jupiter Quote Ready' : 'Donation Pending'}</div>
                <p className="ps-desc">
                  {paymentMethod === 'jupiter'
                    ? 'The campaign receives USDC. Your wallet pays with the selected Solana token through Jupiter routing.'
                    : paymentInstructions
                      ? 'Please complete your transfer to definitively confirm your donation.'
                      : 'Your donation is being processed. This may take a few moments depending on your payment method.'}
                </p>
                
                {paymentInstructions && paymentInstructions.type === 'local' && (
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: 24, margin: '24px 0', border: '1px solid var(--border)', textAlign: 'left' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Transfer Instructions</div>
                    <div style={{ marginBottom: 16 }}>Please send exactly <strong style={{ color: 'var(--white)' }}>{getCurrencySymbol(paymentInstructions.currency)}{Number(paymentInstructions.amount || localTotal).toLocaleString()}</strong> to the following virtual account:</div>
                    
                    <div style={{ display: 'grid', gap: 12 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bank Name</span>
                        <span style={{ color: 'var(--white)', fontWeight: 500 }}>{paymentInstructions.bankName}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account Number</span>
                        <span style={{ color: 'var(--white)', fontWeight: 600, fontSize: 18 }}>{paymentInstructions.accountNumber}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account Name</span>
                        <span style={{ color: 'var(--white)', fontWeight: 500 }}>{paymentInstructions.accountName}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {paymentInstructions && paymentInstructions.type === 'crypto' && (
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: 24, margin: '24px 0', border: '1px solid var(--border)', textAlign: 'left' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Crypto Deposit</div>
                    <div style={{ marginBottom: 16 }}>Please send exactly <strong style={{ color: 'var(--white)' }}>{Number(paymentInstructions.amount || totalAmount).toLocaleString()} {paymentInstructions.asset}</strong> to the following wallet address:</div>
                    
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                      <div style={{ width: 156, height: 156, background: 'var(--white)', borderRadius: 12, padding: 8, boxShadow: '0 18px 40px rgba(0,0,0,0.24)' }}>
                         {/* eslint-disable-next-line @next/next/no-img-element */}
                         <img
                           src={getQrCodeUrl(String(paymentInstructions.address))}
                           alt={`QR code for ${paymentInstructions.asset || 'crypto'} deposit address`}
                           width={140}
                           height={140}
                           style={{ width: '100%', height: '100%', display: 'block', borderRadius: 6 }}
                         />
                      </div>
                    </div>
                    
                    <div style={{ display: 'grid', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Network</span>
                        <span style={{ color: 'var(--white)', fontWeight: 500 }}>{paymentInstructions.network}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, wordBreak: 'break-all', gap: 12 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Address</span>
                        <span style={{ color: 'var(--white)', fontWeight: 500, userSelect: 'all' }}>{paymentInstructions.address}</span>
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'jupiter' && jupiterQuote && (
                  <div className="jupiter-quote-card">
                    <div className="jq-header">
                      <div>
                        <div className="jq-eyebrow">{jupiterQuote.mode === 'live' ? 'Live Jupiter route' : jupiterQuote.mode === 'direct' ? 'Direct transfer' : 'Demo estimate'}</div>
                        <div className="jq-title">{jupiterQuote.inputAmount} {jupiterQuote.inputSymbol} → {jupiterQuote.outputAmount} USDC</div>
                      </div>
                      <span className={`jq-mode jq-mode-${jupiterQuote.mode}`}>{jupiterQuote.mode}</span>
                    </div>

                    <div className="jq-grid">
                      <div>
                        <span>You pay</span>
                        <strong>{jupiterQuote.inputAmount} {jupiterQuote.inputSymbol}</strong>
                      </div>
                      <div>
                        <span>Campaign receives</span>
                        <strong>{jupiterQuote.outputAmount} USDC</strong>
                      </div>
                      <div>
                        <span>Slippage</span>
                        <strong>{(jupiterQuote.slippageBps / 100).toFixed(2)}%</strong>
                      </div>
                      <div>
                        <span>Price impact</span>
                        <strong>{Number(jupiterQuote.priceImpactPct).toFixed(4)}%</strong>
                      </div>
                    </div>

                    <div className="jq-route">
                      {(jupiterQuote.routeLabels.length ? jupiterQuote.routeLabels : ['Jupiter route']).map((label) => (
                        <span key={label}>{label}</span>
                      ))}
                    </div>

                    <div className="jq-note">
                      Wallet signing is the next step: use this quote response with Jupiter&apos;s swap endpoint after connecting a Solana wallet.
                    </div>
                  </div>
                )}

                <div className="ps-amount" style={{ display: paymentInstructions || jupiterQuote ? 'none' : 'block' }}>{currencyObj.symbol}{numAmount.toLocaleString()}</div>
                <div className="ps-method">via {getPaymentMethodLabel()}</div>
                
                {paymentInstructions && (
                  <button 
                    onClick={handleManualVerify}
                    className="btn-primary" 
                    style={{ width: '100%', padding: '14px', marginTop: 12, opacity: isVerifying ? 0.8 : 1, pointerEvents: isVerifying ? 'none' : 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                  >
                    {isVerifying && <svg className="spinner" viewBox="0 0 50 50" style={{width: 18, height: 18, stroke: 'currentColor'}}><circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle></svg>}
                    {isVerifying ? 'Confirming with Network...' : 'I have transferred the funds'}
                  </button>
                )}
                
                {!paymentInstructions && paymentMethod !== 'jupiter' && (
                  <div className="ps-status-badge ps-status-pending">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    Waiting for Transfer
                  </div>
                )}
                {paymentMethod === 'jupiter' && (
                  <div className="ps-status-badge ps-status-pending">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>
                    Ready for wallet signing
                  </div>
                )}
              </div>
            )}
            {status === 'confirmed' && (
              <div className="payment-status">
                <div className="ps-icon-wrap ps-icon-confirmed">✅</div>
                <div className="ps-title">Donation Confirmed!</div>
                <p className="ps-desc">Thank you for your generous contribution to {campaign.title}. The organizer has been notified.</p>
                <div className="ps-amount">{currencyObj.symbol}{numAmount.toLocaleString()}</div>
                <div className="ps-method">via {getPaymentMethodLabel()}</div>
                <div className="ps-status-badge ps-status-confirmed">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
                  Confirmed
                </div>
                <div className="ps-actions">
                  <Link href="/backer/discover" className="btn-secondary" style={{ padding: '12px 24px' }}>
                    Discover more
                  </Link>
                  <Link href="/backer/donations" className="btn-primary" style={{ padding: '12px 24px' }}>
                    View my donations
                  </Link>
                </div>
              </div>
            )}
            {status === 'failed' && (
              <div className="payment-status">
                <div className="ps-icon-wrap ps-icon-failed">❌</div>
                <div className="ps-title">Donation Failed</div>
                <p className="ps-desc">Something went wrong processing your donation. No funds were deducted. Please try again.</p>
                <div className="ps-status-badge ps-status-failed">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
                  Failed
                </div>
                <div className="ps-actions">
                  <button className="btn-secondary" style={{ padding: '12px 24px' }} onClick={handleRetry}>
                    Try again
                  </button>
                  <Link href="/backer/discover" className="btn-primary" style={{ padding: '12px 24px' }}>
                    Back to discover
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar persists during status */}
          <CampaignSidebar campaign={campaign} pct={pct} />
        </div>
      </div>
    );
  }

  // ── Donation Form ──
  return (
    <div className="donate-page">
      <Link href="/backer/discover" className="donate-back">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 4L6 8l4 4"/></svg>
        Back to discover
      </Link>

      <div className="page-header" style={{ marginBottom: 28 }}>
        <div>
          <h1 className="page-title">Make a Donation</h1>
          <div className="page-sub">Choose how you&apos;d like to support this campaign.</div>
        </div>
      </div>

      <div className="donate-layout">
        {/* ── Left: Form ── */}
        <div className="donate-form-card">

          {/* Section 1: Amount */}
          <div className="donate-section">
            <div className="donate-section-title">
              <span className="ds-num">1</span>
              Donation Amount
            </div>
            <div className="amount-presets">
              {PRESETS.map(p => (
                <button
                  key={p}
                  className={`amount-preset ${presetActive === p ? 'active' : ''}`}
                  onClick={() => handlePreset(p)}
                >
                  {currencyObj.symbol}{p}
                </button>
              ))}
              <button
                className={`amount-preset ${!PRESETS.includes(presetActive) && presetActive !== 0 ? 'active' : ''}`}
                onClick={() => { setPresetActive(0); setAmount(''); }}
                style={{ background: 'rgba(29,158,117,0.04)' }}
              >
                Custom
              </button>
            </div>
            <div className="currency-row">
              <div className="s-field-amount">
                <div className="amount-input-wrap">
                  <span className="amount-symbol">{currencyObj.symbol}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="amount-input"
                    value={formatAmount(amount)}
                    onChange={e => handleAmountChange(e.target.value)}
                    placeholder="0"
                    id="donate-amount"
                  />
                </div>
              </div>
              <div>
                <label className="s-label" style={{ marginBottom: 8 }}>Currency</label>
                <select
                  className="currency-select"
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  id="donate-currency"
                >
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="donate-divider" />

          {/* Section 2: Your Info */}
          <div className="donate-section">
            <div className="donate-section-title">
              <span className="ds-num">2</span>
              Your Information
            </div>

            <div
              className={`donate-checkbox-row ${anonymous ? 'checked' : ''}`}
              onClick={() => setAnonymous(!anonymous)}
              style={{ marginBottom: 16 }}
            >
              <div className="donate-check">
                {anonymous && (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.5"><path d="M3 8l4 4 6-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                )}
              </div>
              <div className="donate-check-info">
                <div className="donate-check-label">Donate anonymously</div>
                <div className="donate-check-hint">Your name won&apos;t be displayed publicly</div>
              </div>
            </div>

            <div className="donate-fields">
              {!anonymous && (
                <div>
                  <label className="s-label">Your Name</label>
                  <input
                    type="text"
                    className="s-input"
                    placeholder="Jane Doe"
                    value={donorName}
                    onChange={e => setDonorName(e.target.value)}
                    id="donate-name"
                  />
                </div>
              )}
              <div className={anonymous ? 's-field-full' : ''}>
                <label className="s-label">Email Address</label>
                <input
                  type="email"
                  className="s-input"
                  placeholder="jane@example.com"
                  value={donorEmail}
                  onChange={e => setDonorEmail(e.target.value)}
                  id="donate-email"
                />
              </div>
              <div className="s-field-full">
                <label className="s-label">Message to organizer (optional)</label>
                <textarea
                  className="s-textarea"
                  rows={3}
                  placeholder="Good luck with the project!"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  id="donate-message"
                />
              </div>
            </div>
          </div>

          <div className="donate-divider" />

          {/* Section 3: Payment Method */}
          <div className="donate-section">
            <div className="donate-section-title">
              <span className="ds-num">3</span>
              Choose how to donate
            </div>

            <div className="payment-methods">
              {/* Card */}
              <div
                className={`payment-method-card ${paymentMethod === 'card' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('card')}
                id="pm-card"
              >
                <div className="pm-radio"><div className="pm-radio-dot" /></div>
                <div className="pm-icon-wrap pm-icon-card">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
                </div>
                <div className="pm-text">
                  <div className="pm-text-title">Donate with Card</div>
                  <div className="pm-text-sub">Pay with debit or credit card</div>
                </div>
                <span className="pm-text-badge pm-badge-fast">FASTEST</span>
              </div>

              {/* Crypto */}
              <div
                className={`payment-method-card ${paymentMethod === 'crypto' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('crypto')}
                id="pm-crypto"
              >
                <div className="pm-radio"><div className="pm-radio-dot" /></div>
                <div className="pm-icon-wrap pm-icon-crypto">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M14.5 9.5a3 3 0 00-5 0M9.5 14.5a3 3 0 005 0M12 6v2M12 16v2"/></svg>
                </div>
                <div className="pm-text">
                  <div className="pm-text-title">Donate with Crypto</div>
                  <div className="pm-text-sub">Use USDT, SOL, BTC, ETH, or supported assets</div>
                </div>
                <span className="pm-text-badge pm-badge-popular">LOW FEES</span>
              </div>

              {/* Jupiter */}
              <div
                className={`payment-method-card ${paymentMethod === 'jupiter' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('jupiter')}
                id="pm-jupiter"
              >
                <div className="pm-radio"><div className="pm-radio-dot" /></div>
                <div className="pm-icon-wrap pm-icon-jupiter">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 7h10v10"/><path d="M7 17 17 7"/><path d="M4 12a8 8 0 0113.66-5.66M20 12A8 8 0 016.34 17.66"/></svg>
                </div>
                <div className="pm-text">
                  <div className="pm-text-title">Donate with Any Solana Token</div>
                  <div className="pm-text-sub">Route SOL, JUP, BONK, WIF, or a custom mint into USDC</div>
                </div>
                <span className="pm-text-badge pm-badge-jupiter">JUPITER</span>
              </div>

              {/* Local */}
              <div
                className={`payment-method-card ${paymentMethod === 'local' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('local')}
                id="pm-local"
              >
                <div className="pm-radio"><div className="pm-radio-dot" /></div>
                <div className="pm-icon-wrap pm-icon-local">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l8-4 8 4v14M9 21v-6h6v6"/><path d="M9 9h0M15 9h0M9 13h0M15 13h0"/></svg>
                </div>
                <div className="pm-text">
                  <div className="pm-text-title">Donate Locally</div>
                  <div className="pm-text-sub">Nigeria bank transfer or Kenya M-Pesa</div>
                </div>
              </div>
            </div>

            {/* Crypto sub-options */}
            {paymentMethod === 'crypto' && (
              <div className="crypto-details">
                <label className="s-label" style={{ marginBottom: 10 }}>Select Asset</label>
                <div className="crypto-assets">
                  {['USDT', 'SOL', 'BTC', 'ETH', 'USDC'].map(a => (
                    <button
                      key={a}
                      className={`crypto-asset ${cryptoAsset === a ? 'active' : ''}`}
                      onClick={() => setCryptoAsset(a)}
                    >
                      {a}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: 'var(--w50)', lineHeight: 1.5 }}>
                  You&apos;ll be shown a wallet address or QR code to complete payment via Busha.
                </div>
              </div>
            )}

            {/* Jupiter sub-options */}
            {paymentMethod === 'jupiter' && (
              <div className="jupiter-details">
                <label className="s-label" style={{ marginBottom: 10 }}>Pay from wallet token</label>
                <div className="jupiter-token-grid">
                  {JUPITER_INPUT_TOKENS.map(token => (
                    <button
                      key={token.mint}
                      className={`jupiter-token ${jupiterInputMint === token.mint ? 'active' : ''}`}
                      onClick={() => setJupiterInputMint(token.mint)}
                    >
                      <span>{token.symbol}</span>
                      <small>{token.name}</small>
                    </button>
                  ))}
                </div>

                <label className="s-label" htmlFor="jupiter-custom-mint" style={{ margin: '14px 0 8px' }}>
                  Custom token mint
                </label>
                <input
                  id="jupiter-custom-mint"
                  type="text"
                  className="s-input"
                  placeholder="Paste any Solana token mint"
                  value={JUPITER_INPUT_TOKENS.some(token => token.mint === jupiterInputMint) ? '' : jupiterInputMint}
                  onChange={e => setJupiterInputMint(e.target.value.trim())}
                />

                <div className="jupiter-info-row">
                  <span>Settlement</span>
                  <strong>Exact USDC to campaign</strong>
                </div>
                <div style={{ fontSize: 12, color: 'var(--w50)', lineHeight: 1.5, marginTop: 10 }}>
                  OneRaise prepares an exact-output Jupiter route so the campaign receives the intended USDC amount. The donor wallet covers the source token amount, Solana network fee, and any slippage.
                </div>
              </div>
            )}

            {/* Local transfer sub-options */}
            {paymentMethod === 'local' && (
              <div className="local-details">
                <div className="local-tabs">
                  <button
                    className={`local-tab ${localRegion === 'ng' ? 'active' : ''}`}
                    onClick={() => setLocalRegion('ng')}
                  >
                    🇳🇬 Nigeria
                  </button>
                  <button
                    className={`local-tab ${localRegion === 'ke' ? 'active' : ''}`}
                    onClick={() => setLocalRegion('ke')}
                  >
                    🇰🇪 Kenya
                  </button>
                </div>
                {localRegion === 'ng' ? (
                  <div style={{ fontSize: 13, color: 'var(--w50)', lineHeight: 1.6 }}>
                    <strong style={{ color: 'var(--w80)' }}>Bank Transfer Instructions</strong><br/>
                    You’ll receive a unique temporary bank account number to complete this donation. Transfer the exact amount in NGN to that account. Once payment is received and confirmed, your donation will be updated automatically.
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--w50)', lineHeight: 1.6 }}>
                    <strong style={{ color: 'var(--w80)' }}>M-Pesa Instructions</strong><br/>
                    You&apos;ll receive an M-Pesa payment request or be given a unique paybill number. Send the exact KES amount and your donation will be confirmed automatically.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="donate-divider" />

          {/* Cover fee */}
          {paymentMethod !== 'jupiter' && (
            <div
              className={`donate-checkbox-row ${coverFee ? 'checked' : ''}`}
              onClick={() => setCoverFee(!coverFee)}
            >
              <div className="donate-check">
                {coverFee && (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.5"><path d="M3 8l4 4 6-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                )}
              </div>
              <div className="donate-check-info">
                <div className="donate-check-label">Cover processing fee</div>
                <div className="donate-check-hint">
                  Add {currencyObj.symbol}{feeAmount.toFixed(2)} ({(feeRate * 100).toFixed(1)}%) so 100% of your donation reaches the organizer
                </div>
              </div>
            </div>
          )}

          {/* Fee summary */}
          {numAmount > 0 && (
            <div className="fee-summary">
              <div className="fee-row">
                <span>Donation amount</span>
                <span>{currencyObj.symbol}{numAmount.toLocaleString()}</span>
              </div>
              {coverFee && (
                <div className="fee-row">
                  <span>Processing fee</span>
                  <span>{currencyObj.symbol}{feeAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="fee-row total">
                <span>Total charged</span>
                <div style={{ textAlign: 'right' }}>
                  {paymentMethod === 'local' ? (
                    <>
                      <div>{localCurrencyCode} {localTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, fontWeight: 400 }}>
                        ≈ {currencyObj.symbol}{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencyObj.code} <span style={{opacity: 0.5}}>at 1 {currencyObj.code} = {localRate.toLocaleString()} {localCurrencyCode}</span>
                      </div>
                    </>
                  ) : (
                    <span>{currencyObj.symbol}{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CTA */}
          <button
            className="donate-cta"
            style={{ marginTop: 24 }}
            onClick={handleDonate}
            disabled={numAmount < 5}
            id="donate-cta-btn"
          >
            {ctaText}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>

        {/* ── Right: Campaign Sidebar ── */}
        <CampaignSidebar campaign={campaign} pct={pct} />
      </div>
    </div>
  );
}


/* ── Campaign Sidebar Component ── */
function CampaignSidebar({ campaign, pct }: { campaign: CampaignView; pct: number }) {
  return (
    <div className="campaign-sidebar">
      {/* Campaign info card */}
      <div className="campaign-sidebar-card">
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: 'var(--w50)', marginBottom: 12 }}>
          {campaign.category}
        </div>
        <div className="cs-campaign-title">{campaign.title}</div>
        {campaign.image && (
          <div className="cs-campaign-cover">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={campaign.image} alt={`${campaign.title} cover`} />
          </div>
        )}

        <div className="cs-organizer">
          <div className="cs-organizer-avatar">{campaign.creatorInitials}</div>
          <span className="cs-organizer-name">by {campaign.creator}</span>
          {campaign.verified && (
            <span className="cs-verified">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 8l2 2 4-4"/><circle cx="8" cy="8" r="6"/></svg>
              Verified
            </span>
          )}
        </div>

        <div className="cs-progress">
          <div className="cs-stats-row">
            <div>
              <div className="cs-stat-value">${campaign.raised.toLocaleString()}</div>
              <div className="cs-stat-label">raised of ${campaign.goal.toLocaleString()}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="cs-stat-value" style={{ color: 'var(--white)' }}>{pct}%</div>
              <div className="cs-stat-label">{campaign.daysLeft} days left</div>
            </div>
          </div>
          <div className="cs-progress-bar">
            <div className="cs-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="cs-supporters">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
          <span><strong>{campaign.backers.toLocaleString()}</strong> supporters</span>
        </div>
      </div>

      {/* How it works */}
      <div className="cs-info-card">
        <div className="cs-info-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--teal-200)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          How your donation is processed
        </div>
        <div className="cs-info-steps">
          <div className="cs-info-step">
            <div className="cs-info-step-num">1</div>
            <span>Select your preferred payment method and amount</span>
          </div>
          <div className="cs-info-step">
            <div className="cs-info-step-num">2</div>
            <span>Complete payment through MoonPay, Busha, or a Jupiter-routed Solana swap</span>
          </div>
          <div className="cs-info-step">
            <div className="cs-info-step-num">3</div>
            <span>Your donation is converted and sent directly to the campaign organizer</span>
          </div>
        </div>
      </div>

      {/* Supported methods */}
      <div className="cs-info-card">
        <div className="cs-info-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--teal-200)" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
          Supported donation methods
        </div>
        <div className="cs-methods">
          <div className="cs-method-badge">💳 Visa / Mastercard</div>
          <div className="cs-method-badge">₿ Crypto</div>
          <div className="cs-method-badge">◎ Jupiter swap</div>
          <div className="cs-method-badge">🏦 Bank Transfer</div>
          <div className="cs-method-badge">📱 M-Pesa</div>
        </div>
      </div>
    </div>
  );
}
