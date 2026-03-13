-- Objectifs KPI persistés par scope authentifié (entreprise ou utilisateur).
-- Ce choix évite de coupler le stockage à un seul type d'identifiant.
CREATE TABLE IF NOT EXISTS "KpiTargetSettings" (
  "id" TEXT NOT NULL,
  "scopeId" TEXT NOT NULL,
  "revenueTarget" DOUBLE PRECISION,
  "ordersTarget" INTEGER,
  "clientsTarget" INTEGER,
  "conversionRateTarget" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "KpiTargetSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "KpiTargetSettings_scopeId_key"
ON "KpiTargetSettings"("scopeId");