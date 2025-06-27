/**
 * Script de vérification complète des connexions API
 * Teste tous les points de terminaison et flux de données
 * Frontend Next.js (port 3000) ↔ Backend Fastify (port 3001) ↔ PostgreSQL
 */

const axios = require('axios')
const fs = require('fs')
const path = require('path')

// Configuration
const BACKEND_URL = 'http://localhost:3001'
const FRONTEND_URL = 'http://localhost:3000'
const TEST_TIMEOUT = 10000 // 10 secondes

// Couleurs pour les logs
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// Résultats des tests
const testResults = {
  backend: {
    health: false,
    cors: false,
    auth: false,
    routes: {}
  },
  frontend: {
    accessible: false,
    apiCalls: {}
  },
  database: {
    connection: false,
    data: false
  },
  errors: []
}

// Configuration Axios avec timeout
const api = axios.create({
  timeout: TEST_TIMEOUT,
  validateStatus: () => true // Accepter tous les codes de statut
})

/**
 * Test de santé du backend
 */
async function testBackendHealth() {
  log('\n🔍 Test de santé du backend...', 'blue')
  
  try {
    const response = await api.get(`${BACKEND_URL}/health`)
    
    if (response.status === 200 && response.data.status === 'ok') {
      log('✅ Backend accessible et fonctionnel', 'green')
      testResults.backend.health = true
      return true
    } else {
      log(`❌ Backend non fonctionnel (Status: ${response.status})`, 'red')
      testResults.errors.push(`Backend health check failed: ${response.status}`)
      return false
    }
  } catch (error) {
    log(`❌ Erreur de connexion au backend: ${error.message}`, 'red')
    testResults.errors.push(`Backend connection error: ${error.message}`)
    return false
  }
}

/**
 * Test de la configuration CORS
 */
async function testCorsConfiguration() {
  log('\n🔍 Test de la configuration CORS...', 'blue')
  
  try {
    // Test OPTIONS preflight
    const optionsResponse = await api.options(`${BACKEND_URL}/api/v1/clients`, {
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type,Authorization'
      }
    })
    
    const corsHeaders = {
      'access-control-allow-origin': optionsResponse.headers['access-control-allow-origin'],
      'access-control-allow-methods': optionsResponse.headers['access-control-allow-methods'],
      'access-control-allow-headers': optionsResponse.headers['access-control-allow-headers'],
      'access-control-allow-credentials': optionsResponse.headers['access-control-allow-credentials']
    }
    
    log('📋 Headers CORS reçus:', 'cyan')
    Object.entries(corsHeaders).forEach(([key, value]) => {
      log(`   ${key}: ${value || 'non défini'}`, 'cyan')
    })
    
    // Vérifications CORS
    const corsChecks = {
      origin: corsHeaders['access-control-allow-origin'] === FRONTEND_URL || 
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
      testResults.backend.cors = true
      return true
    } else {
      log('❌ Configuration CORS invalide:', 'red')
      Object.entries(corsChecks).forEach(([key, valid]) => {
        log(`   ${key}: ${valid ? '✅' : '❌'}`, valid ? 'green' : 'red')
      })
      testResults.errors.push('CORS configuration invalid')
      return false
    }
  } catch (error) {
    log(`❌ Erreur lors du test CORS: ${error.message}`, 'red')
    testResults.errors.push(`CORS test error: ${error.message}`)
    return false
  }
}

/**
 * Test d'authentification
 */
async function testAuthentication() {
  log('\n🔍 Test d\'authentification...', 'blue')
  
  try {
    // Test de login avec des identifiants de test
    const loginResponse = await api.post(`${BACKEND_URL}/api/v1/auth/login`, {
      email: 'admin@gctpe.dz',
      password: 'admin123'
    })
    
    if (loginResponse.status === 200 && loginResponse.data.success) {
      log('✅ Authentification réussie', 'green')
      testResults.backend.auth = true
      
      // Récupérer le token pour les tests suivants
      const token = loginResponse.data.data?.accessToken || loginResponse.data.accessToken
      if (token) {
        log('✅ Token JWT reçu', 'green')
        return token
      } else {
        log('⚠️ Token JWT manquant dans la réponse', 'yellow')
        testResults.errors.push('JWT token missing in auth response')
        return null
      }
    } else {
      log(`❌ Échec de l'authentification (Status: ${loginResponse.status})`, 'red')
      log(`   Message: ${loginResponse.data?.message || 'Aucun message'}`, 'red')
      testResults.errors.push(`Authentication failed: ${loginResponse.status}`)
      return null
    }
  } catch (error) {
    log(`❌ Erreur lors de l'authentification: ${error.message}`, 'red')
    testResults.errors.push(`Authentication error: ${error.message}`)
    return null
  }
}

/**
 * Test des routes API principales
 */
async function testApiRoutes(authToken) {
  log('\n🔍 Test des routes API principales...', 'blue')
  
  const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
  
  const routes = [
    { name: 'Dashboard Stats', url: '/api/v1/dashboard/stats', method: 'GET' },
    { name: 'Clients List', url: '/api/v1/clients', method: 'GET' },
    { name: 'Products List', url: '/api/v1/products', method: 'GET' },
    { name: 'Suppliers List', url: '/api/v1/suppliers', method: 'GET' },
    { name: 'Orders List', url: '/api/v1/orders', method: 'GET' },
    { name: 'Invoices List', url: '/api/v1/invoices', method: 'GET' },
    { name: 'Analytics KPI', url: '/api/v1/analytics/kpi', method: 'GET' },
    { name: 'Analytics Sales', url: '/api/v1/analytics/sales', method: 'GET' }
  ]
  
  for (const route of routes) {
    try {
      log(`   Testing ${route.name}...`, 'cyan')
      
      const response = await api({
        method: route.method,
        url: `${BACKEND_URL}${route.url}`,
        headers
      })
      
      if (response.status === 200) {
        // Vérifier le format de la réponse
        const hasValidFormat = response.data && 
                              typeof response.data.success === 'boolean' &&
                              response.data.data !== undefined
        
        if (hasValidFormat) {
          log(`   ✅ ${route.name} - Format valide`, 'green')
          testResults.backend.routes[route.name] = { status: 'success', format: 'valid' }
        } else {
          log(`   ⚠️ ${route.name} - Format invalide`, 'yellow')
          testResults.backend.routes[route.name] = { status: 'success', format: 'invalid' }
        }
      } else if (response.status === 401) {
        log(`   ⚠️ ${route.name} - Non autorisé (token requis)`, 'yellow')
        testResults.backend.routes[route.name] = { status: 'unauthorized' }
      } else {
        log(`   ❌ ${route.name} - Erreur ${response.status}`, 'red')
        testResults.backend.routes[route.name] = { status: 'error', code: response.status }
        testResults.errors.push(`${route.name} failed: ${response.status}`)
      }
    } catch (error) {
      log(`   ❌ ${route.name} - Erreur: ${error.message}`, 'red')
      testResults.backend.routes[route.name] = { status: 'error', message: error.message }
      testResults.errors.push(`${route.name} error: ${error.message}`)
    }
  }
}

/**
 * Test de l'accessibilité du frontend
 */
async function testFrontendAccessibility() {
  log('\n🔍 Test d\'accessibilité du frontend...', 'blue')

  try {
    const response = await api.get(FRONTEND_URL)

    if (response.status === 200) {
      log('✅ Frontend accessible', 'green')
      testResults.frontend.accessible = true
      return true
    } else {
      log(`❌ Frontend non accessible (Status: ${response.status})`, 'red')
      testResults.errors.push(`Frontend not accessible: ${response.status}`)
      return false
    }
  } catch (error) {
    log(`❌ Erreur de connexion au frontend: ${error.message}`, 'red')
    testResults.errors.push(`Frontend connection error: ${error.message}`)
    return false
  }
}

/**
 * Test de la base de données via l'API
 */
async function testDatabaseConnection(authToken) {
  log('\n🔍 Test de connexion à la base de données...', 'blue')

  const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {}

  try {
    // Test avec une requête simple qui nécessite la DB
    const response = await api.get(`${BACKEND_URL}/api/v1/clients?limit=1`, { headers })

    if (response.status === 200 && response.data.success) {
      log('✅ Connexion à la base de données fonctionnelle', 'green')
      testResults.database.connection = true

      // Vérifier s'il y a des données
      const hasData = response.data.data &&
                     response.data.data.data &&
                     Array.isArray(response.data.data.data)

      if (hasData) {
        log(`✅ Données trouvées (${response.data.data.data.length} clients)`, 'green')
        testResults.database.data = true
      } else {
        log('⚠️ Aucune donnée trouvée dans la base', 'yellow')
      }

      return true
    } else {
      log(`❌ Erreur de base de données (Status: ${response.status})`, 'red')
      testResults.errors.push(`Database error: ${response.status}`)
      return false
    }
  } catch (error) {
    log(`❌ Erreur de test de base de données: ${error.message}`, 'red')
    testResults.errors.push(`Database test error: ${error.message}`)
    return false
  }
}

/**
 * Test CRUD complet sur les fournisseurs
 */
async function testSuppliersCrud(authToken) {
  log('\n🔍 Test CRUD complet sur les fournisseurs...', 'blue')

  if (!authToken) {
    log('⚠️ Token d\'authentification requis pour les tests CRUD', 'yellow')
    return false
  }

  const headers = { 'Authorization': `Bearer ${authToken}` }
  let createdSupplierId = null

  try {
    // 1. CREATE - Créer un fournisseur de test
    log('   1. Test CREATE...', 'cyan')
    const createData = {
      type: 'COMPANY',
      name: 'Test Supplier API',
      contactName: 'Test Contact',
      email: 'test@supplier.com',
      phone: '+213555123456',
      city: 'Alger',
      country: 'Algérie',
      isActive: true,
      isPreferred: false
    }

    const createResponse = await api.post(`${BACKEND_URL}/api/v1/suppliers`, createData, { headers })

    if (createResponse.status === 201 && createResponse.data.success) {
      createdSupplierId = createResponse.data.data.id
      log('   ✅ CREATE réussi', 'green')
      testResults.frontend.apiCalls.supplierCreate = 'success'
    } else {
      log(`   ❌ CREATE échoué (${createResponse.status})`, 'red')
      testResults.frontend.apiCalls.supplierCreate = 'failed'
      testResults.errors.push(`Supplier CREATE failed: ${createResponse.status}`)
      return false
    }

    // 2. READ - Lire le fournisseur créé
    log('   2. Test READ...', 'cyan')
    const readResponse = await api.get(`${BACKEND_URL}/api/v1/suppliers/${createdSupplierId}`, { headers })

    if (readResponse.status === 200 && readResponse.data.success) {
      log('   ✅ READ réussi', 'green')
      testResults.frontend.apiCalls.supplierRead = 'success'
    } else {
      log(`   ❌ READ échoué (${readResponse.status})`, 'red')
      testResults.frontend.apiCalls.supplierRead = 'failed'
      testResults.errors.push(`Supplier READ failed: ${readResponse.status}`)
    }

    // 3. UPDATE - Mettre à jour le fournisseur
    log('   3. Test UPDATE...', 'cyan')
    const updateData = {
      name: 'Test Supplier API Updated',
      isPreferred: true
    }

    const updateResponse = await api.put(`${BACKEND_URL}/api/v1/suppliers/${createdSupplierId}`, updateData, { headers })

    if (updateResponse.status === 200 && updateResponse.data.success) {
      log('   ✅ UPDATE réussi', 'green')
      testResults.frontend.apiCalls.supplierUpdate = 'success'
    } else {
      log(`   ❌ UPDATE échoué (${updateResponse.status})`, 'red')
      testResults.frontend.apiCalls.supplierUpdate = 'failed'
      testResults.errors.push(`Supplier UPDATE failed: ${updateResponse.status}`)
    }

    // 4. DELETE - Supprimer le fournisseur
    log('   4. Test DELETE...', 'cyan')
    const deleteResponse = await api.delete(`${BACKEND_URL}/api/v1/suppliers/${createdSupplierId}`, { headers })

    if (deleteResponse.status === 200 && deleteResponse.data.success) {
      log('   ✅ DELETE réussi', 'green')
      testResults.frontend.apiCalls.supplierDelete = 'success'
    } else {
      log(`   ❌ DELETE échoué (${deleteResponse.status})`, 'red')
      testResults.frontend.apiCalls.supplierDelete = 'failed'
      testResults.errors.push(`Supplier DELETE failed: ${deleteResponse.status}`)
    }

    return true

  } catch (error) {
    log(`   ❌ Erreur lors du test CRUD: ${error.message}`, 'red')
    testResults.errors.push(`Supplier CRUD error: ${error.message}`)

    // Nettoyer en cas d'erreur
    if (createdSupplierId) {
      try {
        await api.delete(`${BACKEND_URL}/api/v1/suppliers/${createdSupplierId}`, { headers })
        log('   🧹 Nettoyage effectué', 'yellow')
      } catch (cleanupError) {
        log('   ⚠️ Erreur de nettoyage', 'yellow')
      }
    }

    return false
  }
}

/**
 * Génération du rapport de test
 */
function generateReport() {
  log('\n📊 RAPPORT DE VÉRIFICATION DES CONNEXIONS API', 'magenta')
  log('=' * 60, 'magenta')

  // Résumé général
  const totalTests = Object.keys(testResults.backend.routes).length + 6 // +6 pour les tests de base
  const successfulTests = Object.values(testResults.backend.routes).filter(r => r.status === 'success').length +
                         (testResults.backend.health ? 1 : 0) +
                         (testResults.backend.cors ? 1 : 0) +
                         (testResults.backend.auth ? 1 : 0) +
                         (testResults.frontend.accessible ? 1 : 0) +
                         (testResults.database.connection ? 1 : 0) +
                         (testResults.database.data ? 1 : 0)

  const successRate = Math.round((successfulTests / totalTests) * 100)

  log(`\n🎯 RÉSUMÉ GÉNÉRAL`, 'blue')
  log(`   Tests réussis: ${successfulTests}/${totalTests} (${successRate}%)`, successRate >= 80 ? 'green' : 'red')
  log(`   Erreurs détectées: ${testResults.errors.length}`, testResults.errors.length === 0 ? 'green' : 'red')

  // Backend
  log(`\n🔧 BACKEND (Port 3001)`, 'blue')
  log(`   ✅ Santé: ${testResults.backend.health ? 'OK' : 'ÉCHEC'}`, testResults.backend.health ? 'green' : 'red')
  log(`   ✅ CORS: ${testResults.backend.cors ? 'OK' : 'ÉCHEC'}`, testResults.backend.cors ? 'green' : 'red')
  log(`   ✅ Authentification: ${testResults.backend.auth ? 'OK' : 'ÉCHEC'}`, testResults.backend.auth ? 'green' : 'red')

  log(`\n   📋 Routes API:`, 'cyan')
  Object.entries(testResults.backend.routes).forEach(([name, result]) => {
    const status = result.status === 'success' ? '✅' : result.status === 'unauthorized' ? '⚠️' : '❌'
    const color = result.status === 'success' ? 'green' : result.status === 'unauthorized' ? 'yellow' : 'red'
    log(`      ${status} ${name}: ${result.status}`, color)
  })

  // Frontend
  log(`\n🌐 FRONTEND (Port 3000)`, 'blue')
  log(`   ✅ Accessibilité: ${testResults.frontend.accessible ? 'OK' : 'ÉCHEC'}`, testResults.frontend.accessible ? 'green' : 'red')

  if (Object.keys(testResults.frontend.apiCalls).length > 0) {
    log(`\n   📋 Appels API:`, 'cyan')
    Object.entries(testResults.frontend.apiCalls).forEach(([name, status]) => {
      const icon = status === 'success' ? '✅' : '❌'
      const color = status === 'success' ? 'green' : 'red'
      log(`      ${icon} ${name}: ${status}`, color)
    })
  }

  // Base de données
  log(`\n🗄️ BASE DE DONNÉES`, 'blue')
  log(`   ✅ Connexion: ${testResults.database.connection ? 'OK' : 'ÉCHEC'}`, testResults.database.connection ? 'green' : 'red')
  log(`   ✅ Données: ${testResults.database.data ? 'PRÉSENTES' : 'ABSENTES'}`, testResults.database.data ? 'green' : 'yellow')

  // Erreurs
  if (testResults.errors.length > 0) {
    log(`\n❌ ERREURS DÉTECTÉES`, 'red')
    testResults.errors.forEach((error, index) => {
      log(`   ${index + 1}. ${error}`, 'red')
    })
  }

  // Recommandations
  log(`\n💡 RECOMMANDATIONS`, 'yellow')

  if (!testResults.backend.health) {
    log('   • Vérifier que le backend est démarré sur le port 3001', 'yellow')
  }

  if (!testResults.backend.cors) {
    log('   • Vérifier la configuration CORS dans apps/backend/src/config/cors.ts', 'yellow')
  }

  if (!testResults.backend.auth) {
    log('   • Vérifier les identifiants de test (admin@gctpe.dz / admin123)', 'yellow')
  }

  if (!testResults.frontend.accessible) {
    log('   • Vérifier que le frontend est démarré sur le port 3000', 'yellow')
  }

  if (!testResults.database.connection) {
    log('   • Vérifier la connexion PostgreSQL et la configuration Prisma', 'yellow')
  }

  if (!testResults.database.data) {
    log('   • Exécuter les scripts de seed pour initialiser les données', 'yellow')
  }

  // Sauvegarde du rapport
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests,
      successfulTests,
      successRate,
      errorsCount: testResults.errors.length
    },
    results: testResults
  }

  const reportPath = path.join(__dirname, 'api-connections-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2))
  log(`\n📄 Rapport sauvegardé: ${reportPath}`, 'cyan')

  return successRate >= 80
}

/**
 * Fonction principale
 */
async function main() {
  log('🚀 DÉMARRAGE DE LA VÉRIFICATION DES CONNEXIONS API', 'magenta')
  log('=' * 60, 'magenta')

  let authToken = null

  // Tests séquentiels
  const backendHealthy = await testBackendHealth()

  if (backendHealthy) {
    await testCorsConfiguration()
    authToken = await testAuthentication()
    await testApiRoutes(authToken)
    await testDatabaseConnection(authToken)
    await testSuppliersCrud(authToken)
  }

  await testFrontendAccessibility()

  // Génération du rapport final
  const success = generateReport()

  log(`\n${success ? '🎉' : '⚠️'} VÉRIFICATION TERMINÉE`, success ? 'green' : 'yellow')

  // Code de sortie
  process.exit(success ? 0 : 1)
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  log(`❌ Erreur non gérée: ${reason}`, 'red')
  testResults.errors.push(`Unhandled rejection: ${reason}`)
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  log(`❌ Exception non capturée: ${error.message}`, 'red')
  testResults.errors.push(`Uncaught exception: ${error.message}`)
  process.exit(1)
})

// Démarrage
if (require.main === module) {
  main()
}

module.exports = {
  testBackendHealth,
  testCorsConfiguration,
  testAuthentication,
  testApiRoutes,
  testFrontendAccessibility,
  testDatabaseConnection,
  testSuppliersCrud,
  generateReport
}
