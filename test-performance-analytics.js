/**
 * Test de performance des routes analytics
 * Mesure les temps de réponse et analyse les performances
 */

const https = require('https')
const http = require('http')

async function makeRequest(url, options = {}) {
  const startTime = Date.now()
  
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    
    const req = protocol.request(url, options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        const endTime = Date.now()
        const responseTime = endTime - startTime
        
        try {
          const jsonData = JSON.parse(data)
          resolve({ 
            status: res.statusCode, 
            data: jsonData, 
            responseTime,
            size: data.length
          })
        } catch (e) {
          resolve({ 
            status: res.statusCode, 
            data: data, 
            responseTime,
            size: data.length
          })
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

async function testPerformanceAnalytics() {
  console.log('⚡ TEST DE PERFORMANCE DES ROUTES ANALYTICS')
  console.log('=' * 50)
  
  try {
    // 1. Authentification avec mesure de temps
    console.log('\n🔐 Test de performance - Authentification')
    const loginStart = Date.now()
    
    const loginResponse = await makeRequest('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gctpe.dz', password: 'admin123' })
    })
    
    if (loginResponse.status !== 200) {
      throw new Error('Authentification échouée')
    }
    
    const token = loginResponse.data.data.tokens.accessToken
    console.log(`✅ Authentification: ${loginResponse.responseTime}ms`)
    
    // 2. Test de performance des routes analytics
    console.log('\n📊 Test de performance - Routes Analytics')
    
    const routes = [
      { path: '/api/v1/dashboard/stats', name: 'Dashboard Stats' },
      { path: '/api/v1/analytics/kpi', name: 'KPI Metrics' },
      { path: '/api/v1/analytics/evolution?metric=revenue&period=6m', name: 'Evolution Revenue 6m' },
      { path: '/api/v1/analytics/evolution?metric=revenue&period=12m', name: 'Evolution Revenue 12m' },
      { path: '/api/v1/analytics/evolution?metric=orders&period=6m', name: 'Evolution Orders 6m' },
      { path: '/api/v1/analytics/stats', name: 'Analytics Stats' },
      { path: '/api/v1/analytics/sales', name: 'Sales Analytics' },
      { path: '/api/v1/clients', name: 'Clients List' },
      { path: '/api/v1/products', name: 'Products List' },
      { path: '/api/v1/suppliers', name: 'Suppliers List' }
    ]
    
    const performanceResults = []
    
    for (const route of routes) {
      try {
        const response = await makeRequest(`http://localhost:3001${route.path}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        })
        
        const result = {
          name: route.name,
          path: route.path,
          status: response.status,
          responseTime: response.responseTime,
          size: response.size,
          success: response.status === 200
        }
        
        performanceResults.push(result)
        
        const statusIcon = result.success ? '✅' : '❌'
        const timeColor = result.responseTime < 100 ? '🟢' : result.responseTime < 500 ? '🟡' : '🔴'
        
        console.log(`${statusIcon} ${route.name}: ${result.responseTime}ms ${timeColor} (${result.size} bytes)`)
        
      } catch (error) {
        console.log(`❌ ${route.name}: Erreur - ${error.message}`)
        performanceResults.push({
          name: route.name,
          path: route.path,
          status: 0,
          responseTime: 0,
          size: 0,
          success: false,
          error: error.message
        })
      }
    }
    
    // 3. Test de charge (requêtes multiples)
    console.log('\n🔄 Test de charge - Requêtes simultanées')
    
    const loadTestRoute = '/api/v1/analytics/kpi'
    const concurrentRequests = 5
    
    const loadTestStart = Date.now()
    const loadTestPromises = Array(concurrentRequests).fill().map(() => 
      makeRequest(`http://localhost:3001${loadTestRoute}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      })
    )
    
    const loadTestResults = await Promise.all(loadTestPromises)
    const loadTestEnd = Date.now()
    
    const loadTestTotalTime = loadTestEnd - loadTestStart
    const loadTestAvgTime = loadTestResults.reduce((sum, r) => sum + r.responseTime, 0) / loadTestResults.length
    const loadTestSuccessRate = loadTestResults.filter(r => r.status === 200).length / loadTestResults.length * 100
    
    console.log(`📊 ${concurrentRequests} requêtes simultanées:`)
    console.log(`   Temps total: ${loadTestTotalTime}ms`)
    console.log(`   Temps moyen: ${loadTestAvgTime.toFixed(1)}ms`)
    console.log(`   Taux de réussite: ${loadTestSuccessRate}%`)
    
    // 4. Analyse des performances
    console.log('\n📈 ANALYSE DES PERFORMANCES')
    console.log('=' * 30)
    
    const successfulRequests = performanceResults.filter(r => r.success)
    const avgResponseTime = successfulRequests.reduce((sum, r) => sum + r.responseTime, 0) / successfulRequests.length
    const maxResponseTime = Math.max(...successfulRequests.map(r => r.responseTime))
    const minResponseTime = Math.min(...successfulRequests.map(r => r.responseTime))
    const totalDataSize = successfulRequests.reduce((sum, r) => sum + r.size, 0)
    
    console.log(`📊 Statistiques générales:`)
    console.log(`   Routes testées: ${performanceResults.length}`)
    console.log(`   Requêtes réussies: ${successfulRequests.length}`)
    console.log(`   Temps de réponse moyen: ${avgResponseTime.toFixed(1)}ms`)
    console.log(`   Temps de réponse min: ${minResponseTime}ms`)
    console.log(`   Temps de réponse max: ${maxResponseTime}ms`)
    console.log(`   Taille totale des données: ${(totalDataSize / 1024).toFixed(1)} KB`)
    
    // 5. Recommandations de performance
    console.log('\n💡 RECOMMANDATIONS')
    
    const slowRoutes = successfulRequests.filter(r => r.responseTime > 500)
    const fastRoutes = successfulRequests.filter(r => r.responseTime < 100)
    
    if (avgResponseTime < 200) {
      console.log('✅ Performances excellentes ! Temps de réponse optimal.')
    } else if (avgResponseTime < 500) {
      console.log('🟡 Performances correctes. Quelques optimisations possibles.')
    } else {
      console.log('🔴 Performances à améliorer. Optimisations nécessaires.')
    }
    
    if (slowRoutes.length > 0) {
      console.log('\n🐌 Routes lentes (>500ms):')
      slowRoutes.forEach(route => {
        console.log(`   - ${route.name}: ${route.responseTime}ms`)
      })
      console.log('   💡 Considérer la mise en cache ou l\'optimisation des requêtes DB')
    }
    
    if (fastRoutes.length > 0) {
      console.log('\n⚡ Routes rapides (<100ms):')
      fastRoutes.forEach(route => {
        console.log(`   - ${route.name}: ${route.responseTime}ms`)
      })
    }
    
    // 6. Score de performance global
    let performanceScore = 100
    
    if (avgResponseTime > 100) performanceScore -= 10
    if (avgResponseTime > 200) performanceScore -= 10
    if (avgResponseTime > 500) performanceScore -= 20
    if (maxResponseTime > 1000) performanceScore -= 15
    if (loadTestSuccessRate < 100) performanceScore -= 10
    if (successfulRequests.length < performanceResults.length) performanceScore -= 15
    
    performanceScore = Math.max(0, performanceScore)
    
    console.log(`\n🎯 SCORE DE PERFORMANCE: ${performanceScore}/100`)
    
    if (performanceScore >= 90) {
      console.log('🎉 EXCELLENT ! Les performances sont optimales.')
    } else if (performanceScore >= 70) {
      console.log('👍 BON ! Performances satisfaisantes avec quelques améliorations possibles.')
    } else if (performanceScore >= 50) {
      console.log('⚠️ MOYEN ! Des optimisations sont recommandées.')
    } else {
      console.log('❌ FAIBLE ! Optimisations urgentes nécessaires.')
    }
    
    return {
      success: performanceScore >= 70,
      score: performanceScore,
      avgResponseTime,
      results: performanceResults
    }
    
  } catch (error) {
    console.error('\n❌ ERREUR FATALE:', error.message)
    throw error
  }
}

// Exécuter le test
if (require.main === module) {
  testPerformanceAnalytics()
    .then((result) => {
      console.log(`\n${result.success ? '✅' : '❌'} Test de performance terminé`)
      console.log(`Score final: ${result.score}/100`)
      process.exit(result.success ? 0 : 1)
    })
    .catch((error) => {
      console.error('\n❌ Test échoué:', error.message)
      process.exit(1)
    })
}
