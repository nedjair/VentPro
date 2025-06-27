/**
 * Test spécifique de la structure dashboard
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

async function testDashboardStructure() {
  console.log('🔍 TEST STRUCTURE DASHBOARD')
  console.log('=' * 30)
  
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
    
    // 2. Test Dashboard Stats
    console.log('\n📊 Test Dashboard Stats...')
    const response = await makeRequest(`${baseUrl}/api/v1/dashboard/stats`, {
      method: 'GET',
      headers
    })
    
    console.log(`Status: ${response.status}`)
    
    if (response.status === 200) {
      console.log('✅ Dashboard accessible')
      
      if (response.data.success) {
        console.log('✅ Format API correct (success: true)')
        
        const data = response.data.data
        console.log('\n📋 Structure complète:')
        console.log(JSON.stringify(data, null, 2))
        
        console.log('\n📊 Sections disponibles:')
        Object.keys(data).forEach(section => {
          console.log(`   - ${section}: ${Object.keys(data[section]).join(', ')}`)
        })
        
      } else {
        console.log('❌ Format API incorrect (success: false)')
      }
    } else {
      console.log(`❌ Dashboard inaccessible: ${response.status}`)
      console.log('Réponse:', response.data)
    }
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message)
    throw error
  }
}

// Exécuter le test
if (require.main === module) {
  testDashboardStructure()
    .then(() => {
      console.log('\n✅ Test dashboard terminé')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Test échoué:', error.message)
      process.exit(1)
    })
}
