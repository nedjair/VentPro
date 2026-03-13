import { StockAlertService } from '../services/stock-alert.service'
import { prisma, Product } from '@gestion/database'
import { StockService } from '../services/stock.service'
import { StockAlertService } from '../services/stock-alert.service'

async function testFrontendEndpoints() {
  try {
    console.log('🧪 TEST DES ENDPOINTS FRONTEND')
    console.log('==============================')

    // 1. Récupérer l'entreprise
    const company = await prisma.company.findFirst()
    if (!company) {
      throw new Error('Aucune entreprise trouvée')
    }
    console.log(`✅ Entreprise: ${company.name}`)

    // 2. Tester l'endpoint Dashboard
    console.log('\n📊 TEST ENDPOINT DASHBOARD:')
    const startDashboard = Date.now()
    const dashboard = await StockService.getRealTimeDashboard(company.id)
    const dashboardTime = Date.now() - startDashboard
    
    console.log(`⏱️ Temps de réponse: ${dashboardTime}ms`)
    console.log('Données dashboard:')
    console.log(`   - Total produits: ${dashboard.overview.totalProducts}`)
    console.log(`   - Produits en stock: ${dashboard.overview.productsInStock}`)
    console.log(`   - Stock faible: ${dashboard.overview.lowStockProducts}`)
    console.log(`   - Rupture: ${dashboard.overview.outOfStockProducts}`)
    console.log(`   - Surstock: ${dashboard.overview.overStockProducts}`)
    console.log(`   - Alertes actives: ${dashboard.activity.activeAlerts}`)
    console.log(`   - Alertes critiques: ${dashboard.alerts.critical}`)
    console.log(`   - Alertes warning: ${dashboard.alerts.warning}`)
    console.log(`   - Alertes info: ${dashboard.alerts.info}`)

    // 3. Tester l'endpoint Produits (simulation)
    console.log('\n📦 TEST ENDPOINT PRODUITS:')
    const startProducts = Date.now()
    const products = await prisma.product.findMany({
      where: {
        companyId: company.id,
        isActive: true,
        isService: false,
      },
      include: {
        category: { select: { name: true } },
        stock: true,
      },
      orderBy: { name: 'asc' }
    })
    const productsTime = Date.now() - startProducts

    console.log(`⏱️ Temps de réponse: ${productsTime}ms`)
    console.log(`Total produits: ${products.length}`)

    let productsOutOfStock = 0
    let productsLowStock = 0
    let productsOverStock = 0

    products.forEach(product => {
      if (product.stockQuantity === 0) {
        productsOutOfStock++
      } else if (product.stockQuantity <= (product.minStock || 0) && (product.minStock || 0) > 0) {
        productsLowStock++
      } else if (product.maxStock && product.stockQuantity > product.maxStock) {
        productsOverStock++
      }
    })

    console.log('Comptage depuis endpoint produits:')
    console.log(`   - Rupture: ${productsOutOfStock}`)
    console.log(`   - Stock faible: ${productsLowStock}`)
    console.log(`   - Surstock: ${productsOverStock}`)

    // 4. Tester l'endpoint Alertes
    console.log('\n🚨 TEST ENDPOINT ALERTES:')
    const startAlerts = Date.now()
    const alerts = await prisma.stockAlert.findMany({
      where: {
        companyId: company.id,
        isActive: true,
      },
      include: {
        product: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    const alertsTime = Date.now() - startAlerts

    console.log(`⏱️ Temps de réponse: ${alertsTime}ms`)
    console.log(`Total alertes: ${alerts.length}`)

    const alertsByType = alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const alertsBySeverity = alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log('Comptage depuis endpoint alertes:')
    console.log(`   - OUT_OF_STOCK: ${alertsByType.OUT_OF_STOCK || 0}`)
    console.log(`   - LOW_STOCK: ${alertsByType.LOW_STOCK || 0}`)
    console.log(`   - OVERSTOCK: ${alertsByType.OVERSTOCK || 0}`)
    console.log(`   - HIGH: ${alertsBySeverity.HIGH || 0}`)
    console.log(`   - MEDIUM: ${alertsBySeverity.MEDIUM || 0}`)
    console.log(`   - LOW: ${alertsBySeverity.LOW || 0}`)

    // 5. Comparaison des endpoints
    console.log('\n⚖️ COMPARAISON DES ENDPOINTS:')
    
    console.log('DASHBOARD vs PRODUITS:')
    console.log(`   Rupture - Dashboard: ${dashboard.overview.outOfStockProducts}, Produits: ${productsOutOfStock}`)
    console.log(`   Stock faible - Dashboard: ${dashboard.overview.lowStockProducts}, Produits: ${productsLowStock}`)
    console.log(`   Surstock - Dashboard: ${dashboard.overview.overStockProducts}, Produits: ${productsOverStock}`)

    console.log('\nDASHBOARD vs ALERTES:')
    console.log(`   Total - Dashboard: ${dashboard.activity.activeAlerts}, Alertes: ${alerts.length}`)
    console.log(`   Critiques - Dashboard: ${dashboard.alerts.critical}, HIGH: ${alertsBySeverity.HIGH || 0}`)
    console.log(`   Warning - Dashboard: ${dashboard.alerts.warning}, MEDIUM: ${alertsBySeverity.MEDIUM || 0}`)
    console.log(`   Info - Dashboard: ${dashboard.alerts.info}, LOW: ${alertsBySeverity.LOW || 0}`)

    console.log('\nPRODUITS vs ALERTES:')
    console.log(`   Rupture - Produits: ${productsOutOfStock}, OUT_OF_STOCK: ${alertsByType.OUT_OF_STOCK || 0}`)
    console.log(`   Stock faible - Produits: ${productsLowStock}, LOW_STOCK: ${alertsByType.LOW_STOCK || 0}`)
    console.log(`   Surstock - Produits: ${productsOverStock}, OVERSTOCK: ${alertsByType.OVERSTOCK || 0}`)

    // 6. Test de performance
    console.log('\n⏱️ PERFORMANCE DES ENDPOINTS:')
    console.log(`   Dashboard: ${dashboardTime}ms`)
    console.log(`   Produits: ${productsTime}ms`)
    console.log(`   Alertes: ${alertsTime}ms`)

    const performanceOK = dashboardTime < 2000 && productsTime < 2000 && alertsTime < 2000
    console.log(`   Objectif <2s: ${performanceOK ? '✅ Respecté' : '❌ Non respecté'}`)

    // 7. Test de cohérence
    console.log('\n🔍 TEST DE COHÉRENCE:')
    
    const inconsistencies: string[] = []

    // Dashboard vs Produits
    if (dashboard.overview.outOfStockProducts !== productsOutOfStock) {
      inconsistencies.push(`Rupture: Dashboard ${dashboard.overview.outOfStockProducts} vs Produits ${productsOutOfStock}`)
    }
    if (dashboard.overview.lowStockProducts !== productsLowStock) {
      inconsistencies.push(`Stock faible: Dashboard ${dashboard.overview.lowStockProducts} vs Produits ${productsLowStock}`)
    }
    if (dashboard.overview.overStockProducts !== productsOverStock) {
      inconsistencies.push(`Surstock: Dashboard ${dashboard.overview.overStockProducts} vs Produits ${productsOverStock}`)
    }

    // Dashboard vs Alertes
    if (dashboard.activity.activeAlerts !== alerts.length) {
      inconsistencies.push(`Total alertes: Dashboard ${dashboard.activity.activeAlerts} vs Alertes ${alerts.length}`)
    }
    if (dashboard.alerts.critical !== (alertsBySeverity.HIGH || 0)) {
      inconsistencies.push(`Critiques: Dashboard ${dashboard.alerts.critical} vs HIGH ${alertsBySeverity.HIGH || 0}`)
    }
    if (dashboard.alerts.warning !== (alertsBySeverity.MEDIUM || 0)) {
      inconsistencies.push(`Warning: Dashboard ${dashboard.alerts.warning} vs MEDIUM ${alertsBySeverity.MEDIUM || 0}`)
    }
    if (dashboard.alerts.info !== (alertsBySeverity.LOW || 0)) {
      inconsistencies.push(`Info: Dashboard ${dashboard.alerts.info} vs LOW ${alertsBySeverity.LOW || 0}`)
    }

    // Produits vs Alertes
    if (productsOutOfStock !== (alertsByType.OUT_OF_STOCK || 0)) {
      inconsistencies.push(`Rupture: Produits ${productsOutOfStock} vs OUT_OF_STOCK ${alertsByType.OUT_OF_STOCK || 0}`)
    }
    if (productsLowStock !== (alertsByType.LOW_STOCK || 0)) {
      inconsistencies.push(`Stock faible: Produits ${productsLowStock} vs LOW_STOCK ${alertsByType.LOW_STOCK || 0}`)
    }
    if (productsOverStock !== (alertsByType.OVERSTOCK || 0)) {
      inconsistencies.push(`Surstock: Produits ${productsOverStock} vs OVERSTOCK ${alertsByType.OVERSTOCK || 0}`)
    }

    if (inconsistencies.length === 0) {
      console.log('✅ Tous les endpoints sont cohérents!')
    } else {
      console.log('❌ Incohérences détectées:')
      inconsistencies.forEach(inc => console.log(`   - ${inc}`))
    }

    // 8. Test de mise à jour en temps réel
    console.log('\n🔄 TEST DE MISE À JOUR TEMPS RÉEL:')
    console.log('Forçage de la vérification des alertes...')
    
    const startSync = Date.now()
    await StockAlertService.checkAndCreateAlerts(company.id)
    const syncTime = Date.now() - startSync
    
    console.log(`⏱️ Temps de synchronisation: ${syncTime}ms`)

    // Re-tester le dashboard après sync
    const dashboardAfterSync = await StockService.getRealTimeDashboard(company.id)
    
    console.log('Dashboard après synchronisation:')
    console.log(`   - Alertes actives: ${dashboardAfterSync.activity.activeAlerts}`)
    console.log(`   - Alertes critiques: ${dashboardAfterSync.alerts.critical}`)
    console.log(`   - Alertes warning: ${dashboardAfterSync.alerts.warning}`)
    console.log(`   - Alertes info: ${dashboardAfterSync.alerts.info}`)

    const syncChanged = 
      dashboard.activity.activeAlerts !== dashboardAfterSync.activity.activeAlerts ||
      dashboard.alerts.critical !== dashboardAfterSync.alerts.critical ||
      dashboard.alerts.warning !== dashboardAfterSync.alerts.warning ||
      dashboard.alerts.info !== dashboardAfterSync.alerts.info

    console.log(`Changement après sync: ${syncChanged ? '⚠️ Oui' : '✅ Non (cohérent)'}`)

    console.log('\n✅ Test des endpoints terminé!')

    return {
      dashboard,
      products: { outOfStock: productsOutOfStock, lowStock: productsLowStock, overStock: productsOverStock },
      alerts: { total: alerts.length, bySeverity: alertsBySeverity, byType: alertsByType },
      performance: { dashboardTime, productsTime, alertsTime },
      inconsistencies,
      syncTime
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

testFrontendEndpoints()
  .then((result) => {
    console.log('\n🎯 Test terminé!')
    if (result.inconsistencies.length > 0) {
      console.log('⚠️ Des incohérences ont été détectées')
      process.exit(1)
    } else {
      console.log('✅ Tous les endpoints sont cohérents')
      process.exit(0)
    }
  })
  .catch((error) => {
    console.error('\n💥 Test échoué:', error)
    process.exit(1)
  })

export { testFrontendEndpoints }
