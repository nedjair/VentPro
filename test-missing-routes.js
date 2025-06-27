/**
 * Test pour identifier les routes manquantes
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
    req.setTimeout(3000, () => {
      req.destroy()
      reject(new Error('Timeout'))
    })
    
    if (options.body) {
      req.write(options.body)
    }
    
    req.end()
  })
}

async function testMissingRoutes() {
  console.log('🔍 IDENTIFICATION DES ROUTES MANQUANTES')
  console.log('=' * 40)
  
  const baseUrl = 'http://localhost:3001'
  
  try {
    // 1. Authentification
    console.log('\n🔐 Authentification...')
    const loginResponse = await makeRequest(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gctpe.dz', password: 'admin123' })
    })
    
    if (loginResponse.status !== 200) {
      throw new Error('Authentification échouée')
    }
    
    const token = loginResponse.data.data.tokens.accessToken
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    
    // 2. Routes à tester
    const routesToTest = [
      // Routes d'authentification
      ['Auth Verify', 'GET', '/api/v1/auth/verify'],
      ['Auth Profile', 'GET', '/api/v1/auth/profile'],
      ['Auth Refresh', 'POST', '/api/v1/auth/refresh'],
      
      // Dashboard
      ['Dashboard Stats', 'GET', '/api/v1/dashboard/stats'],
      
      // Analytics
      ['Analytics KPI', 'GET', '/api/v1/analytics/kpi'],
      ['Analytics Sales', 'GET', '/api/v1/analytics/sales'],
      ['Analytics Stats', 'GET', '/api/v1/analytics/stats'],
      ['Analytics Evolution', 'GET', '/api/v1/analytics/evolution'],
      ['Analytics Products', 'GET', '/api/v1/analytics/products'],
      ['Analytics Clients', 'GET', '/api/v1/analytics/clients'],
      
      // CRUD Entities
      ['Clients List', 'GET', '/api/v1/clients'],
      ['Products List', 'GET', '/api/v1/products'],
      ['Suppliers List', 'GET', '/api/v1/suppliers'],
      ['Orders List', 'GET', '/api/v1/orders'],
      ['Invoices List', 'GET', '/api/v1/invoices'],
      
      // Stats
      ['Order Stats', 'GET', '/api/v1/orders/stats/overview'],
      ['Invoice Stats', 'GET', '/api/v1/invoices/stats/overview'],
      
      // Special routes
      ['Invoice from Order', 'POST', '/api/v1/invoices/from-order']
    ]
    
    console.log('\n📊 Test des routes...')
    
    const results = {
      working: [],
      missing: [],
      errors: []
    }
    
    for (const [name, method, path] of routesToTest) {
      try {
        const requestOptions = { method, headers }
        
        // Pour les routes POST spéciales, ajouter un body minimal
        if (method === 'POST' && path.includes('from-order')) {
          requestOptions.body = JSON.stringify({ orderId: 'test' })
        } else if (method === 'POST' && path.includes('refresh')) {
          requestOptions.body = JSON.stringify({ refreshToken: 'test' })
        }
        
        const response = await makeRequest(`${baseUrl}${path}`, requestOptions)
        
        if (response.status === 200 || response.status === 201) {
          results.working.push({ name, path, status: response.status })
          console.log(`✅ ${name}: ${response.status}`)
        } else if (response.status === 404) {
          results.missing.push({ name, path, status: response.status })
          console.log(`❌ ${name}: 404 - ROUTE MANQUANTE`)
        } else if (response.status === 400 && method === 'POST') {
          // 400 pour POST peut indiquer que la route existe mais les données sont invalides
          results.working.push({ name, path, status: response.status })
          console.log(`🟡 ${name}: ${response.status} - Route existe (données invalides)`)
        } else {
          results.errors.push({ name, path, status: response.status })
          console.log(`⚠️ ${name}: ${response.status}`)
        }
        
      } catch (error) {
        results.errors.push({ name, path, error: error.message })
        console.log(`❌ ${name}: Erreur - ${error.message}`)
      }
    }
    
    // 3. Résumé
    console.log('\n📊 RÉSUMÉ')
    console.log('=' * 20)
    console.log(`Routes fonctionnelles: ${results.working.length}`)
    console.log(`Routes manquantes: ${results.missing.length}`)
    console.log(`Erreurs: ${results.errors.length}`)
    
    if (results.missing.length > 0) {
      console.log('\n❌ ROUTES MANQUANTES À IMPLÉMENTER:')
      results.missing.forEach(route => {
        console.log(`   - ${route.name}: ${route.path}`)
      })
    }
    
    if (results.errors.length > 0) {
      console.log('\n⚠️ ROUTES AVEC ERREURS:')
      results.errors.forEach(route => {
        console.log(`   - ${route.name}: ${route.path} (${route.status || route.error})`)
      })
    }
    
    console.log('\n✅ ROUTES FONCTIONNELLES:')
    results.working.forEach(route => {
      console.log(`   - ${route.name}: ${route.path} (${route.status})`)
    })
    
    return results
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message)
    throw error
  }
}

// Exécuter le test
if (require.main === module) {
  testMissingRoutes()
    .then((results) => {
      const success = results.missing.length === 0
      console.log(`\n${success ? '🎉' : '⚠️'} Test terminé`)
      process.exit(success ? 0 : 1)
    })
    .catch((error) => {
      console.error('\n❌ Test échoué:', error.message)
      process.exit(1)
    })
}
