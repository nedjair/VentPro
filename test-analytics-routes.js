/**
 * Test des nouvelles routes analytics
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

async function testAnalyticsRoutes() {
  try {
    console.log('🔐 Test d\'authentification...')
    
    // 1. Authentification
    const loginResponse = await makeRequest('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@gctpe.dz',
        password: 'admin123'
      })
    })
    
    if (loginResponse.status !== 200) {
      throw new Error(`Login failed: ${loginResponse.status}`)
    }
    
    const token = loginResponse.data.data.tokens.accessToken
    console.log('✅ Authentification réussie')
    
    // 2. Test de la route KPI
    console.log('\n📊 Test de la route /api/v1/analytics/kpi...')
    const kpiResponse = await makeRequest('http://localhost:3001/api/v1/analytics/kpi', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log(`Status: ${kpiResponse.status}`)
    if (kpiResponse.status === 200) {
      console.log('✅ Route KPI accessible')
      console.log('📋 Structure KPI:', Object.keys(kpiResponse.data.data || {}))
    } else {
      console.log('❌ Route KPI échouée')
      console.log('Erreur:', kpiResponse.data)
    }
    
    // 3. Test de la route Evolution
    console.log('\n📈 Test de la route /api/v1/analytics/evolution...')
    const evolutionResponse = await makeRequest('http://localhost:3001/api/v1/analytics/evolution?metric=revenue&period=6m', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log(`Status: ${evolutionResponse.status}`)
    if (evolutionResponse.status === 200) {
      console.log('✅ Route Evolution accessible')
      console.log('📋 Structure Evolution:', Object.keys(evolutionResponse.data.data || {}))
      if (evolutionResponse.data.data && evolutionResponse.data.data.data) {
        console.log(`📊 Points de données: ${evolutionResponse.data.data.data.length}`)
      }
    } else {
      console.log('❌ Route Evolution échouée')
      console.log('Erreur:', evolutionResponse.data)
    }
    
    // 4. Test des autres routes analytics existantes
    console.log('\n🔍 Test des autres routes analytics...')
    
    const otherRoutes = [
      '/api/v1/analytics/stats',
      '/api/v1/analytics/sales',
      '/api/v1/analytics/products',
      '/api/v1/analytics/clients'
    ]
    
    for (const route of otherRoutes) {
      try {
        const response = await makeRequest(`http://localhost:3001${route}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.status === 200) {
          console.log(`✅ ${route} - OK`)
        } else {
          console.log(`❌ ${route} - Status: ${response.status}`)
        }
      } catch (error) {
        console.log(`❌ ${route} - Erreur: ${error.message}`)
      }
    }
    
    console.log('\n🎉 Test des routes analytics terminé !')
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message)
    throw error
  }
}

// Exécuter le test
if (require.main === module) {
  testAnalyticsRoutes()
    .then(() => {
      console.log('\n✅ Test terminé avec succès')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Test échoué:', error.message)
      process.exit(1)
    })
}
