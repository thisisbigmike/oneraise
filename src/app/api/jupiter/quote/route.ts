import { NextResponse } from "next/server";
import { convertToUsd } from "@/lib/currency";
import {
  JUPITER_USDC,
  buildDemoJupiterQuote,
  buildDirectUsdcQuote,
  findJupiterToken,
  formatAtomicAmount,
  toAtomicAmount,
  type JupiterDonationQuote,
} from "@/lib/jupiter";

const JUPITER_QUOTE_URL = "https://api.jup.ag/swap/v1/quote";
const DEFAULT_SLIPPAGE_BPS = 50;

function getJupiterApiKey() {
  return process.env.JUPITER_API_KEY || "";
}

function getRouteLabels(routePlan: unknown) {
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

function getQuoteError(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to fetch a Jupiter quote.";
  const error = (payload as { error?: unknown; message?: unknown }).error;
  const message = (payload as { error?: unknown; message?: unknown }).message;
  if (typeof error === "string") return error;
  if (typeof message === "string") return message;
  return "Unable to fetch a Jupiter quote.";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const amount = Number(body.amount);
    const currency = String(body.currency || "USD").toUpperCase();
    const inputMint = String(body.inputMint || "").trim();
    const slippageBps = Number(body.slippageBps || DEFAULT_SLIPPAGE_BPS);

    if (!inputMint) {
      return NextResponse.json({ error: "inputMint is required." }, { status: 400 });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "A positive donation amount is required." }, { status: 400 });
    }

    const outputAmountUsd = convertToUsd(amount, currency);
    if (!Number.isFinite(outputAmountUsd) || outputAmountUsd <= 0) {
      return NextResponse.json({ error: "Unable to convert donation amount to USDC." }, { status: 400 });
    }

    if (inputMint === JUPITER_USDC.mint) {
      return NextResponse.json({
        success: true,
        quote: buildDirectUsdcQuote(outputAmountUsd, slippageBps),
      });
    }

    const apiKey = getJupiterApiKey();
    if (!apiKey) {
      return NextResponse.json({
        success: true,
        quote: buildDemoJupiterQuote({ inputMint, outputAmount: outputAmountUsd, slippageBps }),
      });
    }

    const query = new URLSearchParams({
      inputMint,
      outputMint: JUPITER_USDC.mint,
      amount: toAtomicAmount(outputAmountUsd, JUPITER_USDC.decimals),
      slippageBps: String(slippageBps),
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
      return NextResponse.json({ error: getQuoteError(payload) }, { status: response.status });
    }

    const token = findJupiterToken(inputMint);
    const inputDecimals = token?.decimals || 6;
    const quote: JupiterDonationQuote = {
      inputMint,
      inputSymbol: token?.symbol || "CUSTOM",
      inputAmount: formatAtomicAmount(payload.inAmount, inputDecimals),
      inputRawAmount: String(payload.inAmount || "0"),
      outputMint: JUPITER_USDC.mint,
      outputSymbol: JUPITER_USDC.symbol,
      outputAmount: formatAtomicAmount(payload.outAmount, JUPITER_USDC.decimals),
      outputRawAmount: String(payload.outAmount || "0"),
      priceImpactPct: String(payload.priceImpactPct || "0"),
      slippageBps,
      routeLabels: getRouteLabels(payload.routePlan),
      mode: "live",
      quoteResponse: payload,
    };

    return NextResponse.json({ success: true, quote });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to prepare Jupiter quote.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
