/*
  Warnings:

  - Added the required column `companyId` to the `stock_movements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `stock_movements` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MovementStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'REVERSED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('LOW_STOCK', 'OUT_OF_STOCK', 'OVERSTOCK', 'EXPIRY_WARNING', 'NEGATIVE_STOCK');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StockMovementType" ADD VALUE 'RESERVATION';
ALTER TYPE "StockMovementType" ADD VALUE 'RELEASE';
ALTER TYPE "StockMovementType" ADD VALUE 'RETURN';
ALTER TYPE "StockMovementType" ADD VALUE 'LOSS';
ALTER TYPE "StockMovementType" ADD VALUE 'PRODUCTION';

-- AlterTable - Ajouter d'abord les colonnes optionnelles
ALTER TABLE "stock_movements" ADD COLUMN     "batchNumber" TEXT,
ADD COLUMN     "expiryDate" TIMESTAMP(3),
ADD COLUMN     "invoiceId" TEXT,
ADD COLUMN     "orderId" TEXT,
ADD COLUMN     "quantityAfter" INTEGER,
ADD COLUMN     "quantityBefore" INTEGER,
ADD COLUMN     "status" "MovementStatus" NOT NULL DEFAULT 'CONFIRMED',
ADD COLUMN     "totalCost" DECIMAL(12,2),
ADD COLUMN     "userId" TEXT,
ADD COLUMN     "validatedAt" TIMESTAMP(3),
ADD COLUMN     "validatedBy" TEXT;

-- Ajouter companyId avec une valeur par défaut basée sur le produit
ALTER TABLE "stock_movements" ADD COLUMN "companyId" TEXT;

-- Mettre à jour companyId pour les enregistrements existants
UPDATE "stock_movements"
SET "companyId" = (
    SELECT p."companyId"
    FROM "products" p
    WHERE p.id = "stock_movements"."productId"
);

-- Rendre companyId NOT NULL maintenant qu'il a des valeurs
ALTER TABLE "stock_movements" ALTER COLUMN "companyId" SET NOT NULL;

-- Ajouter updatedAt avec une valeur par défaut
ALTER TABLE "stock_movements" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "stocks" ADD COLUMN     "alerteActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "coutMoyenPondere" DECIMAL(10,4),
ADD COLUMN     "emplacement" TEXT,
ADD COLUMN     "quantiteDisponible" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quantiteEnTransit" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quantiteReservee" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "seuilAlerteMax" INTEGER,
ADD COLUMN     "seuilAlerteMin" INTEGER,
ADD COLUMN     "valeurStock" DECIMAL(12,2);

-- CreateTable
CREATE TABLE "stock_alerts" (
    "id" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "currentStock" INTEGER,
    "thresholdValue" INTEGER,
    "productId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "stock_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_alerts_companyId_idx" ON "stock_alerts"("companyId");

-- CreateIndex
CREATE INDEX "stock_alerts_productId_idx" ON "stock_alerts"("productId");

-- CreateIndex
CREATE INDEX "stock_alerts_type_idx" ON "stock_alerts"("type");

-- CreateIndex
CREATE INDEX "stock_alerts_isActive_idx" ON "stock_alerts"("isActive");

-- CreateIndex
CREATE INDEX "stock_alerts_createdAt_idx" ON "stock_alerts"("createdAt");

-- CreateIndex
CREATE INDEX "stock_movements_companyId_idx" ON "stock_movements"("companyId");

-- CreateIndex
CREATE INDEX "stock_movements_status_idx" ON "stock_movements"("status");

-- CreateIndex
CREATE INDEX "stock_movements_reference_idx" ON "stock_movements"("reference");

-- CreateIndex
CREATE INDEX "stock_movements_userId_idx" ON "stock_movements"("userId");

-- CreateIndex
CREATE INDEX "stock_movements_orderId_idx" ON "stock_movements"("orderId");

-- CreateIndex
CREATE INDEX "stock_movements_invoiceId_idx" ON "stock_movements"("invoiceId");

-- CreateIndex
CREATE INDEX "stocks_quantiteDisponible_idx" ON "stocks"("quantiteDisponible");

-- CreateIndex
CREATE INDEX "stocks_alerteActive_idx" ON "stocks"("alerteActive");

-- CreateIndex
CREATE INDEX "stocks_dateLastUpdate_idx" ON "stocks"("dateLastUpdate");

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_alerts" ADD CONSTRAINT "stock_alerts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_alerts" ADD CONSTRAINT "stock_alerts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
