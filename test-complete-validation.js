/**
 * Test de validation complète des connexions API
 * Vérifie toutes les routes nécessaires pour le frontend
 */

const https = require('https')
const http = require('http')

// Configuration pour ignorer les certificats SSL auto-signés
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    
    const req = protocol.request(url, options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data)
          resolve({ status: res.statusCode, data: jsonData })
        } catch (e) {
          resolve({ status: res.statusCode, data: data })
        }
      })
    })
    
    req.on('error', reject)
    
    if (options.body) {
      req.write(options.body)
    }
    
    req.end()
  })
}

async function testCompleteValidation() {
  console.log('🚀 VALIDATION COMPLÈTE DES CONNEXIONS API')
  console.log('=' * 50)
  
  let token = null
  let testResults = {
    auth: false,
    dashboard: false,
    analytics: { kpi: false, evolution: false, stats: false, sales: false },
    crud: { clients: false, products: false, suppliers: false, orders: false, invoices: false }
  }
  
  try {
    // 1. Test d'authentification
    console.log('\n🔐 1. TEST D\'AUTHENTIFICATION')
    const loginResponse = await makeRequest('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gctpe.dz', password: 'admin123' })
    })
    
    if (loginResponse.status === 200 && loginResponse.data.success) {
      token = loginResponse.data.data.tokens.accessToken
      testResults.auth = true
      console.log('✅ Authentification réussie')
    } else {
      console.log('❌ Authentification échouée')
      throw new Error('Authentification impossible')
    }
    
    // 2. Test du dashboard
    console.log('\n📊 2. TEST DU DASHBOARD')
    const dashboardResponse = await makeRequest('http://localhost:3001/api/v1/dashboard/stats', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    })
    
    if (dashboardResponse.status === 200) {
      testResults.dashboard = true
      console.log('✅ Dashboard stats accessible')
    } else {
      console.log('❌ Dashboard stats inaccessible')
    }
    
    // 3. Test des routes analytics
    console.log('\n📈 3. TEST DES ROUTES ANALYTICS')
    
    const analyticsRoutes = [
      { path: '/api/v1/analytics/kpi', key: 'kpi', name: 'KPI Metrics' },
      { path: '/api/v1/analytics/evolution?metric=revenue&period=6m', key: 'evolution', name: 'Evolution Data' },
      { path: '/api/v1/analytics/stats', key: 'stats', name: 'Analytics Stats' },
      { path: '/api/v1/analytics/sales', key: 'sales', name: 'Sales Analytics' }
    ]
    
    for (const route of analyticsRoutes) {
      try {
        const response = await makeRequest(`http://localhost:3001${route.path}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        })
        
        if (response.status === 200) {
          testResults.analytics[route.key] = true
          console.log(`✅ ${route.name} - OK`)
        } else {
          console.log(`❌ ${route.name} - Status: ${response.status}`)
        }
      } catch (error) {
        console.log(`❌ ${route.name} - Erreur: ${error.message}`)
      }
    }
    
    // 4. Test des routes CRUD
    console.log('\n🔧 4. TEST DES ROUTES CRUD')
    
    const crudRoutes = [
      { path: '/api/v1/clients', key: 'clients', name: 'Clients' },
      { path: '/api/v1/products', key: 'products', name: 'Products' },
      { path: '/api/v1/suppliers', key: 'suppliers', name: 'Suppliers' },
      { path: '/api/v1/orders', key: 'orders', name: 'Orders' },
      { path: '/api/v1/invoices', key: 'invoices', name: 'Invoices' }
    ]
    
    for (const route of crudRoutes) {
      try {
        const response = await makeRequest(`http://localhost:3001${route.path}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        })
        
        if (response.status === 200) {
          testResults.crud[route.key] = true
          console.log(`✅ ${route.name} - OK`)
        } else {
          console.log(`❌ ${route.name} - Status: ${response.status}`)
        }
      } catch (error) {
        console.log(`❌ ${route.name} - Erreur: ${error.message}`)
      }
    }
    
    // 5. Résumé des résultats
    console.log('\n📋 5. RÉSUMÉ DES TESTS')
    console.log('=' * 30)
    
    console.log(`🔐 Authentification: ${testResults.auth ? '✅' : '❌'}`)
    console.log(`📊 Dashboard: ${testResults.dashboard ? '✅' : '❌'}`)
    
    console.log('\n📈 Analytics:')
    Object.entries(testResults.analytics).forEach(([key, success]) => {
      console.log(`   ${key}: ${success ? '✅' : '❌'}`)
    })
    
    console.log('\n🔧 CRUD Operations:')
    Object.entries(testResults.crud).forEach(([key, success]) => {
      console.log(`   ${key}: ${success ? '✅' : '❌'}`)
    })
    
    // 6. Calcul du taux de réussite
    const totalTests = 1 + 1 + Object.keys(testResults.analytics).length + Object.keys(testResults.crud).length
    const successfulTests = (testResults.auth ? 1 : 0) + 
                           (testResults.dashboard ? 1 : 0) + 
                           Object.values(testResults.analytics).filter(Boolean).length + 
                           Object.values(testResults.crud).filter(Boolean).length
    
    const successRate = Math.round((successfulTests / totalTests) * 100)
    
    console.log(`\n🎯 TAUX DE RÉUSSITE: ${successfulTests}/${totalTests} (${successRate}%)`)
    
    if (successRate >= 90) {
      console.log('\n🎉 VALIDATION RÉUSSIE ! L\'application est prête.')
    } else if (successRate >= 70) {
      console.log('\n⚠️ VALIDATION PARTIELLE. Quelques problèmes à résoudre.')
    } else {
      console.log('\n❌ VALIDATION ÉCHOUÉE. Problèmes majeurs détectés.')
    }
    
    // 7. Recommandations
    console.log('\n💡 RECOMMANDATIONS:')
    
    if (!testResults.analytics.kpi) {
      console.log('- Vérifier la route /api/v1/analytics/kpi')
    }
    if (!testResults.analytics.evolution) {
      console.log('- Vérifier la route /api/v1/analytics/evolution')
    }
    
    const failedCrud = Object.entries(testResults.crud).filter(([key, success]) => !success)
    if (failedCrud.length > 0) {
      console.log(`- Vérifier les routes CRUD: ${failedCrud.map(([key]) => key).join(', ')}`)
    }
    
    if (successRate === 100) {
      console.log('- Aucune action requise. Toutes les connexions fonctionnent parfaitement !')
    }
    
    return testResults
    
  } catch (error) {
    console.error('\n❌ ERREUR FATALE:', error.message)
    throw error
  }
}

// Exécuter le test
if (require.main === module) {
  testCompleteValidation()
    .then((results) => {
      console.log('\n✅ Validation terminée')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Validation échouée:', error.message)
      process.exit(1)
    })
}

module.exports = { testCompleteValidation }
