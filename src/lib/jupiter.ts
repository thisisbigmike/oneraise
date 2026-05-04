export type JupiterToken = {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
};

export const JUPITER_QUOTE_URL = "https://api.jup.ag/swap/v1/quote";
export const JUPITER_SWAP_INSTRUCTIONS_URL = "https://api.jup.ag/swap/v1/swap-instructions";

export const JUPITER_USDC: JupiterToken = {
  symbol: "USDC",
  name: "USD Coin",
  mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  decimals: 6,
};

export const JUPITER_INPUT_TOKENS: JupiterToken[] = [
  {
    symbol: "SOL",
    name: "Solana",
    mint: "So11111111111111111111111111111111111111112",
    decimals: 9,
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    mint: JUPITER_USDC.mint,
    decimals: JUPITER_USDC.decimals,
  },
  {
    symbol: "JUP",
    name: "Jupiter",
    mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    decimals: 6,
  },
  {
    symbol: "BONK",
    name: "Bonk",
    mint: "DezXAZ8z7PnrnRJjz3wXBoT9VeezJ7VmK5WfM7PExd",
    decimals: 5,
  },
  {
    symbol: "WIF",
    name: "dogwifhat",
    mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    decimals: 6,
  },
];

export type JupiterDonationQuote = {
  inputMint: string;
  inputSymbol: string;
  inputAmount: string;
  inputRawAmount: string;
  outputMint: string;
  outputSymbol: string;
  outputAmount: string;
  outputRawAmount: string;
  priceImpactPct: string;
  slippageBps: number;
  routeLabels: string[];
  mode: "live" | "demo" | "direct";
  quoteResponse?: unknown;
};

export type JupiterQuotePayload = {
  inputMint: string;
  inAmount?: string;
  outputMint: string;
  outAmount?: string;
  priceImpactPct?: string;
  routePlan?: unknown;
  [key: string]: unknown;
};

const DEMO_USD_PRICES: Record<string, number> = {
  SOL: 145,
  USDC: 1,
  JUP: 0.75,
  BONK: 0.000018,
  WIF: 2.6,
};

export function findJupiterToken(mintOrSymbol: string) {
  const value = mintOrSymbol.trim();
  return JUPITER_INPUT_TOKENS.find(
    (token) =>
      token.mint.toLowerCase() === value.toLowerCase() ||
      token.symbol.toLowerCase() === value.toLowerCase(),
  );
}

export function toAtomicAmount(amount: number, decimals: number) {
  return Math.max(1, Math.round(amount * 10 ** decimals)).toString();
}

export function formatAtomicAmount(rawAmount: string | number, decimals: number) {
  const value = Number(rawAmount);
  if (!Number.isFinite(value)) return "0";
  const amount = value / 10 ** decimals;
  return amount.toLocaleString(undefined, {
    maximumFractionDigits: amount >= 100 ? 2 : 6,
  });
}

export function buildDirectUsdcQuote(outputAmount: number, slippageBps: number): JupiterDonationQuote {
  const rawAmount = toAtomicAmount(outputAmount, JUPITER_USDC.decimals);

  return {
    inputMint: JUPITER_USDC.mint,
    inputSymbol: JUPITER_USDC.symbol,
    inputAmount: outputAmount.toLocaleString(undefined, { maximumFractionDigits: 2 }),
    inputRawAmount: rawAmount,
    outputMint: JUPITER_USDC.mint,
    outputSymbol: JUPITER_USDC.symbol,
    outputAmount: outputAmount.toLocaleString(undefined, { maximumFractionDigits: 2 }),
    outputRawAmount: rawAmount,
    priceImpactPct: "0",
    slippageBps,
    routeLabels: ["Direct USDC transfer"],
    mode: "direct",
  };
}

export function buildDemoJupiterQuote(args: {
  inputMint: string;
  outputAmount: number;
  slippageBps: number;
}): JupiterDonationQuote {
  const token = findJupiterToken(args.inputMint);
  const symbol = token?.symbol || "CUSTOM";
  const decimals = token?.decimals || 6;
  const price = DEMO_USD_PRICES[symbol] || 1;
  const inputAmount = args.outputAmount / price;
  const inputRawAmount = toAtomicAmount(inputAmount, decimals);

  return {
    inputMint: args.inputMint,
    inputSymbol: symbol,
    inputAmount: formatAtomicAmount(inputRawAmount, decimals),
    inputRawAmount,
    outputMint: JUPITER_USDC.mint,
    outputSymbol: JUPITER_USDC.symbol,
    outputAmount: args.outputAmount.toLocaleString(undefined, { maximumFractionDigits: 2 }),
    outputRawAmount: toAtomicAmount(args.outputAmount, JUPITER_USDC.decimals),
    priceImpactPct: "0.03",
    slippageBps: args.slippageBps,
    routeLabels: ["Demo estimate", "Set JUPITER_API_KEY for live routing"],
    mode: "demo",
  };
}

export function getJupiterApiKey() {
  return process.env.JUPITER_API_KEY || "";
}

export function getQuoteError(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to fetch a Jupiter quote.";
  const error = (payload as { error?: unknown; message?: unknown }).error;
  const message = (payload as { error?: unknown; message?: unknown }).message;
  if (typeof error === "string") return error;
  if (typeof message === "string") return message;
  return "Unable to fetch a Jupiter quote.";
}

export function getRouteLabels(routePlan: unknown) {
  if (!Array.isArray(routePlan)) return [];

  return routePlan
    .map((step) => {
      if (!step || typeof step !== "object" || !("swapInfo" in step)) return null;
      const swapInfo = (step as { swapInfo?: unknown }).swapInfo;
      if (!swapInfo || typeof swapInfo !== "object" || !("label" in swapInfo)) return null;
      const label = (swapInfo as { label?: unknown }).label;
      return typeof label === "string" ? label : null;
    })
    .filter((label): label is string => Boolean(label));
}

export function buildLiveJupiterDonationQuote(args: {
  inputMint: string;
  payload: JupiterQuotePayload;
  slippageBps: number;
}): JupiterDonationQuote {
  const token = findJupiterToken(args.inputMint);
  const inputDecimals = token?.decimals || 6;

  return {
    inputMint: args.inputMint,
    inputSymbol: token?.symbol || "CUSTOM",
    inputAmount: formatAtomicAmount(args.payload.inAmount || "0", inputDecimals),
    inputRawAmount: String(args.payload.inAmount || "0"),
    outputMint: JUPITER_USDC.mint,
    outputSymbol: JUPITER_USDC.symbol,
    outputAmount: formatAtomicAmount(args.payload.outAmount || "0", JUPITER_USDC.decimals),
    outputRawAmount: String(args.payload.outAmount || "0"),
    priceImpactPct: String(args.payload.priceImpactPct || "0"),
    slippageBps: args.slippageBps,
    routeLabels: getRouteLabels(args.payload.routePlan),
    mode: "live",
    quoteResponse: args.payload,
  };
}

export async function fetchLiveJupiterQuote(args: {
  inputMint: string;
  outputAmountUsd: number;
  slippageBps: number;
}) {
  const apiKey = getJupiterApiKey();
  if (!apiKey) {
    throw new Error("JUPITER_API_KEY is required for live Jupiter donations.");
  }

  const query = new URLSearchParams({
    inputMint: args.inputMint,
    outputMint: JUPITER_USDC.mint,
    amount: toAtomicAmount(args.outputAmountUsd, JUPITER_USDC.decimals),
    slippageBps: String(args.slippageBps),
    swapMode: "ExactOut",
    restrictIntermediateTokens: "true",
  });

  const response = await fetch(`${JUPITER_QUOTE_URL}?${query.toString()}`, {
    headers: {
      Accept: "application/json",
      "x-api-key": apiKey,
    },
    cache: "no-store",
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(getQuoteError(payload));
  }

  return payload as JupiterQuotePayload;
}
