#!/usr/bin/env node

/**
 * Test détaillé des erreurs d'export
 */

const axios = require('axios')

const API_BASE = 'http://localhost:3004/api/v1'

async function testExportErrors() {
  console.log('🔍 TEST DÉTAILLÉ DES ERREURS D\'EXPORT')
  console.log('=====================================\n')
  
  try {
    // 1. Authentification
    console.log('1. 🔐 Authentification...')
    const authResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@test.com',
      password: 'admin123'
    })
    
    const token = authResponse.data.data.tokens.accessToken
    console.log('✅ Authentifié\n')
    
    const headers = { Authorization: `Bearer ${token}` }
    
    // 2. Test export Excel clients avec détails d'erreur
    console.log('2. 📊 Test export Excel clients...')
    try {
      const response = await axios.get(`${API_BASE}/clients/export?format=xlsx`, {
        headers,
        responseType: 'arraybuffer',
        timeout: 30000
      })
      console.log('✅ Export Excel clients réussi')
    } catch (error) {
      console.log('❌ Export Excel clients échoué')
      console.log('   Status:', error.response?.status)
      console.log('   Headers:', error.response?.headers)
      
      if (error.response?.data) {
        // Convertir arraybuffer en string pour voir l'erreur
        const errorText = Buffer.from(error.response.data).toString()
        console.log('   Erreur:', errorText.substring(0, 500))
      }
    }
    
    // 3. Test export PDF clients avec détails d'erreur
    console.log('\n3. 📄 Test export PDF clients...')
    try {
      const response = await axios.get(`${API_BASE}/clients/export?format=pdf`, {
        headers,
        responseType: 'arraybuffer',
        timeout: 30000
      })
      console.log('✅ Export PDF clients réussi')
    } catch (error) {
      console.log('❌ Export PDF clients échoué')
      console.log('   Status:', error.response?.status)
      
      if (error.response?.data) {
        const errorText = Buffer.from(error.response.data).toString()
        console.log('   Erreur:', errorText.substring(0, 500))
      }
    }
    
    // 4. Test export Excel commandes avec détails d'erreur
    console.log('\n4. 🛒 Test export Excel commandes...')
    try {
      const response = await axios.get(`${API_BASE}/orders/export?format=xlsx`, {
        headers,
        responseType: 'arraybuffer',
        timeout: 30000
      })
      console.log('✅ Export Excel commandes réussi')
    } catch (error) {
      console.log('❌ Export Excel commandes échoué')
      console.log('   Status:', error.response?.status)
      
      if (error.response?.data) {
        const errorText = Buffer.from(error.response.data).toString()
        console.log('   Erreur:', errorText.substring(0, 500))
      }
    }
    
    // 5. Test des routes qui fonctionnent pour comparaison
    console.log('\n5. ✅ Test des routes qui fonctionnent...')
    
    try {
      const response = await axios.get(`${API_BASE}/products/export?format=xlsx`, {
        headers,
        responseType: 'arraybuffer',
        timeout: 30000
      })
      console.log('✅ Export Excel produits: OK (' + response.data.byteLength + ' bytes)')
    } catch (error) {
      console.log('❌ Export Excel produits: ERREUR')
    }
    
    try {
      const response = await axios.get(`${API_BASE}/orders/export?format=pdf`, {
        headers,
        responseType: 'arraybuffer',
        timeout: 30000
      })
      console.log('✅ Export PDF commandes: OK (' + response.data.byteLength + ' bytes)')
    } catch (error) {
      console.log('❌ Export PDF commandes: ERREUR')
    }
    
    console.log('\n' + '='.repeat(50))
    console.log('🎯 ANALYSE DES ERREURS')
    console.log('Les exports qui échouent semblent avoir des problèmes spécifiques.')
    console.log('Vérifiez les logs ci-dessus pour identifier les causes.')
    
    return true
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message)
    return false
  }
}

async function main() {
  const success = await testExportErrors()
  process.exit(success ? 0 : 1)
}

if (require.main === module) {
  main()
}
