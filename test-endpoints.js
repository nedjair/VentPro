/**
 * Script de vérification rapide des endpoints de stock
 */

const axios = require('axios')

const BASE_URL = 'http://localhost:3001'

// Token d'authentification (remplacer par un vrai token si nécessaire)
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzZkNzE5ZjU5YzNhNzJhNzE4ZjE5YzciLCJjb21wYW55SWQiOiI2NzZkNzE5ZjU5YzNhNzJhNzE4ZjE5YzgiLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzM1MjM5NTM1LCJleHAiOjE3MzUzMjU5MzV9.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'

const headers = {
  'Authorization': `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json'
}

async function testEndpoint(name, url) {
  try {
    console.log(`\n🔍 Test ${name}...`)
    const startTime = Date.now()
    const response = await axios.get(`${BASE_URL}${url}`, { headers })
    const duration = Date.now() - startTime
    
    if (response.data.success) {
      console.log(`✅ ${name} - OK (${duration}ms)`)
      return { success: true, data: response.data.data, duration }
    } else {
      console.log(`❌ ${name} - Erreur: ${response.data.message}`)
      return { success: false, error: response.data.message, duration }
    }
  } catch (error) {
    const duration = Date.now() - Date.now()
    console.log(`❌ ${name} - Erreur: ${error.response?.data?.message || error.message}`)
    return { success: false, error: error.response?.data?.message || error.message, duration }
  }
}

async function main() {
  console.log('🚀 Vérification rapide des endpoints de stock')
  console.log('=' .repeat(50))

  // Test des endpoints principaux
  const results = await Promise.all([
    testEndpoint('Dashboard Stock', '/api/v1/stock/dashboard'),
    testEndpoint('Alertes Stock', '/api/v1/stock-alerts/alerts?isActive=true&limit=10'),
    testEndpoint('Produits', '/api/v1/products?limit=10'),
    testEndpoint('Stats Stock', '/api/v1/stock/stats'),
    testEndpoint('Dashboard Principal', '/api/v1/dashboard/stats')
  ])

  console.log('\n📊 Résumé:')
  console.log('=' .repeat(30))

  const successful = results.filter(r => r.success).length
  const total = results.length
  const avgDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0) / total

  console.log(`✅ Succès: ${successful}/${total} (${((successful/total)*100).toFixed(1)}%)`)
  console.log(`⏱️  Durée moyenne: ${avgDuration.toFixed(0)}ms`)

  if (successful === total) {
    console.log('\n🎉 Tous les endpoints fonctionnent correctement!')
    
    // Analyse rapide des données
    const dashboardResult = results.find(r => r.success && r.data?.overview)
    if (dashboardResult) {
      const data = dashboardResult.data
      console.log('\n📈 Données du dashboard:')
      console.log(`   - Total produits: ${data.overview.totalProducts}`)
      console.log(`   - Stock faible: ${data.overview.lowStockProducts}`)
      console.log(`   - Rupture: ${data.overview.outOfStockProducts}`)
      console.log(`   - Alertes actives: ${data.activity.activeAlerts}`)
    }
  } else {
    console.log('\n⚠️  Certains endpoints ont des problèmes:')
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.error}`)
    })
  }

  console.log('\n🏁 Vérification terminée')
}

main().catch(console.error)
