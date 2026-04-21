## OneRaise

This app now expects a Supabase Postgres database through Prisma.

## Supabase Setup

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

The app still uses Prisma and the existing NextAuth Prisma adapter. Only the database backend changed from local SQLite to Supabase Postgres.

## Helpful Commands

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
