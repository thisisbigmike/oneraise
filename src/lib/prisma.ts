import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function warnIfBadDatabaseUrl() {
  const currentUrl = process.env.DATABASE_URL;

  if (!currentUrl) {
    console.error(
      '[v0] DATABASE_URL is missing. Add your Supabase pooled Postgres connection string to your environment variables.',
    );
  } else if (currentUrl.startsWith('file:')) {
    console.error(
      '[v0] SQLite DATABASE_URL detected. Replace DATABASE_URL and DIRECT_URL with your Supabase Postgres connection strings.',
    );
  }
}

warnIfBadDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV !== 'production' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
