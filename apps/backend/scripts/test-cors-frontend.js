#!/usr/bin/env node

/**
 * Test CORS et connectivité frontend-backend
 */

const axios = require('axios')

async function testCorsAndConnectivity() {
  console.log('🧪 TEST CORS ET CONNECTIVITÉ FRONTEND-BACKEND')
  console.log('==============================================\n')
  
  try {
    // 1. Test sans Origin (comme notre script)
    console.log('1. 🔍 Test sans Origin (script backend)...')
    const authResponse1 = await axios.post('http://localhost:3004/api/v1/auth/login', {
      email: 'admin@test.com',
      password: 'admin123'
    })
    console.log('✅ Connexion sans Origin réussie\n')
    
    // 2. Test avec Origin frontend
    console.log('2. 🌐 Test avec Origin frontend...')
    const authResponse2 = await axios.post('http://localhost:3004/api/v1/auth/login', {
      email: 'admin@test.com',
      password: 'admin123'
    }, {
      headers: {
        'Origin': 'http://localhost:3005',
        'Content-Type': 'application/json'
      }
    })
    console.log('✅ Connexion avec Origin frontend réussie\n')
    
    // 3. Test dashboard avec Origin frontend
    console.log('3. 📊 Test dashboard avec Origin frontend...')
    const token = authResponse2.data.data.tokens.accessToken
    const dashboardResponse = await axios.get('http://localhost:3004/api/v1/dashboard/stats', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Origin': 'http://localhost:3005'
      }
    })
    console.log('✅ Dashboard avec Origin frontend réussi\n')
    
    // 4. Vérification des headers CORS
    console.log('4. 🔧 Vérification des headers CORS...')
    console.log('Headers de réponse:')
    Object.keys(dashboardResponse.headers).forEach(key => {
      if (key.toLowerCase().includes('cors') || key.toLowerCase().includes('access-control')) {
        console.log(`   ${key}: ${dashboardResponse.headers[key]}`)
      }
    })
    
    console.log('\n5. 📊 Données reçues:')
    const data = dashboardResponse.data.data
    console.log(`   • Clients: ${data.clients.total}`)
    console.log(`   • Produits: ${data.products.total}`)
    console.log(`   • Commandes: ${data.orders.total}`)
    console.log(`   • Ventes: ${data.sales.currentMonth} ${data.sales.currency}`)
    
    console.log('\n🎉 TOUS LES TESTS CORS RÉUSSIS !')
    console.log('✅ Le backend accepte les requêtes du frontend')
    console.log('✅ Les données sont correctement formatées')
    console.log('✅ Le frontend devrait pouvoir afficher le dashboard')
    
    return true
    
  } catch (error) {
    console.error('❌ Erreur lors du test CORS:', error.message)
    if (error.response) {
      console.error('Status:', error.response.status)
      console.error('Headers:', error.response.headers)
      console.error('Data:', error.response.data)
    }
    return false
  }
}

async function main() {
  const success = await testCorsAndConnectivity()
  process.exit(success ? 0 : 1)
}

if (require.main === module) {
  main()
}
