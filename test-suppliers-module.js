#!/usr/bin/env node

/**
 * Script de test pour le module Fournisseurs
 * Teste les fonctionnalités CRUD et l'intégration
 */

const axios = require('axios')

const BASE_URL = 'http://localhost:3001/api/v1'
let authToken = null

// Couleurs pour les logs
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// Configuration axios
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000
})

// Intercepteur pour ajouter le token d'authentification
api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`
  }
  return config
})

async function authenticate() {
  try {
    log('🔐 Authentification...', 'blue')
    const response = await api.post('/auth/login', {
      email: 'admin@demo-tpe.fr',
      password: 'demo123'
    })

    if (response.data.success && response.data.data.tokens) {
      authToken = response.data.data.tokens.accessToken
      log('✅ Authentification réussie', 'green')
      return true
    } else {
      log('❌ Échec de l\'authentification', 'red')
      return false
    }
  } catch (error) {
    log(`❌ Erreur d'authentification: ${error.message}`, 'red')
    return false
  }
}

async function testSuppliersAPI() {
  log('\n📋 Test des API Fournisseurs', 'cyan')
  
  let createdSupplierId = null

  try {
    // Test 1: Récupérer la liste des fournisseurs
    log('\n1️⃣ Test GET /suppliers', 'yellow')
    const listResponse = await api.get('/suppliers')
    
    if (listResponse.data.success) {
      log(`✅ Liste récupérée: ${listResponse.data.data.data.length} fournisseur(s)`, 'green')
    } else {
      log('❌ Échec de récupération de la liste', 'red')
    }

    // Test 2: Créer un nouveau fournisseur
    log('\n2️⃣ Test POST /suppliers', 'yellow')
    const newSupplier = {
      name: 'Test Supplier Corp',
      type: 'COMPANY',
      contactName: 'Jean Test',
      email: 'test@testsupplier.com',
      phone: '01 23 45 67 89',
      address: '123 Rue de Test',
      city: 'Paris',
      country: 'France',
      siret: '12345678901234',
      paymentTerms: 30,
      discount: 5.0,
      isActive: true,
      isPreferred: false,
      tags: ['test', 'automatique']
    }

    const createResponse = await api.post('/suppliers', newSupplier)
    
    if (createResponse.data.success) {
      createdSupplierId = createResponse.data.data.id
      log(`✅ Fournisseur créé avec l'ID: ${createdSupplierId}`, 'green')
    } else {
      log('❌ Échec de création du fournisseur', 'red')
    }

    // Test 3: Récupérer le fournisseur créé
    if (createdSupplierId) {
      log('\n3️⃣ Test GET /suppliers/:id', 'yellow')
      const getResponse = await api.get(`/suppliers/${createdSupplierId}`)
      
      if (getResponse.data.success && getResponse.data.data.name === newSupplier.name) {
        log('✅ Fournisseur récupéré avec succès', 'green')
      } else {
        log('❌ Échec de récupération du fournisseur', 'red')
      }
    }

    // Test 4: Modifier le fournisseur
    if (createdSupplierId) {
      log('\n4️⃣ Test PUT /suppliers/:id', 'yellow')
      const updateData = {
        name: 'Test Supplier Corp - Modifié',
        rating: 4,
        isPreferred: true
      }

      const updateResponse = await api.put(`/suppliers/${createdSupplierId}`, updateData)
      
      if (updateResponse.data.success) {
        log('✅ Fournisseur modifié avec succès', 'green')
      } else {
        log('❌ Échec de modification du fournisseur', 'red')
      }
    }

    // Test 5: Statistiques des fournisseurs
    log('\n5️⃣ Test GET /suppliers/stats/overview', 'yellow')
    const statsResponse = await api.get('/suppliers/stats/overview')
    
    if (statsResponse.data.success) {
      const stats = statsResponse.data.data
      log(`✅ Statistiques récupérées: ${stats.total} total, ${stats.active} actifs`, 'green')
    } else {
      log('❌ Échec de récupération des statistiques', 'red')
    }

    // Test 6: Supprimer le fournisseur de test
    if (createdSupplierId) {
      log('\n6️⃣ Test DELETE /suppliers/:id', 'yellow')
      const deleteResponse = await api.delete(`/suppliers/${createdSupplierId}`)
      
      if (deleteResponse.data.success) {
        log('✅ Fournisseur supprimé avec succès', 'green')
      } else {
        log('❌ Échec de suppression du fournisseur', 'red')
      }
    }

  } catch (error) {
    log(`❌ Erreur lors des tests API: ${error.message}`, 'red')
    if (error.response) {
      log(`   Status: ${error.response.status}`, 'red')
      log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`, 'red')
    }
  }
}

async function testFrontendPages() {
  log('\n🌐 Test des pages Frontend', 'cyan')
  
  const frontendURL = 'http://localhost:3000'
  
  const pagesToTest = [
    '/suppliers',
    '/suppliers/new'
  ]

  for (const page of pagesToTest) {
    try {
      log(`\n🔍 Test de la page ${page}`, 'yellow')
      const response = await axios.get(`${frontendURL}${page}`, {
        timeout: 5000,
        validateStatus: (status) => status < 500 // Accepter les redirections
      })
      
      if (response.status < 400) {
        log(`✅ Page ${page} accessible (Status: ${response.status})`, 'green')
      } else {
        log(`⚠️ Page ${page} retourne le status ${response.status}`, 'yellow')
      }
    } catch (error) {
      log(`❌ Erreur pour la page ${page}: ${error.message}`, 'red')
    }
  }
}

async function testIntegration() {
  log('\n🔗 Test d\'intégration avec les produits', 'cyan')
  
  try {
    // Créer un fournisseur pour le test
    log('\n1️⃣ Création d\'un fournisseur de test', 'yellow')
    const supplierData = {
      name: 'Fournisseur Intégration Test',
      type: 'COMPANY',
      email: 'integration@test.com',
      isActive: true
    }

    const supplierResponse = await api.post('/suppliers', supplierData)
    
    if (!supplierResponse.data.success) {
      log('❌ Impossible de créer le fournisseur de test', 'red')
      return
    }

    const supplierId = supplierResponse.data.data.id
    log(`✅ Fournisseur créé: ${supplierId}`, 'green')

    // Tester la récupération des fournisseurs pour les produits
    log('\n2️⃣ Test de récupération des fournisseurs actifs', 'yellow')
    const activeSuppliersResponse = await api.get('/suppliers?isActive=true')
    
    if (activeSuppliersResponse.data.success) {
      const activeSuppliers = activeSuppliersResponse.data.data.data
      const testSupplier = activeSuppliers.find(s => s.id === supplierId)
      
      if (testSupplier) {
        log('✅ Fournisseur trouvé dans la liste des actifs', 'green')
      } else {
        log('❌ Fournisseur non trouvé dans la liste des actifs', 'red')
      }
    }

    // Nettoyer - supprimer le fournisseur de test
    log('\n3️⃣ Nettoyage - suppression du fournisseur de test', 'yellow')
    await api.delete(`/suppliers/${supplierId}`)
    log('✅ Fournisseur de test supprimé', 'green')

  } catch (error) {
    log(`❌ Erreur lors du test d'intégration: ${error.message}`, 'red')
  }
}

async function runTests() {
  log('🚀 Démarrage des tests du module Fournisseurs\n', 'cyan')
  
  // Authentification
  const isAuthenticated = await authenticate()
  if (!isAuthenticated) {
    log('❌ Impossible de continuer sans authentification', 'red')
    process.exit(1)
  }

  // Tests des API
  await testSuppliersAPI()
  
  // Tests des pages frontend
  await testFrontendPages()
  
  // Tests d'intégration
  await testIntegration()
  
  log('\n🎉 Tests terminés!', 'cyan')
}

// Exécuter les tests
if (require.main === module) {
  runTests().catch(error => {
    log(`❌ Erreur fatale: ${error.message}`, 'red')
    process.exit(1)
  })
}

module.exports = { runTests }
