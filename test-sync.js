/**
 * Script de test pour vérifier la synchronisation des données de stock
 */

const axios = require('axios')

const BASE_URL = 'http://localhost:3001'

// Token d'authentification (à remplacer par un vrai token)
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzZkNzE5ZjU5YzNhNzJhNzE4ZjE5YzciLCJjb21wYW55SWQiOiI2NzZkNzE5ZjU5YzNhNzJhNzE4ZjE5YzgiLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzM1MjM5NTM1LCJleHAiOjE3MzUzMjU5MzV9.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'

const headers = {
  'Authorization': `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json'
}

async function testEndpoint(name, url) {
  try {
    console.log(`\n🔍 Test ${name}...`)
    const response = await axios.get(`${BASE_URL}${url}`, { headers })
    
    if (response.data.success) {
      console.log(`✅ ${name} - OK`)
      return response.data.data
    } else {
      console.log(`❌ ${name} - Erreur: ${response.data.message}`)
      return null
    }
  } catch (error) {
    console.log(`❌ ${name} - Erreur: ${error.response?.data?.message || error.message}`)
    return null
  }
}

async function main() {
  console.log('🚀 Test de synchronisation des données de stock')
  console.log('=' .repeat(50))

  // Test des différents endpoints
  const dashboard = await testEndpoint('Dashboard', '/stock/dashboard')
  const alerts = await testEndpoint('Alertes', '/api/v1/stock-alerts/alerts?isActive=true&limit=100')
  const products = await testEndpoint('Produits', '/api/v1/products?limit=100')
  const stockList = await testEndpoint('Liste Stock', '/api/v1/stock?limit=100')

  console.log('\n📊 Analyse de cohérence:')
  console.log('=' .repeat(30))

  if (dashboard && alerts && products) {
    // Analyse du dashboard
    console.log(`\n🎯 Dashboard:`)
    console.log(`   - Total produits: ${dashboard.overview?.totalProducts || 0}`)
    console.log(`   - Stock faible: ${dashboard.overview?.lowStockProducts || 0}`)
    console.log(`   - Rupture: ${dashboard.overview?.outOfStockProducts || 0}`)
    console.log(`   - Alertes actives: ${dashboard.activity?.activeAlerts || 0}`)

    // Analyse des alertes
    const alertsArray = Array.isArray(alerts) ? alerts : []
    const lowStockAlerts = alertsArray.filter(a => a.type === 'LOW_STOCK').length
    const outOfStockAlerts = alertsArray.filter(a => a.type === 'OUT_OF_STOCK').length
    
    console.log(`\n🚨 Alertes:`)
    console.log(`   - Total alertes: ${alertsArray.length}`)
    console.log(`   - Stock faible: ${lowStockAlerts}`)
    console.log(`   - Rupture: ${outOfStockAlerts}`)

    // Analyse des produits
    const productsArray = Array.isArray(products?.data) ? products.data : (Array.isArray(products) ? products : [])
    const lowStockProducts = productsArray.filter(p => p.stockQuantity > 0 && p.stockQuantity <= (p.minStock || 0) && (p.minStock || 0) > 0).length
    const outOfStockProducts = productsArray.filter(p => p.stockQuantity === 0).length
    
    console.log(`\n📦 Produits:`)
    console.log(`   - Total produits: ${productsArray.length}`)
    console.log(`   - Stock faible: ${lowStockProducts}`)
    console.log(`   - Rupture: ${outOfStockProducts}`)

    // Vérification de cohérence
    console.log(`\n🔍 Vérification de cohérence:`)
    
    const dashboardLow = dashboard.overview?.lowStockProducts || 0
    const dashboardOut = dashboard.overview?.outOfStockProducts || 0
    const dashboardAlerts = dashboard.activity?.activeAlerts || 0
    
    console.log(`   Dashboard vs Alertes:`)
    console.log(`     - Stock faible: ${dashboardLow} vs ${lowStockAlerts} ${dashboardLow === lowStockAlerts ? '✅' : '❌'}`)
    console.log(`     - Rupture: ${dashboardOut} vs ${outOfStockAlerts} ${dashboardOut === outOfStockAlerts ? '✅' : '❌'}`)
    console.log(`     - Total alertes: ${dashboardAlerts} vs ${alertsArray.length} ${dashboardAlerts === alertsArray.length ? '✅' : '❌'}`)
    
    console.log(`   Dashboard vs Produits:`)
    console.log(`     - Stock faible: ${dashboardLow} vs ${lowStockProducts} ${dashboardLow === lowStockProducts ? '✅' : '❌'}`)
    console.log(`     - Rupture: ${dashboardOut} vs ${outOfStockProducts} ${dashboardOut === outOfStockProducts ? '✅' : '❌'}`)

    // Détails des incohérences
    if (dashboardLow !== lowStockAlerts || dashboardOut !== outOfStockAlerts) {
      console.log(`\n⚠️  Incohérences détectées!`)
      
      if (alertsArray.length > 0) {
        console.log(`\n📋 Détail des alertes:`)
        alertsArray.slice(0, 5).forEach((alert, i) => {
          console.log(`   ${i+1}. ${alert.title} - ${alert.type} (${alert.severity})`)
          console.log(`      Stock: ${alert.currentStock}, Seuil: ${alert.thresholdValue}`)
        })
      }
      
      if (productsArray.length > 0) {
        console.log(`\n📋 Produits problématiques:`)
        const problematicProducts = productsArray.filter(p => 
          p.stockQuantity === 0 || (p.stockQuantity <= (p.minStock || 0) && (p.minStock || 0) > 0)
        ).slice(0, 5)
        
        problematicProducts.forEach((product, i) => {
          const status = product.stockQuantity === 0 ? 'RUPTURE' : 'STOCK_FAIBLE'
          console.log(`   ${i+1}. ${product.name} - ${status}`)
          console.log(`      Stock: ${product.stockQuantity}, Min: ${product.minStock || 0}`)
        })
      }
    } else {
      console.log(`\n✅ Toutes les données sont cohérentes!`)
    }
  }

  console.log('\n🏁 Test terminé')
}

main().catch(console.error)
