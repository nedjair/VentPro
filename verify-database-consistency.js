/**
 * Script de vérification de la cohérence des données en base de données
 */

// Utiliser le client Prisma depuis le backend
const { PrismaClient } = require('./apps/backend/node_modules/@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "file:./dev.db"
    }
  }
})

async function verifyDatabaseConsistency() {
  console.log('🔍 Vérification de la cohérence des données en base...')
  console.log('=' .repeat(60))

  try {
    // 1. Vérification des produits
    console.log('\n📦 VÉRIFICATION DES PRODUITS:')
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        stockQuantity: true,
        minStock: true,
        maxStock: true,
        isActive: true
      }
    })

    console.log(`- Total produits actifs: ${products.length}`)
    
    const outOfStockProducts = products.filter(p => p.stockQuantity === 0)
    const lowStockProducts = products.filter(p => p.stockQuantity > 0 && p.stockQuantity <= p.minStock && p.minStock > 0)
    const overStockProducts = products.filter(p => p.maxStock && p.stockQuantity > p.maxStock)
    
    console.log(`- Produits en rupture: ${outOfStockProducts.length}`)
    console.log(`- Produits en stock faible: ${lowStockProducts.length}`)
    console.log(`- Produits en surstock: ${overStockProducts.length}`)

    // 2. Vérification des stocks (table Stock)
    console.log('\n📊 VÉRIFICATION DES STOCKS:')
    const stocks = await prisma.stock.findMany({
      select: {
        id: true,
        productId: true,
        quantiteActuelle: true,
        quantiteMinimale: true,
        quantiteMaximale: true,
        product: {
          select: {
            name: true,
            stockQuantity: true,
            minStock: true
          }
        }
      }
    })

    console.log(`- Total entrées dans table Stock: ${stocks.length}`)

    // Vérification de cohérence entre Product et Stock
    let inconsistencies = 0
    for (const stock of stocks) {
      if (stock.product) {
        if (stock.quantiteActuelle !== stock.product.stockQuantity) {
          console.log(`⚠️  Incohérence produit ${stock.product.name}: Stock.quantiteActuelle=${stock.quantiteActuelle}, Product.stockQuantity=${stock.product.stockQuantity}`)
          inconsistencies++
        }
        if (stock.quantiteMinimale !== stock.product.minStock) {
          console.log(`⚠️  Incohérence seuil ${stock.product.name}: Stock.quantiteMinimale=${stock.quantiteMinimale}, Product.minStock=${stock.product.minStock}`)
          inconsistencies++
        }
      }
    }

    if (inconsistencies === 0) {
      console.log('✅ Cohérence Product/Stock: OK')
    } else {
      console.log(`❌ ${inconsistencies} incohérences détectées entre Product et Stock`)
    }

    // 3. Vérification des alertes
    console.log('\n🚨 VÉRIFICATION DES ALERTES:')
    const alerts = await prisma.stockAlert.findMany({
      where: { isActive: true },
      select: {
        id: true,
        type: true,
        severity: true,
        currentStock: true,
        thresholdValue: true,
        productId: true,
        product: {
          select: {
            name: true,
            stockQuantity: true,
            minStock: true
          }
        }
      }
    })

    console.log(`- Total alertes actives: ${alerts.length}`)
    
    const alertsByType = alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1
      return acc
    }, {})

    Object.entries(alertsByType).forEach(([type, count]) => {
      console.log(`- ${type}: ${count}`)
    })

    // Vérification de cohérence des alertes
    let alertInconsistencies = 0
    for (const alert of alerts) {
      if (alert.product) {
        if (alert.currentStock !== alert.product.stockQuantity) {
          console.log(`⚠️  Alerte incohérente ${alert.product.name}: Alert.currentStock=${alert.currentStock}, Product.stockQuantity=${alert.product.stockQuantity}`)
          alertInconsistencies++
        }
      }
    }

    if (alertInconsistencies === 0) {
      console.log('✅ Cohérence Alertes/Product: OK')
    } else {
      console.log(`❌ ${alertInconsistencies} incohérences détectées dans les alertes`)
    }

    // 4. Vérification des alertes manquantes
    console.log('\n🔍 VÉRIFICATION DES ALERTES MANQUANTES:')
    let missingAlerts = 0

    // Alertes OUT_OF_STOCK manquantes
    for (const product of outOfStockProducts) {
      const hasAlert = alerts.some(a => a.productId === product.id && a.type === 'OUT_OF_STOCK')
      if (!hasAlert) {
        console.log(`⚠️  Alerte OUT_OF_STOCK manquante pour: ${product.name} (stock: ${product.stockQuantity})`)
        missingAlerts++
      }
    }

    // Alertes LOW_STOCK manquantes
    for (const product of lowStockProducts) {
      const hasAlert = alerts.some(a => a.productId === product.id && a.type === 'LOW_STOCK')
      if (!hasAlert) {
        console.log(`⚠️  Alerte LOW_STOCK manquante pour: ${product.name} (stock: ${product.stockQuantity}, min: ${product.minStock})`)
        missingAlerts++
      }
    }

    if (missingAlerts === 0) {
      console.log('✅ Toutes les alertes nécessaires sont présentes')
    } else {
      console.log(`❌ ${missingAlerts} alertes manquantes détectées`)
    }

    // 5. Résumé final
    console.log('\n📋 RÉSUMÉ DE LA VÉRIFICATION:')
    console.log('=' .repeat(40))
    console.log(`✅ Produits actifs: ${products.length}`)
    console.log(`🔴 Ruptures de stock: ${outOfStockProducts.length}`)
    console.log(`🟠 Stock faible: ${lowStockProducts.length}`)
    console.log(`🔵 Surstock: ${overStockProducts.length}`)
    console.log(`🚨 Alertes actives: ${alerts.length}`)
    console.log(`⚠️  Incohérences Product/Stock: ${inconsistencies}`)
    console.log(`⚠️  Incohérences Alertes: ${alertInconsistencies}`)
    console.log(`⚠️  Alertes manquantes: ${missingAlerts}`)

    const totalIssues = inconsistencies + alertInconsistencies + missingAlerts
    if (totalIssues === 0) {
      console.log('\n🎉 BASE DE DONNÉES COHÉRENTE!')
    } else {
      console.log(`\n❌ ${totalIssues} PROBLÈMES DÉTECTÉS`)
      
      // Suggestions de correction
      console.log('\n💡 SUGGESTIONS DE CORRECTION:')
      if (inconsistencies > 0) {
        console.log('- Exécuter la synchronisation des données: POST /api/v1/stock/sync-data')
      }
      if (alertInconsistencies > 0 || missingAlerts > 0) {
        console.log('- Régénérer les alertes: Appeler le service StockAlertService.checkAndCreateAlerts()')
      }
    }

  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Fonction pour corriger automatiquement les incohérences
async function fixInconsistencies() {
  console.log('🔧 Correction automatique des incohérences...')
  
  try {
    // 1. Synchronisation Product/Stock
    console.log('📊 Synchronisation des données Product/Stock...')
    
    const products = await prisma.product.findMany({
      where: { isActive: true }
    })

    for (const product of products) {
      await prisma.stock.upsert({
        where: { productId: product.id },
        update: {
          quantiteActuelle: product.stockQuantity,
          quantiteMinimale: product.minStock,
          quantiteMaximale: product.maxStock,
          dateLastUpdate: new Date()
        },
        create: {
          productId: product.id,
          quantiteActuelle: product.stockQuantity,
          quantiteMinimale: product.minStock,
          quantiteMaximale: product.maxStock,
          companyId: product.companyId
        }
      })
    }

    console.log('✅ Synchronisation Product/Stock terminée')

    // 2. Nettoyage et régénération des alertes
    console.log('🚨 Régénération des alertes...')
    
    // Désactiver toutes les alertes existantes
    await prisma.stockAlert.updateMany({
      data: { isActive: false }
    })

    // Créer les nouvelles alertes
    for (const product of products) {
      if (product.stockQuantity === 0) {
        await prisma.stockAlert.create({
          data: {
            type: 'OUT_OF_STOCK',
            severity: 'CRITICAL',
            title: `Rupture de stock - ${product.name}`,
            message: `Le produit ${product.name} est en rupture de stock`,
            currentStock: product.stockQuantity,
            thresholdValue: 0,
            productId: product.id,
            companyId: product.companyId
          }
        })
      } else if (product.stockQuantity <= product.minStock && product.minStock > 0) {
        await prisma.stockAlert.create({
          data: {
            type: 'LOW_STOCK',
            severity: 'HIGH',
            title: `Stock faible - ${product.name}`,
            message: `Le stock du produit ${product.name} est inférieur au seuil minimum`,
            currentStock: product.stockQuantity,
            thresholdValue: product.minStock,
            productId: product.id,
            companyId: product.companyId
          }
        })
      }
    }

    console.log('✅ Régénération des alertes terminée')
    console.log('🎉 Correction automatique terminée!')

  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Exécution
const command = process.argv[2]

if (command === 'fix') {
  fixInconsistencies()
} else {
  verifyDatabaseConsistency()
}

console.log('\n💡 Pour corriger automatiquement les incohérences:')
console.log('node verify-database-consistency.js fix')
