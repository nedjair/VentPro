#!/usr/bin/env node

/**
 * Test des fonctionnalités d'export PDF et Excel
 */

const axios = require('axios')
const fs = require('fs')
const path = require('path')

const API_BASE = 'http://localhost:3004/api/v1'

async function testExportFunctionality() {
  console.log('🧪 TEST DES FONCTIONNALITÉS D\'EXPORT')
  console.log('====================================\n')
  
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
    
    // 2. Test export Excel clients
    console.log('2. 📊 Test export Excel clients...')
    try {
      const clientsExcelResponse = await axios.get(`${API_BASE}/clients/export?format=xlsx`, {
        headers,
        responseType: 'arraybuffer',
        timeout: 30000
      })
      
      if (clientsExcelResponse.status === 200) {
        console.log('✅ Export Excel clients réussi')
        console.log(`   Taille: ${clientsExcelResponse.data.byteLength} bytes`)
        
        // Sauvegarder le fichier pour vérification
        const testDir = path.join(process.cwd(), 'test-exports')
        if (!fs.existsSync(testDir)) {
          fs.mkdirSync(testDir, { recursive: true })
        }
        
        fs.writeFileSync(path.join(testDir, 'clients-test.xlsx'), clientsExcelResponse.data)
        console.log('   Fichier sauvegardé: test-exports/clients-test.xlsx')
      }
    } catch (error) {
      console.log('❌ Export Excel clients échoué:', error.response?.status, error.message)
    }
    
    // 3. Test export PDF clients
    console.log('\n3. 📄 Test export PDF clients...')
    try {
      const clientsPdfResponse = await axios.get(`${API_BASE}/clients/export?format=pdf`, {
        headers,
        responseType: 'arraybuffer',
        timeout: 30000
      })
      
      if (clientsPdfResponse.status === 200) {
        console.log('✅ Export PDF clients réussi')
        console.log(`   Taille: ${clientsPdfResponse.data.byteLength} bytes`)
        
        const testDir = path.join(process.cwd(), 'test-exports')
        fs.writeFileSync(path.join(testDir, 'clients-test.pdf'), clientsPdfResponse.data)
        console.log('   Fichier sauvegardé: test-exports/clients-test.pdf')
      }
    } catch (error) {
      console.log('❌ Export PDF clients échoué:', error.response?.status, error.message)
    }
    
    // 4. Test export Excel produits
    console.log('\n4. 📦 Test export Excel produits...')
    try {
      const productsExcelResponse = await axios.get(`${API_BASE}/products/export?format=xlsx`, {
        headers,
        responseType: 'arraybuffer',
        timeout: 30000
      })
      
      if (productsExcelResponse.status === 200) {
        console.log('✅ Export Excel produits réussi')
        console.log(`   Taille: ${productsExcelResponse.data.byteLength} bytes`)
        
        const testDir = path.join(process.cwd(), 'test-exports')
        fs.writeFileSync(path.join(testDir, 'products-test.xlsx'), productsExcelResponse.data)
        console.log('   Fichier sauvegardé: test-exports/products-test.xlsx')
      }
    } catch (error) {
      console.log('❌ Export Excel produits échoué:', error.response?.status, error.message)
    }
    
    // 5. Test export PDF produits
    console.log('\n5. 📄 Test export PDF produits...')
    try {
      const productsPdfResponse = await axios.get(`${API_BASE}/products/export?format=pdf`, {
        headers,
        responseType: 'arraybuffer',
        timeout: 30000
      })
      
      if (productsPdfResponse.status === 200) {
        console.log('✅ Export PDF produits réussi')
        console.log(`   Taille: ${productsPdfResponse.data.byteLength} bytes`)
        
        const testDir = path.join(process.cwd(), 'test-exports')
        fs.writeFileSync(path.join(testDir, 'products-test.pdf'), productsPdfResponse.data)
        console.log('   Fichier sauvegardé: test-exports/products-test.pdf')
      }
    } catch (error) {
      console.log('❌ Export PDF produits échoué:', error.response?.status, error.message)
    }
    
    // 6. Test export Excel commandes
    console.log('\n6. 🛒 Test export Excel commandes...')
    try {
      const ordersExcelResponse = await axios.get(`${API_BASE}/orders/export?format=xlsx`, {
        headers,
        responseType: 'arraybuffer',
        timeout: 30000
      })
      
      if (ordersExcelResponse.status === 200) {
        console.log('✅ Export Excel commandes réussi')
        console.log(`   Taille: ${ordersExcelResponse.data.byteLength} bytes`)
        
        const testDir = path.join(process.cwd(), 'test-exports')
        fs.writeFileSync(path.join(testDir, 'orders-test.xlsx'), ordersExcelResponse.data)
        console.log('   Fichier sauvegardé: test-exports/orders-test.xlsx')
      }
    } catch (error) {
      console.log('❌ Export Excel commandes échoué:', error.response?.status, error.message)
    }
    
    // 7. Test export PDF commandes
    console.log('\n7. 📄 Test export PDF commandes...')
    try {
      const ordersPdfResponse = await axios.get(`${API_BASE}/orders/export?format=pdf`, {
        headers,
        responseType: 'arraybuffer',
        timeout: 30000
      })
      
      if (ordersPdfResponse.status === 200) {
        console.log('✅ Export PDF commandes réussi')
        console.log(`   Taille: ${ordersPdfResponse.data.byteLength} bytes`)
        
        const testDir = path.join(process.cwd(), 'test-exports')
        fs.writeFileSync(path.join(testDir, 'orders-test.pdf'), ordersPdfResponse.data)
        console.log('   Fichier sauvegardé: test-exports/orders-test.pdf')
      }
    } catch (error) {
      console.log('❌ Export PDF commandes échoué:', error.response?.status, error.message)
    }
    
    // 8. Test export Excel factures
    console.log('\n8. 🧾 Test export Excel factures...')
    try {
      const invoicesExcelResponse = await axios.get(`${API_BASE}/invoices/export?format=xlsx`, {
        headers,
        responseType: 'arraybuffer',
        timeout: 30000
      })
      
      if (invoicesExcelResponse.status === 200) {
        console.log('✅ Export Excel factures réussi')
        console.log(`   Taille: ${invoicesExcelResponse.data.byteLength} bytes`)
        
        const testDir = path.join(process.cwd(), 'test-exports')
        fs.writeFileSync(path.join(testDir, 'invoices-test.xlsx'), invoicesExcelResponse.data)
        console.log('   Fichier sauvegardé: test-exports/invoices-test.xlsx')
      }
    } catch (error) {
      console.log('❌ Export Excel factures échoué:', error.response?.status, error.message)
    }
    
    console.log('\n' + '='.repeat(50))
    console.log('🎯 RÉSUMÉ DES TESTS D\'EXPORT')
    console.log('✅ Tests terminés - Vérifiez les fichiers dans test-exports/')
    console.log('📁 Dossier de test: ' + path.join(process.cwd(), 'test-exports'))
    
    return true
    
  } catch (error) {
    console.error('❌ Erreur lors du test d\'export:', error.message)
    if (error.response) {
      console.error('Status:', error.response.status)
      console.error('Data:', error.response.data)
    }
    return false
  }
}

async function main() {
  const success = await testExportFunctionality()
  process.exit(success ? 0 : 1)
}

if (require.main === module) {
  main()
}
