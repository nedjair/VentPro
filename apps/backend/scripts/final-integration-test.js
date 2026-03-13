#!/usr/bin/env node

/**
 * Test final d'intégration complète frontend-backend
 */

const axios = require('axios')

async function finalIntegrationTest() {
  console.log('🎯 TEST FINAL D\'INTÉGRATION COMPLÈTE')
  console.log('====================================\n')
  
  try {
    // 1. Vérifier que le backend fonctionne
    console.log('1. 🔧 Vérification du backend (port 3004)...')
    try {
      const healthCheck = await axios.get('http://localhost:3004/health', { timeout: 5000 })
      console.log('✅ Backend opérationnel')
    } catch (error) {
      console.log('❌ Backend non accessible')
      throw new Error('Backend non disponible sur le port 3004')
    }
    
    // 2. Vérifier que le frontend fonctionne
    console.log('\n2. 🌐 Vérification du frontend (port 3005)...')
    try {
      const frontendCheck = await axios.get('http://localhost:3005', { timeout: 5000 })
      console.log('✅ Frontend opérationnel')
    } catch (error) {
      console.log('❌ Frontend non accessible')
      throw new Error('Frontend non disponible sur le port 3005')
    }
    
    // 3. Test de l'authentification
    console.log('\n3. 🔐 Test d\'authentification...')
    const authResponse = await axios.post('http://localhost:3004/api/v1/auth/login', {
      email: 'admin@test.com',
      password: 'admin123'
    }, {
      headers: {
        'Origin': 'http://localhost:3005',
        'Content-Type': 'application/json'
      }
    })
    
    const token = authResponse.data.data.tokens.accessToken
    console.log('✅ Authentification réussie')
    
    // 4. Test de l'API dashboard
    console.log('\n4. 📊 Test de l\'API dashboard...')
    const dashboardResponse = await axios.get('http://localhost:3004/api/v1/dashboard/stats', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Origin': 'http://localhost:3005'
      }
    })
    
    const data = dashboardResponse.data.data
    console.log('✅ API dashboard opérationnelle')
    
    // 5. Vérification des données
    console.log('\n5. 🔍 Vérification des données...')
    
    const checks = [
      { name: 'Clients total', value: data.clients?.total, expected: 'number' },
      { name: 'Clients particuliers', value: data.clients?.individuals, expected: 'number' },
      { name: 'Clients entreprises', value: data.clients?.companies, expected: 'number' },
      { name: 'Produits total', value: data.products?.total, expected: 'number' },
      { name: 'Produits en stock', value: data.products?.inStock, expected: 'number' },
      { name: 'Produits rupture', value: data.products?.outOfStock, expected: 'number' },
      { name: 'Commandes total', value: data.orders?.total, expected: 'number' },
      { name: 'Commandes en attente', value: data.orders?.pending, expected: 'number' },
      { name: 'Ventes mois actuel', value: data.sales?.currentMonth, expected: 'number' },
      { name: 'Factures total', value: data.invoices?.total, expected: 'number' }
    ]
    
    let allChecksPass = true
    for (const check of checks) {
      if (typeof check.value === check.expected) {
        console.log(`   ✅ ${check.name}: ${check.value}`)
      } else {
        console.log(`   ❌ ${check.name}: ${check.value} (attendu: ${check.expected})`)
        allChecksPass = false
      }
    }
    
    // 6. Test CORS
    console.log('\n6. 🌐 Vérification CORS...')
    const corsHeaders = dashboardResponse.headers['access-control-allow-origin']
    if (corsHeaders === 'http://localhost:3005') {
      console.log('✅ CORS configuré correctement')
    } else {
      console.log(`❌ CORS incorrect: ${corsHeaders}`)
      allChecksPass = false
    }
    
    // 7. Résumé final
    console.log('\n' + '='.repeat(50))
    if (allChecksPass) {
      console.log('🎉 INTÉGRATION COMPLÈTE RÉUSSIE !')
      console.log('✅ Backend opérationnel (port 3004)')
      console.log('✅ Frontend opérationnel (port 3005)')
      console.log('✅ API dashboard fonctionnelle')
      console.log('✅ Données correctement structurées')
      console.log('✅ CORS configuré')
      console.log('\n📊 DONNÉES DU DASHBOARD:')
      console.log(`   • ${data.clients.total} clients (${data.clients.individuals} particuliers, ${data.clients.companies} entreprises)`)
      console.log(`   • ${data.products.total} produits (${data.products.inStock} en stock, ${data.products.outOfStock} en rupture)`)
      console.log(`   • ${data.orders.total} commandes (${data.orders.pending} en attente)`)
      console.log(`   • ${data.sales.currentMonth} ${data.sales.currency} de ventes ce mois`)
      console.log(`   • ${data.invoices.total} factures`)
      console.log('\n🚀 Le dashboard frontend devrait maintenant afficher toutes les données !')
      console.log('🌐 Accédez à: http://localhost:3005')
    } else {
      console.log('⚠️  PROBLÈMES DÉTECTÉS')
      console.log('❌ L\'intégration n\'est pas complète')
      console.log('🔧 Vérifiez les erreurs ci-dessus')
    }
    
    return allChecksPass
    
  } catch (error) {
    console.error('\n❌ ERREUR LORS DU TEST D\'INTÉGRATION')
    console.error('Message:', error.message)
    if (error.response) {
      console.error('Status:', error.response.status)
      console.error('Data:', error.response.data)
    }
    return false
  }
}

async function main() {
  const success = await finalIntegrationTest()
  process.exit(success ? 0 : 1)
}

if (require.main === module) {
  main()
}
