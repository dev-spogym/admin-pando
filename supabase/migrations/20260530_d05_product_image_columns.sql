ALTER TABLE products
  ADD COLUMN IF NOT EXISTS "imageUrl" text,
  ADD COLUMN IF NOT EXISTS "imageMimeType" text,
  ADD COLUMN IF NOT EXISTS "imageUpdatedAt" timestamp without time zone;
