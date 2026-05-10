import { google } from '@ai-sdk/google';
import { tool, streamText, convertToModelMessages, stepCountIs } from 'ai';
import { z } from 'zod';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const JUP_API_KEY = process.env.JUPITER_API_KEY || '';

function jupHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json' };
  if (JUP_API_KEY) h['x-api-key'] = JUP_API_KEY;
  return h;
}
export async function POST(req: Request) {
  const { messages } = await req.json();
  console.log("INCOMING BODY:", JSON.stringify(messages, null, 2));

  const systemPrompt = `You are the OneRaise AI Support Assistant. 
Your goal is to help donors calculate their donations, understand exchange rates, and see how their tokens will be routed using Jupiter on the Solana blockchain.
You are professional, helpful, and concise.
Always use the tools available to get real-time data before giving an answer about prices or swap quotes.
When formatting currency, use standard symbols (e.g. $10.00).
When a user mentions a token by name or symbol, use searchToken first to resolve the mint address, then use that mint for price or swap queries.

Available Tools:
- getTokenPrice: Get the current USD price of a given Solana token using Jupiter Price API v3.
- getSwapQuote: Get a swap quote to see how much of an output token a user will get for a specific amount of an input token. Note: the amount is in the token's base units (e.g. 1 USDC = 1000000 base units, 1 SOL = 1000000000 lamports). Usually USDC has 6 decimals and SOL has 9 decimals.
- searchToken: Search for a Solana token by name, symbol, or mint address using the Jupiter Tokens API.
- getPortfolio: Get the DeFi positions and token balances for a Solana wallet address.

Common token mints on Solana:
- SOL: So11111111111111111111111111111111111111112
- USDC: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
- USDT: Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB
- JUP: JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN
`;

  const result = streamText({
    model: google('gemini-3.1-pro'),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: {
      getTokenPrice: tool({
        description: 'Get the current USD price of a Solana token by its mint address. Use searchToken first if you only have a symbol.',
        inputSchema: z.object({
          ids: z.string().describe('Comma-separated mint addresses (e.g. So11111111111111111111111111111111111111112)'),
        }),
        execute: async ({ ids }: { ids: string }) => {
          try {
            const res = await fetch(`https://api.jup.ag/price/v3?ids=${ids}`, {
              headers: jupHeaders(),
            });
            const data = await res.json();
            if (data.data) {
              const results: Record<string, { priceUsd: string; buyPriceUsd?: string; sellPriceUsd?: string }> = {};
              for (const [mint, info] of Object.entries(data.data)) {
                const p = info as { price?: string; buyPrice?: string; sellPrice?: string };
                results[mint] = {
                  priceUsd: p.price || 'unknown',
                  buyPriceUsd: p.buyPrice,
                  sellPriceUsd: p.sellPrice,
                };
              }
              return results;
            }
            return { error: 'Price not found for this token.' };
          } catch {
            return { error: 'Failed to fetch price.' };
          }
        },
      }),
      getSwapQuote: tool({
        description: 'Get a quote from Jupiter Swap API to see the exchange rate between two tokens. Amounts must be in lamports/base units.',
        inputSchema: z.object({
          inputMint: z.string().describe('The mint address of the input token'),
          outputMint: z.string().describe('The mint address of the output token'),
          amount: z.number().describe('The amount of input token to swap, in its smallest unit (lamports or decimals). E.g. 1 USDC = 1000000. 1 SOL = 1000000000.'),
          slippageBps: z.number().optional().describe('Slippage in basis points. Default is 50 (0.5%).'),
        }),
        execute: async ({ inputMint, outputMint, amount, slippageBps }: { inputMint: string; outputMint: string; amount: number; slippageBps?: number }) => {
          const slip = slippageBps ?? 50;
          try {
            const url = `https://api.jup.ag/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slip}`;
            const res = await fetch(url, { headers: jupHeaders() });
            const quote = await res.json();
            if (quote.error) {
              return { error: quote.error };
            }
            return {
              inAmount: quote.inAmount,
              outAmount: quote.outAmount,
              priceImpactPct: quote.priceImpactPct,
              routePlanLength: quote.routePlan?.length || 0,
              outAmountWithSlippage: quote.otherAmountThreshold,
            };
          } catch {
            return { error: 'Failed to fetch swap quote.' };
          }
        },
      }),
      searchToken: tool({
        description: 'Search for a Solana token by name, symbol, or mint address. Returns token metadata including mint address, decimals, and verification status.',
        inputSchema: z.object({
          query: z.string().describe('The token name, symbol (e.g. "SOL", "BONK"), or mint address to search for.'),
        }),
        execute: async ({ query }: { query: string }) => {
          try {
            const res = await fetch(`https://api.jup.ag/tokens/v2/search?query=${encodeURIComponent(query)}`, {
              headers: jupHeaders(),
            });
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              return data.slice(0, 5).map((t: { symbol?: string; name?: string; address?: string; decimals?: number; verified?: boolean; organicScore?: number }) => ({
                symbol: t.symbol,
                name: t.name,
                mint: t.address,
                decimals: t.decimals,
                verified: t.verified,
                organicScore: t.organicScore,
              }));
            }
            return { error: 'No tokens found matching that query.' };
          } catch {
            return { error: 'Failed to search for token.' };
          }
        },
      }),
      getPortfolio: tool({
        description: 'Get the token balances and DeFi positions for a Solana wallet address.',
        inputSchema: z.object({
          wallet: z.string().describe('The Solana wallet public key to look up.'),
        }),
        execute: async ({ wallet }: { wallet: string }) => {
          try {
            const res = await fetch(`https://api.jup.ag/portfolio/v1/positions?wallet=${wallet}`, {
              headers: jupHeaders(),
            });
            const data = await res.json();
            if (data.error) {
              return { error: data.error };
            }
            return data;
          } catch {
            return { error: 'Failed to fetch portfolio.' };
          }
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
