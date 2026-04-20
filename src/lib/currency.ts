const USD_RATES: Record<string, number> = {
  USD: 1,
  USDT: 1,
  USDC: 1,
  NGN: 1 / 1450,
  KES: 1 / 135,
  EUR: 1.08,
  GBP: 1.27,
};

export function convertToUsd(amount: number, currency?: string | null) {
  const code = (currency || "USD").toUpperCase();
  const rate = USD_RATES[code] ?? 1;
  return amount * rate;
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
