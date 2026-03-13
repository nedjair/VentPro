import { StockAlertService } from '../services/stock-alert.service'
import { prisma, Product } from '@gestion/database'
import { StockService } from '../services/stock.service'
import { DashboardService } from '../services/dashboard.service'
import { StockAlertService } from '../services/stock-alert.service'

async function finalSyncTest() {
  try {
    console.log('🎯 TEST FINAL DE SYNCHRONISATION')
    console.log('================================')

    // 1. Récupérer l'entreprise
    const company = await prisma.company.findFirst()
    if (!company) {
      throw new Error('Aucune entreprise trouvée')
    }
    console.log(`✅ Entreprise: ${company.name}`)

    // 2. Test des endpoints avec headers anti-cache
    console.log('\n📡 TEST DES ENDPOINTS AVEC HEADERS ANTI-CACHE:')
    
    // Simuler un appel HTTP avec headers
    const testEndpoint = async (name: string, serviceCall: () => Promise<any>) => {
      const start = Date.now()
      const result = await serviceCall()
      const time = Date.now() - start
      
      console.log(`   ${name}: ${time}ms`)
      return { result, time }
    }

    const dashboardStock = await testEndpoint('Stock Dashboard', () => 
      StockService.getRealTimeDashboard(company.id)
    )

    const dashboardMain = await testEndpoint('Main Dashboard', () => 
      DashboardService.getDashboardStats(company.id)
    )

    const alerts = await testEndpoint('Alertes', () => 
      prisma.stockAlert.findMany({
        where: { companyId: company.id, isActive: true },
        include: { product: { select: { name: true } } }
      })
    )

    // 3. Vérification de la cohérence
    console.log('\n🔍 VÉRIFICATION DE LA COHÉRENCE:')
    
    const stockData = dashboardStock.result
    const mainData = dashboardMain.result
    const alertsData = alerts.result

    console.log('Données Stock Dashboard:')
    console.log(`   - Total produits: ${stockData.overview.totalProducts}`)
    console.log(`   - Stock faible: ${stockData.overview.lowStockProducts}`)
    console.log(`   - Rupture: ${stockData.overview.outOfStockProducts}`)
    console.log(`   - Surstock: ${stockData.overview.overStockProducts}`)
    console.log(`   - Alertes actives: ${stockData.activity.activeAlerts}`)
    console.log(`   - Critiques: ${stockData.alerts.critical}`)
    console.log(`   - Warning: ${stockData.alerts.warning}`)
    console.log(`   - Info: ${stockData.alerts.info}`)

    console.log('\nDonnées Main Dashboard:')
    console.log(`   - Total produits: ${mainData.products.total}`)
    console.log(`   - Stock faible: ${mainData.products.lowStock}`)
    console.log(`   - Rupture: ${mainData.products.outOfStock}`)
    console.log(`   - Valeur stock: ${mainData.products.totalStockValue}`)

    console.log('\nDonnées Alertes:')
    console.log(`   - Total alertes: ${alertsData.length}`)
    
    const alertsByType = alertsData.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const alertsBySeverity = alertsData.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log(`   - OUT_OF_STOCK: ${alertsByType.OUT_OF_STOCK || 0}`)
    console.log(`   - LOW_STOCK: ${alertsByType.LOW_STOCK || 0}`)
    console.log(`   - OVERSTOCK: ${alertsByType.OVERSTOCK || 0}`)
    console.log(`   - HIGH: ${alertsBySeverity.HIGH || 0}`)
    console.log(`   - MEDIUM: ${alertsBySeverity.MEDIUM || 0}`)
    console.log(`   - LOW: ${alertsBySeverity.LOW || 0}`)

    // 4. Test de cohérence
    console.log('\n⚖️ TEST DE COHÉRENCE:')
    
    const checks = [
      {
        name: 'Total produits',
        stock: stockData.overview.totalProducts,
        main: mainData.products.total,
        expected: 'égaux'
      },
      {
        name: 'Stock faible',
        stock: stockData.overview.lowStockProducts,
        main: mainData.products.lowStock,
        expected: 'égaux'
      },
      {
        name: 'Rupture',
        stock: stockData.overview.outOfStockProducts,
        main: mainData.products.outOfStock,
        expected: 'égaux'
      },
      {
        name: 'Total alertes',
        stock: stockData.activity.activeAlerts,
        alerts: alertsData.length,
        expected: 'égaux'
      },
      {
        name: 'Alertes critiques',
        stock: stockData.alerts.critical,
        alerts: alertsBySeverity.HIGH || 0,
        expected: 'égaux'
      },
      {
        name: 'Alertes warning',
        stock: stockData.alerts.warning,
        alerts: alertsBySeverity.MEDIUM || 0,
        expected: 'égaux'
      },
      {
        name: 'Alertes info',
        stock: stockData.alerts.info,
        alerts: alertsBySeverity.LOW || 0,
        expected: 'égaux'
      }
    ]

    let inconsistencies = 0
    checks.forEach(check => {
      const stockVal = check.stock
      const otherVal = check.main || check.alerts
      const isConsistent = stockVal === otherVal
      const status = isConsistent ? '✅' : '❌'
      
      console.log(`   ${status} ${check.name}: ${stockVal} vs ${otherVal}`)
      if (!isConsistent) inconsistencies++
    })

    // 5. Test de performance
    console.log('\n⏱️ PERFORMANCE:')
    const avgTime = (dashboardStock.time + dashboardMain.time + alerts.time) / 3
    console.log(`   Temps moyen: ${avgTime.toFixed(2)}ms`)
    console.log(`   Stock Dashboard: ${dashboardStock.time}ms`)
    console.log(`   Main Dashboard: ${dashboardMain.time}ms`)
    console.log(`   Alertes: ${alerts.time}ms`)
    
    const performanceOK = avgTime < 2000
    console.log(`   Objectif <2s: ${performanceOK ? '✅ Respecté' : '❌ Non respecté'}`)

    // 6. Test de refresh forcé
    console.log('\n🔄 TEST DE REFRESH FORCÉ:')
    
    const refreshStart = Date.now()
    await StockAlertService.checkAndCreateAlerts(company.id)
    const refreshedDashboard = await StockService.getRealTimeDashboard(company.id)
    const refreshTime = Date.now() - refreshStart
    
    console.log(`   Temps de refresh: ${refreshTime}ms`)
    
    const refreshChanged = 
      refreshedDashboard.activity.activeAlerts !== stockData.activity.activeAlerts ||
      refreshedDashboard.alerts.critical !== stockData.alerts.critical ||
      refreshedDashboard.alerts.warning !== stockData.alerts.warning ||
      refreshedDashboard.alerts.info !== stockData.alerts.info

    console.log(`   Changement détecté: ${refreshChanged ? '⚠️ Oui' : '✅ Non (stable)'}`)

    // 7. Génération du rapport final
    console.log('\n📋 RAPPORT FINAL:')
    
    const finalReport = {
      timestamp: new Date().toISOString(),
      consistency: {
        inconsistencies,
        status: inconsistencies === 0 ? 'PERFECT' : 'ISSUES_DETECTED'
      },
      performance: {
        avgResponseTime: Math.round(avgTime),
        status: performanceOK ? 'EXCELLENT' : 'NEEDS_IMPROVEMENT'
      },
      refresh: {
        time: refreshTime,
        stable: !refreshChanged
      },
      data: {
        totalProducts: stockData.overview.totalProducts,
        activeAlerts: stockData.activity.activeAlerts,
        criticalAlerts: stockData.alerts.critical,
        warningAlerts: stockData.alerts.warning,
        infoAlerts: stockData.alerts.info
      },
      recommendations: []
    }

    if (inconsistencies === 0) {
      console.log('✅ SYNCHRONISATION PARFAITE')
      finalReport.recommendations.push('Système parfaitement synchronisé')
    } else {
      console.log('❌ INCOHÉRENCES DÉTECTÉES')
      finalReport.recommendations.push('Corriger les incohérences détectées')
    }

    if (performanceOK) {
      console.log('✅ PERFORMANCE EXCELLENTE')
      finalReport.recommendations.push('Performance optimale maintenue')
    } else {
      console.log('⚠️ PERFORMANCE À AMÉLIORER')
      finalReport.recommendations.push('Optimiser les requêtes pour améliorer les temps de réponse')
    }

    if (!refreshChanged) {
      console.log('✅ STABILITÉ CONFIRMÉE')
      finalReport.recommendations.push('Données stables et cohérentes')
    } else {
      console.log('⚠️ INSTABILITÉ DÉTECTÉE')
      finalReport.recommendations.push('Vérifier la stabilité des données')
    }

    // 8. Instructions pour le frontend
    console.log('\n🔧 INSTRUCTIONS POUR LE FRONTEND:')
    console.log('1. Utiliser les headers anti-cache ajoutés aux endpoints')
    console.log('2. Implémenter un bouton de refresh forcé avec POST /stock/dashboard/refresh')
    console.log('3. Ajouter un timestamp aux requêtes pour éviter le cache navigateur')
    console.log('4. Utiliser les WebSockets pour les mises à jour temps réel (optionnel)')
    console.log('5. Vérifier que les hooks React se rafraîchissent correctement')

    console.log('\n✅ Test final terminé!')
    
    return finalReport

  } catch (error) {
    console.error('❌ Erreur lors du test final:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

finalSyncTest()
  .then((report) => {
    console.log('\n🎯 Test final terminé!')
    console.log('\n📊 RAPPORT JSON:')
    console.log(JSON.stringify(report, null, 2))
    
    if (report.consistency.status === 'PERFECT' && report.performance.status === 'EXCELLENT') {
      console.log('\n🎉 SYSTÈME PRÊT POUR LA PRODUCTION!')
      process.exit(0)
    } else {
      console.log('\n⚠️ Améliorations nécessaires avant la production')
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('\n💥 Test final échoué:', error)
    process.exit(1)
  })

export { finalSyncTest }
