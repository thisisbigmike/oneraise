# OneRaise: The World's First Borderless Trust Protocol

OneRaise is a next-generation crowdfunding platform designed to bridge the gap between global capital and local impact. We go beyond moving money; we move trust. By leveraging blockchain technology and milestone-based disbursement, OneRaise ensures that every donation is protected and every outcome is verifiable.

**One Goal. One Platform. OneRaise.**

## Core Features

- **The "Protect" Protocol**: Funds are held in a secure escrow and released to creators only when predefined project milestones are verified.
- **Borderless by Design**: Seamlessly connect local African payment rails (Busha, Raenest) to global liquidity via Solana and stablecoins.
- **Radical Transparency**: Real-time tracking of donations and proof-of-impact through verifiable milestones.
- **Collective Impact**: Tools for community-led campaigns, emergency aid, and grant distribution.

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
