/**
 * Test complet de navigation dans l'application
 * Simule un parcours utilisateur complet
 */

const https = require('https')
const http = require('http')

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
    req.setTimeout(5000, () => {
      req.destroy()
      reject(new Error('Timeout'))
    })
    
    if (options.body) {
      req.write(options.body)
    }
    
    req.end()
  })
}

async function testCompleteNavigation() {
  console.log('🚀 TEST DE NAVIGATION COMPLÈTE')
  console.log('=' * 35)
  
  const baseUrl = 'http://localhost:3001'
  let authToken = null
  let testResults = {
    authentication: false,
    dashboard: false,
    analytics: false,
    clients: false,
    products: false,
    suppliers: false,
    orders: false,
    invoices: false
  }
  
  try {
    // 1. AUTHENTIFICATION
    console.log('\n🔐 ÉTAPE 1: Authentification')
    const loginResponse = await makeRequest(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gctpe.dz', password: 'admin123' })
    })
    
    if (loginResponse.status === 200 && loginResponse.data.success) {
      authToken = loginResponse.data.data.tokens.accessToken
      testResults.authentication = true
      console.log('✅ Authentification réussie')
      console.log(`   Utilisateur: ${loginResponse.data.data.user?.email}`)
    } else {
      console.log('❌ Authentification échouée')
      throw new Error('Impossible de s\'authentifier')
    }
    
    const headers = { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' }
    
    // 2. DASHBOARD
    console.log('\n📊 ÉTAPE 2: Dashboard')
    const dashboardResponse = await makeRequest(`${baseUrl}/api/v1/dashboard/stats`, {
      method: 'GET',
      headers
    })
    
    if (dashboardResponse.status === 200 && dashboardResponse.data.success) {
      testResults.dashboard = true
      const sections = Object.keys(dashboardResponse.data.data)
      console.log('✅ Dashboard accessible')
      console.log(`   Sections: ${sections.join(', ')}`)
    } else {
      console.log('❌ Dashboard inaccessible')
    }
    
    // 3. ANALYTICS
    console.log('\n📈 ÉTAPE 3: Analytics')
    const analyticsTests = [
      ['KPI', '/api/v1/analytics/kpi'],
      ['Sales', '/api/v1/analytics/sales'],
      ['Evolution', '/api/v1/analytics/evolution?metric=revenue&period=6m'],
      ['Products Analytics', '/api/v1/analytics/products'],
      ['Clients Analytics', '/api/v1/analytics/clients']
    ]
    
    let analyticsSuccess = 0
    for (const [name, endpoint] of analyticsTests) {
      try {
        const response = await makeRequest(`${baseUrl}${endpoint}`, {
          method: 'GET',
          headers
        })
        
        if (response.status === 200) {
          analyticsSuccess++
          console.log(`✅ ${name}: OK`)
        } else {
          console.log(`❌ ${name}: ${response.status}`)
        }
      } catch (error) {
        console.log(`❌ ${name}: ${error.message}`)
      }
    }
    
    testResults.analytics = analyticsSuccess === analyticsTests.length
    console.log(`📊 Analytics: ${analyticsSuccess}/${analyticsTests.length} routes fonctionnelles`)
    
    // 4. GESTION DES ENTITÉS
    console.log('\n📋 ÉTAPE 4: Gestion des entités')
    
    const entities = [
      ['Clients', '/api/v1/clients'],
      ['Products', '/api/v1/products'],
      ['Suppliers', '/api/v1/suppliers'],
      ['Orders', '/api/v1/orders'],
      ['Invoices', '/api/v1/invoices']
    ]
    
    for (const [name, endpoint] of entities) {
      try {
        const response = await makeRequest(`${baseUrl}${endpoint}`, {
          method: 'GET',
          headers
        })
        
        if (response.status === 200 && response.data.success) {
          const entityKey = name.toLowerCase()
          testResults[entityKey] = true
          
          const count = response.data.data?.data?.length || response.data.data?.total || 0
          console.log(`✅ ${name}: ${count} éléments`)
          
          // Test de structure
          if (response.data.data?.data && response.data.data.data.length > 0) {
            const firstItem = response.data.data.data[0]
            const fields = Object.keys(firstItem)
            console.log(`   Champs: ${fields.slice(0, 4).join(', ')}${fields.length > 4 ? '...' : ''}`)
          }
        } else {
          console.log(`❌ ${name}: ${response.status}`)
        }
      } catch (error) {
        console.log(`❌ ${name}: ${error.message}`)
      }
    }
    
    // 5. ROUTES D'AUTHENTIFICATION AVANCÉES
    console.log('\n🔐 ÉTAPE 5: Routes d\'authentification avancées')
    
    const authTests = [
      ['Verify Token', 'GET', '/api/v1/auth/verify'],
      ['Get Profile', 'GET', '/api/v1/auth/profile']
    ]
    
    for (const [name, method, path] of authTests) {
      try {
        const response = await makeRequest(`${baseUrl}${path}`, {
          method,
          headers
        })
        
        if (response.status === 200) {
          console.log(`✅ ${name}: OK`)
        } else {
          console.log(`❌ ${name}: ${response.status}`)
        }
      } catch (error) {
        console.log(`❌ ${name}: ${error.message}`)
      }
    }
    
    // 6. TEST DE PERFORMANCE GLOBAL
    console.log('\n⚡ ÉTAPE 6: Performance globale')
    
    const performanceTests = [
      '/api/v1/dashboard/stats',
      '/api/v1/analytics/kpi',
      '/api/v1/clients',
      '/api/v1/products'
    ]
    
    let totalTime = 0
    let successCount = 0
    
    for (const endpoint of performanceTests) {
      try {
        const startTime = Date.now()
        const response = await makeRequest(`${baseUrl}${endpoint}`, {
          method: 'GET',
          headers
        })
        const endTime = Date.now()
        const responseTime = endTime - startTime
        
        if (response.status === 200) {
          successCount++
          totalTime += responseTime
          const timeIcon = responseTime < 100 ? '🟢' : responseTime < 500 ? '🟡' : '🔴'
          console.log(`${timeIcon} ${endpoint}: ${responseTime}ms`)
        }
      } catch (error) {
        console.log(`❌ ${endpoint}: ${error.message}`)
      }
    }
    
    const avgTime = successCount > 0 ? totalTime / successCount : 0
    console.log(`📊 Temps de réponse moyen: ${avgTime.toFixed(1)}ms`)
    
    // 7. RÉSUMÉ FINAL
    console.log('\n🎯 RÉSUMÉ FINAL')
    console.log('=' * 20)
    
    const successfulModules = Object.values(testResults).filter(Boolean).length
    const totalModules = Object.keys(testResults).length
    const successRate = (successfulModules / totalModules) * 100
    
    console.log(`Modules fonctionnels: ${successfulModules}/${totalModules} (${successRate.toFixed(1)}%)`)
    
    Object.entries(testResults).forEach(([module, success]) => {
      const icon = success ? '✅' : '❌'
      const name = module.charAt(0).toUpperCase() + module.slice(1)
      console.log(`${icon} ${name}`)
    })
    
    console.log(`\nPerformance: ${avgTime < 200 ? '✅ Excellente' : avgTime < 500 ? '🟡 Correcte' : '❌ À améliorer'}`)
    
    if (successRate >= 90) {
      console.log('\n🎉 APPLICATION PARFAITEMENT FONCTIONNELLE !')
      console.log('Toutes les routes API sont opérationnelles et cohérentes.')
    } else if (successRate >= 70) {
      console.log('\n👍 APPLICATION LARGEMENT FONCTIONNELLE')
      console.log('La plupart des fonctionnalités sont opérationnelles.')
    } else {
      console.log('\n⚠️ APPLICATION PARTIELLEMENT FONCTIONNELLE')
      console.log('Plusieurs modules nécessitent des corrections.')
    }
    
    return {
      success: successRate >= 80,
      successRate,
      results: testResults,
      avgResponseTime: avgTime
    }
    
  } catch (error) {
    console.error('\n❌ ERREUR FATALE:', error.message)
    throw error
  }
}

// Exécuter le test
if (require.main === module) {
  testCompleteNavigation()
    .then((result) => {
      console.log(`\n${result.success ? '🎉' : '⚠️'} Test de navigation terminé`)
      console.log(`Taux de réussite: ${result.successRate.toFixed(1)}%`)
      process.exit(result.success ? 0 : 1)
    })
    .catch((error) => {
      console.error('\n❌ Test échoué:', error.message)
      process.exit(1)
    })
}
