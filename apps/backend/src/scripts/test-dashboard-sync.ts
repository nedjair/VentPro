import { prisma, Product } from '@gestion/database'
import { StockService } from '../services/stock.service'
import { DashboardService } from '../services/dashboard.service'

async function testDashboardSync() {
  try {
    console.log('🧪 TEST DE SYNCHRONISATION DASHBOARD')
    console.log('====================================')

    // 1. Récupérer l'entreprise
    const company = await prisma.company.findFirst()
    if (!company) {
      throw new Error('Aucune entreprise trouvée')
    }
    console.log(`✅ Entreprise: ${company.name}`)

    // 2. Tester StockService.getRealTimeDashboard
    console.log('\n📊 TEST STOCK SERVICE:')
    const startStock = Date.now()
    const stockDashboard = await StockService.getRealTimeDashboard(company.id)
    const stockTime = Date.now() - startStock

    console.log(`⏱️ Temps de réponse: ${stockTime}ms`)
    console.log('Données StockService:')
    console.log(`   - Total produits: ${stockDashboard.overview.totalProducts}`)
    console.log(`   - Produits en stock: ${stockDashboard.overview.productsInStock}`)
    console.log(`   - Stock faible: ${stockDashboard.overview.lowStockProducts}`)
    console.log(`   - Rupture: ${stockDashboard.overview.outOfStockProducts}`)
    console.log(`   - Surstock: ${stockDashboard.overview.overStockProducts}`)
    console.log(`   - Valeur stock: ${stockDashboard.overview.totalStockValue}`)
    console.log(`   - Alertes actives: ${stockDashboard.activity.activeAlerts}`)
    console.log(`   - Alertes critiques: ${stockDashboard.alerts.critical}`)
    console.log(`   - Alertes warning: ${stockDashboard.alerts.warning}`)
    console.log(`   - Alertes info: ${stockDashboard.alerts.info}`)

    // 3. Tester DashboardService.getDashboardStats
    console.log('\n📈 TEST DASHBOARD SERVICE:')
    const startDashboard = Date.now()
    const dashboardStats = await DashboardService.getDashboardStats(company.id)
    const dashboardTime = Date.now() - startDashboard

    console.log(`⏱️ Temps de réponse: ${dashboardTime}ms`)
    console.log('Données DashboardService:')
    console.log(`   - Total produits: ${dashboardStats.products.total}`)
    console.log(`   - Produits en stock: ${dashboardStats.products.inStock}`)
    console.log(`   - Stock faible: ${dashboardStats.products.lowStock}`)
    console.log(`   - Rupture: ${dashboardStats.products.outOfStock}`)
    console.log(`   - Valeur stock: ${dashboardStats.products.totalStockValue}`)

    // 4. Comparaison détaillée
    console.log('\n⚖️ COMPARAISON DÉTAILLÉE:')
    
    const comparisons = [
      {
        metric: 'Total produits',
        stock: stockDashboard.overview.totalProducts,
        dashboard: dashboardStats.products.total
      },
      {
        metric: 'Produits en stock',
        stock: stockDashboard.overview.productsInStock,
        dashboard: dashboardStats.products.inStock
      },
      {
        metric: 'Stock faible',
        stock: stockDashboard.overview.lowStockProducts,
        dashboard: dashboardStats.products.lowStock
      },
      {
        metric: 'Rupture de stock',
        stock: stockDashboard.overview.outOfStockProducts,
        dashboard: dashboardStats.products.outOfStock
      },
      {
        metric: 'Valeur totale stock',
        stock: stockDashboard.overview.totalStockValue,
        dashboard: dashboardStats.products.totalStockValue
      }
    ]

    let inconsistencies = 0
    comparisons.forEach(comp => {
      const isConsistent = comp.stock === comp.dashboard
      const status = isConsistent ? '✅' : '❌'
      console.log(`   ${status} ${comp.metric}: Stock=${comp.stock}, Dashboard=${comp.dashboard}`)
      if (!isConsistent) inconsistencies++
    })

    // 5. Vérification des données brutes
    console.log('\n🔍 VÉRIFICATION DES DONNÉES BRUTES:')
    
    // Compter directement en base
    const rawProducts = await prisma.product.findMany({
      where: {
        companyId: company.id,
        isActive: true,
        isService: false,
      }
    })

    let rawOutOfStock = 0
    let rawLowStock = 0
    let rawInStock = 0

    rawProducts.forEach(product => {
      if (product.stockQuantity === 0) {
        rawOutOfStock++
      } else if (product.stockQuantity <= (product.minStock || 0) && (product.minStock || 0) > 0) {
        rawLowStock++
      } else {
        rawInStock++
      }
    })

    console.log('Comptage direct en base:')
    console.log(`   - Total produits: ${rawProducts.length}`)
    console.log(`   - Produits en stock: ${rawInStock}`)
    console.log(`   - Stock faible: ${rawLowStock}`)
    console.log(`   - Rupture: ${rawOutOfStock}`)

    // Valeur totale du stock
    const rawStockValue = await prisma.stock.aggregate({
      where: { companyId: company.id },
      _sum: { valeurStock: true }
    })

    console.log(`   - Valeur stock: ${rawStockValue._sum.valeurStock || 0}`)

    // 6. Comparaison avec les données brutes
    console.log('\n🎯 COMPARAISON AVEC DONNÉES BRUTES:')
    
    const rawComparisons = [
      {
        metric: 'Total produits',
        raw: rawProducts.length,
        stock: stockDashboard.overview.totalProducts,
        dashboard: dashboardStats.products.total
      },
      {
        metric: 'Stock faible',
        raw: rawLowStock,
        stock: stockDashboard.overview.lowStockProducts,
        dashboard: dashboardStats.products.lowStock
      },
      {
        metric: 'Rupture',
        raw: rawOutOfStock,
        stock: stockDashboard.overview.outOfStockProducts,
        dashboard: dashboardStats.products.outOfStock
      },
      {
        metric: 'Valeur stock',
        raw: Number(rawStockValue._sum.valeurStock || 0),
        stock: stockDashboard.overview.totalStockValue,
        dashboard: dashboardStats.products.totalStockValue
      }
    ]

    let rawInconsistencies = 0
    rawComparisons.forEach(comp => {
      const stockOK = comp.raw === comp.stock
      const dashboardOK = comp.raw === comp.dashboard
      const stockStatus = stockOK ? '✅' : '❌'
      const dashboardStatus = dashboardOK ? '✅' : '❌'
      
      console.log(`   ${comp.metric}:`)
      console.log(`     Raw: ${comp.raw}`)
      console.log(`     ${stockStatus} Stock: ${comp.stock}`)
      console.log(`     ${dashboardStatus} Dashboard: ${comp.dashboard}`)
      
      if (!stockOK || !dashboardOK) rawInconsistencies++
    })

    // 7. Test de performance
    console.log('\n⏱️ PERFORMANCE:')
    console.log(`   StockService: ${stockTime}ms`)
    console.log(`   DashboardService: ${dashboardTime}ms`)
    
    const performanceOK = stockTime < 2000 && dashboardTime < 2000
    console.log(`   Objectif <2s: ${performanceOK ? '✅ Respecté' : '❌ Non respecté'}`)

    // 8. Résumé final
    console.log('\n📋 RÉSUMÉ FINAL:')
    console.log(`   Incohérences entre services: ${inconsistencies}`)
    console.log(`   Incohérences avec données brutes: ${rawInconsistencies}`)
    console.log(`   Performance: ${performanceOK ? '✅ OK' : '❌ KO'}`)

    if (inconsistencies === 0 && rawInconsistencies === 0 && performanceOK) {
      console.log('\n🎉 SYNCHRONISATION PARFAITE!')
      console.log('   ✅ Tous les services sont cohérents')
      console.log('   ✅ Données conformes aux données brutes')
      console.log('   ✅ Performance optimale')
    } else {
      console.log('\n⚠️ PROBLÈMES DÉTECTÉS:')
      if (inconsistencies > 0) {
        console.log('   ❌ Incohérences entre StockService et DashboardService')
      }
      if (rawInconsistencies > 0) {
        console.log('   ❌ Incohérences avec les données brutes')
      }
      if (!performanceOK) {
        console.log('   ❌ Performance insuffisante')
      }
    }

    console.log('\n✅ Test terminé!')

    return {
      stockDashboard,
      dashboardStats,
      inconsistencies,
      rawInconsistencies,
      performanceOK,
      stockTime,
      dashboardTime
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

testDashboardSync()
  .then((result) => {
    console.log('\n🎯 Test terminé!')
    if (result.inconsistencies === 0 && result.rawInconsistencies === 0 && result.performanceOK) {
      console.log('✅ Synchronisation parfaite')
      process.exit(0)
    } else {
      console.log('⚠️ Problèmes détectés - Correction nécessaire')
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('\n💥 Test échoué:', error)
    process.exit(1)
  })

export { testDashboardSync }
