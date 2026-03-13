import { PrismaClient } from '@gestion/database'

// Créer une instance Prisma temporaire pour résoudre le problème d'import
const prismaClient = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

// Utiliser le client Prisma
export const prisma = prismaClient

// Configuration des middleware de synchronisation automatique
// TEMPORAIREMENT DÉSACTIVÉ - prisma.$use n'est plus supporté dans Prisma 5+
const enableAutoSync = false // process.env.ENABLE_AUTO_SYNC !== 'false'

if (enableAutoSync) {
  // Middleware principal de synchronisation products ↔ stocks
  // prisma.$use(createConfigurableSyncMiddleware({
  //   enableProductSync: true,
  //   enableStockSync: true,
  //   enableBatchSync: false, // Désactivé pour éviter les synchronisations massives
  //   logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn'
  // }))

  // Middleware spécialisé pour les mouvements de stock
  // prisma.$use(createStockMovementSyncMiddleware())

  console.log('✅ Synchronisation automatique des stocks activée')
} else {
  console.log('⚠️ Synchronisation automatique des stocks désactivée (prisma.$use non supporté)')
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
