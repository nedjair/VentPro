-- Ajout des champs manquants pour persister correctement les données produit
-- dans le schéma PostgreSQL local courant.
ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "cost" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "minStock" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "maxStock" INTEGER,
  ADD COLUMN IF NOT EXISTS "categoryId" TEXT;

CREATE TABLE IF NOT EXISTS "Category" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT NOT NULL,
  "parentId" TEXT,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Category_userId_name_idx" ON "Category"("userId", "name");
CREATE INDEX IF NOT EXISTS "Category_parentId_idx" ON "Category"("parentId");
CREATE INDEX IF NOT EXISTS "Product_categoryId_idx" ON "Product"("categoryId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'Product'
      AND constraint_name = 'Product_categoryId_fkey'
  ) THEN
    ALTER TABLE "Product"
      ADD CONSTRAINT "Product_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;