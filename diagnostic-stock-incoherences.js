/**
 * Script de diagnostic et correction des incohérences de stock
 * Gestion Commerciale - Diagnostic complet des données products/stocks
 */

const { PrismaClient } = require('@prisma/client')

// Configuration de la base de données
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://gestion_user:gestion_password_secure_2024@localhost:5432/gestion_commerciale"
    }
  }
})

async function diagnosticStockIncoherences() {
  console.log('🔍 DIAGNOSTIC DES INCOHÉRENCES DE STOCK')
  console.log('=' .repeat(60))

  try {
    // 1. Analyser l'état général des données
    console.log('\n📊 1. ANALYSE GÉNÉRALE DES DONNÉES')
    console.log('-' .repeat(40))

    const [totalProducts, totalStocks, activeProducts, serviceProducts] = await Promise.all([
      prisma.product.count(),
      prisma.stock.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({ where: { isService: true } })
    ])

    console.log(`📦 Total produits: ${totalProducts}`)
    console.log(`📋 Total stocks: ${totalStocks}`)
    console.log(`✅ Produits actifs: ${activeProducts}`)
    console.log(`🔧 Produits services: ${serviceProducts}`)
    console.log(`⚠️  Différence products/stocks: ${totalProducts - totalStocks}`)

    // 2. Identifier les produits sans entrée stock
    console.log('\n🚨 2. PRODUITS SANS ENTRÉE STOCK')
    console.log('-' .repeat(40))

    const productsWithoutStock = await prisma.product.findMany({
      where: {
        stock: null,
        isService: false // Exclure les services
      },
      select: {
        id: true,
        name: true,
        stockQuantity: true,
        minStock: true,
        isActive: true,
        companyId: true
      }
    })

    console.log(`❌ Produits sans stock: ${productsWithoutStock.length}`)
    if (productsWithoutStock.length > 0) {
      console.log('Détails:')
      productsWithoutStock.forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.name} (Stock: ${product.stockQuantity}, Min: ${product.minStock})`)
      })
    }

    // 3. Analyser les incohérences de données
    console.log('\n⚖️  3. INCOHÉRENCES PRODUCTS ↔ STOCKS')
    console.log('-' .repeat(40))

    const productsWithStock = await prisma.product.findMany({
      where: {
        stock: { isNot: null },
        isService: false
      },
      include: {
        stock: true
      }
    })

    const incoherences = []
    productsWithStock.forEach(product => {
      const stock = product.stock
      if (stock) {
        const issues = []
        
        if (product.stockQuantity !== stock.quantiteActuelle) {
          issues.push(`Stock: ${product.stockQuantity} ≠ ${stock.quantiteActuelle}`)
        }
        
        if (product.minStock !== stock.quantiteMinimale) {
          issues.push(`MinStock: ${product.minStock} ≠ ${stock.quantiteMinimale}`)
        }

        if (issues.length > 0) {
          incoherences.push({
            id: product.id,
            name: product.name,
            issues: issues
          })
        }
      }
    })

    console.log(`⚠️  Incohérences détectées: ${incoherences.length}`)
    if (incoherences.length > 0) {
      console.log('Détails:')
      incoherences.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.name}`)
        item.issues.forEach(issue => {
          console.log(`     - ${issue}`)
        })
      })
    }

    // 4. Analyser les statuts de stock
    console.log('\n🎯 4. ANALYSE DES STATUTS DE STOCK')
    console.log('-' .repeat(40))

    const allProducts = await prisma.product.findMany({
      where: { isService: false },
      select: {
        id: true,
        name: true,
        stockQuantity: true,
        minStock: true,
        isActive: true
      }
    })

    const statusStats = {
      rupture: 0,      // stockQuantity = 0
      faible: 0,       // 0 < stockQuantity <= minStock
      normal: 0,       // stockQuantity > minStock
      inactif: 0       // isActive = false
    }

    allProducts.forEach(product => {
      if (!product.isActive) {
        statusStats.inactif++
      } else if (product.stockQuantity === 0) {
        statusStats.rupture++
      } else if (product.stockQuantity <= product.minStock) {
        statusStats.faible++
      } else {
        statusStats.normal++
      }
    })

    console.log(`🔴 Rupture de stock: ${statusStats.rupture}`)
    console.log(`🟠 Stock faible: ${statusStats.faible}`)
    console.log(`🟢 Stock normal: ${statusStats.normal}`)
    console.log(`⚫ Produits inactifs: ${statusStats.inactif}`)

    // 5. Vérifier les alertes de stock
    console.log('\n🚨 5. ALERTES DE STOCK DÉTAILLÉES')
    console.log('-' .repeat(40))

    const outOfStock = allProducts.filter(p => p.isActive && p.stockQuantity === 0)
    const lowStock = allProducts.filter(p => p.isActive && p.stockQuantity > 0 && p.stockQuantity <= p.minStock)

    console.log(`❌ Produits en rupture (${outOfStock.length}):`)
    outOfStock.slice(0, 5).forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.name} (Stock: ${product.stockQuantity})`)
    })
    if (outOfStock.length > 5) {
      console.log(`  ... et ${outOfStock.length - 5} autres`)
    }

    console.log(`⚠️  Produits en stock faible (${lowStock.length}):`)
    lowStock.slice(0, 5).forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.name} (Stock: ${product.stockQuantity}/${product.minStock})`)
    })
    if (lowStock.length > 5) {
      console.log(`  ... et ${lowStock.length - 5} autres`)
    }

    return {
      totalProducts,
      totalStocks,
      productsWithoutStock: productsWithoutStock.length,
      incoherences: incoherences.length,
      statusStats,
      needsCorrection: productsWithoutStock.length > 0 || incoherences.length > 0
    }

  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error)
    throw error
  }
}

async function corrigerIncoherences() {
  console.log('\n🔧 CORRECTION DES INCOHÉRENCES')
  console.log('=' .repeat(60))

  try {
    let corrections = 0

    // 1. Créer les entrées stock manquantes
    console.log('\n📝 1. CRÉATION DES ENTRÉES STOCK MANQUANTES')
    console.log('-' .repeat(40))

    const productsWithoutStock = await prisma.product.findMany({
      where: {
        stock: null,
        isService: false
      }
    })

    for (const product of productsWithoutStock) {
      await prisma.stock.create({
        data: {
          productId: product.id,
          companyId: product.companyId,
          quantiteActuelle: product.stockQuantity,
          quantiteMinimale: product.minStock,
          quantiteMaximale: product.maxStock,
          dateLastUpdate: new Date()
        }
      })
      corrections++
      console.log(`✅ Créé stock pour: ${product.name}`)
    }

    // 2. Synchroniser les données incohérentes
    console.log('\n🔄 2. SYNCHRONISATION DES DONNÉES INCOHÉRENTES')
    console.log('-' .repeat(40))

    const productsWithStock = await prisma.product.findMany({
      where: {
        stock: { isNot: null },
        isService: false
      },
      include: {
        stock: true
      }
    })

    for (const product of productsWithStock) {
      const stock = product.stock
      if (stock) {
        const needsUpdate = 
          product.stockQuantity !== stock.quantiteActuelle ||
          product.minStock !== stock.quantiteMinimale

        if (needsUpdate) {
          await prisma.stock.update({
            where: { id: stock.id },
            data: {
              quantiteActuelle: product.stockQuantity,
              quantiteMinimale: product.minStock,
              quantiteMaximale: product.maxStock,
              dateLastUpdate: new Date()
            }
          })
          corrections++
          console.log(`🔄 Synchronisé: ${product.name}`)
        }
      }
    }

    console.log(`\n✅ Total corrections effectuées: ${corrections}`)
    return corrections

  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error)
    throw error
  }
}

async function main() {
  try {
    const diagnostic = await diagnosticStockIncoherences()
    
    if (diagnostic.needsCorrection) {
      console.log('\n❓ Des incohérences ont été détectées.')
      console.log('Voulez-vous les corriger automatiquement ? (Tapez "oui" pour continuer)')
      
      // Pour l'automatisation, on corrige directement
      console.log('🔧 Correction automatique en cours...')
      const corrections = await corrigerIncoherences()
      
      if (corrections > 0) {
        console.log('\n🔍 Vérification post-correction...')
        await diagnosticStockIncoherences()
      }
    } else {
      console.log('\n✅ Aucune incohérence détectée. Les données sont cohérentes.')
    }

  } catch (error) {
    console.error('❌ Erreur fatale:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Exécuter le diagnostic
main().catch(console.error)
