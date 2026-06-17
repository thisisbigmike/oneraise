export const USD_RATES: Record<string, number> = {
  // Stablecoins
  USD: 1, USDT: 1, USDC: 1,
  // Africa
  NGN: 1 / 1450, KES: 1 / 135, GHS: 1 / 15.4, ZAR: 1 / 18.5, TZS: 1 / 2500,
  UGX: 1 / 3750, RWF: 1 / 1300, ETB: 1 / 57, XOF: 1 / 610, XAF: 1 / 610,
  EGP: 1 / 49, MAD: 1 / 10, TND: 1 / 3.1, DZD: 1 / 135, MZN: 1 / 64,
  ZMW: 1 / 27, MWK: 1 / 1700, BWP: 1 / 14, AOA: 1 / 830, MUR: 1 / 46,
  // Europe
  EUR: 1.08, GBP: 1.27, CHF: 1.12, SEK: 1 / 10.8, NOK: 1 / 10.7,
  DKK: 1 / 6.9, PLN: 1 / 4, CZK: 1 / 23.5, HUF: 1 / 365, RON: 1 / 4.6,
  BGN: 1 / 1.8, HRK: 1 / 7, ISK: 1 / 140, RSD: 1 / 108, UAH: 1 / 41,
  GEL: 1 / 2.7, TRY: 1 / 38,
  // Americas
  CAD: 1 / 1.37, MXN: 1 / 17.2, BRL: 1 / 5, ARS: 1 / 960, CLP: 1 / 945,
  COP: 1 / 4000, PEN: 1 / 3.7, UYU: 1 / 40, CRC: 1 / 515, GTQ: 1 / 7.8,
  DOP: 1 / 59, JMD: 1 / 157, TTD: 1 / 6.8, BBD: 1 / 2,
  // Asia & Pacific
  JPY: 1 / 155, CNY: 1 / 7.25, KRW: 1 / 1350, INR: 1 / 83, PHP: 1 / 56.5,
  THB: 1 / 36, VND: 1 / 25000, IDR: 1 / 16000, MYR: 1 / 4.7, SGD: 1 / 1.35,
  HKD: 1 / 7.8, TWD: 1 / 32, PKR: 1 / 280, BDT: 1 / 120, LKR: 1 / 310,
  NPR: 1 / 133, MMK: 1 / 2100, KHR: 1 / 4100,
  // Middle East
  AED: 1 / 3.67, SAR: 1 / 3.75, QAR: 1 / 3.64, BHD: 1 / 0.376, KWD: 1 / 0.31,
  OMR: 1 / 0.385, JOD: 1 / 0.71, ILS: 1 / 3.7,
  // Oceania
  AUD: 1 / 1.55, NZD: 1 / 1.7, FJD: 1 / 2.25,
};

/** Crypto tokens available on the "You donate" side. */
export type CurrencyDef = { code: string; label: string; flag: string; logoUrl?: string };

export const DONATE_CURRENCIES: CurrencyDef[] = [
  { code: "USDC", label: "USDC", flag: "🪙", logoUrl: "/tokens/usdc.svg" },
  { code: "USDT", label: "USDT", flag: "🪙", logoUrl: "/tokens/usdt.svg" },
];

const CURRENCY_TO_COUNTRY: Record<string, string> = {
  USD: "us", NGN: "ng", KES: "ke", GHS: "gh", ZAR: "za", TZS: "tz",
  UGX: "ug", RWF: "rw", ETB: "et", XOF: "sn", XAF: "cm", EGP: "eg",
  MAD: "ma", TND: "tn", DZD: "dz", MZN: "mz", ZMW: "zm", MWK: "mw",
  BWP: "bw", AOA: "ao", MUR: "mu", EUR: "eu", GBP: "gb", CHF: "ch",
  SEK: "se", NOK: "no", DKK: "dk", PLN: "pl", CZK: "cz", HUF: "hu",
  RON: "ro", BGN: "bg", HRK: "hr", ISK: "is", RSD: "rs", UAH: "ua",
  GEL: "ge", TRY: "tr", CAD: "ca", MXN: "mx", BRL: "br", ARS: "ar",
  CLP: "cl", COP: "co", PEN: "pe", UYU: "uy", CRC: "cr", GTQ: "gt",
  DOP: "do", JMD: "jm", TTD: "tt", BBD: "bb", JPY: "jp", CNY: "cn",
  KRW: "kr", INR: "in", PHP: "ph", THB: "th", VND: "vn", IDR: "id",
  MYR: "my", SGD: "sg", HKD: "hk", TWD: "tw", PKR: "pk", BDT: "bd",
  LKR: "lk", NPR: "np", MMK: "mm", KHR: "kh", AED: "ae", SAR: "sa",
  QAR: "qa", BHD: "bh", KWD: "kw", OMR: "om", JOD: "jo", ILS: "il",
  AUD: "au", NZD: "nz", FJD: "fj"
};

/** Raw fiat currencies (78 countries) list. */
const RAW_RECEIVE_CURRENCIES: CurrencyDef[] = [
  // Africa
  { code: "NGN", label: "NGN", flag: "🇳🇬", logoUrl: "/tokens/ngn.svg" },
  { code: "KES", label: "KES", flag: "🇰🇪", logoUrl: "/tokens/kes.svg" },
  { code: "GHS", label: "GHS", flag: "🇬🇭" },
  { code: "ZAR", label: "ZAR", flag: "🇿🇦" },
  { code: "TZS", label: "TZS", flag: "🇹🇿" },
  { code: "UGX", label: "UGX", flag: "🇺🇬" },
  { code: "RWF", label: "RWF", flag: "🇷🇼" },
  { code: "ETB", label: "ETB", flag: "🇪🇹" },
  { code: "XOF", label: "XOF", flag: "🌍" },
  { code: "XAF", label: "XAF", flag: "🌍" },
  { code: "EGP", label: "EGP", flag: "🇪🇬" },
  { code: "MAD", label: "MAD", flag: "🇲🇦" },
  { code: "TND", label: "TND", flag: "🇹🇳" },
  { code: "DZD", label: "DZD", flag: "🇩🇿" },
  { code: "MZN", label: "MZN", flag: "🇲🇿" },
  { code: "ZMW", label: "ZMW", flag: "🇿🇲" },
  { code: "MWK", label: "MWK", flag: "🇲🇼" },
  { code: "BWP", label: "BWP", flag: "🇧🇼" },
  { code: "AOA", label: "AOA", flag: "🇦🇴" },
  { code: "MUR", label: "MUR", flag: "🇲🇺" },
  // Europe
  { code: "EUR", label: "EUR", flag: "🇪🇺", logoUrl: "/tokens/eur.svg" },
  { code: "GBP", label: "GBP", flag: "🇬🇧", logoUrl: "/tokens/gbp.svg" },
  { code: "CHF", label: "CHF", flag: "🇨🇭" },
  { code: "SEK", label: "SEK", flag: "🇸🇪" },
  { code: "NOK", label: "NOK", flag: "🇳🇴" },
  { code: "DKK", label: "DKK", flag: "🇩🇰" },
  { code: "PLN", label: "PLN", flag: "🇵🇱" },
  { code: "CZK", label: "CZK", flag: "🇨🇿" },
  { code: "HUF", label: "HUF", flag: "🇭🇺" },
  { code: "RON", label: "RON", flag: "🇷🇴" },
  { code: "BGN", label: "BGN", flag: "🇧🇬" },
  { code: "HRK", label: "HRK", flag: "🇭🇷" },
  { code: "ISK", label: "ISK", flag: "🇮🇸" },
  { code: "RSD", label: "RSD", flag: "🇷🇸" },
  { code: "UAH", label: "UAH", flag: "🇺🇦" },
  { code: "GEL", label: "GEL", flag: "🇬🇪" },
  { code: "TRY", label: "TRY", flag: "🇹🇷" },
  // Americas
  { code: "USD", label: "USD", flag: "🇺🇸", logoUrl: "/tokens/usd.svg" },
  { code: "CAD", label: "CAD", flag: "🇨🇦" },
  { code: "MXN", label: "MXN", flag: "🇲🇽" },
  { code: "BRL", label: "BRL", flag: "🇧🇷" },
  { code: "ARS", label: "ARS", flag: "🇦🇷" },
  { code: "CLP", label: "CLP", flag: "🇨🇱" },
  { code: "COP", label: "COP", flag: "🇨🇴" },
  { code: "PEN", label: "PEN", flag: "🇵🇪" },
  { code: "UYU", label: "UYU", flag: "🇺🇾" },
  { code: "CRC", label: "CRC", flag: "🇨🇷" },
  { code: "GTQ", label: "GTQ", flag: "🇬🇹" },
  { code: "DOP", label: "DOP", flag: "🇩🇴" },
  { code: "JMD", label: "JMD", flag: "🇯🇲" },
  { code: "TTD", label: "TTD", flag: "🇹🇹" },
  { code: "BBD", label: "BBD", flag: "🇧🇧" },
  // Asia & Pacific
  { code: "JPY", label: "JPY", flag: "🇯🇵" },
  { code: "CNY", label: "CNY", flag: "🇨🇳" },
  { code: "KRW", label: "KRW", flag: "🇰🇷" },
  { code: "INR", label: "INR", flag: "🇮🇳" },
  { code: "PHP", label: "PHP", flag: "🇵🇭" },
  { code: "THB", label: "THB", flag: "🇹🇭" },
  { code: "VND", label: "VND", flag: "🇻🇳" },
  { code: "IDR", label: "IDR", flag: "🇮🇩" },
  { code: "MYR", label: "MYR", flag: "🇲🇾" },
  { code: "SGD", label: "SGD", flag: "🇸🇬" },
  { code: "HKD", label: "HKD", flag: "🇭🇰" },
  { code: "TWD", label: "TWD", flag: "🇹🇼" },
  { code: "PKR", label: "PKR", flag: "🇵🇰" },
  { code: "BDT", label: "BDT", flag: "🇧🇩" },
  { code: "LKR", label: "LKR", flag: "🇱🇰" },
  { code: "NPR", label: "NPR", flag: "🇳🇵" },
  { code: "MMK", label: "MMK", flag: "🇲🇲" },
  { code: "KHR", label: "KHR", flag: "🇰🇭" },
  // Middle East
  { code: "AED", label: "AED", flag: "🇦🇪" },
  { code: "SAR", label: "SAR", flag: "🇸🇦" },
  { code: "QAR", label: "QAR", flag: "🇶🇦" },
  { code: "BHD", label: "BHD", flag: "🇧🇭" },
  { code: "KWD", label: "KWD", flag: "🇰🇼" },
  { code: "OMR", label: "OMR", flag: "🇴🇲" },
  { code: "JOD", label: "JOD", flag: "🇯🇴" },
  { code: "ILS", label: "ILS", flag: "🇮🇱" },
  // Oceania
  { code: "AUD", label: "AUD", flag: "🇦🇺" },
  { code: "NZD", label: "NZD", flag: "🇳🇿" },
  { code: "FJD", label: "FJD", flag: "🇫🇯" },
];

/** Fiat currencies available on the "Campaign receives" side (78 countries), populated with flag CDN URLs. */
export const RECEIVE_CURRENCIES: CurrencyDef[] = RAW_RECEIVE_CURRENCIES.map(c => ({
  ...c,
  logoUrl: c.logoUrl || (CURRENCY_TO_COUNTRY[c.code] ? `https://flagcdn.com/${CURRENCY_TO_COUNTRY[c.code]}.svg` : undefined)
}));

/** Combined list for backward compat — both crypto + fiat. */
export const SUPPORTED_CURRENCIES: CurrencyDef[] = [...DONATE_CURRENCIES, ...RECEIVE_CURRENCIES];

/** Centralized logo mapping populated dynamically. */
export const TOKEN_LOGOS: Record<string, string> = {
  USDC: "/tokens/usdc.svg",
  USDT: "/tokens/usdt.svg",
};

// Populate the TOKEN_LOGOS mapping dynamically for all supported currencies
SUPPORTED_CURRENCIES.forEach(c => {
  if (c.logoUrl && !TOKEN_LOGOS[c.code]) {
    TOKEN_LOGOS[c.code] = c.logoUrl;
  }
});

export function convertToUsd(amount: number, currency?: string | null) {
  const code = (currency || "USD").toUpperCase();
  const rate = USD_RATES[code] ?? 1;
  return amount * rate;
}

/**
 * Convert between any two supported currencies via the shared USD_RATES table.
 * Used by the hero converter (donor pays `from` → campaign receives `to`).
 */
export function convertCurrency(amount: number, from: string, to: string) {
  const usd = convertToUsd(amount, from);
  const toRate = USD_RATES[(to || "USD").toUpperCase()] ?? 1;
  return usd / toRate;
}

export function roundUsd(amount: number) {
  return Math.round(amount * 100) / 100;
}

export function getProcessingFeeRate(provider?: string | null) {
  const normalized = (provider || "").toLowerCase();

  if (normalized.includes("moonpay")) return 0.039;
  if (normalized.includes("crypto")) return 0.01;
  if (normalized.includes("local") || normalized.includes("busha_ng") || normalized.includes("busha_ke")) {
    return 0.015;
  }

  return 0;
}

export function getDonationCreditUsd(args: {
  amount: number;
  currency?: string | null;
  coverFee?: boolean | null;
  provider?: string | null;
}) {
  const usdAmount = convertToUsd(args.amount, args.currency);
  const feeRate = args.coverFee ? getProcessingFeeRate(args.provider) : 0;
  const donationUsdAmount = feeRate > 0 ? usdAmount / (1 + feeRate) : usdAmount;

  return roundUsd(donationUsdAmount);
}

export function getStoredDonationCreditUsd(args: {
  amount: number;
  currency?: string | null;
  coverFee?: boolean | null;
  provider?: string | null;
  providerDataJson?: string | null;
}) {
  if (args.providerDataJson) {
    try {
      const parsed = JSON.parse(args.providerDataJson) as {
        credit?: {
          amountUsd?: unknown;
        };
      };
      const storedAmount = Number(parsed.credit?.amountUsd);

      if (Number.isFinite(storedAmount) && storedAmount >= 0) {
        return storedAmount;
      }
    } catch {
      // Fall through to the best available conversion fallback.
    }
  }

  return getDonationCreditUsd(args);
}
