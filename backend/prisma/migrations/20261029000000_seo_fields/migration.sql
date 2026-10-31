BEGIN;
ALTER TABLE "Product" ADD COLUMN "seoTitle" TEXT,
  ADD COLUMN "seoDescription" TEXT,
  ADD COLUMN "noindex" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canonicalUrl" TEXT,
  ADD COLUMN "ogTitle" TEXT,
  ADD COLUMN "ogDescription" TEXT,
  ADD COLUMN "ogImage" TEXT;
ALTER TABLE "Article" ADD COLUMN "seoTitle" TEXT,
  ADD COLUMN "seoDescription" TEXT,
  ADD COLUMN "noindex" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canonicalUrl" TEXT,
  ADD COLUMN "ogTitle" TEXT,
  ADD COLUMN "ogDescription" TEXT,
  ADD COLUMN "ogImage" TEXT;
CREATE TYPE "RedirectType" AS ENUM ('PRODUCT', 'ARTICLE');
CREATE TABLE "SlugRedirect" (
  "id" TEXT PRIMARY KEY, "type" "RedirectType" NOT NULL, "fromSlug" TEXT NOT NULL,
  "targetId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "SlugRedirect_type_fromSlug_key" ON "SlugRedirect"("type", "fromSlug");
CREATE INDEX "SlugRedirect_targetId_idx" ON "SlugRedirect"("targetId");
COMMIT;
