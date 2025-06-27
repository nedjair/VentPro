/**
 * Test des données d'évolution pour les graphiques
 * Vérifie que les données sont correctement formatées pour les composants de graphiques
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
    
    if (options.body) {
      req.write(options.body)
    }
    
    req.end()
  })
}

async function testEvolutionCharts() {
  console.log('📈 TEST DES DONNÉES D\'ÉVOLUTION POUR GRAPHIQUES')
  console.log('=' * 50)
  
  try {
    // 1. Authentification
    console.log('\n🔐 Authentification...')
    const loginResponse = await makeRequest('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gctpe.dz', password: 'admin123' })
    })
    
    if (loginResponse.status !== 200) {
      throw new Error('Authentification échouée')
    }
    
    const token = loginResponse.data.data.tokens.accessToken
    console.log('✅ Token obtenu')
    
    // 2. Test des différentes métriques et périodes
    const testCases = [
      { metric: 'revenue', period: '3m', name: 'Revenus 3 mois' },
      { metric: 'revenue', period: '6m', name: 'Revenus 6 mois' },
      { metric: 'revenue', period: '12m', name: 'Revenus 12 mois' },
      { metric: 'orders', period: '6m', name: 'Commandes 6 mois' }
    ]
    
    let allTestsPassed = true
    const results = []
    
    for (const testCase of testCases) {
      console.log(`\n📊 Test: ${testCase.name}`)
      
      try {
        const response = await makeRequest(
          `http://localhost:3001/api/v1/analytics/evolution?metric=${testCase.metric}&period=${testCase.period}`,
          {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
          }
        )
        
        if (response.status !== 200) {
          console.log(`❌ Erreur HTTP: ${response.status}`)
          allTestsPassed = false
          continue
        }
        
        const evolutionData = response.data.data
        
        // Validation de la structure
        const requiredFields = ['metric', 'period', 'data', 'summary']
        const missingFields = requiredFields.filter(field => !evolutionData.hasOwnProperty(field))
        
        if (missingFields.length > 0) {
          console.log(`❌ Champs manquants: ${missingFields.join(', ')}`)
          allTestsPassed = false
          continue
        }
        
        // Validation des données
        if (!Array.isArray(evolutionData.data)) {
          console.log('❌ Le champ "data" n\'est pas un tableau')
          allTestsPassed = false
          continue
        }
        
        if (evolutionData.data.length === 0) {
          console.log('❌ Aucune donnée d\'évolution')
          allTestsPassed = false
          continue
        }
        
        // Validation de chaque point de données
        let dataPointsValid = true
        evolutionData.data.forEach((point, index) => {
          const requiredPointFields = ['period', 'label', 'value']
          const missingPointFields = requiredPointFields.filter(field => point[field] === undefined)
          
          if (missingPointFields.length > 0) {
            console.log(`❌ Point ${index}: champs manquants ${missingPointFields.join(', ')}`)
            dataPointsValid = false
          }
          
          if (typeof point.value !== 'number') {
            console.log(`❌ Point ${index}: valeur non numérique (${typeof point.value})`)
            dataPointsValid = false
          }
        })
        
        if (!dataPointsValid) {
          allTestsPassed = false
          continue
        }
        
        // Validation du résumé
        const summaryFields = ['total', 'average', 'trend']
        const missingSummaryFields = summaryFields.filter(field => evolutionData.summary[field] === undefined)
        
        if (missingSummaryFields.length > 0) {
          console.log(`❌ Résumé: champs manquants ${missingSummaryFields.join(', ')}`)
          allTestsPassed = false
          continue
        }
        
        console.log('✅ Structure valide')
        console.log(`   📊 Points de données: ${evolutionData.data.length}`)
        console.log(`   📈 Métrique: ${evolutionData.metric}`)
        console.log(`   📅 Période: ${evolutionData.period}`)
        console.log(`   📊 Total: ${evolutionData.summary.total}`)
        console.log(`   📊 Moyenne: ${evolutionData.summary.average.toFixed(2)}`)
        console.log(`   📈 Tendance: ${evolutionData.summary.trend}`)
        
        // Afficher quelques points de données
        console.log('   📋 Premiers points:')
        evolutionData.data.slice(0, 3).forEach(point => {
          console.log(`      ${point.label}: ${point.value}`)
        })
        
        results.push({
          testCase,
          success: true,
          dataPoints: evolutionData.data.length,
          summary: evolutionData.summary
        })
        
      } catch (error) {
        console.log(`❌ Erreur: ${error.message}`)
        allTestsPassed = false
        results.push({
          testCase,
          success: false,
          error: error.message
        })
      }
    }
    
    // 3. Résumé des tests
    console.log('\n📊 RÉSUMÉ DES TESTS D\'ÉVOLUTION')
    console.log('=' * 35)
    
    const successfulTests = results.filter(r => r.success).length
    const totalTests = results.length
    
    console.log(`Tests réussis: ${successfulTests}/${totalTests}`)
    
    results.forEach(result => {
      const status = result.success ? '✅' : '❌'
      console.log(`${status} ${result.testCase.name}`)
      if (result.success) {
        console.log(`   Points: ${result.dataPoints}, Tendance: ${result.summary.trend}`)
      } else {
        console.log(`   Erreur: ${result.error}`)
      }
    })
    
    // 4. Validation pour les graphiques
    console.log('\n🎨 COMPATIBILITÉ AVEC LES GRAPHIQUES')
    
    if (allTestsPassed) {
      console.log('✅ Format compatible avec Recharts')
      console.log('✅ Données numériques valides')
      console.log('✅ Labels de période présents')
      console.log('✅ Structure de résumé complète')
      console.log('\n🎉 Les graphiques d\'évolution devraient s\'afficher correctement !')
    } else {
      console.log('❌ Problèmes détectés')
      console.log('⚠️ Les graphiques pourraient ne pas s\'afficher correctement')
    }
    
    return { success: allTestsPassed, results }
    
  } catch (error) {
    console.error('\n❌ ERREUR FATALE:', error.message)
    throw error
  }
}

// Exécuter le test
if (require.main === module) {
  testEvolutionCharts()
    .then((result) => {
      console.log(`\n${result.success ? '✅' : '❌'} Test des graphiques d'évolution terminé`)
      process.exit(result.success ? 0 : 1)
    })
    .catch((error) => {
      console.error('\n❌ Test échoué:', error.message)
      process.exit(1)
    })
}
