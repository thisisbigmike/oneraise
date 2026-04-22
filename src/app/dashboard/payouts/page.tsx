'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useToast, Modal } from '../../components';

type PayoutMethod = {
  id: string;
  type: 'bank' | 'crypto';
  label: string;
  accountName?: string | null;
  accountNumber?: string | null;
  bankName?: string | null;
  bankCode?: string | null;
  walletAddress?: string | null;
  network?: string | null;
  currency: string;
  countryCode?: string | null;
  isPrimary: boolean;
  bushaRecipientId?: string | null;
};

type PayoutRecord = {
  id: string;
  amount: number;
  sourceCurrency: string;
  targetCurrency: string;
  receiveAmount?: number | null;
  receiveCurrency?: string | null;
  status: string;
  createdAt: string;
  completedAt?: string | null;
  quote?: PayoutQuote | null;
  payoutMethod?: {
    id: string;
    type: string;
    label: string;
    currency: string;
  } | null;
};

type PayoutQuote = {
  id: string;
  sourceAmount: number;
  sourceCurrency: string;
  targetAmount: number;
  targetCurrency: string;
  rate?: number | null;
  expiresAt?: string | null;
};

const BANK_CURRENCY_OPTIONS = [
  { code: 'NGN', countryCode: 'NG', label: 'NGN' },
  { code: 'KES', countryCode: 'KE', label: 'KES' },
];

const CRYPTO_ASSET_OPTIONS = ['USDT', 'USDC', 'BTC', 'ETH', 'SOL'];

const NIGERIAN_BANKS = [
  { name: 'Access Bank', code: '044' },
  { name: 'Citibank Nigeria', code: '023' },
  { name: 'Ecobank Nigeria', code: '050' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'First Bank of Nigeria', code: '011' },
  { name: 'First City Monument Bank (FCMB)', code: '214' },
  { name: 'Guaranty Trust Bank (GTB)', code: '058' },
  { name: 'Heritage Bank', code: '030' },
  { name: 'Keystone Bank', code: '082' },
  { name: 'Kuda Bank', code: '50211' },
  { name: 'Moniepoint', code: '50515' },
  { name: 'OPay', code: '100004' },
  { name: 'Palmpay', code: '100033' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'Providus Bank', code: '101' },
  { name: 'Stanbic IBTC Bank', code: '221' },
  { name: 'Standard Chartered Bank', code: '068' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'SunTrust Bank', code: '100' },
  { name: 'Union Bank of Nigeria', code: '032' },
  { name: 'United Bank for Africa (UBA)', code: '033' },
  { name: 'Unity Bank', code: '215' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Zenith Bank', code: '057' },
];

export default function PayoutsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('0');
  const [summary, setSummary] = useState({
    availableBalance: 0,
    pendingBalance: 0,
    totalWithdrawn: 0,
  });
  const [methods, setMethods] = useState<PayoutMethod[]>([]);
  const [history, setHistory] = useState<PayoutRecord[]>([]);
  const [newMethodType, setNewMethodType] = useState<'bank' | 'crypto' | ''>('');
  const [bankName, setBankName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankCurrency, setBankCurrency] = useState('NGN');
  const [countryCode, setCountryCode] = useState('NG');
  const [cryptoAsset, setCryptoAsset] = useState('USDT');
  const [cryptoNetwork, setCryptoNetwork] = useState('TRX');
  const [walletAddress, setWalletAddress] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [savingMethod, setSavingMethod] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [previewingQuote, setPreviewingQuote] = useState(false);
  const [quotePreview, setQuotePreview] = useState<PayoutQuote | null>(null);
  const [resolvingName, setResolvingName] = useState(false);

  useEffect(() => {
    const verifyAccount = async () => {
      if (countryCode !== 'NG' || !bankCode || accountNumber.length !== 10) {
        if (countryCode === 'NG' && accountNumber.length !== 10) {
          setAccountName('');
        }
        return;
      }

      setResolvingName(true);
      try {
        const res = await fetch(`/api/verify-account?account_number=${accountNumber}&bank_code=${bankCode}`);
        const data = await res.json();
        if (res.ok && data.account_name) {
          setAccountName(data.account_name);
        } else {
          setAccountName('Account not found');
        }
      } catch (err) {
        setAccountName('Verification failed');
      } finally {
        setResolvingName(false);
      }
    };

    verifyAccount();
  }, [accountNumber, bankCode, countryCode]);

  const primaryMethod = methods.find(method => method.isPrimary) || null;

  const formatAmount = (val: string) => {
    if (!val) return '';
    const parts = val.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const handleAmountChange = (val: string) => {
    const cleanVal = val.replace(/[^0-9.]/g, '');
    const parts = cleanVal.split('.');
    const finalizedVal = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleanVal;
    setWithdrawAmount(finalizedVal);
    setQuotePreview(null);
  };

  const formatDisplayAmount = (value: number, currency = 'USD') => {
    if (['USD', 'EUR', 'GBP', 'NGN', 'KES'].includes(currency)) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
      }).format(value);
    }

    return `${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currency}`;
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [methodsRes, payoutsRes] = await Promise.all([
        fetch('/api/payout-methods', { cache: 'no-store' }),
        fetch('/api/payouts', { cache: 'no-store' }),
      ]);

      const methodsData = await methodsRes.json();
      const payoutsData = await payoutsRes.json();

      if (!methodsRes.ok) {
        throw new Error(methodsData.error || 'Unable to load payout methods.');
      }

      if (!payoutsRes.ok) {
        throw new Error(payoutsData.error || 'Unable to load payouts.');
      }

      setMethods(methodsData.methods || []);
      setHistory(payoutsData.payouts || []);
      setSummary(
        payoutsData.summary || {
          availableBalance: 0,
          pendingBalance: 0,
          totalWithdrawn: 0,
        },
      );
    } catch (error: any) {
      showToast(error.message || 'Unable to load payout data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetMethodForm = () => {
    setNewMethodType('');
    setBankName('');
    setBankCode('');
    setAccountName('');
    setAccountNumber('');
    setBankCurrency('NGN');
    setCountryCode('NG');
    setCryptoAsset('USDT');
    setCryptoNetwork('TRX');
    setWalletAddress('');
  };

  const handleSaveMethod = async () => {
    if (!newMethodType) {
      showToast('Please select a payout method type.', 'warning');
      return;
    }

    if (newMethodType === 'bank' && (!bankName || !bankCode || !accountName || !accountNumber)) {
      showToast('Fill in the bank name, bank code, account name, and account number.', 'warning');
      return;
    }

    if (newMethodType === 'crypto' && !walletAddress.trim()) {
      showToast('Please enter your wallet address.', 'warning');
      return;
    }

    try {
      setSavingMethod(true);
      const res = await fetch('/api/payout-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          newMethodType === 'bank'
            ? {
                type: 'bank',
                bankName,
                bankCode,
                accountName,
                accountNumber,
                currency: bankCurrency,
                countryCode,
                makePrimary: methods.length === 0,
              }
            : {
                type: 'crypto',
                walletAddress,
                network: cryptoNetwork,
                currency: cryptoAsset,
                countryCode: 'GLOBAL',
                makePrimary: methods.length === 0,
              },
        ),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to save payout method.');
      }

      await loadData();
      resetMethodForm();
      setShowAddModal(false);
      showToast('Payout method saved successfully.', 'success');
    } catch (error: any) {
      showToast(error.message || 'Unable to save payout method.', 'error');
    } finally {
      setSavingMethod(false);
    }
  };

  const handlePreviewPayout = async () => {
    const parsedAmount = Number(withdrawAmount);
    if (!parsedAmount || parsedAmount <= 0) {
      showToast('Enter a valid amount.', 'warning');
      return;
    }

    if (!primaryMethod) {
      showToast('Add a payout method first.', 'warning');
      return;
    }

    if (parsedAmount > summary.availableBalance) {
      showToast('Withdrawal exceeds available balance.', 'warning');
      return;
    }

    try {
      setPreviewingQuote(true);
      const res = await fetch('/api/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parsedAmount,
          payoutMethodId: primaryMethod.id,
          previewOnly: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to preview payout quote.');
      }

      setQuotePreview(data.quote || null);
      showToast('Busha payout quote ready.', 'success');
    } catch (error: any) {
      setQuotePreview(null);
      showToast(error.message || 'Unable to preview payout quote.', 'error');
    } finally {
      setPreviewingQuote(false);
    }
  };

  const handleWithdraw = async () => {
    const parsedAmount = Number(withdrawAmount);
    if (!parsedAmount || parsedAmount <= 0) {
      showToast('Enter a valid amount.', 'warning');
      return;
    }

    if (!primaryMethod) {
      showToast('Add a payout method first.', 'warning');
      return;
    }

    if (!quotePreview) {
      showToast('Preview the Busha quote before confirming withdrawal.', 'warning');
      return;
    }

    try {
      setWithdrawing(true);
      const res = await fetch('/api/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parsedAmount,
          payoutMethodId: primaryMethod.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to initiate payout.');
      }

      await loadData();
      setWithdrawOpen(false);
      setWithdrawAmount('0');
      setQuotePreview(null);
      showToast('Withdrawal initiated successfully.', 'success');
    } catch (error: any) {
      showToast(error.message || 'Unable to initiate payout.', 'error');
    } finally {
      setWithdrawing(false);
    }
  };

  const handleSetPrimary = async (id: string) => {
    try {
      const res = await fetch(`/api/payout-methods/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ makePrimary: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to update payout method.');
      }

      await loadData();
      setEditId(null);
      showToast('Primary payout method updated.', 'success');
    } catch (error: any) {
      showToast(error.message || 'Unable to update payout method.', 'error');
    }
  };

  const handleRemoveMethod = async (id: string) => {
    try {
      const res = await fetch(`/api/payout-methods/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to remove payout method.');
      }

      await loadData();
      setEditId(null);
      showToast('Payout method removed.', 'info');
    } catch (error: any) {
      showToast(error.message || 'Unable to remove payout method.', 'error');
    }
  };

  const handleRefreshPayout = async (id: string) => {
    try {
      const res = await fetch(`/api/payouts/${id}/refresh`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to refresh payout status.');
      }

      await loadData();
      showToast('Payout status refreshed.', 'success');
    } catch (error: any) {
      showToast(error.message || 'Unable to refresh payout status.', 'error');
    }
  };

  return (
    <div className="overview-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payouts</h1>
          <div className="page-sub">Manage your withdrawal methods and payout schedule.</div>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="sc-label">Available Balance</div>
          <div className="sc-value" style={{ fontSize: 28, marginTop: 8, color: 'var(--teal-200)' }}>
            {formatDisplayAmount(summary.availableBalance)}
          </div>
          <button
            className="btn-primary"
            style={{ marginTop: 16, width: '100%' }}
            onClick={() => setWithdrawOpen(true)}
            disabled={!primaryMethod || summary.availableBalance <= 0}
          >
            Withdraw funds
          </button>
        </div>
        <div className="stat-card">
          <div className="sc-label">Pending Clearance</div>
          <div className="sc-value" style={{ fontSize: 28, marginTop: 8, color: 'var(--amber)' }}>
            {formatDisplayAmount(summary.pendingBalance)}
          </div>
          <div className="sc-sub" style={{ marginTop: 8 }}>Still waiting on donation settlement</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">Total Withdrawn</div>
          <div className="sc-value" style={{ fontSize: 28, marginTop: 8 }}>
            {formatDisplayAmount(summary.totalWithdrawn)}
          </div>
          <div className="sc-sub" style={{ marginTop: 8 }}>Across completed payouts</div>
        </div>
      </div>

      <div className="content-card">
        <div className="cc-header">
          <div className="cc-title">Payout Methods</div>
          <button className="btn-primary" style={{ fontSize: 13, padding: '8px 16px' }} onClick={() => setShowAddModal(true)}>
            + Add method
          </button>
        </div>
        <div className="payout-methods">
          {methods.length === 0 && (
            <div className="s-hint" style={{ padding: '16px 0' }}>
              No payout methods yet. Add one to enable withdrawals.
            </div>
          )}
          {methods.map(method => (
            <div key={method.id} className="pm-item">
              <div className="pm-icon">
                {method.type === 'bank' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"/><path d="M2 10h20"/></svg>
                )}
              </div>
              <div className="pm-info">
                <div style={{ fontWeight: 600 }}>{method.label}</div>
                <div className="s-hint">
                  {method.type === 'bank'
                    ? `${method.accountName || 'Account'} • ${method.currency}`
                    : `${method.walletAddress?.slice(0, 8) || ''}...${method.walletAddress?.slice(-6) || ''} (${method.network})`}
                </div>
              </div>
              {method.isPrimary && (
                <span className="s-verify-badge verified" style={{ fontSize: 11, padding: '4px 10px' }}>
                  Primary
                </span>
              )}
              <button
                className="btn-secondary"
                style={{ fontSize: 12, padding: '6px 12px', marginLeft: 'auto' }}
                onClick={() => setEditId(editId === method.id ? null : method.id)}
              >
                {editId === method.id ? 'Close' : 'Edit'}
              </button>
              {editId === method.id && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {!method.isPrimary && (
                    <button className="btn-primary" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => handleSetPrimary(method.id)}>
                      Set Primary
                    </button>
                  )}
                  <button className="btn-danger" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => handleRemoveMethod(method.id)}>
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {showAddModal && (
          <div className="pm-add-form">
            <div className="cc-title" style={{ fontSize: 14, marginBottom: 16 }}>Add Payout Method</div>
            <div className="s-fields">
              <div className="s-field">
                <label className="s-label">Method Type</label>
                <select className="s-input" value={newMethodType} onChange={e => setNewMethodType(e.target.value as 'bank' | 'crypto' | '')}>
                  <option value="" disabled>Select method</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="crypto">Crypto Wallet</option>
                </select>
              </div>

              {newMethodType === 'bank' && (
                <>
                  <div className="s-field">
                    <label className="s-label">Payout Currency</label>
                    <select
                      className="s-input"
                      value={bankCurrency}
                      onChange={e => {
                        const nextCurrency = e.target.value;
                        setBankCurrency(nextCurrency);
                        const next = BANK_CURRENCY_OPTIONS.find(option => option.code === nextCurrency);
                        setCountryCode(next?.countryCode || 'NG');
                      }}
                    >
                      {BANK_CURRENCY_OPTIONS.map(option => (
                        <option key={option.code} value={option.code}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  {countryCode === 'NG' ? (
                    <div className="s-field">
                      <label className="s-label">Bank Name</label>
                      <select 
                        className="s-input" 
                        value={bankCode} 
                        onChange={e => {
                          const selectedBank = NIGERIAN_BANKS.find(b => b.code === e.target.value);
                          if (selectedBank) {
                            setBankName(selectedBank.name);
                            setBankCode(selectedBank.code);
                          }
                        }}
                      >
                        <option value="" disabled>Select your bank</option>
                        {NIGERIAN_BANKS.map(bank => (
                          <option key={bank.code} value={bank.code}>{bank.name}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <>
                      <div className="s-field">
                        <label className="s-label">Bank Name</label>
                        <input className="s-input" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. Equity Bank" />
                      </div>
                      <div className="s-field">
                        <label className="s-label">Bank Code</label>
                        <input className="s-input" value={bankCode} onChange={e => setBankCode(e.target.value)} placeholder="Bank Code" />
                      </div>
                    </>
                  )}
                  <div className="s-field s-field-full">
                    <label className="s-label">Account Number</label>
                    <input className="s-input" value={accountNumber} onChange={e => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="0123456789" />
                  </div>
                  <div className="s-field">
                    <label className="s-label">Account Name</label>
                    {countryCode === 'NG' ? (
                      <input 
                        className="s-input" 
                        value={resolvingName ? 'Verifying account...' : accountName} 
                        readOnly 
                        style={{ backgroundColor: 'var(--w5)', color: resolvingName ? 'var(--w50)' : 'var(--white)' }}
                        placeholder="Auto-resolved account name"
                      />
                    ) : (
                      <input className="s-input" value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Tunde Coker" />
                    )}
                  </div>
                </>
              )}

              {newMethodType === 'crypto' && (
                <>
                  <div className="s-field">
                    <label className="s-label">Asset</label>
                    <select className="s-input" value={cryptoAsset} onChange={e => setCryptoAsset(e.target.value)}>
                      {CRYPTO_ASSET_OPTIONS.map(asset => (
                        <option key={asset} value={asset}>{asset}</option>
                      ))}
                    </select>
                  </div>
                  <div className="s-field">
                    <label className="s-label">Network</label>
                    <input className="s-input" value={cryptoNetwork} onChange={e => setCryptoNetwork(e.target.value.toUpperCase())} placeholder="TRX" />
                  </div>
                  <div className="s-field s-field-full">
                    <label className="s-label">Wallet Address</label>
                    <input className="s-input" value={walletAddress} onChange={e => setWalletAddress(e.target.value)} placeholder="Enter wallet address" />
                  </div>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn-primary" style={{ fontSize: 13 }} onClick={handleSaveMethod} disabled={savingMethod}>
                {savingMethod ? 'Saving...' : 'Save method'}
              </button>
              <button
                className="btn-secondary"
                style={{ fontSize: 13 }}
                onClick={() => {
                  resetMethodForm();
                  setShowAddModal(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="content-card" style={{ marginTop: 24, overflow: 'hidden', padding: 0 }}>
        <div style={{ padding: '24px 24px 0' }}>
          <div className="cc-title">Payout History</div>
        </div>
        <div className="txn-table-wrap">
          <table className="txn-table">
            <thead>
              <tr>
                <th>Payout ID</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--w50)' }}>
                    Loading payouts...
                  </td>
                </tr>
              )}
              {!loading && history.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--w50)' }}>
                    No payouts yet.
                  </td>
                </tr>
              )}
              {!loading && history.map(payout => (
                <tr key={payout.id}>
                  <td>
                    <span className="txn-id">{payout.id.slice(0, 12)}</span>
                  </td>
                  <td>
                    <span className="txn-amount">{formatDisplayAmount(payout.amount, payout.sourceCurrency)}</span>
                    {payout.receiveAmount ? (
                      <div className="s-hint" style={{ marginTop: 4 }}>
                        Receive {formatDisplayAmount(payout.receiveAmount, payout.receiveCurrency || payout.targetCurrency)}
                      </div>
                    ) : null}
                  </td>
                  <td>{payout.payoutMethod?.label || 'Payout method'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`txn-status ${payout.status === 'completed' ? 'confirmed' : 'pending'}`}>{payout.status}</span>
                      {payout.status !== 'completed' && payout.status !== 'failed' && (
                        <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => handleRefreshPayout(payout.id)}>
                          Refresh
                        </button>
                      )}
                    </div>
                  </td>
                  <td>{new Date(payout.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={withdrawOpen} onClose={() => {
        setWithdrawOpen(false);
        setQuotePreview(null);
      }} title="Withdraw Funds">
        <p style={{ color: 'var(--w50)', fontSize: 14, marginBottom: 20 }}>
          Funds will be sent to your primary payout method ({primaryMethod?.label || 'None set'}).
        </p>
        <div className="s-field" style={{ marginBottom: 20 }}>
          <label className="s-label">Withdrawal Amount (USD)</label>
          <input className="s-input" type="text" inputMode="decimal" value={formatAmount(withdrawAmount)} onChange={e => handleAmountChange(e.target.value)} />
        </div>
        <div style={{ background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(93,202,165,0.22)', borderRadius: 16, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: 'var(--w50)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
            Busha payout quote
          </div>
          {quotePreview ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 10 }}>
                <span style={{ color: 'var(--w50)' }}>You send</span>
                <strong>{formatDisplayAmount(quotePreview.sourceAmount || Number(withdrawAmount), quotePreview.sourceCurrency || 'USDT')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 10 }}>
                <span style={{ color: 'var(--w50)' }}>Creator receives</span>
                <strong style={{ color: 'var(--teal-200)' }}>{formatDisplayAmount(quotePreview.targetAmount, quotePreview.targetCurrency || primaryMethod?.currency || 'NGN')}</strong>
              </div>
              {quotePreview.rate ? (
                <div className="s-hint">Rate: 1 {quotePreview.sourceCurrency} ≈ {quotePreview.rate.toLocaleString()} {quotePreview.targetCurrency}</div>
              ) : (
                <div className="s-hint">Quote generated by Busha at withdrawal time.</div>
              )}
            </>
          ) : (
            <div className="s-hint">
              Preview a fresh Busha quote to see what the creator will receive before creating the transfer.
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={handlePreviewPayout} disabled={previewingQuote || withdrawing}>
            {previewingQuote ? 'Getting quote...' : quotePreview ? 'Refresh quote' : 'Preview quote'}
          </button>
          <button className="btn-primary" style={{ flex: 1 }} onClick={handleWithdraw} disabled={withdrawing || !quotePreview}>
            {withdrawing ? 'Processing...' : 'Confirm Withdrawal'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
