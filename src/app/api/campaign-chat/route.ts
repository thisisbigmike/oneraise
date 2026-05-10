import { google } from '@ai-sdk/google';
import { tool, streamText, convertToModelMessages, stepCountIs } from 'ai';
import { z } from 'zod';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const systemPrompt = `You are the OneRaise AI Support Assistant. 
Your goal is to help donors calculate their donations, understand exchange rates, and see how their tokens will be routed using Jupiter on the Solana blockchain.
You are professional, helpful, and concise.
Always use the tools available to get real-time data before giving an answer about prices or swap quotes.
When formatting currency, use standard symbols (e.g. $10.00).

Available Tools:
- getTokenPrice: Get the current USD price of a given Solana token.
- getSwapQuote: Get a swap quote to see how much of an output token a user will get for a specific amount of an input token. Note: the amount is in the token's base units (e.g. 1 USDC = 1000000 base units, 1 SOL = 1000000000 lamports). Usually USDC has 6 decimals and SOL has 9 decimals.

Common token mints on Solana:
- SOL: So11111111111111111111111111111111111111112
- USDC: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
- USDT: Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB
- JUP: JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN
`;

  const result = streamText({
    model: google('gemini-2.5-flash'),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: {
      getTokenPrice: tool({
        description: 'Get the current USD price of a Solana token by its mint address or symbol (like SOL, USDC).',
        inputSchema: z.object({
          id: z.string().describe('The token symbol (e.g. SOL, JUP) or mint address to get the price for.'),
        }),
        execute: async ({ id }: { id: string }) => {
          try {
            const res = await fetch(`https://api.jup.ag/price/v2?ids=${id}`);
            const data = await res.json();
            if (data.data && data.data[id]) {
              return { priceUsd: data.data[id].price };
            }
            return { error: 'Price not found for this token.' };
          } catch {
            return { error: 'Failed to fetch price.' };
          }
        },
      }),
      getSwapQuote: tool({
        description: 'Get a quote from Jupiter Swap V6 to see the exchange rate between two tokens. Amounts must be in lamports/base units.',
        inputSchema: z.object({
          inputMint: z.string().describe('The mint address of the input token (e.g. EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v for USDC)'),
          outputMint: z.string().describe('The mint address of the output token (e.g. So11111111111111111111111111111111111111112 for SOL)'),
          amount: z.number().describe('The amount of input token to swap, in its smallest unit (lamports or decimals). E.g. 1 USDC = 1000000. 1 SOL = 1000000000.'),
          slippageBps: z.number().optional().describe('Slippage in basis points. Default is 50 (0.5%).'),
        }),
        execute: async ({ inputMint, outputMint, amount, slippageBps }: { inputMint: string; outputMint: string; amount: number; slippageBps?: number }) => {
          const slip = slippageBps ?? 50;
          try {
            const url = `https://api.jup.ag/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slip}`;
            const res = await fetch(url);
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
    },
  });

  return result.toUIMessageStreamResponse();
}
