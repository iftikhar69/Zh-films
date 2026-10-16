CREATE TABLE "BlockedDate" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL DEFAULT 'film-family',
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "reason" TEXT,
    "blockStart" TIMESTAMP(3) NOT NULL,
    "blockEnd" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BlockedDate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BlockedDate_teamId_blockStart_blockEnd_idx" ON "BlockedDate"("teamId", "blockStart", "blockEnd");
