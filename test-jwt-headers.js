#!/usr/bin/env node

/**
 * Test de vérification des en-têtes JWT du frontend
 * Vérifie si le frontend envoie correctement le token JWT dans l'en-tête Authorization
 */

const axios = require('axios')
const { spawn } = require('child_process')

const BACKEND_URL = 'http://localhost:3001'
const FRONTEND_URL = 'http://localhost:3000'

// Couleurs pour les logs
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// Configuration axios avec intercepteur pour capturer les en-têtes
const api = axios.create({
  baseURL: BACKEND_URL,
  timeout: 10000
})

// Intercepteur pour capturer les requêtes sortantes
api.interceptors.request.use((config) => {
  log(`📤 Requête sortante: ${config.method?.toUpperCase()} ${config.url}`, 'blue')
  if (config.headers.Authorization) {
    log(`🔑 En-tête Authorization trouvé: ${config.headers.Authorization.substring(0, 30)}...`, 'green')
  } else {
    log(`⚠️  Aucun en-tête Authorization trouvé`, 'yellow')
  }
  return config
})

// Intercepteur pour capturer les réponses
api.interceptors.response.use(
  (response) => {
    log(`📥 Réponse reçue: ${response.status} ${response.statusText}`, 'green')
    return response
  },
  (error) => {
    if (error.response) {
      log(`❌ Erreur HTTP: ${error.response.status} ${error.response.statusText}`, 'red')
      if (error.response.status === 401) {
        log(`🔒 Erreur 401: Token manquant ou invalide`, 'red')
      }
    } else {
      log(`❌ Erreur réseau: ${error.message}`, 'red')
    }
    return Promise.reject(error)
  }
)

async function testBackendAuth() {
  log('\n🔧 TEST 1: AUTHENTIFICATION BACKEND DIRECTE', 'cyan')
  log('=' .repeat(50), 'cyan')
  
  try {
    // Test de connexion
    log('\n1. Test de connexion...', 'yellow')
    const loginResponse = await api.post('/api/v1/auth/login', {
      email: 'admin@test.com',
      password: 'password123'
    })
    
    if (loginResponse.data.success) {
      const token = loginResponse.data.data.tokens.accessToken
      log(`✅ Connexion réussie`, 'green')
      log(`🔑 Token reçu: ${token.substring(0, 30)}...`, 'green')
      
      // Test d'une requête protégée avec token
      log('\n2. Test requête protégée avec token...', 'yellow')
      const protectedResponse = await api.get('/api/v1/clients', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      
      if (protectedResponse.data.success) {
        log(`✅ Requête protégée réussie avec token`, 'green')
        log(`📊 Données reçues: ${protectedResponse.data.data.data.length} clients`, 'green')
      }
      
      // Test d'une requête protégée sans token
      log('\n3. Test requête protégée sans token...', 'yellow')
      try {
        await api.get('/api/v1/clients')
        log(`❌ Requête sans token acceptée (problème de sécurité!)`, 'red')
      } catch (error) {
        if (error.response?.status === 401) {
          log(`✅ Requête sans token correctement rejetée (401)`, 'green')
        } else {
          log(`⚠️  Erreur inattendue: ${error.response?.status}`, 'yellow')
        }
      }
      
      return token
    } else {
      log(`❌ Échec de la connexion`, 'red')
      return null
    }
  } catch (error) {
    log(`❌ Erreur lors du test backend: ${error.message}`, 'red')
    return null
  }
}

async function testFrontendAPI() {
  log('\n🌐 TEST 2: SIMULATION DU COMPORTEMENT FRONTEND', 'cyan')
  log('=' .repeat(50), 'cyan')
  
  try {
    // Simuler le comportement du frontend
    log('\n1. Simulation de la connexion frontend...', 'yellow')
    
    // Créer une instance axios comme le frontend
    const frontendAPI = axios.create({
      baseURL: BACKEND_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    })
    
    // Ajouter les intercepteurs comme dans le frontend
    frontendAPI.interceptors.request.use(
      (config) => {
        log(`📤 Frontend Request: ${config.method?.toUpperCase()} ${config.url}`, 'blue')
        if (config.headers.Authorization) {
          log(`🔑 Authorization Header: ${config.headers.Authorization.substring(0, 30)}...`, 'green')
        } else {
          log(`⚠️  No Authorization Header`, 'yellow')
        }
        return config
      }
    )
    
    // Login comme le frontend
    const loginResponse = await frontendAPI.post('/api/v1/auth/login', {
      email: 'admin@test.com',
      password: 'password123'
    })
    
    if (loginResponse.data.success) {
      const token = loginResponse.data.data.tokens.accessToken
      log(`✅ Frontend login successful`, 'green')
      
      // Configurer le token comme le frontend
      frontendAPI.defaults.headers.common['Authorization'] = `Bearer ${token}`
      log(`🔧 Token configuré dans les en-têtes par défaut`, 'green')
      
      // Test de requêtes avec le token configuré
      log('\n2. Test requêtes avec token configuré...', 'yellow')
      
      const endpoints = [
        '/api/v1/clients',
        '/api/v1/products',
        '/api/v1/suppliers'
      ]
      
      for (const endpoint of endpoints) {
        try {
          const response = await frontendAPI.get(endpoint)
          if (response.data.success) {
            log(`✅ ${endpoint}: OK (${response.data.data.data?.length || 0} items)`, 'green')
          } else {
            log(`⚠️  ${endpoint}: Réponse non-success`, 'yellow')
          }
        } catch (error) {
          if (error.response?.status === 401) {
            log(`❌ ${endpoint}: 401 Unauthorized (token non envoyé?)`, 'red')
          } else {
            log(`⚠️  ${endpoint}: ${error.response?.status || error.message}`, 'yellow')
          }
        }
      }
      
      return true
    } else {
      log(`❌ Frontend login failed`, 'red')
      return false
    }
  } catch (error) {
    log(`❌ Erreur lors du test frontend: ${error.message}`, 'red')
    return false
  }
}

async function testTokenValidation() {
  log('\n🔍 TEST 3: VALIDATION DES TOKENS JWT', 'cyan')
  log('=' .repeat(50), 'cyan')
  
  try {
    // Test avec token valide
    log('\n1. Test avec token valide...', 'yellow')
    const loginResponse = await api.post('/api/v1/auth/login', {
      email: 'admin@test.com',
      password: 'password123'
    })
    
    const validToken = loginResponse.data.data.tokens.accessToken
    
    const validResponse = await api.get('/api/v1/clients', {
      headers: { Authorization: `Bearer ${validToken}` }
    })
    log(`✅ Token valide accepté`, 'green')
    
    // Test avec token invalide
    log('\n2. Test avec token invalide...', 'yellow')
    try {
      await api.get('/api/v1/clients', {
        headers: { Authorization: `Bearer invalid-token-123` }
      })
      log(`❌ Token invalide accepté (problème de sécurité!)`, 'red')
    } catch (error) {
      if (error.response?.status === 401) {
        log(`✅ Token invalide correctement rejeté`, 'green')
      }
    }
    
    // Test avec format d'en-tête incorrect
    log('\n3. Test avec format d\'en-tête incorrect...', 'yellow')
    try {
      await api.get('/api/v1/clients', {
        headers: { Authorization: validToken } // Sans "Bearer "
      })
      log(`❌ Format incorrect accepté (problème de sécurité!)`, 'red')
    } catch (error) {
      if (error.response?.status === 401) {
        log(`✅ Format incorrect correctement rejeté`, 'green')
      }
    }
    
  } catch (error) {
    log(`❌ Erreur lors de la validation: ${error.message}`, 'red')
  }
}

async function main() {
  log('🧪 TEST DE VERIFICATION DES EN-TETES JWT', 'magenta')
  log('=' .repeat(60), 'magenta')
  log('Ce test vérifie si le frontend envoie correctement les tokens JWT', 'magenta')
  
  // Vérifier que les serveurs sont accessibles
  try {
    await axios.post(`${BACKEND_URL}/api/v1/auth/login`, {
      email: 'admin@test.com',
      password: 'password123'
    }, { timeout: 5000 })
    log(`✅ Backend accessible sur ${BACKEND_URL}`, 'green')
  } catch (error) {
    log(`❌ Backend non accessible sur ${BACKEND_URL}`, 'red')
    log(`   Assurez-vous que le backend est démarré`, 'red')
    process.exit(1)
  }
  
  try {
    await axios.get(FRONTEND_URL, { timeout: 5000 })
    log(`✅ Frontend accessible sur ${FRONTEND_URL}`, 'green')
  } catch (error) {
    log(`⚠️  Frontend non accessible sur ${FRONTEND_URL}`, 'yellow')
    log(`   Le test continuera sans le frontend`, 'yellow')
  }
  
  // Exécuter les tests
  const token = await testBackendAuth()
  if (token) {
    await testFrontendAPI()
    await testTokenValidation()
  }
  
  log('\n📋 RESUME DES TESTS', 'magenta')
  log('=' .repeat(30), 'magenta')
  log('✅ Tests terminés - Vérifiez les résultats ci-dessus', 'green')
  log('🔍 Points à vérifier:', 'yellow')
  log('   - Les en-têtes Authorization sont-ils présents?', 'yellow')
  log('   - Les tokens sont-ils au bon format "Bearer <token>"?', 'yellow')
  log('   - Les requêtes sans token sont-elles rejetées?', 'yellow')
}

// Exécuter le test
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { testBackendAuth, testFrontendAPI, testTokenValidation }
