/**
 * Test rapide de performance des routes analytics
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
            responseTime
          })
        } catch (e) {
          resolve({ 
            status: res.statusCode, 
            data: data, 
            responseTime
          })
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

async function testQuickPerformance() {
  console.log('⚡ TEST RAPIDE DE PERFORMANCE')
  console.log('=' * 30)
  
  try {
    // 1. Authentification
    console.log('\n🔐 Authentification...')
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
    
    // 2. Test des routes principales
    const routes = [
      { path: '/api/v1/dashboard/stats', name: 'Dashboard' },
      { path: '/api/v1/analytics/kpi', name: 'KPI' },
      { path: '/api/v1/analytics/evolution?metric=revenue&period=6m', name: 'Evolution' }
    ]
    
    console.log('\n📊 Test des routes principales:')
    
    let totalTime = 0
    let successCount = 0
    
    for (const route of routes) {
      try {
        const response = await makeRequest(`http://localhost:3001${route.path}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        })
        
        if (response.status === 200) {
          successCount++
          totalTime += response.responseTime
          const timeIcon = response.responseTime < 100 ? '🟢' : response.responseTime < 500 ? '🟡' : '🔴'
          console.log(`✅ ${route.name}: ${response.responseTime}ms ${timeIcon}`)
        } else {
          console.log(`❌ ${route.name}: Status ${response.status}`)
        }
        
      } catch (error) {
        console.log(`❌ ${route.name}: ${error.message}`)
      }
    }
    
    // 3. Résumé
    const avgTime = successCount > 0 ? totalTime / successCount : 0
    
    console.log('\n📈 RÉSUMÉ:')
    console.log(`Routes testées: ${routes.length}`)
    console.log(`Routes réussies: ${successCount}`)
    console.log(`Temps moyen: ${avgTime.toFixed(1)}ms`)
    
    if (avgTime < 100) {
      console.log('🎉 EXCELLENT ! Performances optimales.')
    } else if (avgTime < 300) {
      console.log('👍 BON ! Performances satisfaisantes.')
    } else {
      console.log('⚠️ MOYEN ! Optimisations possibles.')
    }
    
    return { success: successCount === routes.length, avgTime }
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message)
    throw error
  }
}

// Exécuter le test
if (require.main === module) {
  testQuickPerformance()
    .then((result) => {
      console.log(`\n${result.success ? '✅' : '❌'} Test terminé`)
      process.exit(result.success ? 0 : 1)
    })
    .catch((error) => {
      console.error('\n❌ Test échoué:', error.message)
      process.exit(1)
    })
}
