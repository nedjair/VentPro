#!/usr/bin/env node

/**
 * Script de test pour la création de commandes
 * Teste la génération de numéros uniques et la création d'ordres
 */

const axios = require('axios')

const API_BASE = 'http://localhost:3003/api/v1'

// Données de test pour créer une commande
const testOrderData = {
  type: 'ORDER',
  clientId: 'cm4ywqhqz0001uxqhqhqhqhqh', // ID de test - à adapter selon votre DB
  items: [
    {
      productId: 'cm4ywqhqz0002uxqhqhqhqhqh', // ID de test - à adapter selon votre DB
      quantity: 2,
      unitPrice: 100.00,
      vatRate: 19.00,
      discount: 0
    }
  ],
  notes: 'Test de création de commande',
  orderDate: new Date().toISOString()
}

async function getAuthToken() {
  try {
    // Essayer de se connecter avec des identifiants de test
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@test.com',
      password: 'admin123'
    })
    
    return response.data.data.token
  } catch (error) {
    console.error('❌ Erreur lors de l\'authentification:', error.response?.data || error.message)
    return null
  }
}

async function getFirstClient(token) {
  try {
    const response = await axios.get(`${API_BASE}/clients`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    const clients = response.data.data
    if (clients && clients.length > 0) {
      return clients[0].id
    }
    
    return null
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des clients:', error.response?.data || error.message)
    return null
  }
}

async function getFirstProduct(token) {
  try {
    const response = await axios.get(`${API_BASE}/products`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    const products = response.data.data
    if (products && products.length > 0) {
      return products[0].id
    }
    
    return null
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des produits:', error.response?.data || error.message)
    return null
  }
}

async function testOrderCreation() {
  console.log('🧪 Test de création de commande')
  console.log('================================\n')
  
  try {
    // 1. Authentification
    console.log('1. 🔐 Authentification...')
    const token = await getAuthToken()
    if (!token) {
      console.log('❌ Impossible de s\'authentifier')
      return
    }
    console.log('✅ Authentification réussie\n')
    
    // 2. Récupérer un client
    console.log('2. 👤 Récupération d\'un client...')
    const clientId = await getFirstClient(token)
    if (!clientId) {
      console.log('❌ Aucun client trouvé')
      return
    }
    console.log(`✅ Client trouvé: ${clientId}\n`)
    
    // 3. Récupérer un produit
    console.log('3. 📦 Récupération d\'un produit...')
    const productId = await getFirstProduct(token)
    if (!productId) {
      console.log('❌ Aucun produit trouvé')
      return
    }
    console.log(`✅ Produit trouvé: ${productId}\n`)
    
    // 4. Créer plusieurs commandes pour tester l'unicité des numéros
    console.log('4. 📝 Test de création de commandes multiples...')
    
    const orderData = {
      ...testOrderData,
      clientId,
      items: [{
        ...testOrderData.items[0],
        productId
      }]
    }
    
    const results = []
    
    // Créer 3 commandes en parallèle pour tester les race conditions
    const promises = []
    for (let i = 0; i < 3; i++) {
      const promise = axios.post(`${API_BASE}/orders`, {
        ...orderData,
        notes: `Test commande #${i + 1}`
      }, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      promises.push(promise)
    }
    
    try {
      const responses = await Promise.all(promises)
      
      responses.forEach((response, index) => {
        const order = response.data.data
        results.push({
          index: index + 1,
          id: order.id,
          number: order.number,
          status: 'success'
        })
        console.log(`   ✅ Commande ${index + 1}: ${order.number}`)
      })
      
    } catch (error) {
      console.error('❌ Erreur lors de la création:', error.response?.data || error.message)
      
      // Essayer de créer une seule commande pour diagnostiquer
      console.log('\n🔍 Test avec une seule commande...')
      try {
        const response = await axios.post(`${API_BASE}/orders`, orderData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        const order = response.data.data
        console.log(`✅ Commande créée: ${order.number}`)
        
      } catch (singleError) {
        console.error('❌ Erreur détaillée:', singleError.response?.data || singleError.message)
        if (singleError.response?.data?.details) {
          console.error('Détails:', singleError.response.data.details)
        }
      }
    }
    
    console.log('\n📊 Résumé des tests:')
    results.forEach(result => {
      console.log(`   ${result.status === 'success' ? '✅' : '❌'} ${result.number || 'Échec'}`)
    })
    
  } catch (error) {
    console.error('❌ Erreur générale:', error.message)
  }
}

async function main() {
  await testOrderCreation()
}

if (require.main === module) {
  main()
}
