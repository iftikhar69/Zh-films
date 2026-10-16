-- AlterTable
ALTER TABLE "GearItem" ADD COLUMN     "condition" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "imagePaths" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "imageThumb" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "includes" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "rentPrice" INTEGER,
ADD COLUMN     "rentUnit" TEXT NOT NULL DEFAULT 'day',
ADD COLUMN     "salePrice" INTEGER,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'draft',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "FamilyGallery" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "eventDate" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'active',
    "allowDownloads" BOOLEAN NOT NULL DEFAULT false,
    "coverPhotoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyGallery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyGalleryMember" (
    "id" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "addedBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyGalleryMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyPhoto" (
    "id" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "originalPath" TEXT NOT NULL,
    "displayPath" TEXT NOT NULL,
    "thumbPath" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'upload',
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FamilyGalleryMember_email_idx" ON "FamilyGalleryMember"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyGalleryMember_galleryId_email_key" ON "FamilyGalleryMember"("galleryId", "email");

-- CreateIndex
CREATE INDEX "FamilyPhoto_galleryId_sortOrder_idx" ON "FamilyPhoto"("galleryId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyPhoto_galleryId_sourceId_key" ON "FamilyPhoto"("galleryId", "sourceId");

-- AddForeignKey
ALTER TABLE "FamilyGalleryMember" ADD CONSTRAINT "FamilyGalleryMember_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "FamilyGallery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyPhoto" ADD CONSTRAINT "FamilyPhoto_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "FamilyGallery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seeded demo gear (random stock photos, invented prices) stays hidden until the owner publishes real listings.
UPDATE "GearItem" SET "status" = 'draft' WHERE "image" LIKE 'https://picsum.photos/%';
UPDATE "GearItem" SET "status" = CASE WHEN "available" THEN 'available' ELSE 'unavailable' END WHERE "image" NOT LIKE 'https://picsum.photos/%';

-- The app talks to Postgres directly through Prisma (table owner). Supabase's public Data API
-- (anon / authenticated roles, used with the publishable key) must not reach any table.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated';
  END IF;
END $$;
