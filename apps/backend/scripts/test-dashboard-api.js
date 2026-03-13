#!/usr/bin/env node

const axios = require('axios')

async function testDashboardAPI() {
  console.log('🧪 Test direct de l\'API Dashboard')
  console.log('==================================\n')
  
  try {
    // 1. Authentification
    console.log('1. 🔐 Authentification...')
    const authResponse = await axios.post('http://localhost:3004/api/v1/auth/login', {
      email: 'admin@test.com',
      password: 'admin123'
    })
    
    const token = authResponse.data.data.tokens.accessToken
    console.log('✅ Authentifié\n')
    
    // 2. Test de l'API dashboard
    console.log('2. 📊 Test de l\'API dashboard...')
    
    const startTime = Date.now()
    const dashboardResponse = await axios.get('http://localhost:3004/api/v1/dashboard/stats', {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000 // 10 secondes de timeout
    })
    const endTime = Date.now()
    
    console.log(`✅ Réponse reçue en ${endTime - startTime}ms`)
    console.log('\n📊 Données du dashboard:')
    console.log(JSON.stringify(dashboardResponse.data.data, null, 2))
    
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error('❌ Timeout - L\'API dashboard prend trop de temps à répondre')
    } else {
      console.error('❌ Erreur:', error.message)
      if (error.response) {
        console.error('Détails:', error.response.data)
      }
    }
  }
}

testDashboardAPI()
