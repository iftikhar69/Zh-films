-- AlterTable
ALTER TABLE "CrewMember" ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "sourceId" TEXT,
ADD COLUMN "imagePaths" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "CrewMember_sourceId_key" ON "CrewMember"("sourceId");

-- Seeded demo crew with invented names and stock photos are hidden, not deleted (hire history keeps their names).
UPDATE "CrewMember" SET "published" = false
WHERE "image" LIKE 'https://picsum.photos/%' AND "name" <> 'Zulfikar Hussain';
