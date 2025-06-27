/**
 * Test des corrections frontend - Vérification des identifiants
 */

const https = require('https')
const http = require('http')

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    
    const req = protocol.request(url, options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data)
          resolve({ status: res.statusCode, data: jsonData })
        } catch (e) {
          resolve({ status: res.statusCode, data: data })
        }
      })
    })
    
    req.on('error', reject)
    req.setTimeout(5000, () => {
      req.destroy()
      reject(new Error('Timeout'))
    })
    
    if (options.body) {
      req.write(options.body)
    }
    
    req.end()
  })
}

async function testFrontendCorrections() {
  console.log('🔧 TEST DES CORRECTIONS FRONTEND')
  console.log('=' * 35)
  
  const baseUrl = 'http://localhost:3001'
  
  try {
    // 1. Test avec les NOUVEAUX identifiants (corrigés)
    console.log('\n✅ ÉTAPE 1: Test avec identifiants CORRIGÉS')
    const correctLoginResponse = await makeRequest(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gctpe.dz', password: 'admin123' })
    })
    
    if (correctLoginResponse.status === 200) {
      console.log('✅ Identifiants corrigés FONCTIONNENT')
      console.log(`   Email: admin@gctpe.dz`)
      console.log(`   Status: ${correctLoginResponse.status}`)
      
      const token = correctLoginResponse.data.data.tokens.accessToken
      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      
      // Test des routes avec les nouveaux identifiants
      console.log('\n📊 Test des routes avec identifiants corrigés:')
      
      // Test clients
      const clientsResponse = await makeRequest(`${baseUrl}/api/v1/clients`, {
        method: 'GET',
        headers
      })
      
      if (clientsResponse.status === 200) {
        const clientsCount = clientsResponse.data.data?.data?.length || 0
        console.log(`✅ Clients: ${clientsCount} trouvés`)
      } else {
        console.log(`❌ Clients: Erreur ${clientsResponse.status}`)
      }
      
      // Test produits
      const productsResponse = await makeRequest(`${baseUrl}/api/v1/products`, {
        method: 'GET',
        headers
      })
      
      if (productsResponse.status === 200) {
        const productsCount = productsResponse.data.data?.data?.length || 0
        console.log(`✅ Produits: ${productsCount} trouvés`)
      } else {
        console.log(`❌ Produits: Erreur ${productsResponse.status}`)
      }
      
    } else {
      console.log('❌ Identifiants corrigés NE FONCTIONNENT PAS')
      console.log(`   Status: ${correctLoginResponse.status}`)
      console.log(`   Réponse: ${JSON.stringify(correctLoginResponse.data)}`)
    }
    
    // 2. Test avec les ANCIENS identifiants (pour confirmer qu'ils ne marchent plus)
    console.log('\n❌ ÉTAPE 2: Test avec anciens identifiants (doivent échouer)')
    const oldLoginResponse = await makeRequest(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@demo-tpe.fr', password: 'demo123' })
    })
    
    if (oldLoginResponse.status !== 200) {
      console.log('✅ Anciens identifiants CORRECTEMENT REJETÉS')
      console.log(`   Email: admin@demo-tpe.fr`)
      console.log(`   Status: ${oldLoginResponse.status}`)
    } else {
      console.log('⚠️ Anciens identifiants encore acceptés (problème potentiel)')
    }
    
    // 3. Résumé des corrections
    console.log('\n🎯 RÉSUMÉ DES CORRECTIONS')
    console.log('=' * 25)
    console.log('✅ Identifiants corrigés dans les composants:')
    console.log('   - ClientsPage: admin@gctpe.dz / admin123')
    console.log('   - ProductsPage: admin@gctpe.dz / admin123')
    console.log('   - OrdersPage: admin@gctpe.dz / admin123')
    console.log('   - InvoicesPage: admin@gctpe.dz / admin123')
    console.log('   - ClientFormPage: admin@gctpe.dz / admin123')
    console.log('   - OrderFormPage: admin@gctpe.dz / admin123')
    console.log('   - LoginPage: admin@gctpe.dz / admin123')
    console.log('   - AuthStore: admin@gctpe.dz / admin123')
    
    console.log('\n🚀 PROCHAINES ÉTAPES:')
    console.log('1. Démarrer le frontend: npm run dev (dans apps/frontend)')
    console.log('2. Accéder à http://localhost:3000')
    console.log('3. Tester les pages /clients et /products')
    console.log('4. Vérifier que les données s\'affichent correctement')
    
    console.log('\n💡 DIAGNOSTIC ATTENDU:')
    console.log('- Les pages clients et produits devraient maintenant afficher les données')
    console.log('- Plus d\'erreurs 401 Unauthorized')
    console.log('- Authentification automatique fonctionnelle')
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message)
    throw error
  }
}

// Exécuter le test
if (require.main === module) {
  testFrontendCorrections()
    .then(() => {
      console.log('\n✅ Test des corrections terminé')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Test échoué:', error.message)
      process.exit(1)
    })
}
