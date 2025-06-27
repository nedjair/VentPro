import { prisma } from '@gestion/database'
import { StockService } from '../services/stock.service'
import { DashboardService } from '../services/dashboard.service'

async function testFrontendCache() {
  try {
    console.log('🧪 TEST DU CACHE FRONTEND')
    console.log('=========================')

    // 1. Récupérer l'entreprise
    const company = await prisma.company.findFirst()
    if (!company) {
      throw new Error('Aucune entreprise trouvée')
    }
    console.log(`✅ Entreprise: ${company.name}`)

    // 2. Simuler les appels frontend multiples
    console.log('\n🔄 SIMULATION DES APPELS FRONTEND:')
    
    const calls = []
    for (let i = 1; i <= 5; i++) {
      console.log(`\n--- Appel ${i} ---`)
      
      const start = Date.now()
      
      // Appel dashboard stats (utilisé par le dashboard principal)
      const dashboardStats = await DashboardService.getDashboardStats(company.id)
      
      // Appel stock dashboard (utilisé par le composant stock)
      const stockDashboard = await StockService.getRealTimeDashboard(company.id)
      
      // Appel alertes (utilisé par le composant alertes)
      const alerts = await prisma.stockAlert.findMany({
        where: {
          companyId: company.id,
          isActive: true,
        },
        include: {
          product: { select: { name: true } }
        }
      })
      
      const time = Date.now() - start
      
      const callData = {
        call: i,
        time,
        dashboardStats: {
          total: dashboardStats.products.total,
          inStock: dashboardStats.products.inStock,
          lowStock: dashboardStats.products.lowStock,
          outOfStock: dashboardStats.products.outOfStock,
          stockValue: dashboardStats.products.totalStockValue
        },
        stockDashboard: {
          total: stockDashboard.overview.totalProducts,
          inStock: stockDashboard.overview.productsInStock,
          lowStock: stockDashboard.overview.lowStockProducts,
          outOfStock: stockDashboard.overview.outOfStockProducts,
          stockValue: stockDashboard.overview.totalStockValue,
          activeAlerts: stockDashboard.activity.activeAlerts,
          critical: stockDashboard.alerts.critical,
          warning: stockDashboard.alerts.warning,
          info: stockDashboard.alerts.info
        },
        alerts: {
          total: alerts.length,
          byType: alerts.reduce((acc, alert) => {
            acc[alert.type] = (acc[alert.type] || 0) + 1
            return acc
          }, {} as Record<string, number>)
        }
      }
      
      calls.push(callData)
      
      console.log(`⏱️ Temps: ${time}ms`)
      console.log(`📊 Dashboard: ${callData.dashboardStats.total} produits, ${callData.dashboardStats.lowStock} stock faible, ${callData.dashboardStats.outOfStock} rupture`)
      console.log(`📦 Stock: ${callData.stockDashboard.total} produits, ${callData.stockDashboard.activeAlerts} alertes`)
      console.log(`🚨 Alertes: ${callData.alerts.total} actives`)
      
      // Attendre 100ms entre les appels
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // 3. Vérifier la cohérence entre les appels
    console.log('\n🔍 VÉRIFICATION DE LA COHÉRENCE:')
    
    const firstCall = calls[0]
    let inconsistentCalls = 0
    
    calls.forEach((call, index) => {
      if (index === 0) return
      
      const inconsistencies = []
      
      // Vérifier dashboard stats
      if (call.dashboardStats.total !== firstCall.dashboardStats.total) {
        inconsistencies.push(`Dashboard total: ${firstCall.dashboardStats.total} → ${call.dashboardStats.total}`)
      }
      if (call.dashboardStats.lowStock !== firstCall.dashboardStats.lowStock) {
        inconsistencies.push(`Dashboard lowStock: ${firstCall.dashboardStats.lowStock} → ${call.dashboardStats.lowStock}`)
      }
      if (call.dashboardStats.outOfStock !== firstCall.dashboardStats.outOfStock) {
        inconsistencies.push(`Dashboard outOfStock: ${firstCall.dashboardStats.outOfStock} → ${call.dashboardStats.outOfStock}`)
      }
      
      // Vérifier stock dashboard
      if (call.stockDashboard.activeAlerts !== firstCall.stockDashboard.activeAlerts) {
        inconsistencies.push(`Stock activeAlerts: ${firstCall.stockDashboard.activeAlerts} → ${call.stockDashboard.activeAlerts}`)
      }
      if (call.stockDashboard.critical !== firstCall.stockDashboard.critical) {
        inconsistencies.push(`Stock critical: ${firstCall.stockDashboard.critical} → ${call.stockDashboard.critical}`)
      }
      
      // Vérifier alertes
      if (call.alerts.total !== firstCall.alerts.total) {
        inconsistencies.push(`Alertes total: ${firstCall.alerts.total} → ${call.alerts.total}`)
      }
      
      if (inconsistencies.length > 0) {
        inconsistentCalls++
        console.log(`❌ Appel ${call.call}: ${inconsistencies.length} incohérences`)
        inconsistencies.forEach(inc => console.log(`   - ${inc}`))
      } else {
        console.log(`✅ Appel ${call.call}: Cohérent`)
      }
    })

    // 4. Statistiques de performance
    console.log('\n⏱️ STATISTIQUES DE PERFORMANCE:')
    const times = calls.map(c => c.time)
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)
    
    console.log(`   Temps moyen: ${avgTime.toFixed(2)}ms`)
    console.log(`   Temps min: ${minTime}ms`)
    console.log(`   Temps max: ${maxTime}ms`)
    console.log(`   Variation: ${((maxTime - minTime) / avgTime * 100).toFixed(1)}%`)

    // 5. Générer des données pour le frontend
    console.log('\n📡 DONNÉES POUR LE FRONTEND:')
    
    const frontendData = {
      timestamp: new Date().toISOString(),
      dashboard: firstCall.dashboardStats,
      stock: firstCall.stockDashboard,
      alerts: firstCall.alerts,
      performance: {
        avgResponseTime: Math.round(avgTime),
        consistency: inconsistentCalls === 0 ? 'PERFECT' : 'INCONSISTENT',
        cacheRecommendation: avgTime < 100 ? 'NO_CACHE_NEEDED' : 'CACHE_RECOMMENDED'
      }
    }
    
    console.log(JSON.stringify(frontendData, null, 2))

    // 6. Recommandations
    console.log('\n💡 RECOMMANDATIONS POUR LE FRONTEND:')
    
    if (inconsistentCalls === 0) {
      console.log('✅ Backend parfaitement cohérent')
      console.log('   → Le problème vient du cache frontend ou du timing')
    } else {
      console.log('❌ Incohérences détectées dans le backend')
      console.log('   → Vérifier la synchronisation des services')
    }
    
    if (avgTime < 100) {
      console.log('✅ Performance excellente')
      console.log('   → Pas besoin de cache agressif')
    } else if (avgTime < 500) {
      console.log('⚠️ Performance correcte')
      console.log('   → Cache recommandé pour améliorer l\'UX')
    } else {
      console.log('❌ Performance insuffisante')
      console.log('   → Cache obligatoire + optimisation backend')
    }
    
    console.log('\n🔧 ACTIONS RECOMMANDÉES:')
    console.log('1. Vérifier les headers de cache HTTP')
    console.log('2. Implémenter un cache-busting avec timestamp')
    console.log('3. Utiliser des WebSockets pour les mises à jour temps réel')
    console.log('4. Ajouter un mécanisme de refresh forcé')

    console.log('\n✅ Test terminé!')

    return {
      calls,
      inconsistentCalls,
      avgTime,
      frontendData
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

testFrontendCache()
  .then((result) => {
    console.log('\n🎯 Test terminé!')
    if (result.inconsistentCalls === 0) {
      console.log('✅ Backend cohérent - Problème côté frontend')
    } else {
      console.log('⚠️ Incohérences backend détectées')
    }
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Test échoué:', error)
    process.exit(1)
  })

export { testFrontendCache }
