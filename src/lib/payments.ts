import crypto from "crypto";

type BushaRequestOptions = {
  body?: Record<string, unknown>;
  bushaProfileId?: string | null;
};

type MoonPayCheckoutArgs = {
  baseCurrencyAmount: number;
  baseCurrencyCode: string;
  currencyCode: string;
  walletAddress: string;
  externalTransactionId: string;
  email?: string | null;
  redirectURL?: string | null;
};

export const SUPPORTED_CRYPTO_ASSETS = ["USDT", "USDC", "BTC", "ETH", "SOL"] as const;

export function getBushaToken() {
  return process.env.BUSHA_SECRET_TOKEN || process.env.BUSHA_API_KEY || "";
}

export function getBushaBaseUrl() {
  return trimTrailingSlash(process.env.BUSHA_BASE_URL || "https://api.sandbox.busha.so");
}

export function getMoonPayBaseUrl() {
  return trimTrailingSlash(process.env.MOONPAY_WIDGET_BASE_URL || "https://buy-sandbox.moonpay.com");
}

export function getMoonPayPublicKey() {
  return process.env.MOONPAY_PUBLIC_KEY || process.env.MOONPAY_API_KEY || "";
}

export function getMoonPaySecretKey() {
  return process.env.MOONPAY_SECRET_KEY || "";
}

export function getDefaultSettlementAsset() {
  return (process.env.DEFAULT_SETTLEMENT_ASSET || "USDT").toUpperCase();
}

export function getDefaultSettlementNetwork() {
  return (process.env.DEFAULT_SETTLEMENT_NETWORK || "TRX").toUpperCase();
}

export function getDefaultNetworkForAsset(asset: string) {
  const upper = asset.toUpperCase();
  if (upper === "USDT") return getDefaultSettlementNetwork();
  if (upper === "USDC") return "ETH";
  if (upper === "BTC") return "BTC";
  if (upper === "ETH") return "ETH";
  if (upper === "SOL") return "SOL";
  return getDefaultSettlementNetwork();
}

export function getMoonPayCurrencyCode(asset: string, network: string) {
  return `${asset.toLowerCase()}_${network.toLowerCase()}`;
}

export function toNumber(value: unknown, fallback = 0) {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function toAmountString(value: unknown) {
  const amount = toNumber(value);
  if (!amount || amount <= 0) {
    throw new Error("A valid positive amount is required.");
  }
  return amount.toFixed(2);
}

export function safeJsonParse<T = unknown>(value?: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function ensureAbsoluteUrl(url?: string | null, fallbackPath?: string) {
  if (url) return url;
  if (fallbackPath) {
    const host = process.env.NEXTAUTH_URL || "http://oneraise.vercel.app";
    return `${trimTrailingSlash(host)}${fallbackPath}`;
  }
  return null;
}

export function buildMoonPayCheckoutUrl({
  baseCurrencyAmount,
  baseCurrencyCode,
  currencyCode,
  walletAddress,
  externalTransactionId,
  email,
  redirectURL,
}: MoonPayCheckoutArgs) {
  const apiKey = getMoonPayPublicKey();
  const secretKey = getMoonPaySecretKey();

  if (!apiKey || !secretKey) {
    throw new Error("MoonPay keys are missing. Set MOONPAY_PUBLIC_KEY/API_KEY and MOONPAY_SECRET_KEY.");
  }

  const baseUrl = getMoonPayBaseUrl();
  const query = new URLSearchParams({
    apiKey,
    baseCurrencyAmount: String(baseCurrencyAmount),
    baseCurrencyCode: baseCurrencyCode.toLowerCase(),
    currencyCode: currencyCode.toLowerCase(),
    walletAddress,
    externalTransactionId,
    lockAmount: "true",
  });

  if (email) {
    query.set("email", email);
  }

  if (redirectURL) {
    query.set("redirectURL", redirectURL);
  }

  const unsignedUrl = `${baseUrl}?${query.toString()}`;
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(new URL(unsignedUrl).search)
    .digest("base64");

  return `${unsignedUrl}&signature=${encodeURIComponent(signature)}`;
}

export async function bushaRequest(
  method: "GET" | "POST",
  endpoint: string,
  options: BushaRequestOptions = {},
) {
  const token = getBushaToken();
  if (!token) {
    throw new Error("Busha token is missing. Set BUSHA_API_KEY or BUSHA_SECRET_TOKEN.");
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  if (process.env.BUSHA_API_VERSION) {
    headers["X-BU-Version"] = process.env.BUSHA_API_VERSION;
  }

  if (options.bushaProfileId) {
    headers["X-BU-PROFILE-ID"] = options.bushaProfileId;
  }

  const response = await fetch(`${getBushaBaseUrl()}${endpoint}`, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const text = await response.text();
  let payload: unknown = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    throw new Error(`Busha request failed (${response.status}): ${typeof payload === "string" ? payload : JSON.stringify(payload)}`);
  }

  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: unknown }).data;
  }

  return payload;
}

export async function createBushaCryptoDeposit(args: {
  asset: string;
  network?: string;
  quoteAmount: number;
  quoteCurrency: string;
  targetAsset?: string;
  bushaProfileId?: string | null;
}) {
  const asset = args.asset.toUpperCase();
  const network = (args.network || getDefaultNetworkForAsset(asset)).toUpperCase();
  const targetAsset = (args.targetAsset || asset).toUpperCase();
  const quote = (await bushaRequest("POST", "/v1/quotes", {
    bushaProfileId: args.bushaProfileId,
    body: {
      type: "deposit",
      source_currency: asset,
      target_currency: targetAsset,
      quote_currency: args.quoteCurrency.toUpperCase(),
      quote_amount: toAmountString(args.quoteAmount),
      pay_in: {
        type: "address",
        network,
      },
    },
  })) as Record<string, any>;

  const transfer = (await bushaRequest("POST", "/v1/transfers", {
    bushaProfileId: args.bushaProfileId,
    body: {
      quote_id: quote.id,
    },
  })) as Record<string, any>;

  return { quote, transfer };
}

export async function createBushaLocalDeposit(args: {
  region: "ng" | "ke";
  amount: number;
  currency: string;
  phone?: string | null;
  bushaProfileId?: string | null;
}) {
  const sourceCurrency = args.currency.toUpperCase();
  const payIn =
    args.region === "ke"
      ? {
          type: "mobile_money",
          phone: args.phone,
        }
      : {
          type: "temporary_bank_account",
        };

  const quote = (await bushaRequest("POST", "/v1/quotes", {
    bushaProfileId: args.bushaProfileId,
    body: {
      type: "deposit",
      source_currency: sourceCurrency,
      target_currency: sourceCurrency,
      source_amount: toAmountString(args.amount),
      pay_in: payIn,
    },
  })) as Record<string, any>;

  const transfer = (await bushaRequest("POST", "/v1/transfers", {
    bushaProfileId: args.bushaProfileId,
    body: {
      quote_id: quote.id,
    },
  })) as Record<string, any>;

  return { quote, transfer };
}

export async function fetchBushaTransfer(transferId: string, bushaProfileId?: string | null) {
  return (await bushaRequest("GET", `/v1/transfers/${transferId}`, {
    bushaProfileId,
  })) as Record<string, any>;
}

export async function createBushaRecipient(args: {
  accountName: string;
  accountNumber: string;
  bankCode: string;
  bankName?: string | null;
  currency: string;
  countryCode: string;
  bushaProfileId?: string | null;
}) {
  return (await bushaRequest("POST", "/v1/recipients", {
    bushaProfileId: args.bushaProfileId,
    body: {
      type: "bank_transfer",
      country_id: args.countryCode.toUpperCase(),
      currency_id: args.currency.toUpperCase(),
      account_name: args.accountName,
      account_number: args.accountNumber,
      bank_code: args.bankCode,
      bank_name: args.bankName || undefined,
    },
  })) as Record<string, any>;
}

export async function createBushaPayout(args: {
  amount: number;
  sourceCurrency: string;
  targetCurrency: string;
  recipientId?: string | null;
  walletAddress?: string | null;
  network?: string | null;
  bushaProfileId?: string | null;
}) {
  const quote = await quoteBushaPayout(args);

  const transfer = (await bushaRequest("POST", "/v1/transfers", {
    bushaProfileId: args.bushaProfileId,
    body: {
      quote_id: quote.id,
    },
  })) as Record<string, any>;

  return { quote, transfer };
}

export async function quoteBushaPayout(args: {
  amount: number;
  sourceCurrency: string;
  targetCurrency: string;
  recipientId?: string | null;
  walletAddress?: string | null;
  network?: string | null;
  bushaProfileId?: string | null;
}) {
  const payOut = args.recipientId
    ? {
        type: "bank_transfer",
        recipient_id: args.recipientId,
      }
    : {
        type: "address",
        address: args.walletAddress,
        network: args.network,
      };

  return (await bushaRequest("POST", "/v1/quotes", {
    bushaProfileId: args.bushaProfileId,
    body: {
      type: "withdrawal",
      source_currency: args.sourceCurrency.toUpperCase(),
      target_currency: args.targetCurrency.toUpperCase(),
      source_amount: toAmountString(args.amount),
      pay_out: payOut,
    },
  })) as Record<string, any>;
}

export function formatBushaQuote(quote: Record<string, any>) {
  const sourceAmount = toNumber(quote.source_amount || quote.sourceAmount || quote.amount);
  const targetAmount = toNumber(quote.target_amount || quote.targetAmount || quote.receive_amount || quote.receiveAmount);
  const rate = toNumber(quote.rate || quote.exchange_rate || quote.exchangeRate);

  return {
    id: String(quote.id || ""),
    sourceAmount,
    sourceCurrency: String(quote.source_currency || quote.sourceCurrency || ""),
    targetAmount,
    targetCurrency: String(quote.target_currency || quote.targetCurrency || ""),
    rate: rate || (sourceAmount && targetAmount ? targetAmount / sourceAmount : null),
    expiresAt: quote.expires_at || quote.expiresAt || null,
    raw: quote,
  };
}

export function extractBushaInstructions(transfer: Record<string, any>, fallbackAsset?: string | null) {
  const payIn = (transfer.pay_in || transfer.payIn || {}) as Record<string, any>;
  const recipient = (payIn.recipient_details || payIn.recipientDetails || {}) as Record<string, any>;
  const amount = transfer.source_amount || transfer.amount || null;
  const asset = fallbackAsset || transfer.source_currency || null;

  if (payIn.address) {
    return {
      type: "crypto",
      address: payIn.address,
      network: payIn.network || null,
      asset,
      amount,
      expiresAt: payIn.expires_at || null,
    };
  }

  if (payIn.type === "temporary_bank_account" || recipient.account_number) {
    return {
      type: "local",
      bankName: recipient.bank_name || null,
      accountNumber: recipient.account_number || null,
      accountName: recipient.account_name || null,
      amount,
      currency: transfer.source_currency || null,
      expiresAt: payIn.expires_at || null,
    };
  }

  if (payIn.type === "mobile_money") {
    return {
      type: "local",
      provider: recipient.provider_name || recipient.network || "M-Pesa",
      accountNumber: recipient.phone_number || recipient.paybill || null,
      accountName: recipient.account_name || recipient.shortcode || null,
      amount,
      currency: transfer.source_currency || null,
      expiresAt: payIn.expires_at || null,
      raw: recipient,
    };
  }

  return null;
}

export function mapBushaTransferStatus(value: unknown) {
  const status = String(value || "").toLowerCase();
  if (
    status.includes("funds_received") ||
    status.includes("funds_converted") ||
    status.includes("funds_delivered") ||
    status.includes("completed") ||
    status.includes("successful")
  ) {
    return "completed";
  }
  if (status.includes("cancel") || status.includes("fail")) {
    return "failed";
  }
  return "pending";
}

export function verifyMoonPayWebhookSignature(rawBody: string, signatureHeader?: string | null) {
  const secret = process.env.MOONPAY_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!signatureHeader) return false;

  const expectedHex = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBase64 = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  const values = signatureHeader.split(",").map((part) => part.trim());

  return values.includes(expectedHex) || values.includes(expectedBase64);
}

export function verifyBushaWebhookSignature(rawBody: string, signatureHeader?: string | null) {
  const secret = process.env.BUSHA_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!signatureHeader) return false;

  const expectedHex = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBase64 = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  const values = signatureHeader.split(",").map((part) => part.trim());

  return values.includes(expectedHex) || values.includes(expectedBase64);
}

export function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}
