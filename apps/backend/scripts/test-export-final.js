#!/usr/bin/env node

/**
 * Test final des fonctionnalités d'export - Version simplifiée
 */

const axios = require('axios')
const fs = require('fs')

async function testExportFinal() {
  console.log('🎯 TEST FINAL DES EXPORTS')
  console.log('=========================\n')
  
  try {
    // 1. Test de connexion au backend
    console.log('1. 🔍 Test de connexion backend...')
    let backendOk = false
    
    for (let i = 0; i < 5; i++) {
      try {
        const response = await axios.get('http://localhost:3004/health', { timeout: 5000 })
        if (response.status === 200) {
          console.log('✅ Backend accessible')
          backendOk = true
          break
        }
      } catch (error) {
        console.log(`   Tentative ${i + 1}/5 échouée, retry...`)
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    if (!backendOk) {
      console.log('❌ Backend non accessible après 5 tentatives')
      return false
    }
    
    // 2. Authentification
    console.log('\n2. 🔐 Authentification...')
    const authResponse = await axios.post('http://localhost:3004/api/v1/auth/login', {
      email: 'admin@test.com',
      password: 'admin123'
    })
    
    const token = authResponse.data.data.tokens.accessToken
    console.log('✅ Authentifié')
    
    const headers = { Authorization: `Bearer ${token}` }
    
    // 3. Test des exports qui fonctionnaient
    console.log('\n3. 📊 Test des exports fonctionnels...')
    
    const tests = [
      { name: 'Excel Produits', url: '/products/export?format=xlsx', file: 'products-final.xlsx' },
      { name: 'PDF Produits', url: '/products/export?format=pdf', file: 'products-final.pdf' },
      { name: 'PDF Commandes', url: '/orders/export?format=pdf', file: 'orders-final.pdf' },
      { name: 'Excel Factures', url: '/invoices/export?format=xlsx', file: 'invoices-final.xlsx' },
    ]
    
    for (const test of tests) {
      try {
        const response = await axios.get(`http://localhost:3004/api/v1${test.url}`, {
          headers,
          responseType: 'arraybuffer',
          timeout: 30000
        })
        
        if (response.status === 200) {
          console.log(`✅ ${test.name}: OK (${response.data.byteLength} bytes)`)
          fs.writeFileSync(`test-exports/${test.file}`, response.data)
        }
      } catch (error) {
        console.log(`❌ ${test.name}: ERREUR (${error.response?.status || error.message})`)
      }
    }
    
    // 4. Test des exports corrigés
    console.log('\n4. 🔧 Test des exports corrigés...')
    
    const fixedTests = [
      { name: 'Excel Clients', url: '/clients/export?format=xlsx', file: 'clients-final.xlsx' },
      { name: 'PDF Clients', url: '/clients/export?format=pdf', file: 'clients-final.pdf' },
      { name: 'Excel Commandes', url: '/orders/export?format=xlsx', file: 'orders-final.xlsx' },
    ]
    
    for (const test of fixedTests) {
      try {
        const response = await axios.get(`http://localhost:3004/api/v1${test.url}`, {
          headers,
          responseType: 'arraybuffer',
          timeout: 30000
        })
        
        if (response.status === 200) {
          console.log(`✅ ${test.name}: CORRIGÉ (${response.data.byteLength} bytes)`)
          fs.writeFileSync(`test-exports/${test.file}`, response.data)
        }
      } catch (error) {
        console.log(`❌ ${test.name}: ENCORE EN ERREUR (${error.response?.status || error.message})`)
      }
    }
    
    console.log('\n' + '='.repeat(50))
    console.log('🎯 RÉSUMÉ FINAL')
    console.log('✅ Tests d\'export terminés')
    console.log('📁 Fichiers générés dans test-exports/')
    console.log('🌐 Frontend accessible sur: http://localhost:3005')
    console.log('🔧 Backend accessible sur: http://localhost:3004')
    
    return true
    
  } catch (error) {
    console.error('❌ Erreur lors du test final:', error.message)
    return false
  }
}

async function main() {
  const success = await testExportFinal()
  process.exit(success ? 0 : 1)
}

if (require.main === module) {
  main()
}
