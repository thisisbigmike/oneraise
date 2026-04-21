import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function assertSupabaseDatabaseUrl() {
  const currentUrl = process.env.DATABASE_URL;

  if (!currentUrl) {
    throw new Error(
      'DATABASE_URL is missing. Add your Supabase pooled Postgres connection string to .env.local.',
    );
  }

  if (currentUrl.startsWith('file:')) {
    throw new Error(
      'SQLite DATABASE_URL detected. Replace DATABASE_URL and DIRECT_URL with your Supabase Postgres connection strings.',
    );
  }
}

assertSupabaseDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
