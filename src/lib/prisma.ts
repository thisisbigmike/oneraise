import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function ensureWritableSqliteUrl() {
  const currentUrl = process.env.DATABASE_URL || '';
  const needsFallback =
    currentUrl === 'file:./dev.db' ||
    currentUrl === 'file:dev.db' ||
    currentUrl === 'file:./prisma/dev.db';

  if (!needsFallback) {
    return;
  }

  const fallbackPath = '/tmp/oneraise-dev.db';
  const sourceCandidates = [
    path.join(process.cwd(), 'prisma', 'dev.db'),
    path.join(process.cwd(), 'dev.db'),
  ];

  if (!fs.existsSync(fallbackPath)) {
    const existingSource = sourceCandidates.find((candidate) => fs.existsSync(candidate));
    if (existingSource) {
      fs.copyFileSync(existingSource, fallbackPath);
    }
  }

  process.env.DATABASE_URL = `file:${fallbackPath}`;
}

ensureWritableSqliteUrl();

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
