/**
 * Test spécifique de la structure des données KPI
 * Vérifie que les données correspondent à ce que le frontend attend
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

async function testKPIStructure() {
  console.log('🔍 TEST DE LA STRUCTURE DES DONNÉES KPI')
  console.log('=' * 45)
  
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
    
    // 2. Récupération des données KPI
    console.log('\n📊 Récupération des données KPI...')
    const kpiResponse = await makeRequest('http://localhost:3001/api/v1/analytics/kpi', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    })
    
    if (kpiResponse.status !== 200) {
      throw new Error(`Erreur KPI: ${kpiResponse.status}`)
    }
    
    const kpiData = kpiResponse.data.data
    console.log('✅ Données KPI récupérées')
    
    // 3. Validation de la structure
    console.log('\n🔍 VALIDATION DE LA STRUCTURE')
    
    const requiredFields = {
      'revenue': ['current', 'target', 'percentage', 'growth', 'currency'],
      'orders': ['current', 'target', 'percentage', 'growth'],
      'clients': ['current', 'target', 'percentage', 'growth'],
      'conversion': ['rate', 'target', 'growth']
    }
    
    let allValid = true
    
    Object.entries(requiredFields).forEach(([section, fields]) => {
      console.log(`\n📋 Section: ${section}`)
      
      if (!kpiData[section]) {
        console.log(`❌ Section ${section} manquante`)
        allValid = false
        return
      }
      
      fields.forEach(field => {
        if (kpiData[section][field] !== undefined) {
          console.log(`   ✅ ${field}: ${kpiData[section][field]}`)
        } else {
          console.log(`   ❌ ${field}: MANQUANT`)
          allValid = false
        }
      })
    })
    
    // 4. Test des méthodes toFixed()
    console.log('\n🧪 TEST DES MÉTHODES toFixed()')
    
    const testToFixed = (value, name) => {
      try {
        if (typeof value === 'number') {
          const result = value.toFixed(1)
          console.log(`✅ ${name}.toFixed(1) = ${result}`)
          return true
        } else {
          console.log(`❌ ${name} n'est pas un nombre (${typeof value})`)
          return false
        }
      } catch (error) {
        console.log(`❌ ${name}.toFixed(1) échoue: ${error.message}`)
        return false
      }
    }
    
    const toFixedTests = [
      testToFixed(kpiData.revenue?.percentage, 'revenue.percentage'),
      testToFixed(kpiData.revenue?.growth, 'revenue.growth'),
      testToFixed(kpiData.orders?.percentage, 'orders.percentage'),
      testToFixed(kpiData.clients?.percentage, 'clients.percentage'),
      testToFixed(kpiData.conversion?.growth, 'conversion.growth')
    ]
    
    const toFixedSuccess = toFixedTests.filter(Boolean).length
    
    // 5. Résumé
    console.log('\n📊 RÉSUMÉ DU TEST')
    console.log('=' * 20)
    
    console.log(`Structure générale: ${allValid ? '✅' : '❌'}`)
    console.log(`Tests toFixed(): ${toFixedSuccess}/${toFixedTests.length} réussis`)
    
    if (allValid && toFixedSuccess === toFixedTests.length) {
      console.log('\n🎉 STRUCTURE KPI PARFAITEMENT COMPATIBLE !')
      console.log('Le frontend devrait maintenant fonctionner sans erreur.')
    } else {
      console.log('\n⚠️ PROBLÈMES DÉTECTÉS')
      console.log('Des ajustements sont nécessaires.')
    }
    
    // 6. Données complètes pour debug
    console.log('\n📋 DONNÉES COMPLÈTES:')
    console.log(JSON.stringify(kpiData, null, 2))
    
    return { success: allValid && toFixedSuccess === toFixedTests.length, kpiData }
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message)
    throw error
  }
}

// Exécuter le test
if (require.main === module) {
  testKPIStructure()
    .then((result) => {
      console.log(`\n${result.success ? '✅' : '❌'} Test terminé`)
      process.exit(result.success ? 0 : 1)
    })
    .catch((error) => {
      console.error('\n❌ Test échoué:', error.message)
      process.exit(1)
    })
}
