import { NextResponse } from "next/server";
import { convertToUsd } from "@/lib/currency";
import {
  JUPITER_USDC,
  buildDemoJupiterQuote,
  buildDirectUsdcQuote,
  buildLiveJupiterDonationQuote,
  fetchLiveJupiterQuote,
  getJupiterApiKey,
} from "@/lib/jupiter";

const DEFAULT_SLIPPAGE_BPS = 50;

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

    const payload = await fetchLiveJupiterQuote({
      inputMint,
      outputAmountUsd,
      slippageBps,
    });

    const quote = buildLiveJupiterDonationQuote({
      inputMint,
      payload,
      slippageBps,
    });

    return NextResponse.json({ success: true, quote });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to prepare Jupiter quote.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
