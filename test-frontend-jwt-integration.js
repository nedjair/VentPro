#!/usr/bin/env node

/**
 * Test d'intégration pour vérifier l'envoi des tokens JWT par le frontend
 * Ce test simule exactement le comportement du frontend React/Next.js
 */

const axios = require('axios')
const puppeteer = require('puppeteer')

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

async function testFrontendCodeBehavior() {
  log('\n🔍 TEST 1: ANALYSE DU CODE FRONTEND', 'cyan')
  log('=' .repeat(50), 'cyan')
  
  // Simuler exactement le comportement du code frontend
  log('\n1. Simulation de la classe ApiClient du frontend...', 'yellow')
  
  class FrontendApiClient {
    constructor() {
      this.authToken = null
      this.client = axios.create({
        baseURL: BACKEND_URL,
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      })
      
      // Intercepteur de requête comme dans le frontend
      this.client.interceptors.request.use(
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
      
      // Intercepteur de réponse comme dans le frontend
      this.client.interceptors.response.use(
        (response) => {
          log(`✅ Response: ${response.status} ${response.statusText}`, 'green')
          return response
        },
        (error) => {
          if (error.response?.status === 401) {
            log(`🔒 401 Unauthorized - Token invalide ou manquant`, 'red')
          }
          return Promise.reject(error)
        }
      )
    }
    
    // Méthode setAuthToken comme dans le frontend
    setAuthToken(token) {
      this.authToken = token
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`
      log(`🔧 Token configuré: ${token.substring(0, 30)}...`, 'green')
    }
    
    // Méthode clearAuthToken comme dans le frontend
    clearAuthToken() {
      this.authToken = null
      delete this.client.defaults.headers.common['Authorization']
      log(`🗑️  Token supprimé`, 'yellow')
    }
    
    // Méthode login comme dans le frontend
    async login(credentials) {
      const response = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })
      
      const data = await response.json()
      return data
    }
    
    // Méthodes API comme dans le frontend
    async getClients() {
      const response = await this.client.get('/api/v1/clients')
      return response.data
    }
    
    async getProducts() {
      const response = await this.client.get('/api/v1/products')
      return response.data
    }
  }
  
  // Test du comportement
  const api = new FrontendApiClient()
  
  log('\n2. Test de connexion...', 'yellow')
  const loginResult = await api.login({
    email: 'admin@test.com',
    password: 'password123'
  })
  
  if (loginResult.success) {
    log(`✅ Login réussi`, 'green')
    const token = loginResult.data.tokens.accessToken
    
    log('\n3. Configuration du token...', 'yellow')
    api.setAuthToken(token)
    
    log('\n4. Test des requêtes protégées...', 'yellow')
    try {
      const clients = await api.getClients()
      log(`✅ Clients récupérés: ${clients.data.data.length} items`, 'green')
    } catch (error) {
      log(`❌ Erreur clients: ${error.message}`, 'red')
    }
    
    try {
      const products = await api.getProducts()
      log(`✅ Produits récupérés: ${products.data.data.length} items`, 'green')
    } catch (error) {
      log(`❌ Erreur produits: ${error.message}`, 'red')
    }
    
    log('\n5. Test sans token...', 'yellow')
    api.clearAuthToken()
    try {
      await api.getClients()
      log(`❌ Requête sans token acceptée (problème!)`, 'red')
    } catch (error) {
      if (error.response?.status === 401) {
        log(`✅ Requête sans token correctement rejetée`, 'green')
      }
    }
    
    return true
  } else {
    log(`❌ Login échoué`, 'red')
    return false
  }
}

async function testLocalStorageBehavior() {
  log('\n💾 TEST 2: SIMULATION DU LOCALSTORAGE', 'cyan')
  log('=' .repeat(50), 'cyan')
  
  // Simuler le comportement localStorage du frontend
  const mockLocalStorage = {}
  
  log('\n1. Simulation de la sauvegarde des tokens...', 'yellow')
  
  // Login
  const loginResponse = await axios.post(`${BACKEND_URL}/api/v1/auth/login`, {
    email: 'admin@test.com',
    password: 'password123'
  })
  
  if (loginResponse.data.success) {
    const tokens = loginResponse.data.data.tokens
    const user = loginResponse.data.data.user
    
    // Simuler le stockage comme dans le frontend
    mockLocalStorage['auth-tokens'] = JSON.stringify(tokens)
    mockLocalStorage['auth-user'] = JSON.stringify(user)
    
    log(`✅ Tokens sauvegardés dans localStorage simulé`, 'green')
    log(`🔑 Access Token: ${tokens.accessToken.substring(0, 30)}...`, 'green')
    
    log('\n2. Simulation de la restauration des tokens...', 'yellow')
    
    // Simuler la restauration comme dans checkAuth()
    const storedTokens = JSON.parse(mockLocalStorage['auth-tokens'])
    const storedUser = JSON.parse(mockLocalStorage['auth-user'])
    
    // Créer un client API et configurer le token
    const api = axios.create({
      baseURL: BACKEND_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    // Configurer le token comme dans le frontend
    api.defaults.headers.common['Authorization'] = `Bearer ${storedTokens.accessToken}`
    
    log(`✅ Token restauré et configuré`, 'green')
    
    log('\n3. Test avec token restauré...', 'yellow')
    try {
      const response = await api.get('/api/v1/clients')
      log(`✅ Requête avec token restauré réussie: ${response.data.data.data.length} clients`, 'green')
    } catch (error) {
      if (error.response?.status === 401) {
        log(`❌ Token restauré invalide ou expiré`, 'red')
      } else {
        log(`❌ Erreur: ${error.message}`, 'red')
      }
    }
    
    return true
  } else {
    log(`❌ Login échoué`, 'red')
    return false
  }
}

async function testBrowserBehavior() {
  log('\n🌐 TEST 3: SIMULATION NAVIGATEUR AVEC PUPPETEER', 'cyan')
  log('=' .repeat(50), 'cyan')
  
  let browser = null
  try {
    log('\n1. Lancement du navigateur...', 'yellow')
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    const page = await browser.newPage()
    
    // Intercepter les requêtes réseau
    const requests = []
    await page.setRequestInterception(true)
    
    page.on('request', (request) => {
      const headers = request.headers()
      requests.push({
        url: request.url(),
        method: request.method(),
        headers: headers,
        hasAuth: !!headers.authorization
      })
      request.continue()
    })
    
    log('\n2. Navigation vers le frontend...', 'yellow')
    try {
      await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0', timeout: 10000 })
      log(`✅ Frontend chargé`, 'green')
      
      // Attendre un peu pour que les requêtes se fassent
      await page.waitForTimeout(2000)
      
      log('\n3. Analyse des requêtes interceptées...', 'yellow')
      const apiRequests = requests.filter(req => req.url.includes(BACKEND_URL))
      
      if (apiRequests.length > 0) {
        log(`📊 ${apiRequests.length} requêtes API détectées:`, 'blue')
        apiRequests.forEach((req, index) => {
          log(`   ${index + 1}. ${req.method} ${req.url}`, 'blue')
          if (req.hasAuth) {
            log(`      ✅ Authorization header présent`, 'green')
          } else {
            log(`      ⚠️  Pas d'Authorization header`, 'yellow')
          }
        })
      } else {
        log(`⚠️  Aucune requête API détectée`, 'yellow')
      }
      
    } catch (error) {
      log(`⚠️  Impossible de charger le frontend: ${error.message}`, 'yellow')
      log(`   Le test continue sans l'analyse du navigateur`, 'yellow')
    }
    
  } catch (error) {
    log(`❌ Erreur Puppeteer: ${error.message}`, 'red')
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

async function main() {
  log('🧪 TEST D\'INTEGRATION JWT FRONTEND', 'magenta')
  log('=' .repeat(60), 'magenta')
  log('Ce test vérifie l\'envoi des tokens JWT par le frontend', 'magenta')
  
  // Vérifier que le backend est accessible
  try {
    await axios.post(`${BACKEND_URL}/api/v1/auth/login`, {
      email: 'admin@test.com',
      password: 'password123'
    }, { timeout: 5000 })
    log(`✅ Backend accessible`, 'green')
  } catch (error) {
    log(`❌ Backend non accessible: ${error.message}`, 'red')
    process.exit(1)
  }
  
  // Exécuter les tests
  await testFrontendCodeBehavior()
  await testLocalStorageBehavior()
  await testBrowserBehavior()
  
  log('\n📋 CONCLUSION', 'magenta')
  log('=' .repeat(30), 'magenta')
  log('✅ Tests d\'intégration terminés', 'green')
  log('🔍 Le frontend devrait:', 'yellow')
  log('   1. Configurer le token après login avec setAuthToken()', 'yellow')
  log('   2. Envoyer "Authorization: Bearer <token>" automatiquement', 'yellow')
  log('   3. Gérer les erreurs 401 en nettoyant les tokens', 'yellow')
  log('   4. Restaurer les tokens depuis localStorage au démarrage', 'yellow')
}

// Exécuter le test
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { testFrontendCodeBehavior, testLocalStorageBehavior }
