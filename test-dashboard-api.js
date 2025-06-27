/**
 * Test rapide de l'API dashboard
 */

const fetch = require('node-fetch')

async function testDashboardAPI() {
  try {
    console.log('🔐 Test de connexion...')
    
    // 1. Authentification
    const loginResponse = await fetch('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@gctpe.dz',
        password: 'admin123'
      })
    })
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`)
    }
    
    const loginData = await loginResponse.json()
    const token = loginData.data.tokens.accessToken
    console.log('✅ Authentification réussie')
    
    // 2. Test de l'API dashboard
    console.log('📊 Test de l\'API dashboard...')
    const dashResponse = await fetch('http://localhost:3001/api/v1/dashboard/stats', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!dashResponse.ok) {
      throw new Error(`Dashboard API failed: ${dashResponse.status}`)
    }
    
    const dashData = await dashResponse.json()
    console.log('✅ API dashboard accessible')
    
    // 3. Vérification de la structure des données
    console.log('\n📋 Structure des données reçues:')
    console.log('- Success:', dashData.success)
    console.log('- Message:', dashData.message)
    
    if (dashData.data) {
      console.log('\n📊 Données dashboard:')
      console.log('- Clients:', dashData.data.clients ? '✅' : '❌')
      console.log('- Products:', dashData.data.products ? '✅' : '❌')
      console.log('- Sales:', dashData.data.sales ? '✅' : '❌')
      console.log('- Orders:', dashData.data.orders ? '✅' : '❌')
      
      if (dashData.data.sales) {
        console.log('\n💰 Structure Sales:')
        console.log('- currentMonth:', dashData.data.sales.currentMonth)
        console.log('- previousMonth:', dashData.data.sales.previousMonth)
        console.log('- growth:', dashData.data.sales.growth)
        console.log('- currency:', dashData.data.sales.currency)
      }
      
      if (dashData.data.orders) {
        console.log('\n📦 Structure Orders:')
        console.log('- total:', dashData.data.orders.total)
        console.log('- pending:', dashData.data.orders.pending)
        console.log('- accepted:', dashData.data.orders.accepted)
        console.log('- rejected:', dashData.data.orders.rejected)
      }
    }
    
    console.log('\n🎉 Test réussi ! L\'API dashboard fonctionne correctement.')
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message)
    throw error
  }
}

// Exécuter le test
if (require.main === module) {
  testDashboardAPI()
    .then(() => {
      console.log('\n✅ Test terminé avec succès')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Test échoué:', error.message)
      process.exit(1)
    })
}
