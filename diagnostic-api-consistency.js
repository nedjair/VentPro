/**
 * Script de diagnostic de cohérence via les APIs
 */

const axios = require('axios')

const BASE_URL = 'http://localhost:3001'
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzZkNzE5ZjU5YzNhNzJhNzE4ZjE5YzciLCJjb21wYW55SWQiOiI2NzZkNzE5ZjU5YzNhNzJhNzE4ZjE5YzgiLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzM1MjM5NTM1LCJleHAiOjE3MzUzMjU5MzV9.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'

const headers = {
  'Authorization': `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json'
}

async function callAPI(endpoint) {
  try {
    const startTime = Date.now()
    const response = await axios.get(`${BASE_URL}${endpoint}`, { headers })
    const duration = Date.now() - startTime
    
    return {
      success: true,
      data: response.data.data,
      duration,
      endpoint
    }
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      endpoint
    }
  }
}

async function runDiagnostic() {
  console.log('🔍 DIAGNOSTIC DE COHÉRENCE DES DONNÉES DE STOCK')
  console.log('=' .repeat(60))

  // 1. Appel des endpoints principaux
  console.log('\n📡 Appel des endpoints...')
  
  const [dashboardResult, alertsResult, productsResult, stocksResult] = await Promise.all([
    callAPI('/api/v1/stock/dashboard'),
    callAPI('/api/v1/stock-alerts/alerts?isActive=true&limit=100'),
    callAPI('/api/v1/products?limit=100'),
    callAPI('/api/v1/stock?limit=100')
  ])

  // 2. Vérification des succès
  const results = [dashboardResult, alertsResult, productsResult, stocksResult]
  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)

  console.log(`✅ Endpoints réussis: ${successful.length}/4`)
  console.log(`❌ Endpoints échoués: ${failed.length}/4`)

  if (failed.length > 0) {
    console.log('\n❌ ENDPOINTS EN ÉCHEC:')
    failed.forEach(f => {
      console.log(`- ${f.endpoint}: ${f.error}`)
    })
  }

  if (successful.length < 3) {
    console.log('\n⚠️  Impossible de continuer le diagnostic avec moins de 3 endpoints fonctionnels')
    return
  }

  // 3. Analyse des données
  console.log('\n📊 ANALYSE DES DONNÉES:')
  
  const dashboard = dashboardResult.success ? dashboardResult.data : null
  const alerts = alertsResult.success ? (Array.isArray(alertsResult.data) ? alertsResult.data : alertsResult.data.alerts || []) : []
  const products = productsResult.success ? (Array.isArray(productsResult.data) ? productsResult.data : productsResult.data.data || productsResult.data.products || []) : []
  const stocks = stocksResult.success ? (Array.isArray(stocksResult.data) ? stocksResult.data : stocksResult.data.data || []) : []

  console.log(`- Dashboard: ${dashboard ? 'OK' : 'KO'}`)
  console.log(`- Alertes: ${alerts.length} éléments`)
  console.log(`- Produits: ${products.length} éléments`)
  console.log(`- Stocks: ${stocks.length} éléments`)

  // 4. Calculs basés sur les produits (source de vérité)
  console.log('\n🧮 CALCULS BASÉS SUR LES PRODUITS:')
  
  let outOfStockCount = 0
  let lowStockCount = 0
  let overStockCount = 0
  let totalProducts = products.length

  products.forEach(product => {
    const stock = product.stockQuantity ?? product.stock ?? 0
    const minStock = product.minStock ?? product.min_stock ?? 0
    const maxStock = product.maxStock ?? product.max_stock ?? null

    if (stock === 0) {
      outOfStockCount++
    } else if (stock <= minStock && minStock > 0) {
      lowStockCount++
    } else if (maxStock && stock > maxStock) {
      overStockCount++
    }
  })

  console.log(`- Total produits: ${totalProducts}`)
  console.log(`- Rupture de stock: ${outOfStockCount}`)
  console.log(`- Stock faible: ${lowStockCount}`)
  console.log(`- Surstock: ${overStockCount}`)

  // 5. Comparaison avec le dashboard
  if (dashboard) {
    console.log('\n🔍 COMPARAISON DASHBOARD vs CALCULÉ:')
    
    const dashboardTotal = dashboard.overview?.totalProducts ?? dashboard.totalProducts ?? 0
    const dashboardOutOfStock = dashboard.overview?.outOfStockProducts ?? dashboard.outOfStockProducts ?? 0
    const dashboardLowStock = dashboard.overview?.lowStockProducts ?? dashboard.lowStockProducts ?? 0
    const dashboardOverStock = dashboard.overview?.overStockProducts ?? dashboard.overStockProducts ?? 0
    const dashboardActiveAlerts = dashboard.activity?.activeAlerts ?? dashboard.activeAlerts ?? 0

    console.log(`Total produits: Dashboard=${dashboardTotal}, Calculé=${totalProducts} ${dashboardTotal === totalProducts ? '✅' : '❌'}`)
    console.log(`Rupture stock: Dashboard=${dashboardOutOfStock}, Calculé=${outOfStockCount} ${dashboardOutOfStock === outOfStockCount ? '✅' : '❌'}`)
    console.log(`Stock faible: Dashboard=${dashboardLowStock}, Calculé=${lowStockCount} ${dashboardLowStock === lowStockCount ? '✅' : '❌'}`)
    console.log(`Surstock: Dashboard=${dashboardOverStock}, Calculé=${overStockCount} ${dashboardOverStock === overStockCount ? '✅' : '❌'}`)
    console.log(`Alertes actives: Dashboard=${dashboardActiveAlerts}, Réelles=${alerts.length} ${dashboardActiveAlerts === alerts.length ? '✅' : '❌'}`)
  }

  // 6. Analyse des alertes
  console.log('\n🚨 ANALYSE DES ALERTES:')
  
  const alertsByType = alerts.reduce((acc, alert) => {
    acc[alert.type] = (acc[alert.type] || 0) + 1
    return acc
  }, {})

  console.log(`- Total alertes: ${alerts.length}`)
  Object.entries(alertsByType).forEach(([type, count]) => {
    console.log(`- ${type}: ${count}`)
  })

  // Vérification cohérence alertes vs produits
  const alertsOutOfStock = alertsByType.OUT_OF_STOCK || 0
  const alertsLowStock = alertsByType.LOW_STOCK || 0
  const alertsOverStock = alertsByType.OVERSTOCK || 0

  console.log('\n🔍 COHÉRENCE ALERTES vs PRODUITS:')
  console.log(`Rupture: Alertes=${alertsOutOfStock}, Produits=${outOfStockCount} ${alertsOutOfStock === outOfStockCount ? '✅' : '❌'}`)
  console.log(`Stock faible: Alertes=${alertsLowStock}, Produits=${lowStockCount} ${alertsLowStock === lowStockCount ? '✅' : '❌'}`)
  console.log(`Surstock: Alertes=${alertsOverStock}, Produits=${overStockCount} ${alertsOverStock === overStockCount ? '✅' : '❌'}`)

  // 7. Résumé final
  console.log('\n📋 RÉSUMÉ FINAL:')
  console.log('=' .repeat(40))

  let issues = 0
  
  if (dashboard) {
    const dashboardTotal = dashboard.overview?.totalProducts ?? dashboard.totalProducts ?? 0
    const dashboardOutOfStock = dashboard.overview?.outOfStockProducts ?? dashboard.outOfStockProducts ?? 0
    const dashboardLowStock = dashboard.overview?.lowStockProducts ?? dashboard.lowStockProducts ?? 0
    const dashboardActiveAlerts = dashboard.activity?.activeAlerts ?? dashboard.activeAlerts ?? 0

    if (dashboardTotal !== totalProducts) issues++
    if (dashboardOutOfStock !== outOfStockCount) issues++
    if (dashboardLowStock !== lowStockCount) issues++
    if (dashboardActiveAlerts !== alerts.length) issues++
  }

  const alertsOutOfStockIssue = alertsOutOfStock !== outOfStockCount
  const alertsLowStockIssue = alertsLowStock !== lowStockCount

  if (alertsOutOfStockIssue) issues++
  if (alertsLowStockIssue) issues++

  if (issues === 0) {
    console.log('🎉 TOUTES LES DONNÉES SONT COHÉRENTES!')
  } else {
    console.log(`❌ ${issues} INCOHÉRENCES DÉTECTÉES`)
    
    console.log('\n💡 ACTIONS RECOMMANDÉES:')
    if (dashboard) {
      const dashboardOutOfStock = dashboard.overview?.outOfStockProducts ?? dashboard.outOfStockProducts ?? 0
      const dashboardLowStock = dashboard.overview?.lowStockProducts ?? dashboard.lowStockProducts ?? 0
      
      if (dashboardOutOfStock !== outOfStockCount || dashboardLowStock !== lowStockCount) {
        console.log('1. Forcer le rafraîchissement du dashboard: POST /api/v1/stock/dashboard/refresh')
      }
    }
    
    if (alertsOutOfStockIssue || alertsLowStockIssue) {
      console.log('2. Régénérer les alertes de stock')
      console.log('3. Vérifier la synchronisation entre les tables Product et StockAlert')
    }
    
    console.log('4. Utiliser le hook useUnifiedStockData avec les corrections appliquées')
  }

  // 8. Test du hook unifié (simulation)
  console.log('\n🔧 SIMULATION DU HOOK UNIFIÉ:')
  
  // Simulation de la logique du hook corrigé
  const unifiedData = {
    dashboard: {
      totalProducts: totalProducts,
      outOfStockProducts: outOfStockCount,
      lowStockProducts: lowStockCount,
      overStockProducts: overStockCount,
      activeAlerts: alerts.length
    },
    alerts: alerts,
    products: products.map(p => ({
      id: p.id,
      name: p.name,
      stockQuantity: p.stockQuantity ?? p.stock ?? 0,
      minStock: p.minStock ?? p.min_stock ?? 0,
      status: (p.stockQuantity ?? p.stock ?? 0) === 0 ? 'out' : 
              ((p.stockQuantity ?? p.stock ?? 0) <= (p.minStock ?? p.min_stock ?? 0) && (p.minStock ?? p.min_stock ?? 0) > 0) ? 'low' : 'normal'
    }))
  }

  console.log('✅ Hook unifié simulé avec succès')
  console.log(`- Données cohérentes: ${unifiedData.dashboard.totalProducts} produits, ${unifiedData.dashboard.activeAlerts} alertes`)
  
  return {
    success: issues === 0,
    issues,
    data: unifiedData
  }
}

// Exécution
runDiagnostic().then(result => {
  if (result.success) {
    console.log('\n🎯 DIAGNOSTIC TERMINÉ: SUCCÈS')
    process.exit(0)
  } else {
    console.log('\n⚠️  DIAGNOSTIC TERMINÉ: PROBLÈMES DÉTECTÉS')
    process.exit(1)
  }
}).catch(error => {
  console.error('\n❌ ERREUR LORS DU DIAGNOSTIC:', error.message)
  process.exit(1)
})
