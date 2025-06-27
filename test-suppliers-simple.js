const axios = require('axios')

const BASE_URL = 'http://localhost:3001'

async function testSuppliersAPI() {
  console.log('🚀 Test simple de l\'API Fournisseurs\n')

  try {
    // Test 1: Health check
    console.log('1️⃣ Test Health Check...')
    const healthResponse = await axios.get(`${BASE_URL}/health`)
    console.log('✅ Health:', healthResponse.data.status)

    // Test 2: Test API Fournisseurs sans authentification (devrait échouer)
    console.log('\n2️⃣ Test API Fournisseurs (sans auth)...')
    try {
      const suppliersResponse = await axios.get(`${BASE_URL}/api/v1/suppliers`)
      console.log('❌ Erreur: L\'API devrait exiger une authentification')
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Authentification requise (comme attendu)')
      } else {
        console.log('❌ Erreur inattendue:', error.message)
      }
    }

    // Test 3: Authentification
    console.log('\n3️⃣ Test Authentification...')
    try {
      const authResponse = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
        email: 'admin@test.com',
        password: 'password123'
      })
      
      if (authResponse.data.token) {
        console.log('✅ Authentification réussie')
        const token = authResponse.data.token
        
        // Test 4: API Fournisseurs avec authentification
        console.log('\n4️⃣ Test API Fournisseurs (avec auth)...')
        const suppliersResponse = await axios.get(`${BASE_URL}/api/v1/suppliers`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        console.log('✅ API Fournisseurs fonctionne!')
        console.log(`📊 Nombre de fournisseurs: ${suppliersResponse.data.suppliers?.length || 0}`)
        
        if (suppliersResponse.data.suppliers && suppliersResponse.data.suppliers.length > 0) {
          console.log('📋 Premier fournisseur:', suppliersResponse.data.suppliers[0].name)
        }
        
      } else {
        console.log('❌ Token non reçu')
      }
      
    } catch (authError) {
      console.log('❌ Erreur d\'authentification:', authError.response?.data?.message || authError.message)
    }

  } catch (error) {
    console.log('❌ Erreur générale:', error.message)
  }
}

testSuppliersAPI()
