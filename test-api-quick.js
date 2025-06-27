/**
 * Test rapide des connexions API
 * Utilise fetch natif pour tester les endpoints
 */

const BACKEND_URL = 'http://localhost:3001'

// Couleurs pour les logs
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// Test de santé du backend
async function testBackendHealth() {
  log('\n🔍 Test de santé du backend...', 'blue')
  
  try {
    const response = await fetch(`${BACKEND_URL}/health`)
    
    if (response.ok) {
      const data = await response.json()
      log('✅ Backend accessible', 'green')
      log(`   Status: ${data.status}`, 'cyan')
      log(`   Uptime: ${Math.round(data.uptime)}s`, 'cyan')
      return true
    } else {
      log(`❌ Backend non fonctionnel (Status: ${response.status})`, 'red')
      return false
    }
  } catch (error) {
    log(`❌ Erreur de connexion au backend: ${error.message}`, 'red')
    return false
  }
}

// Test d'authentification
async function testAuthentication() {
  log('\n🔍 Test d\'authentification...', 'blue')
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@gctpe.dz',
        password: 'admin123'
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        log('✅ Authentification réussie', 'green')
        const token = data.data?.tokens?.accessToken || data.data?.accessToken
        if (token) {
          log('✅ Token JWT reçu', 'green')
          return token
        } else {
          log('⚠️ Token JWT manquant', 'yellow')
          return null
        }
      } else {
        log(`❌ Échec de l'authentification: ${data.message}`, 'red')
        return null
      }
    } else {
      log(`❌ Échec de l'authentification (Status: ${response.status})`, 'red')
      return null
    }
  } catch (error) {
    log(`❌ Erreur lors de l'authentification: ${error.message}`, 'red')
    return null
  }
}

// Test des routes principales
async function testMainRoutes(authToken) {
  log('\n🔍 Test des routes principales...', 'blue')
  
  const headers = {
    'Content-Type': 'application/json'
  }
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }
  
  const routes = [
    { name: 'Dashboard Stats', url: '/api/v1/dashboard/stats' },
    { name: 'Clients List', url: '/api/v1/clients' },
    { name: 'Products List', url: '/api/v1/products' },
    { name: 'Suppliers List', url: '/api/v1/suppliers' },
    { name: 'Orders List', url: '/api/v1/orders' },
    { name: 'Invoices List', url: '/api/v1/invoices' }
  ]
  
  const results = []
  
  for (const route of routes) {
    try {
      log(`   Testing ${route.name}...`, 'cyan')
      
      const response = await fetch(`${BACKEND_URL}${route.url}`, {
        headers
      })
      
      if (response.ok) {
        const data = await response.json()
        const hasValidFormat = data && typeof data.success === 'boolean'
        
        if (hasValidFormat) {
          log(`   ✅ ${route.name} - OK`, 'green')
          results.push({ route: route.name, status: 'success' })
        } else {
          log(`   ⚠️ ${route.name} - Format invalide`, 'yellow')
          results.push({ route: route.name, status: 'invalid_format' })
        }
      } else if (response.status === 401) {
        log(`   ⚠️ ${route.name} - Non autorisé`, 'yellow')
        results.push({ route: route.name, status: 'unauthorized' })
      } else {
        log(`   ❌ ${route.name} - Erreur ${response.status}`, 'red')
        results.push({ route: route.name, status: 'error', code: response.status })
      }
    } catch (error) {
      log(`   ❌ ${route.name} - Erreur: ${error.message}`, 'red')
      results.push({ route: route.name, status: 'error', message: error.message })
    }
  }
  
  return results
}

// Test CORS
async function testCORS() {
  log('\n🔍 Test de la configuration CORS...', 'blue')
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/clients`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type,Authorization'
      }
    })
    
    const corsHeaders = {
      'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
      'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
      'access-control-allow-headers': response.headers.get('access-control-allow-headers'),
      'access-control-allow-credentials': response.headers.get('access-control-allow-credentials')
    }
    
    log('📋 Headers CORS reçus:', 'cyan')
    Object.entries(corsHeaders).forEach(([key, value]) => {
      log(`   ${key}: ${value || 'non défini'}`, 'cyan')
    })
    
    // Vérifications CORS
    const corsChecks = {
      origin: corsHeaders['access-control-allow-origin'] === 'http://localhost:3000' || 
              corsHeaders['access-control-allow-origin'] === '*',
      methods: corsHeaders['access-control-allow-methods']?.includes('GET') &&
               corsHeaders['access-control-allow-methods']?.includes('POST'),
      headers: corsHeaders['access-control-allow-headers']?.includes('Content-Type') &&
               corsHeaders['access-control-allow-headers']?.includes('Authorization'),
      credentials: corsHeaders['access-control-allow-credentials'] === 'true'
    }
    
    const corsValid = Object.values(corsChecks).every(check => check)
    
    if (corsValid) {
      log('✅ Configuration CORS valide', 'green')
      return true
    } else {
      log('❌ Configuration CORS invalide:', 'red')
      Object.entries(corsChecks).forEach(([key, valid]) => {
        log(`   ${key}: ${valid ? '✅' : '❌'}`, valid ? 'green' : 'red')
      })
      return false
    }
  } catch (error) {
    log(`❌ Erreur lors du test CORS: ${error.message}`, 'red')
    return false
  }
}

// Fonction principale
async function main() {
  log('🚀 TEST RAPIDE DES CONNEXIONS API', 'blue')
  log('=' * 50, 'blue')
  
  let authToken = null
  let results = {
    backend: false,
    cors: false,
    auth: false,
    routes: []
  }
  
  // Tests séquentiels
  results.backend = await testBackendHealth()
  
  if (results.backend) {
    results.cors = await testCORS()
    authToken = await testAuthentication()
    results.auth = !!authToken
    results.routes = await testMainRoutes(authToken)
  }
  
  // Résumé
  log('\n📊 RÉSUMÉ DES TESTS', 'blue')
  log('=' * 30, 'blue')
  
  log(`Backend: ${results.backend ? '✅' : '❌'}`, results.backend ? 'green' : 'red')
  log(`CORS: ${results.cors ? '✅' : '❌'}`, results.cors ? 'green' : 'red')
  log(`Authentification: ${results.auth ? '✅' : '❌'}`, results.auth ? 'green' : 'red')
  
  if (results.routes.length > 0) {
    log('\nRoutes API:', 'cyan')
    results.routes.forEach(route => {
      const icon = route.status === 'success' ? '✅' : route.status === 'unauthorized' ? '⚠️' : '❌'
      const color = route.status === 'success' ? 'green' : route.status === 'unauthorized' ? 'yellow' : 'red'
      log(`  ${icon} ${route.route}`, color)
    })
  }
  
  const successCount = (results.backend ? 1 : 0) + 
                      (results.cors ? 1 : 0) + 
                      (results.auth ? 1 : 0) + 
                      results.routes.filter(r => r.status === 'success').length
  
  const totalTests = 3 + results.routes.length
  const successRate = Math.round((successCount / totalTests) * 100)
  
  log(`\nTaux de réussite: ${successCount}/${totalTests} (${successRate}%)`, successRate >= 80 ? 'green' : 'red')
  
  if (successRate >= 80) {
    log('\n🎉 Tests réussis ! Les connexions API fonctionnent correctement.', 'green')
  } else {
    log('\n⚠️ Certains tests ont échoué. Vérifiez les erreurs ci-dessus.', 'yellow')
  }
  
  return successRate >= 80
}

// Démarrage
if (require.main === module) {
  main().then(success => {
    process.exit(success ? 0 : 1)
  }).catch(error => {
    log(`❌ Erreur fatale: ${error.message}`, 'red')
    process.exit(1)
  })
}
