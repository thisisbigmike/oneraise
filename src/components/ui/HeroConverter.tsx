'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { convertCurrency, DONATE_CURRENCIES, RECEIVE_CURRENCIES } from '@/lib/currency';
import CustomSelect, { type CustomSelectOption } from '@/components/ui/CustomSelect';

const toOption = (c: { code: string; label: string; flag: string; logoUrl?: string }): CustomSelectOption => ({
  value: c.code,
  label: c.label,
  iconUrl: c.logoUrl || undefined,
});

/** Crypto tokens (USDC, USDT) — "You donate" side. */
const DONATE_OPTIONS: CustomSelectOption[] = DONATE_CURRENCIES.map(toOption);

/** Fiat currencies (78 countries) — "Campaign receives" side. */
const RECEIVE_OPTIONS: CustomSelectOption[] = RECEIVE_CURRENCIES.map(toOption);

/**
 * Live donation converter for the hero (Sorbet-style). Donor enters an amount in
 * a stablecoin and sees what the campaign receives in local fiat, using the shared
 * USD_RATES table (lib/currency). Pure client-side, no network — instant.
 */
export default function HeroConverter() {
  const [amount, setAmount] = useState('1000');
  const [from, setFrom] = useState('USDC');
  const [to, setTo] = useState('NGN');

  const numericAmount = Number(amount) || 0;

  const { received, rate } = useMemo(() => {
    return {
      received: convertCurrency(numericAmount, from, to),
      rate: convertCurrency(1, from, to),
    };
  }, [numericAmount, from, to]);

  const fmt = (value: number, max = 2) =>
    value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: max });

  return (
    <div className="hconv">
      <div className="hconv-field">
        <label className="hconv-label">You donate</label>
        <div className="hconv-row">
          <input
            className="hconv-input"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
            aria-label="Donation amount"
          />
          <CustomSelect className="hconv-cur" value={from} options={DONATE_OPTIONS} onChange={setFrom} />
        </div>
      </div>

      <div className="hconv-rate">
        <span>1 {from} = {fmt(rate, 4)} {to}</span>
        <span className="hconv-rate-tag">
          <span className="hconv-rate-dot" /> Live rate
        </span>
      </div>

      <div className="hconv-field">
        <label className="hconv-label">Campaign receives</label>
        <div className="hconv-row">
          <input
            className="hconv-input"
            value={fmt(received)}
            readOnly
            aria-label="Amount the campaign receives"
          />
          <CustomSelect className="hconv-cur" value={to} options={RECEIVE_OPTIONS} onChange={setTo} />
        </div>
      </div>

      <div className="hconv-note">
        <span className="hconv-note-icon">⚡</span>
        <div>
          <div className="hconv-note-title">Funds settle in minutes</div>
          <div className="hconv-note-sub">Cross-border, every currency, every time</div>
        </div>
      </div>

      <Link href="/backer/discover" className="hconv-cta">Donate now</Link>
    </div>
  );
}
