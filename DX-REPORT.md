# Jupiter DX Report — OneRaise

**Author:** OneRaise Team  
**Email:** greasemike2000@gmail.com  
**Date:** May 2026  
**Project:** [OneRaise](https://github.com/thisisbigmike/oneraise) — A borderless fundraising protocol on Solana  
**Jupiter APIs Used:** Swap V1 (Quote + Swap-Instructions), Price V3, Tokens V2, Portfolio V1  

---

## What We Built

OneRaise is a fundraising platform where campaign creators accept donations in any Solana token. Jupiter is the backbone — every non-USDC donation is automatically routed through Jupiter's swap infrastructure so creators always receive USDC, regardless of what the donor pays with.

We integrated Jupiter at **three distinct layers**:

1. **Donation Routing (Backend)** — Server-side Jupiter Quote + Swap-Instructions APIs to build Versioned Transactions that swap donor tokens → USDC → campaign treasury, all in a single atomic transaction.
2. **AI Campaign Assistant (AI + API)** — An LLM-powered chatbot using Jupiter Price V3, Swap Quote, Token Search V2, and Portfolio V1 as tool calls, so donors can ask natural-language questions like "how much SOL is 50 USDC?" and get real-time answers.
3. **Donation UI (Frontend)** — A multi-token donation page showing live Jupiter quotes with route labels, slippage, and price impact before the donor signs.

---

## DX Report: Specific, Actionable, Honest

### What Worked Well

**1. The APIs are genuinely AI-native. This is rare.**

Jupiter's REST APIs return clean, flat JSON with no pagination boilerplate or nested wrapper objects for the common case. The Price V3 endpoint (`GET /price/v3?ids={mints}`) returns exactly `{ data: { [mint]: { price } } }` — that's it. No cursors, no metadata noise. This matters because when you're feeding API responses into an LLM as tool results, every unnecessary field is wasted context window. Jupiter's responses are lean enough that an LLM can reason about them without summarization.

**2. Keyless access for prototyping is the right call.**

Being able to hit `api.jup.ag` at 0.5 RPS with zero setup was critical for our development velocity. We built the entire AI assistant against the free tier first, then added `x-api-key` later. Most DeFi API providers force you through a signup/KYC flow before you can even test a GET request. Jupiter doesn't. This is how developer onboarding should work.

**3. Swap-Instructions endpoint gives real composability.**

The `/swap/v1/swap-instructions` endpoint returning individual instructions (computeBudget, setup, swap, cleanup) instead of a pre-built transaction was essential for our use case. We needed to inject a `createAssociatedTokenAccountIdempotent` instruction for the campaign treasury *before* the swap, and append nothing after. The instruction-level granularity let us build a single Versioned Transaction that does: create treasury ATA → setup → swap → cleanup. Pre-built transaction endpoints would have killed this.

**4. The `llms.txt` file is excellent.**

`https://dev.jup.ag/docs/llms.txt` is one of the best-structured LLM documentation indexes I've seen. It has proper titles, one-line descriptions, and direct links to every endpoint. We used it to bootstrap the system prompt for our AI assistant. The fact that every doc page can also be fetched as raw Markdown (`.md` extension) means you can build a RAG pipeline against Jupiter docs in about 20 minutes.

**5. ExactOut swap mode saved our architecture.**

For donations, the user specifies a USD amount and pays with an arbitrary token. We need ExactOut (fixed output, variable input) — not ExactIn. Jupiter supports this on the Quote API with `swapMode: "ExactOut"`. Many aggregators only support ExactIn, which would have forced us to do a two-step price lookup + quote, introducing a race condition. Jupiter's ExactOut mode eliminates this entirely.

### What Didn't Work / Pain Points

**1. Price API v2 → v3 migration was invisible.**

We initially built against `/price/v2` because that's what appeared in older examples and community code. There was no deprecation warning in the v2 response, no header hint, nothing. We only discovered v3 existed by reading the `llms.txt` file carefully. **Suggestion:** Add a `X-Jupiter-API-Version` response header or a `deprecated` field in v2 responses pointing to v3.

**2. Token symbol → mint resolution is a separate API call.**

The Price API and Swap Quote API both require mint addresses, not symbols. But users (and LLMs) think in symbols. We had to add a `searchToken` tool that calls `/tokens/v2/search` just to resolve "SOL" → `So11...112` before calling Price or Quote. This is fine, but it means every "what's the price of SOL?" question costs 2 API calls minimum. **Suggestion:** Accept `symbol` as an alias parameter on `/price/v3` — even if it's best-effort and only for verified tokens.

**3. Swap V1 vs V2 API surface is confusing.**

The docs reference both `/swap/v1/quote` and `/swap/v2/order` + `/swap/v2/build`. The V1 endpoints still work but the docs heavily push V2. For our use case (custom transaction building), we needed V1's `/swap-instructions` endpoint. It wasn't immediately clear whether V2 `/build` is a direct replacement or has different behavior. We stayed on V1 because it works and we couldn't afford a regression. **Suggestion:** Add a clear "V1 is still supported for X use cases" note in the V2 docs, or a migration guide specifically for `/swap-instructions` → `/build`.

**4. Error messages from Quote API could be more actionable.**

When a quote fails (e.g., insufficient liquidity for an exotic pair), the error is often just `"No routes found"`. It doesn't tell you *why* — is it the pair, the amount, or a temporary routing issue? For an AI assistant that needs to explain failures to users, this is a problem. We had to write defensive prompts like "if you get 'No routes found', suggest the user try a smaller amount or a different token." **Suggestion:** Return structured error codes with a `reason` field (e.g., `NO_LIQUIDITY`, `AMOUNT_TOO_SMALL`, `PAIR_NOT_SUPPORTED`).

**5. Rate limit feedback is opaque.**

When hitting the 0.5 RPS keyless limit, the 429 response doesn't include `Retry-After` or `X-RateLimit-Remaining` headers. For our AI assistant making chained tool calls (search → price → quote), we occasionally hit the rate limit mid-conversation with no way to know when to retry. **Suggestion:** Add standard rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`).

**6. Portfolio API returns very large payloads.**

`/portfolio/v1/positions?wallet={address}` returns *every* DeFi position including all lending, staking, and LP positions. For our AI assistant, this is way too much data to fit in an LLM context window. We'd like a `?filter=balances` or `?include=tokens` parameter to get just token balances without the full DeFi position tree. **Suggestion:** Add filtering/pagination to the Portfolio API.

### What's Missing

1. **Webhook/streaming for price updates.** For a donation page showing live quotes, we currently poll `/price/v3` every 15 seconds. A WebSocket or SSE endpoint for price feeds would eliminate unnecessary requests and give donors real-time confidence.

2. **A "human-readable quote" endpoint.** Something like `/swap/v1/quote?format=summary` that returns `{ from: "1 SOL", to: "94.44 USDC", fee: "0.01 USDC", route: "SOL → USDC via Raydium" }` instead of raw lamport amounts. This would be a huge DX win for AI agents and frontend developers who just want to display a quote without doing decimal math.

3. **Batch quote endpoint.** When showing a token selector with 5 options (SOL, JUP, BONK, WIF, USDT), we need 5 separate quote calls. A batch endpoint accepting an array of input mints for the same output mint and amount would cut our API calls by 80%.

---

## AI Stack Feedback

### What We Used

| Tool | Used? | Verdict |
|------|-------|---------|
| **llms.txt** | ✅ Yes | Excellent. Best-in-class LLM documentation index. Used it to discover all available API endpoints and build our AI assistant's system prompt. |
| **Skills (`npx skills add`)** | ❌ No | Didn't use — we built directly against the REST APIs. The Skills concept (SKILL.md files as context) is interesting but assumes you're using an AI coding assistant *to build*, not building an AI assistant *as the product*. |
| **Documentation MCP** | ❌ No | Didn't use — we're not on Cursor/Claude Code for this project. MCP is useful for IDE-based workflows but doesn't help for runtime AI tool integration. |
| **Jupiter CLI** | ❌ No | Didn't use — our integration is server-side Next.js API routes, not terminal-based. CLI would be useful for testing quotes during development. |

### AI Stack Feedback

**llms.txt is the standout.** It's the right abstraction — a single file that tells an LLM "here's everything I can do." We used it to generate the system prompt for our chatbot and to discover endpoints we didn't know existed (Portfolio API, Tokens V2 search).

**Skills would be more useful if they were runtime-consumable.** Right now, Skills are `.md` files designed to be read by coding assistants during development. If they were available as a JSON schema or OpenAPI spec fragment that could be loaded at runtime (e.g., for dynamically registering LLM tools), that would be much more powerful for AI agent builders.

**The MCP server is good but narrow.** It helps developers *read docs* inside their editor. What would be more impactful is an MCP server that can *execute* Jupiter operations — so an AI coding assistant could test a swap quote inline while writing integration code.

---

## Technical Execution

### Integration Depth

| Layer | Jupiter API | Implementation |
|-------|-------------|----------------|
| **Donation Routing** | Swap V1 Quote, Swap-Instructions | Server-side Versioned Transaction building with custom instruction injection (treasury ATA creation). ExactOut mode for fixed-USD donations. Full error handling, Prisma donation tracking, and on-chain confirmation verification. |
| **AI Assistant** | Price V3, Swap Quote, Tokens V2 Search, Portfolio V1 | Four LLM tool calls powered by Vercel AI SDK v6 with multi-step execution (`stopWhen: stepCountIs(5)`). The LLM chains tools autonomously (search → price → quote) to answer complex natural-language queries. |
| **Quote Preview UI** | Swap V1 Quote | Frontend quote card showing input/output amounts, slippage, price impact, route labels (extracted from `routePlan`), and Solscan transaction links. |
| **Token Selector** | Tokens V2 | Pre-populated list of supported input tokens (SOL, USDC, JUP, BONK, WIF) with dynamic resolution via Jupiter Tokens API. |
| **Donation Confirmation** | On-chain verification | Post-swap verification comparing actual USDC delivered to treasury ATA against expected amounts from the quote. Handles partial fills, failed transactions, and revalidates Next.js cache paths. |

### Key Files

- [`src/lib/jupiter.ts`](src/lib/jupiter.ts) — Jupiter client library: token types, quote builders, API key management, route label extraction
- [`src/app/api/jupiter/swap/route.ts`](src/app/api/jupiter/swap/route.ts) — Server-side swap transaction builder (280 lines)
- [`src/app/api/jupiter/confirm/route.ts`](src/app/api/jupiter/confirm/route.ts) — On-chain donation confirmation and USDC delivery verification (227 lines)
- [`src/app/api/jupiter/quote/route.ts`](src/app/api/jupiter/quote/route.ts) — Quote preview API with demo/live/direct modes
- [`src/app/api/campaign-chat/route.ts`](src/app/api/campaign-chat/route.ts) — AI assistant with 4 Jupiter tool calls
- [`src/app/backer/donate/[campaignId]/page.tsx`](src/app/backer/donate/[campaignId]/page.tsx) — Full donation UI with Jupiter payment method

---

## Creativity & Ambition

### The Unexpected Angle: Jupiter as Donation Infrastructure

Most Jupiter integrations are trading bots or DEX frontends. We used Jupiter as **donation infrastructure** — enabling a fundraising platform where donors pay with *any* Solana token and creators always receive USDC. This is a fundamentally different use case:

- **ExactOut mode** is critical (donors specify USD amount, not token amount)
- **Route transparency** matters for trust (donors see exactly how their SOL becomes USDC)
- **Treasury delivery verification** is non-negotiable (we verify on-chain that USDC actually arrived)

### AI-Powered DeFi UX

We combined Jupiter's APIs with an LLM to create a conversational interface for DeFi operations. Instead of forcing donors to understand mint addresses, lamports, and slippage, they ask "if I donate 50 USDC worth of SOL, how much SOL do I need?" and get a real-time answer backed by Jupiter's Price and Swap APIs.

This is where DeFi needs to go — abstracting away the complexity while maintaining full transparency on the underlying operations.

---

## Summary

Jupiter's API surface is production-grade and genuinely AI-friendly. The keyless access, clean JSON responses, and `llms.txt` standard set a high bar for developer experience. The main gaps are around error granularity, API versioning visibility, and tooling for AI agents that operate at runtime (not just development time).

We shipped a real product with Jupiter at its core — not a demo, not a tutorial project. Every donation on OneRaise flows through Jupiter infrastructure, and the AI assistant uses Jupiter APIs as its primary data source. The integration is deep, composable, and designed for production.
