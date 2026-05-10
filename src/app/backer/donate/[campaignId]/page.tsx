'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { VersionedTransaction } from '@solana/web3.js';
import { useToast } from '../../../components';

import { JUPITER_INPUT_TOKENS, type JupiterDonationQuote } from '@/lib/jupiter';
import CampaignAssistant from '@/components/CampaignAssistant';

type CampaignView = {
  id: number; slug: string; title: string; image?: string | null; creator: string; creatorInitials: string;
  raised: number; goal: number; category: string; desc: string;
  backers: number; daysLeft: number; verified: boolean;
  type?: string;
  protectStatus?: string;
  milestones?: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    proofUrl: string | null;
  }[];
};

const PROTECT_STATUS_LABELS: Record<string, string> = {
  funding: 'Funding',
  locked: 'Funds locked',
  pending_verification: 'Pending verification',
  unlocked: 'Funds released',
  refunded: 'Refunded',
};

function isProtectedType(type?: string) {
  return type === 'protected_crowdfunding' || type === 'emergency_aid' || type === 'grant_distribution';
}

const PRESETS = [25, 50, 100, 250];
const CURRENCIES = [
  { code: 'USDT', symbol: '$', label: 'USDT' },
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

type SolanaWalletProvider = {
  isPhantom?: boolean;
  publicKey?: { toString: () => string };
  connect: () => Promise<{ publicKey?: { toString: () => string } }>;
  signAndSendTransaction: (
    transaction: VersionedTransaction,
    options?: { skipPreflight?: boolean; preflightCommitment?: string },
  ) => Promise<{ signature?: string; hash?: string }>;
};

declare global {
  interface Window {
    solana?: SolanaWalletProvider;
    solflare?: SolanaWalletProvider;
    phantom?: {
      solana?: SolanaWalletProvider;
    };
  }
}

export default function DonatePage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const [campaign, setCampaign] = useState<CampaignView | undefined>(undefined);
  const [isLoadingCampaign, setIsLoadingCampaign] = useState(true);
  const { showToast } = useToast();

  // Form state
  const [amount, setAmount] = useState('50');
  const [presetActive, setPresetActive] = useState(50);
  const [currency, setCurrency] = useState('USDT');
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
  const [jupiterSignature, setJupiterSignature] = useState<string | null>(null);
  const [jupiterTreasuryAccount, setJupiterTreasuryAccount] = useState<string | null>(null);
  const [walletPublicKey, setWalletPublicKey] = useState<string | null>(null);

  // Cloak privacy state
  const [cloakPrivate, setCloakPrivate] = useState(false);
  const [cloakFeeEstimate, setCloakFeeEstimate] = useState<{ gross: number; protocolFee: number; net: number; feePercent: string } | null>(null);

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

  const readApiResponse = async (res: Response) => {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return res.json();
    }

    const text = await res.text();
    return text ? { error: text } : {};
  };

  const getSolanaWallet = () => {
    const phantom = window.phantom?.solana;
    const solana = window.solana;
    const solflare = window.solflare;

    console.log('[OneRaise] Wallet detection:', {
      'window.phantom?.solana': !!phantom,
      'window.phantom?.solana?.isPhantom': phantom?.isPhantom,
      'window.solana': !!solana,
      'window.solflare': !!solflare,
    });

    const provider = phantom || solana || solflare;
    if (!provider) {
      throw new Error('No Solana wallet found. Install Phantom (phantom.app) or Solflare to donate with Jupiter.');
    }
    if (!provider.signAndSendTransaction) {
      throw new Error('Your Solana wallet does not support transaction signing from this browser.');
    }
    return provider;
  };

  const decodeBase64Transaction = (value: string) => {
    const binary = window.atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return VersionedTransaction.deserialize(bytes);
  };

  const refreshCampaignProgress = useCallback(async () => {
    if (!campaignId) return;

    try {
      // Only show loading spinner if we don't already have seed/campaign data
      if (!campaign) setIsLoadingCampaign(true);
      const res = await fetch(`/api/campaigns/${campaignId}`, { cache: 'no-store' });
      const data = await res.json();

      if (res.ok && data.campaign) {
        setCampaign(data.campaign);
      } else if (res.status === 404) {
        setCampaign(undefined);
      }
    } catch {
      // Keep the seeded campaign view if the live progress endpoint is unavailable.
    } finally {
      setIsLoadingCampaign(false);
    }
  }, [campaignId, campaign]);

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
          const wallet = getSolanaWallet();
          let publicKey: string | undefined;
          try {
            const connected = await wallet.connect();
            publicKey = connected.publicKey?.toString() || wallet.publicKey?.toString();
          } catch (connectError: unknown) {
            const msg = connectError instanceof Error ? connectError.message : '';
            if (msg.toLowerCase().includes('reject') || msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('cancel')) {
              throw new Error('Wallet connection was rejected. Please approve the connection request in your wallet extension.');
            }
            throw new Error(
              'Unable to connect to your Solana wallet. Make sure Phantom or Solflare is unlocked, then try again. ' +
              (msg ? `(${msg})` : '')
            );
          }

          if (!publicKey) {
            throw new Error('Unable to read your Solana wallet public key.');
          }

          setWalletPublicKey(publicKey);

          /* ── Cloak Shielded Flow ── */
          if (cloakPrivate) {
            const res = await fetch('/api/cloak/donate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                amount: Number(numAmount.toFixed(2)),
                campaignId: params.campaignId,
                userPublicKey: publicKey,
                donorName: anonymous ? null : donorName,
                donorEmail,
                donorMessage: message,
                isAnonymous: anonymous,
              }),
            });
            const data = await readApiResponse(res);

            if (!res.ok || !data.success || !data.donationId) {
              throw new Error(data.error || 'Unable to prepare shielded donation.');
            }

            setCurrentDonationId(data.donationId);
            setCloakFeeEstimate(data.cloak?.fee || null);
            setJupiterTreasuryAccount(data.treasury?.owner || null);
            setJupiterQuote(null);
            setPaymentInstructions(null);
            setStatus('pending');
            showToast('🔒 Shielded donation recorded. Cloak privacy transaction is being processed.', 'info');

            // Execute client-side shielded donation
            try {
              const signTx = (window.solana as any)?.signTransaction?.bind(window.solana) ||
                (window.solflare as any)?.signTransaction?.bind(window.solflare);
                
              const signMsg = (window.solana as any)?.signMessage?.bind(window.solana) ||
                (window.solflare as any)?.signMessage?.bind(window.solflare);
                
              if (!signTx) {
                throw new Error("Your wallet does not support signTransaction. Try using Phantom.");
              }

              const { executeClientShieldedDonation } = await import('@/lib/cloak');
              const { PublicKey } = await import('@solana/web3.js');
              
              await executeClientShieldedDonation({
                donorPublicKey: new PublicKey(publicKey),
                treasuryPublicKey: new PublicKey(data.treasury.owner),
                amountRaw: BigInt(data.cloak.amountRaw),
                signTransaction: signTx,
                signMessage: signMsg,
                onProgress: (statusText) => showToast(statusText, 'info'),
              });
              
              showToast('🔒 Shielded donation successful! Verifying on-chain...', 'success');
              
              // Tell server we completed it
              await fetch(`/api/donations/${data.donationId}/refresh`, { method: 'POST' });
              
              setStatus('confirmed');
              refreshCampaignProgress();
              showToast('Payment confirmed! Thank you for your private donation.', 'success');
              return;
            } catch (err: any) {
              console.error("Cloak donation failed:", err);
              showToast(err?.message || "Failed to complete shielded donation.", "error");
              setStatus('failed');
              return;
            }
          }

          /* ── Standard Jupiter Flow ── */
          const res = await fetch('/api/jupiter/swap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: Number(numAmount.toFixed(2)),
              currency,
              inputMint: jupiterInputMint,
              slippageBps: 50,
              userPublicKey: publicKey,
              campaignId: params.campaignId,
              donorName: anonymous ? null : donorName,
              donorEmail,
              donorMessage: message,
              isAnonymous: anonymous,
            }),
          });
          const data = await readApiResponse(res);

          if (!res.ok || !data.success || !data.transaction || !data.donationId || !data.quote) {
            throw new Error(data.error || 'Unable to prepare a Jupiter donation transaction.');
          }

          setPaymentInstructions(null);
          setCurrentDonationId(data.donationId);
          setJupiterQuote(data.quote);
          setJupiterTreasuryAccount(data.treasury?.owner || null);
          setStatus('pending');
          showToast('Review and approve the donation in your Solana wallet.', 'info');

          const transaction = decodeBase64Transaction(data.transaction);
          const result = await wallet.signAndSendTransaction(transaction, {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
          });
          const signature = result.signature || result.hash;

          if (!signature) {
            throw new Error('Wallet did not return a transaction signature.');
          }

          setJupiterSignature(signature);
          showToast('Transaction submitted. Confirming USDC delivery...', 'info');

          const confirmRes = await fetch('/api/jupiter/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              donationId: data.donationId,
              signature,
            }),
          });
          const confirmData = await readApiResponse(confirmRes);

          if (!confirmRes.ok) {
            throw new Error(confirmData.error || 'Unable to confirm the Jupiter donation.');
          }

          if (confirmData.status === 'completed') {
            setStatus('confirmed');
            refreshCampaignProgress();
            showToast('Payment confirmed! Thank you for your donation.', 'success');
          } else if (confirmData.status === 'failed') {
            setStatus('failed');
            showToast('The Solana transaction failed. No donation was credited.', 'error');
          } else {
            setStatus('pending');
            showToast('Transaction is submitted and will be credited after confirmation.', 'info');
          }
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
        const data = await readApiResponse(res);

        if (res.ok && data.success) {
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
          throw new Error(data.error || 'Unable to initiate payment.');
        }
      } catch (error) {
        console.error(error);
        const message = error instanceof Error && error.message
          ? error.message
          : 'Network error processing payment';
        setStatus('failed');
        showToast(message, 'error');
      }
    };
    
    executePayment();
  };

  const handleRetry = () => {
    setCurrentDonationId(null);
    setPaymentInstructions(null);
    setJupiterQuote(null);
    setJupiterSignature(null);
    setJupiterTreasuryAccount(null);
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
    jupiter: 'Connect Wallet & Donate',
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
        <Link href="/backer/discover" className="donate-back">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 4L6 8l4 4"/></svg>
          Back to discover
        </Link>
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
                <div className="ps-title">{paymentMethod === 'jupiter' ? 'Jupiter Donation Pending' : 'Donation Pending'}</div>
                <p className="ps-desc">
                  {paymentMethod === 'jupiter'
                    ? jupiterSignature
                      ? 'Your Solana transaction has been submitted. OneRaise is verifying that the treasury received the expected USDC.'
                      : 'The campaign receives USDC. Your wallet pays with the selected Solana token through Jupiter routing.'
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
                      {(jupiterQuote.routeLabels.length ? jupiterQuote.routeLabels : ['Jupiter route']).map((label, index) => (
                        <span key={`${label}-${index}`}>{label}</span>
                      ))}
                    </div>

                    <div className="jq-note">
                      {walletPublicKey && <div>Wallet: <strong>{walletPublicKey.slice(0, 6)}...{walletPublicKey.slice(-4)}</strong></div>}
                      {jupiterTreasuryAccount && <div>OneRaise USDC treasury: <strong>{jupiterTreasuryAccount.slice(0, 6)}...{jupiterTreasuryAccount.slice(-4)}</strong></div>}
                      {jupiterSignature && (
                        <a
                          href={`https://solscan.io/tx/${jupiterSignature}`}
                          target="_blank"
                          rel="noreferrer"
                          className="jq-link"
                        >
                          View transaction on Solscan
                        </a>
                      )}
                      {!jupiterSignature && 'Your wallet will sign and broadcast this transaction. OneRaise credits the donation only after treasury USDC delivery is verified.'}
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
                    {jupiterSignature ? 'Confirming on Solana' : 'Ready for wallet signing'}
                  </div>
                )}

                <button 
                  className="btn-secondary" 
                  style={{ width: '100%', padding: '12px', marginTop: 16 }} 
                  onClick={handleRetry}
                  disabled={isVerifying}
                >
                  Cancel & go back
                </button>
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
                <div
                  className="currency-select"
                  style={{ display: 'flex', alignItems: 'center', pointerEvents: 'none' }}
                >
                  USDT
                </div>
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
                  <div className="pm-text-sub">Use USDT or USDC</div>
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

            {/* Cloak Privacy Toggle — shown for Jupiter method */}
            {paymentMethod === 'jupiter' && (
              <div className="cloak-privacy-toggle">
                <div className="cloak-toggle-row">
                  <div className="cloak-toggle-info">
                    <div className="cloak-toggle-title">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                      Donate Privately
                    </div>
                    <div className="cloak-toggle-desc">Hide your identity and amount on-chain via Cloak shielded pool</div>
                  </div>
                  <label className="cloak-switch">
                    <input type="checkbox" checked={cloakPrivate} onChange={e => setCloakPrivate(e.target.checked)} />
                    <span className="cloak-slider" />
                  </label>
                </div>
                {cloakPrivate && (
                  <div className="cloak-info-card">
                    <div className="cloak-info-header">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      <strong>Powered by Cloak</strong>
                      <span className="cloak-badge">SHIELDED</span>
                    </div>
                    <ul className="cloak-features">
                      <li>Your donation amount and wallet are hidden on-chain</li>
                      <li>Campaign creator can verify donations via viewing key</li>
                      <li>Compliant &amp; auditable — privacy with accountability</li>
                    </ul>
                    {cloakFeeEstimate && (
                      <div className="cloak-fee-display">
                        <div className="cloak-fee-row"><span>Amount</span><strong>${cloakFeeEstimate.gross.toFixed(2)} USDC</strong></div>
                        <div className="cloak-fee-row"><span>Privacy fee ({cloakFeeEstimate.feePercent}%)</span><span>−${cloakFeeEstimate.protocolFee.toFixed(4)} USDC</span></div>
                        <div className="cloak-fee-row cloak-fee-total"><span>Creator receives</span><strong>${cloakFeeEstimate.net.toFixed(2)} USDC</strong></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Crypto sub-options */}
            {paymentMethod === 'crypto' && (
              <div className="crypto-details">
                <label className="s-label" style={{ marginBottom: 10 }}>Select Asset</label>
                <div className="crypto-assets">
                  {['USDT', 'USDC'].map(a => (
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

          {/* Extra options: Cover fee or Donate Privately */}
          {paymentMethod !== 'jupiter' ? (
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
          ) : (
            <div className="cloak-privacy-toggle" style={{ marginTop: 0 }}>
              <div className="cloak-toggle-row">
                <div className="cloak-toggle-info">
                  <div className="cloak-toggle-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                    Donate Privately
                  </div>
                  <div className="cloak-toggle-desc">Hide your identity and amount on-chain via Cloak shielded pool</div>
                </div>
                <label className="cloak-switch">
                  <input type="checkbox" checked={cloakPrivate} onChange={e => setCloakPrivate(e.target.checked)} />
                  <span className="cloak-slider" />
                </label>
              </div>
              {cloakPrivate && (
                <div className="cloak-info-card">
                  <div className="cloak-info-header">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    <strong>Powered by Cloak</strong>
                    <span className="cloak-badge">SHIELDED</span>
                  </div>
                  <ul className="cloak-features">
                    <li>Your donation amount and wallet are hidden on-chain</li>
                    <li>Campaign creator can verify donations via viewing key</li>
                    <li>Compliant &amp; auditable — privacy with accountability</li>
                  </ul>
                  {cloakFeeEstimate && (
                    <div className="cloak-fee-display">
                      <div className="cloak-fee-row"><span>Amount</span><strong>${cloakFeeEstimate.gross.toFixed(2)} USDC</strong></div>
                      <div className="cloak-fee-row"><span>Privacy fee ({cloakFeeEstimate.feePercent}%)</span><span>−${cloakFeeEstimate.protocolFee.toFixed(4)} USDC</span></div>
                      <div className="cloak-fee-row cloak-fee-total"><span>Creator receives</span><strong>${cloakFeeEstimate.net.toFixed(2)} USDC</strong></div>
                    </div>
                  )}
                </div>
              )}
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
  const isProtectedCampaign = isProtectedType(campaign.type);
  const milestones = campaign.milestones || [];

  return (
    <div className="campaign-sidebar">
      {/* Campaign info card */}
      <div className="campaign-sidebar-card">
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: 'var(--w50)', marginBottom: 12 }}>
          {campaign.category}
        </div>
        {isProtectedCampaign && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 10px',
            borderRadius: 999,
            background: 'rgba(29,158,117,0.14)',
            border: '1px solid rgba(29,158,117,0.32)',
            color: 'var(--teal-200)',
            fontSize: 12,
            fontWeight: 800,
            marginBottom: 12,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--teal-200)' }} />
            OneRaise Protect
          </div>
        )}
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

      {isProtectedCampaign && (
        <div className="cs-info-card">
          <div className="cs-info-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--teal-200)" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
            Protect timeline
          </div>
          <div style={{ color: 'var(--w50)', fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>
            Status: <strong style={{ color: 'var(--teal-200)' }}>{PROTECT_STATUS_LABELS[campaign.protectStatus || 'funding'] || campaign.protectStatus}</strong>
          </div>
          <div className="cs-info-steps">
            {milestones.length === 0 && (
              <div className="cs-info-step">
                <div className="cs-info-step-num">1</div>
                <span>Milestones will appear here once the creator publishes them.</span>
              </div>
            )}
            {milestones.slice(0, 4).map((milestone, index) => (
              <div className="cs-info-step" key={milestone.id}>
                <div className="cs-info-step-num">{index + 1}</div>
                <span>{milestone.title} · {milestone.status.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
            <span>{isProtectedCampaign ? 'Protected funds can release when milestone proof is approved' : 'Your donation is converted and sent directly to the campaign organizer'}</span>
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
      <CampaignAssistant />
    </div>
  );
}
