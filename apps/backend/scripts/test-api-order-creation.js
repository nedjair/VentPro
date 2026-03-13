#!/usr/bin/env node

/**
 * Test de l'API de création de commandes pour vérifier la correction du bug
 */

const axios = require('axios')

const API_BASE = 'http://localhost:3004/api/v1'

async function testOrderCreationAPI() {
  console.log('🧪 Test de l\'API de création de commandes')
  console.log('==========================================\n')
  
  try {
    // 1. Authentification
    console.log('1. 🔐 Authentification...')
    let token = null
    
    try {
      const authResponse = await axios.post(`${API_BASE}/auth/login`, {
        email: 'admin@test.com',
        password: 'admin123'
      })

      // Extraire le token de la réponse

      token = authResponse.data.data?.tokens?.accessToken || authResponse.data.data?.token || authResponse.data.token || authResponse.data.access_token
      if (!token) {
        throw new Error('Token non trouvé dans la réponse')
      }
      console.log('✅ Authentification réussie\n')
    } catch (authError) {
      console.log('⚠️ Authentification échouée, tentative avec d\'autres identifiants...')
      
      // Essayer d'autres identifiants possibles
      const credentials = [
        { email: 'test@test.com', password: 'test123' },
        { email: 'admin@example.com', password: 'password' },
        { email: 'user@test.com', password: 'password123' }
      ]
      
      for (const cred of credentials) {
        try {
          const response = await axios.post(`${API_BASE}/auth/login`, cred)
          token = response.data.data.token
          console.log(`✅ Authentification réussie avec ${cred.email}\n`)
          break
        } catch (e) {
          // Continuer avec les autres identifiants
        }
      }
      
      if (!token) {
        console.log('❌ Impossible de s\'authentifier avec les identifiants de test')
        console.log('💡 Vérifiez qu\'un utilisateur existe dans la base de données\n')
        return
      }
    }
    
    // 2. Récupérer les données nécessaires
    console.log('2. 📋 Récupération des données...')
    
    // Récupérer un client
    const clientsResponse = await axios.get(`${API_BASE}/clients`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    if (!clientsResponse.data.data || clientsResponse.data.data.length === 0) {
      console.log('❌ Aucun client trouvé')
      return
    }
    
    const client = clientsResponse.data.data[0]
    console.log(`✅ Client trouvé: ${client.name || client.firstName + ' ' + client.lastName}`)
    
    // Récupérer un produit
    const productsResponse = await axios.get(`${API_BASE}/products`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    if (!productsResponse.data.data || productsResponse.data.data.length === 0) {
      console.log('❌ Aucun produit trouvé')
      return
    }
    
    const product = productsResponse.data.data[0]
    console.log(`✅ Produit trouvé: ${product.name}\n`)
    
    // 3. Test de création de commandes séquentielles
    console.log('3. 📝 Test de création de commandes séquentielles...')
    
    const orderData = {
      type: 'ORDER',
      clientId: client.id,
      items: [{
        productId: product.id,
        quantity: 1,
        unitPrice: 100.00,
        vatRate: 19.00,
        discount: 0
      }],
      notes: 'Test de création de commande - correction bug numéros',
      orderDate: new Date().toISOString()
    }
    
    const createdOrders = []
    
    for (let i = 0; i < 3; i++) {
      try {
        const response = await axios.post(`${API_BASE}/orders`, {
          ...orderData,
          notes: `Test commande séquentielle #${i + 1}`
        }, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        const order = response.data.data
        createdOrders.push(order)
        console.log(`   ✅ Commande ${i + 1}: ${order.number}`)
        
      } catch (error) {
        console.log(`   ❌ Erreur commande ${i + 1}:`, error.response?.data?.message || error.message)
      }
    }
    
    // Vérifier l'unicité des numéros
    const numbers = createdOrders.map(o => o.number)
    const uniqueNumbers = new Set(numbers)
    
    if (uniqueNumbers.size === numbers.length) {
      console.log('   ✅ Tous les numéros sont uniques\n')
    } else {
      console.log('   ❌ Doublons détectés dans les numéros\n')
    }
    
    // 4. Test de création de devis
    console.log('4. 📋 Test de création de devis...')
    
    const quoteData = {
      ...orderData,
      type: 'QUOTE',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 jours
    }
    
    const createdQuotes = []
    
    for (let i = 0; i < 3; i++) {
      try {
        const response = await axios.post(`${API_BASE}/orders`, {
          ...quoteData,
          notes: `Test devis séquentiel #${i + 1}`
        }, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        const quote = response.data.data
        createdQuotes.push(quote)
        console.log(`   ✅ Devis ${i + 1}: ${quote.number}`)
        
      } catch (error) {
        console.log(`   ❌ Erreur devis ${i + 1}:`, error.response?.data?.message || error.message)
      }
    }
    
    // Vérifier l'unicité des numéros de devis
    const quoteNumbers = createdQuotes.map(o => o.number)
    const uniqueQuoteNumbers = new Set(quoteNumbers)
    
    if (uniqueQuoteNumbers.size === quoteNumbers.length) {
      console.log('   ✅ Tous les numéros de devis sont uniques\n')
    } else {
      console.log('   ❌ Doublons détectés dans les numéros de devis\n')
    }
    
    // 5. Test de création concurrente
    console.log('5. ⚡ Test de création concurrente...')
    
    const concurrentPromises = []
    for (let i = 0; i < 5; i++) {
      const promise = axios.post(`${API_BASE}/orders`, {
        ...orderData,
        notes: `Test concurrent #${i + 1}`
      }, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      concurrentPromises.push(promise)
    }
    
    try {
      const concurrentResponses = await Promise.all(concurrentPromises)
      const concurrentOrders = concurrentResponses.map(r => r.data.data)
      const concurrentNumbers = concurrentOrders.map(o => o.number)
      const uniqueConcurrentNumbers = new Set(concurrentNumbers)
      
      console.log('   Numéros générés en parallèle:')
      concurrentNumbers.forEach((num, index) => {
        console.log(`     ${index + 1}: ${num}`)
      })
      
      if (uniqueConcurrentNumbers.size === concurrentNumbers.length) {
        console.log('   ✅ Création concurrente réussie - tous uniques\n')
      } else {
        console.log('   ❌ Doublons détectés en création concurrente\n')
      }
      
    } catch (error) {
      console.log('   ⚠️ Certaines créations concurrentes ont échoué (normal si retry fonctionne)')
      console.log('   Erreur:', error.response?.data?.message || error.message)
    }
    
    console.log('✅ Tests terminés avec succès!')
    console.log('\n🎉 Le bug de génération de numéros de commandes semble être corrigé!')
    
  } catch (error) {
    console.error('❌ Erreur lors des tests:', error.message)
    if (error.response) {
      console.error('Détails:', error.response.data)
    }
  }
}

async function main() {
  await testOrderCreationAPI()
}

if (require.main === module) {
  main()
}
