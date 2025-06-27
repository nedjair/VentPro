#!/usr/bin/env ts-node

/**
 * Script pour créer des données de test algériennes pour les stocks
 * 
 * Usage:
 *   npm run seed:stocks
 *   ou
 *   npx ts-node scripts/seed-stocks.ts
 */

import { seedStockData } from '../prisma/seeds/stock-seed'

async function main() {
  console.log('🚀 Démarrage du script de seed des stocks...')
  console.log('📍 Données de test algériennes avec produits locaux')
  console.log('=' .repeat(50))
  
  try {
    await seedStockData()
    console.log('\n🎉 Script de seed terminé avec succès!')
  } catch (error) {
    console.error('\n💥 Erreur lors de l\'exécution du script:', error)
    process.exit(1)
  }
}

// Exécuter le script
main()
  .catch((error) => {
    console.error('💥 Erreur fatale:', error)
    process.exit(1)
  })
