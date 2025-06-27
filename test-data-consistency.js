/**
 * Test de cohérence des structures de données entre frontend et backend
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

// Structures attendues par le frontend (basées sur api.ts)
const EXPECTED_STRUCTURES = {
  dashboard: {
    clients: ['total', 'individuals', 'companies', 'recentCount', 'growth'],
    products: ['total', 'inStock', 'lowStock', 'outOfStock', 'totalStockValue'],
    sales: ['currentMonth', 'previousMonth', 'growth', 'currency'],
    orders: ['total', 'pending', 'accepted', 'rejected', 'averageValue'],
    invoices: ['total', 'paid', 'pending', 'overdue', 'totalAmount', 'paidAmount', 'pendingAmount']
  },
  kpi: {
    revenue: ['current', 'target', 'percentage', 'growth', 'currency'],
    orders: ['current', 'target', 'percentage', 'growth'],
    clients: ['current', 'target', 'percentage', 'growth'],
    conversion: ['rate', 'target', 'growth']
  },
  client: ['id', 'type', 'firstName', 'lastName', 'companyName', 'email', 'phone', 'address', 'city', 'createdAt'],
  product: ['id', 'name', 'reference', 'description', 'category', 'price', 'stock', 'unit', 'isActive', 'createdAt'],
  supplier: ['id', 'type', 'name', 'contactName', 'email', 'phone', 'city', 'isActive', 'createdAt'],
  order: ['id', 'number', 'type', 'status', 'clientId', 'orderDate', 'total', 'items', 'createdAt'],
  invoice: ['id', 'number', 'type', 'status', 'clientId', 'invoiceDate', 'total', 'items', 'createdAt']
}

function validateStructure(data, expectedFields, entityName) {
  const issues = []
  
  if (!data || typeof data !== 'object') {
    issues.push(`${entityName}: Données invalides ou manquantes`)
    return issues
  }
  
  // Vérifier les champs requis
  expectedFields.forEach(field => {
    if (!(field in data)) {
      issues.push(`${entityName}: Champ manquant '${field}'`)
    }
  })
  
  // Vérifier les types de base
  if ('id' in data && typeof data.id !== 'string') {
    issues.push(`${entityName}: 'id' doit être une string`)
  }
  
  if ('createdAt' in data && typeof data.createdAt !== 'string') {
    issues.push(`${entityName}: 'createdAt' doit être une string`)
  }
  
  if ('total' in data && typeof data.total !== 'number') {
    issues.push(`${entityName}: 'total' doit être un number`)
  }
  
  return issues
}

async function testDataConsistency() {
  console.log('🔍 TEST DE COHÉRENCE DES DONNÉES')
  console.log('=' * 35)
  
  const baseUrl = 'http://localhost:3001'
  
  try {
    // 1. Authentification
    console.log('\n🔐 Authentification...')
    const loginResponse = await makeRequest(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gctpe.dz', password: 'admin123' })
    })
    
    if (loginResponse.status !== 200) {
      throw new Error('Authentification échouée')
    }
    
    const token = loginResponse.data.data.tokens.accessToken
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    console.log('✅ Authentification réussie')
    
    let totalIssues = 0
    
    // 2. Test Dashboard Stats
    console.log('\n📊 TEST DASHBOARD STATS')
    try {
      const response = await makeRequest(`${baseUrl}/api/v1/dashboard/stats`, {
        method: 'GET',
        headers
      })
      
      if (response.status === 200 && response.data.success) {
        const data = response.data.data
        console.log('✅ Dashboard stats récupérées')
        
        // Valider chaque section
        Object.keys(EXPECTED_STRUCTURES.dashboard).forEach(section => {
          if (data[section]) {
            const issues = validateStructure(data[section], EXPECTED_STRUCTURES.dashboard[section], `Dashboard.${section}`)
            if (issues.length > 0) {
              console.log(`⚠️ ${section}:`)
              issues.forEach(issue => console.log(`   - ${issue}`))
              totalIssues += issues.length
            } else {
              console.log(`✅ ${section}: Structure correcte`)
            }
          } else {
            console.log(`❌ ${section}: Section manquante`)
            totalIssues++
          }
        })
      } else {
        console.log(`❌ Dashboard stats: ${response.status}`)
        totalIssues++
      }
    } catch (error) {
      console.log(`❌ Dashboard stats: ${error.message}`)
      totalIssues++
    }
    
    // 3. Test KPI Structure
    console.log('\n📈 TEST KPI STRUCTURE')
    try {
      const response = await makeRequest(`${baseUrl}/api/v1/analytics/kpi`, {
        method: 'GET',
        headers
      })
      
      if (response.status === 200 && response.data.success) {
        const data = response.data.data
        console.log('✅ KPI données récupérées')
        
        Object.keys(EXPECTED_STRUCTURES.kpi).forEach(section => {
          if (data[section]) {
            const issues = validateStructure(data[section], EXPECTED_STRUCTURES.kpi[section], `KPI.${section}`)
            if (issues.length > 0) {
              console.log(`⚠️ ${section}:`)
              issues.forEach(issue => console.log(`   - ${issue}`))
              totalIssues += issues.length
            } else {
              console.log(`✅ ${section}: Structure correcte`)
            }
          } else {
            console.log(`❌ ${section}: Section manquante`)
            totalIssues++
          }
        })
      } else {
        console.log(`❌ KPI: ${response.status}`)
        totalIssues++
      }
    } catch (error) {
      console.log(`❌ KPI: ${error.message}`)
      totalIssues++
    }
    
    // 4. Test des entités CRUD
    console.log('\n📋 TEST ENTITÉS CRUD')
    
    const crudEntities = [
      ['Clients', '/api/v1/clients', 'client'],
      ['Products', '/api/v1/products', 'product'],
      ['Suppliers', '/api/v1/suppliers', 'supplier'],
      ['Orders', '/api/v1/orders', 'order'],
      ['Invoices', '/api/v1/invoices', 'invoice']
    ]
    
    for (const [name, endpoint, structureKey] of crudEntities) {
      try {
        const response = await makeRequest(`${baseUrl}${endpoint}`, {
          method: 'GET',
          headers
        })
        
        if (response.status === 200 && response.data.success) {
          const items = response.data.data?.data || []
          console.log(`✅ ${name}: ${items.length} éléments`)
          
          if (items.length > 0) {
            const firstItem = items[0]
            const issues = validateStructure(firstItem, EXPECTED_STRUCTURES[structureKey], name)
            
            if (issues.length > 0) {
              console.log(`⚠️ ${name} - Structure:`)
              issues.forEach(issue => console.log(`   - ${issue}`))
              totalIssues += issues.length
            } else {
              console.log(`✅ ${name}: Structure correcte`)
            }
            
            // Afficher les champs disponibles
            const availableFields = Object.keys(firstItem)
            console.log(`   Champs: ${availableFields.slice(0, 5).join(', ')}${availableFields.length > 5 ? '...' : ''}`)
          } else {
            console.log(`ℹ️ ${name}: Aucune donnée pour valider la structure`)
          }
        } else {
          console.log(`❌ ${name}: ${response.status}`)
          totalIssues++
        }
      } catch (error) {
        console.log(`❌ ${name}: ${error.message}`)
        totalIssues++
      }
    }
    
    // 5. Test format de réponse API
    console.log('\n🔧 TEST FORMAT RÉPONSE API')
    
    const apiFormatTests = [
      ['Dashboard', '/api/v1/dashboard/stats'],
      ['KPI', '/api/v1/analytics/kpi'],
      ['Clients', '/api/v1/clients']
    ]
    
    for (const [name, endpoint] of apiFormatTests) {
      try {
        const response = await makeRequest(`${baseUrl}${endpoint}`, {
          method: 'GET',
          headers
        })
        
        if (response.status === 200) {
          const hasSuccess = 'success' in response.data
          const hasData = 'data' in response.data
          const successValue = response.data.success === true
          
          if (hasSuccess && hasData && successValue) {
            console.log(`✅ ${name}: Format API correct`)
          } else {
            console.log(`⚠️ ${name}: Format API incorrect`)
            if (!hasSuccess) console.log(`   - Manque 'success'`)
            if (!hasData) console.log(`   - Manque 'data'`)
            if (!successValue) console.log(`   - 'success' n'est pas true`)
            totalIssues++
          }
        }
      } catch (error) {
        console.log(`❌ ${name}: ${error.message}`)
        totalIssues++
      }
    }
    
    // 6. Résumé
    console.log('\n📊 RÉSUMÉ DE COHÉRENCE')
    console.log('=' * 25)
    console.log(`Problèmes détectés: ${totalIssues}`)
    
    if (totalIssues === 0) {
      console.log('🎉 PARFAIT ! Toutes les structures sont cohérentes')
    } else if (totalIssues <= 5) {
      console.log('👍 BON ! Quelques ajustements mineurs nécessaires')
    } else {
      console.log('⚠️ ATTENTION ! Plusieurs problèmes de cohérence détectés')
    }
    
    return { success: totalIssues <= 5, issues: totalIssues }
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message)
    throw error
  }
}

// Exécuter le test
if (require.main === module) {
  testDataConsistency()
    .then((result) => {
      console.log(`\n${result.success ? '✅' : '⚠️'} Test de cohérence terminé`)
      process.exit(result.success ? 0 : 1)
    })
    .catch((error) => {
      console.error('\n❌ Test échoué:', error.message)
      process.exit(1)
    })
}
