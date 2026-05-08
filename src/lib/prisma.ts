import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
let databaseWarningShown = false;

function warnIfDatabaseUrlIsMissing() {
  const currentUrl = process.env.DATABASE_URL;

  if (!currentUrl) {
    if (!databaseWarningShown) {
      console.warn(
        'DATABASE_URL is missing. Database-backed pages will fail until the Supabase pooled Postgres connection string is configured.',
      );
      databaseWarningShown = true;
    }
    return;
  }

  if (currentUrl.startsWith('file:') && !databaseWarningShown) {
    console.warn(
      'SQLite DATABASE_URL detected. OneRaise expects Supabase Postgres DATABASE_URL and DIRECT_URL values in deployed environments.',
    );
    databaseWarningShown = true;
  }
}

warnIfDatabaseUrlIsMissing();

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
