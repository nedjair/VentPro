import { PrismaClient } from '@prisma/client'
import {
  createPrismaSyncMiddleware,
  createStockMovementSyncMiddleware,
  createConfigurableSyncMiddleware
} from '../middleware/prisma-sync.middleware'

// Instance globale de Prisma
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
})

// Configuration des middleware de synchronisation automatique
const enableAutoSync = process.env.ENABLE_AUTO_SYNC !== 'false' // Activé par défaut

if (enableAutoSync) {
  // Middleware principal de synchronisation products ↔ stocks
  prisma.$use(createConfigurableSyncMiddleware({
    enableProductSync: true,
    enableStockSync: true,
    enableBatchSync: false, // Désactivé pour éviter les synchronisations massives
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn'
  }))

  // Middleware spécialisé pour les mouvements de stock
  prisma.$use(createStockMovementSyncMiddleware())

  console.log('✅ Synchronisation automatique des stocks activée')
} else {
  console.log('⚠️ Synchronisation automatique des stocks désactivée')
}

// Gestion propre de la déconnexion
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})
