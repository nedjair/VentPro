const axios = require('axios')

// Configuration
const FRONTEND_URL = 'http://localhost:3000'
const BACKEND_URL = 'http://localhost:3001'

// Liste de toutes les pages à tester
const pages = [
  // Pages publiques
  { name: 'Accueil', url: '/', public: true },
  { name: 'Connexion', url: '/auth/login', public: true },
  { name: 'Inscription', url: '/auth/register', public: true },
  
  // Pages principales
  { name: 'Dashboard', url: '/dashboard', public: false },
  
  // Module Clients
  { name: 'Liste Clients', url: '/clients', public: false },
  { name: 'Nouveau Client', url: '/clients/new', public: false },
  
  // Module Produits
  { name: 'Liste Produits', url: '/products', public: false },
  { name: 'Nouveau Produit', url: '/products/new', public: false },
  
  // Module Stock
  { name: 'Liste Stocks', url: '/stocks', public: false },
  { name: 'Nouveau Stock', url: '/stocks/new', public: false },
  { name: 'Test Stock Simple', url: '/stocks-simple', public: false },
  
  // Module Fournisseurs
  { name: 'Liste Fournisseurs', url: '/suppliers', public: false },
  { name: 'Nouveau Fournisseur', url: '/suppliers/new', public: false },
  
  // Module Commandes
  { name: 'Liste Commandes', url: '/orders', public: false },
  { name: 'Nouvelle Commande', url: '/orders/new', public: false },
  
  // Module Factures
  { name: 'Liste Factures', url: '/invoices', public: false },
  { name: 'Nouvelle Facture', url: '/invoices/new', public: false },
  
  // Pages de configuration
  { name: 'Paramètres', url: '/settings', public: false },
  { name: 'Profil', url: '/profile', public: false }
]

// Endpoints API à tester
const apiEndpoints = [
  { name: 'Health Check', url: '/health', method: 'GET', auth: false },
  { name: 'API Info', url: '/api', method: 'GET', auth: false },
  { name: 'Auth Login', url: '/api/v1/auth/login', method: 'POST', auth: false },
  { name: 'Auth Register', url: '/api/v1/auth/register', method: 'POST', auth: false },
  { name: 'Companies', url: '/api/v1/companies', method: 'GET', auth: true },
  { name: 'Users', url: '/api/v1/users', method: 'GET', auth: true },
  { name: 'Clients', url: '/api/v1/clients', method: 'GET', auth: true },
  { name: 'Products', url: '/api/v1/products', method: 'GET', auth: true },
  { name: 'Categories', url: '/api/v1/categories', method: 'GET', auth: true },
  { name: 'Stock', url: '/api/v1/stock', method: 'GET', auth: true },
  { name: 'Stock Movements', url: '/api/v1/stock/movements', method: 'GET', auth: true },
  { name: 'Suppliers', url: '/api/v1/suppliers', method: 'GET', auth: true },
  { name: 'Orders', url: '/api/v1/orders', method: 'GET', auth: true },
  { name: 'Invoices', url: '/api/v1/invoices', method: 'GET', auth: true },
  { name: 'Analytics Dashboard', url: '/api/v1/analytics/dashboard', method: 'GET', auth: true }
]

async function testPageConnectivity() {
  console.log('🔍 VÉRIFICATION COMPLÈTE DES CONNEXIONS')
  console.log('=' .repeat(60))
  
  // 1. Test de connectivité des serveurs
  console.log('\n1️⃣ Test de connectivité des serveurs...')
  
  try {
    const frontendTest = await axios.get(FRONTEND_URL, { timeout: 5000 })
    console.log(`✅ Frontend (${FRONTEND_URL}): ${frontendTest.status}`)
  } catch (error) {
    console.log(`❌ Frontend (${FRONTEND_URL}): ${error.code || error.message}`)
  }
  
  try {
    const backendTest = await axios.get(`${BACKEND_URL}/api`, { timeout: 5000 })
    console.log(`✅ Backend (${BACKEND_URL}): ${backendTest.status}`)
  } catch (error) {
    console.log(`❌ Backend (${BACKEND_URL}): ${error.code || error.message}`)
  }
  
  // 2. Test des endpoints API
  console.log('\n2️⃣ Test des endpoints API...')
  
  let apiSuccessCount = 0
  let apiTotalCount = apiEndpoints.length
  
  for (const endpoint of apiEndpoints) {
    try {
      const config = {
        method: endpoint.method.toLowerCase(),
        url: `${BACKEND_URL}${endpoint.url}`,
        timeout: 5000,
        validateStatus: (status) => status < 500 // Accepter les codes 2xx, 3xx, 4xx
      }
      
      // Pour les endpoints qui nécessitent l'auth, on s'attend à un 401
      const response = await axios(config)
      
      if (endpoint.auth && response.status === 401) {
        console.log(`✅ ${endpoint.name}: ${response.status} (Auth requise - Normal)`)
        apiSuccessCount++
      } else if (!endpoint.auth && response.status < 400) {
        console.log(`✅ ${endpoint.name}: ${response.status}`)
        apiSuccessCount++
      } else if (response.status === 404) {
        console.log(`⚠️ ${endpoint.name}: ${response.status} (Endpoint non trouvé)`)
      } else {
        console.log(`✅ ${endpoint.name}: ${response.status}`)
        apiSuccessCount++
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`❌ ${endpoint.name}: Serveur non accessible`)
      } else {
        console.log(`❌ ${endpoint.name}: ${error.message}`)
      }
    }
  }
  
  // 3. Test des pages frontend (simulation)
  console.log('\n3️⃣ Test des pages frontend...')
  
  let pageSuccessCount = 0
  let pageTotalCount = pages.length
  
  for (const page of pages) {
    try {
      // Pour les pages Next.js, on teste juste si le serveur répond
      // Les pages protégées redirigeront vers /auth/login
      const response = await axios.get(`${FRONTEND_URL}${page.url}`, {
        timeout: 5000,
        maxRedirects: 0,
        validateStatus: (status) => status < 500
      })
      
      if (response.status === 200) {
        console.log(`✅ ${page.name} (${page.url}): Accessible`)
        pageSuccessCount++
      } else if (response.status === 302 || response.status === 307) {
        console.log(`🔄 ${page.name} (${page.url}): Redirection (Normal si auth requise)`)
        pageSuccessCount++
      } else {
        console.log(`⚠️ ${page.name} (${page.url}): ${response.status}`)
      }
    } catch (error) {
      if (error.response && (error.response.status === 302 || error.response.status === 307)) {
        console.log(`🔄 ${page.name} (${page.url}): Redirection (Normal si auth requise)`)
        pageSuccessCount++
      } else if (error.code === 'ECONNREFUSED') {
        console.log(`❌ ${page.name} (${page.url}): Frontend non accessible`)
      } else {
        console.log(`❌ ${page.name} (${page.url}): ${error.message}`)
      }
    }
  }
  
  // 4. Résumé final
  console.log('\n4️⃣ Résumé final...')
  console.log('=' .repeat(40))
  console.log(`📊 API Endpoints: ${apiSuccessCount}/${apiTotalCount} fonctionnels`)
  console.log(`📄 Pages Frontend: ${pageSuccessCount}/${pageTotalCount} accessibles`)
  
  const apiPercentage = Math.round((apiSuccessCount / apiTotalCount) * 100)
  const pagePercentage = Math.round((pageSuccessCount / pageTotalCount) * 100)
  
  console.log(`\n🎯 Taux de réussite:`)
  console.log(`   API: ${apiPercentage}%`)
  console.log(`   Pages: ${pagePercentage}%`)
  
  if (apiPercentage >= 80 && pagePercentage >= 80) {
    console.log('\n🎉 APPLICATION FONCTIONNELLE !')
    console.log('💡 La plupart des connexions sont opérationnelles')
  } else {
    console.log('\n⚠️ PROBLÈMES DÉTECTÉS')
    console.log('💡 Vérifiez que les serveurs sont démarrés:')
    console.log('   → Frontend: npm run dev (port 3000)')
    console.log('   → Backend: npm run dev (port 3001)')
  }
  
  console.log('\n🔗 URLs de test:')
  console.log(`   Frontend: ${FRONTEND_URL}`)
  console.log(`   Backend: ${BACKEND_URL}/api`)
  console.log(`   API Docs: ${BACKEND_URL}/docs (si activé)`)
}

// Exécution
testPageConnectivity().catch(console.error)
