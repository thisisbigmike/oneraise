-- Retention features (F2 notifications, F3 badges, F5 refund tracking).
-- Project uses `prisma db push` (no migrations dir). DB creds are not present in
-- this checkout, so apply this once against the live DB, e.g.:
--   npx prisma db execute --file prisma/manual-migrations/retention_features.sql --schema prisma/schema.prisma
-- or simply run `npx prisma db push` with valid DATABASE_URL.
-- Idempotent (IF NOT EXISTS guards) so it is safe to re-run.

-- F5: refund tracking on Donation
ALTER TABLE "Donation" ADD COLUMN IF NOT EXISTS "refundStatus" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "Donation" ADD COLUMN IF NOT EXISTS "refundedAt" TIMESTAMP(3);
ALTER TABLE "Donation" ADD COLUMN IF NOT EXISTS "refundTxSignature" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Donation_refundTxSignature_key" ON "Donation"("refundTxSignature");

-- F2: Notification feed
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "campaignId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- F3: Badge cache
CREATE TABLE IF NOT EXISTS "Badge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Badge_userId_idx" ON "Badge"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Badge_userId_kind_key" ON "Badge"("userId", "kind");

-- Foreign keys (guarded — Postgres has no IF NOT EXISTS for constraints)
DO $$ BEGIN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "Badge" ADD CONSTRAINT "Badge_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
