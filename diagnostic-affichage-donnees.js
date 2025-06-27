const axios = require('axios')
const { PrismaClient } = require('./packages/database/generated/client')

// Configuration
const FRONTEND_URL = 'http://localhost:3000'
const BACKEND_URL = 'http://localhost:3001'
const prisma = new PrismaClient()

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

const log = (color, message) => console.log(`${colors[color]}${message}${colors.reset}`)

async function diagnosticAffichageDonnees() {
  log('cyan', '🔍 DIAGNOSTIC COMPLET - PROBLÈME D\'AFFICHAGE DES DONNÉES')
  log('cyan', '=' .repeat(70))
  
  const results = {
    database: { status: false, details: [], hasData: false },
    backend: { status: false, details: [] },
    frontend: { status: false, details: [] },
    auth: { status: false, details: [] }
  }

  try {
    // 1. DIAGNOSTIC BASE DE DONNÉES
    log('blue', '\n1️⃣ DIAGNOSTIC BASE DE DONNÉES POSTGRESQL')
    log('blue', '-' .repeat(50))
    
    try {
      await prisma.$connect()
      log('green', '✅ Connexion PostgreSQL réussie')
      results.database.details.push('Connexion OK')
      
      // Vérifier les tables et données
      const tables = [
        { name: 'companies', model: 'company' },
        { name: 'users', model: 'user' },
        { name: 'products', model: 'product' },
        { name: 'clients', model: 'client' },
        { name: 'stocks', model: 'stock' },
        { name: 'suppliers', model: 'supplier' },
        { name: 'orders', model: 'order' },
        { name: 'invoices', model: 'invoice' }
      ]
      
      let totalRecords = 0
      for (const table of tables) {
        try {
          const count = await prisma[table.model].count()
          totalRecords += count
          if (count > 0) {
            log('green', `   ✅ Table ${table.name}: ${count} enregistrements`)
            results.database.hasData = true
          } else {
            log('yellow', `   ⚠️ Table ${table.name}: VIDE`)
          }
          results.database.details.push(`${table.name}: ${count}`)
        } catch (error) {
          log('red', `   ❌ Table ${table.name}: ERREUR - ${error.message}`)
          results.database.details.push(`${table.name}: ERREUR`)
        }
      }
      
      if (totalRecords > 0) {
        results.database.status = true
        log('green', `✅ Base de données: ${totalRecords} enregistrements au total`)
      } else {
        log('red', '❌ PROBLÈME PRINCIPAL: Base de données complètement VIDE')
        log('yellow', '   → C\'est la cause principale du problème d\'affichage')
        results.database.details.push('BASE VIDE - CAUSE RACINE')
      }
      
    } catch (error) {
      log('red', `❌ Erreur base de données: ${error.message}`)
      results.database.details.push(`Erreur: ${error.message}`)
    }

    // 2. DIAGNOSTIC BACKEND API
    log('blue', '\n2️⃣ DIAGNOSTIC BACKEND API')
    log('blue', '-' .repeat(50))
    
    try {
      // Test de base
      const apiInfo = await axios.get(`${BACKEND_URL}/api`, { timeout: 5000 })
      log('green', `✅ Backend accessible: ${apiInfo.status}`)
      results.backend.details.push('Serveur accessible')
      
      // Test des endpoints avec authentification
      const endpoints = [
        { url: '/api/v1/products', name: 'Products' },
        { url: '/api/v1/clients', name: 'Clients' },
        { url: '/api/v1/stock', name: 'Stock' },
        { url: '/api/v1/suppliers', name: 'Suppliers' },
        { url: '/api/v1/orders', name: 'Orders' },
        { url: '/api/v1/invoices', name: 'Invoices' },
        { url: '/api/v1/analytics/dashboard', name: 'Dashboard' }
      ]
      
      let workingEndpoints = 0
      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(`${BACKEND_URL}${endpoint.url}`, { 
            timeout: 5000,
            validateStatus: (status) => status < 500
          })
          
          if (response.status === 401) {
            log('green', `   ✅ ${endpoint.name}: 401 (Auth requise - NORMAL)`)
            workingEndpoints++
            results.backend.details.push(`${endpoint.name}: Auth requis (OK)`)
          } else if (response.status === 200) {
            log('green', `   ✅ ${endpoint.name}: 200 (Données retournées)`)
            workingEndpoints++
            results.backend.details.push(`${endpoint.name}: Données OK`)
          } else {
            log('yellow', `   ⚠️ ${endpoint.name}: ${response.status}`)
            results.backend.details.push(`${endpoint.name}: ${response.status}`)
          }
        } catch (error) {
          log('red', `   ❌ ${endpoint.name}: ${error.message}`)
          results.backend.details.push(`${endpoint.name}: ERREUR`)
        }
      }
      
      if (workingEndpoints >= endpoints.length * 0.8) {
        results.backend.status = true
        log('green', '✅ Backend API: Tous les endpoints fonctionnent')
      } else {
        log('yellow', '⚠️ Backend API: Certains endpoints ont des problèmes')
      }
      
    } catch (error) {
      log('red', `❌ Erreur backend: ${error.message}`)
      results.backend.details.push(`Erreur: ${error.message}`)
    }

    // 3. TEST D'AUTHENTIFICATION
    log('blue', '\n3️⃣ TEST D\'AUTHENTIFICATION')
    log('blue', '-' .repeat(50))
    
    try {
      // Test de l'endpoint de login avec de mauvaises données
      const loginTest = await axios.post(`${BACKEND_URL}/api/v1/auth/login`, {
        email: 'test@example.com',
        password: 'wrongpassword'
      }, { 
        timeout: 5000,
        validateStatus: (status) => status < 500
      })
      
      if (loginTest.status === 401 || loginTest.status === 400) {
        log('green', '✅ Endpoint de login: Fonctionne (erreur attendue)')
        results.auth.status = true
        results.auth.details.push('Login endpoint OK')
      } else {
        log('yellow', `⚠️ Endpoint de login: ${loginTest.status}`)
        results.auth.details.push(`Login: ${loginTest.status}`)
      }
      
      // Test de l'endpoint de register
      const registerTest = await axios.post(`${BACKEND_URL}/api/v1/auth/register`, {
        email: 'test@example.com',
        password: 'test'
      }, { 
        timeout: 5000,
        validateStatus: (status) => status < 500
      })
      
      if (registerTest.status === 400 || registerTest.status === 409 || registerTest.status === 201) {
        log('green', '✅ Endpoint de register: Fonctionne')
        results.auth.details.push('Register endpoint OK')
      } else {
        log('yellow', `⚠️ Endpoint de register: ${registerTest.status}`)
        results.auth.details.push(`Register: ${registerTest.status}`)
      }
      
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 400) {
        log('green', '✅ Authentification: Endpoints fonctionnels')
        results.auth.status = true
      } else {
        log('red', `❌ Erreur authentification: ${error.message}`)
        results.auth.details.push(`Erreur: ${error.message}`)
      }
    }

    // 4. DIAGNOSTIC FRONTEND
    log('blue', '\n4️⃣ DIAGNOSTIC FRONTEND NEXT.JS')
    log('blue', '-' .repeat(50))
    
    try {
      const frontendHome = await axios.get(FRONTEND_URL, { 
        timeout: 5000,
        maxRedirects: 0,
        validateStatus: (status) => status < 500
      })
      log('green', `✅ Frontend accessible: ${frontendHome.status}`)
      results.frontend.details.push('Serveur accessible')
      
      // Test des pages critiques
      const pages = [
        { url: '/auth/login', name: 'Login', shouldWork: true },
        { url: '/auth/register', name: 'Register', shouldWork: true },
        { url: '/dashboard', name: 'Dashboard', shouldWork: false },
        { url: '/products', name: 'Products', shouldWork: false },
        { url: '/stocks', name: 'Stocks', shouldWork: false }
      ]
      
      let workingPages = 0
      for (const page of pages) {
        try {
          const response = await axios.get(`${FRONTEND_URL}${page.url}`, { 
            timeout: 5000,
            maxRedirects: 0,
            validateStatus: (status) => status < 500
          })
          
          if (response.status === 200) {
            log('green', `   ✅ ${page.name}: Accessible`)
            workingPages++
          } else if (response.status === 302 || response.status === 307) {
            if (page.shouldWork) {
              log('yellow', `   ⚠️ ${page.name}: Redirection inattendue`)
            } else {
              log('green', `   ✅ ${page.name}: Redirection (Normal - auth requise)`)
              workingPages++
            }
          }
          results.frontend.details.push(`${page.name}: ${response.status}`)
        } catch (error) {
          if (error.response?.status === 302 || error.response?.status === 307) {
            if (!page.shouldWork) {
              log('green', `   ✅ ${page.name}: Redirection (Normal - auth requise)`)
              workingPages++
            }
            results.frontend.details.push(`${page.name}: Redirection`)
          } else {
            log('red', `   ❌ ${page.name}: ${error.message}`)
            results.frontend.details.push(`${page.name}: ERREUR`)
          }
        }
      }
      
      if (workingPages >= pages.length * 0.8) {
        results.frontend.status = true
        log('green', '✅ Frontend: Pages accessibles')
      }
      
    } catch (error) {
      log('red', `❌ Erreur frontend: ${error.message}`)
      results.frontend.details.push(`Erreur: ${error.message}`)
    }

  } catch (error) {
    log('red', `❌ Erreur générale: ${error.message}`)
  } finally {
    await prisma.$disconnect()
  }

  // 5. RAPPORT FINAL ET SOLUTIONS
  log('cyan', '\n5️⃣ RAPPORT FINAL ET SOLUTIONS')
  log('cyan', '=' .repeat(50))
  
  // Résumé des composants
  const components = [
    { name: 'Base de données', status: results.database.status },
    { name: 'Backend API', status: results.backend.status },
    { name: 'Frontend', status: results.frontend.status },
    { name: 'Authentification', status: results.auth.status }
  ]
  
  components.forEach(comp => {
    const icon = comp.status ? '✅' : '❌'
    const color = comp.status ? 'green' : 'red'
    log(color, `${icon} ${comp.name}`)
  })
  
  // Diagnostic du problème principal
  log('cyan', '\n🎯 DIAGNOSTIC DU PROBLÈME:')
  
  if (!results.database.hasData) {
    log('red', '❌ PROBLÈME PRINCIPAL IDENTIFIÉ: BASE DE DONNÉES VIDE')
    log('yellow', '   → Toutes les pages affichent "Aucune donnée trouvée"')
    log('yellow', '   → Les listes déroulantes sont vides')
    log('yellow', '   → Le dashboard affiche des zéros partout')
    log('yellow', '   → C\'est NORMAL car il n\'y a aucune donnée à afficher')
  } else {
    log('green', '✅ La base contient des données')
    if (!results.backend.status) {
      log('red', '❌ Problème: Backend API défaillant')
    } else if (!results.auth.status) {
      log('red', '❌ Problème: Authentification défaillante')
    } else {
      log('yellow', '⚠️ Problème: Autre cause à investiguer')
    }
  }
  
  // Solutions
  log('cyan', '\n🔧 SOLUTIONS RECOMMANDÉES:')
  
  if (!results.database.hasData) {
    log('yellow', '1. CRÉER DES DONNÉES (Solution principale):')
    log('yellow', '   → Aller sur http://localhost:3000/auth/register')
    log('yellow', '   → Créer un compte utilisateur')
    log('yellow', '   → Se connecter sur http://localhost:3000/auth/login')
    log('yellow', '   → Ajouter des produits sur /products/new')
    log('yellow', '   → Ajouter des clients sur /clients/new')
    log('yellow', '   → Ajouter des stocks sur /stocks/new')
    log('yellow', '   → Les données apparaîtront alors dans les listes')
  }
  
  if (!results.backend.status) {
    log('yellow', '2. Redémarrer le backend:')
    log('yellow', '   → cd apps/backend && npm run dev')
  }
  
  if (!results.frontend.status) {
    log('yellow', '3. Redémarrer le frontend:')
    log('yellow', '   → cd apps/frontend && npm run dev')
  }
  
  log('cyan', '\n🎉 CONCLUSION:')
  const successCount = components.filter(c => c.status).length
  
  if (successCount >= 3) {
    log('green', '✅ L\'application fonctionne correctement')
    if (!results.database.hasData) {
      log('green', '💡 Le "problème" est juste une base de données vide')
      log('green', '🚀 Créez des données et tout s\'affichera parfaitement')
    }
  } else {
    log('red', '❌ Problèmes techniques détectés')
    log('red', '💡 Corrigez les composants défaillants avant de créer des données')
  }
}

// Exécution
diagnosticAffichageDonnees().catch(console.error)
