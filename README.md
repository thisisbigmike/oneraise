# OneRaise: The World's First Borderless Trust Protocol

[![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/thisisbigmike/oneraise?utm_source=oss&utm_medium=github&utm_campaign=thisisbigmike%2Foneraise&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)](https://coderabbit.ai)

OneRaise is a next-generation crowdfunding platform designed to bridge the gap between global capital and local impact. We go beyond moving money; we move trust. By leveraging blockchain technology and milestone-based disbursement, OneRaise ensures that every donation is protected and every outcome is verifiable.

**One Goal. One Platform. OneRaise.**

## Core Features

- **The "Protect" Protocol**: Funds are held in a secure escrow and released to creators only when predefined project milestones are verified.
- **Borderless by Design**: Seamlessly connect local African payment rails (Busha, Raenest) to global liquidity via Solana and stablecoins.
- **Radical Transparency**: Real-time tracking of donations and proof-of-impact through verifiable milestones.
- **Collective Impact**: Tools for community-led campaigns, emergency aid, and grant distribution.

## 🛡️ OneRaise Shield (Cloak Integration)

**The Problem:** High-trust fundraising needs privacy. Donors may want to support sensitive campaigns (political, emergency, local aid) without broadcasting their wealth, wallet address, or specific donations to the public blockchain. However, the campaign still needs an auditable trail for compliance.
**Who it's for:** Whales, anonymous philanthropists, and donors supporting sensitive causes who need privacy from the public, but accountability from the platform.

**How the Cloak SDK is used:** We use `@cloak.dev/sdk` to power "Private Donations." When a user chooses to donate privately:
1. We generate a unique viewing key (`nk`) for the donation.
2. We create a shielded UTXO deposit using `createUtxo` and `transact`, effectively mixing the donor's USDC into the Cloak shielded pool.
3. We immediately execute a `fullWithdraw` to pull the funds from the shielded pool into the campaign's treasury.
**Why it's central:** This breaks the on-chain link between the donor's wallet and the campaign's treasury, providing total privacy. The generated viewing key is stored so the campaign creator can still scan the history and generate compliance reports using `scanTransactions` and `toComplianceReport`—giving us privacy without sacrificing accountability.

**Setup and Run Instructions:**
1. Clone the repo and install dependencies: `npm install`
2. Connect your Supabase database in `.env` and run `npm run db:push`
3. Run the development server: `npm run dev`
4. To test the shielded donation, navigate to any campaign page and select the "Donate Privately (Cloak)" option.

**Deployed Links & Programs:**
- **Cloak Program ID:** `CLOAK_PROGRAM_ID` (as imported from `@cloak.dev/sdk`)
- **Frontend Link:** [oneraise.vercel.app](https://oneraise.vercel.app)

---

## Technical Setup

This app is built with **Next.js 15**, **Prisma**, and **Supabase**.

### Supabase Setup

1. In Supabase, open your project and copy two database connection strings:
   - `DATABASE_URL`: the pooled Supavisor transaction string on port `6543`, with `?pgbouncer=true`
   - `DIRECT_URL`: the direct database connection on port `5432`
2. Paste both values into `.env` and `.env.local`.
3. Push the Prisma schema into Supabase:

```bash
npm run db:push
```

4. Start the app:

```bash
npm run dev
```

The app uses Prisma and the NextAuth Prisma adapter. The database backend is Supabase Postgres.

### Helpful Commands

```bash
npm run db:generate
npm run db:push
npm run db:pull
npm run db:studio
```

## Notes

- `prisma/dev.db` is no longer used by the app.
- If Prisma reports a `file:` database URL, update `.env` and `.env.local` with your Supabase values.
- For local or serverless deploys, keep the pooled connection in `DATABASE_URL` and the direct connection in `DIRECT_URL`.

## References

- Next.js App Router docs: [node_modules/next/dist/docs/01-app/index.md](node_modules/next/dist/docs/01-app/index.md)
- Prisma + Supabase guide: https://www.prisma.io/docs/orm/overview/databases/supabase
