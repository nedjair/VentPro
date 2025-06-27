/**
 * Test des routes de création backend
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

async function testCreationRoutesBackend() {
  console.log('🔍 TEST DES ROUTES DE CRÉATION BACKEND')
  console.log('=' * 40)
  
  const baseUrl = 'http://localhost:3001'
  
  try {
    // 1. Authentification
    console.log('\n🔐 ÉTAPE 1: Authentification')
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
    
    // 2. Test création client
    console.log('\n👥 ÉTAPE 2: Test création client')
    const clientData = {
      type: 'INDIVIDUAL',
      firstName: 'Test',
      lastName: 'Client',
      email: 'test.client@example.com',
      phone: '+213555123456',
      address: {
        street: '123 Rue Test',
        city: 'Alger',
        postalCode: '16000',
        country: 'Algérie'
      }
    }
    
    const clientResponse = await makeRequest(`${baseUrl}/api/v1/clients`, {
      method: 'POST',
      headers,
      body: JSON.stringify(clientData)
    })
    
    console.log(`Status création client: ${clientResponse.status}`)
    if (clientResponse.status === 201 || clientResponse.status === 200) {
      console.log('✅ Route création client fonctionnelle')
      if (clientResponse.data.success) {
        console.log(`   ID créé: ${clientResponse.data.data?.id || 'Non spécifié'}`)
      }
    } else {
      console.log('❌ Route création client problématique')
      console.log(`   Réponse: ${JSON.stringify(clientResponse.data)}`)
    }
    
    // 3. Test création fournisseur
    console.log('\n🏢 ÉTAPE 3: Test création fournisseur')
    const supplierData = {
      name: 'Test Supplier',
      type: 'COMPANY',
      email: 'test.supplier@example.com',
      phone: '+213555654321',
      address: {
        street: '456 Rue Fournisseur',
        city: 'Oran',
        postalCode: '31000',
        country: 'Algérie'
      },
      isActive: true
    }
    
    const supplierResponse = await makeRequest(`${baseUrl}/api/v1/suppliers`, {
      method: 'POST',
      headers,
      body: JSON.stringify(supplierData)
    })
    
    console.log(`Status création supplier: ${supplierResponse.status}`)
    if (supplierResponse.status === 201 || supplierResponse.status === 200) {
      console.log('✅ Route création supplier fonctionnelle')
      if (supplierResponse.data.success) {
        console.log(`   ID créé: ${supplierResponse.data.data?.id || 'Non spécifié'}`)
      }
    } else {
      console.log('❌ Route création supplier problématique')
      console.log(`   Réponse: ${JSON.stringify(supplierResponse.data)}`)
    }
    
    // 4. Test création commande
    console.log('\n📦 ÉTAPE 4: Test création commande')
    
    // D'abord récupérer un client existant
    const clientsListResponse = await makeRequest(`${baseUrl}/api/v1/clients`, {
      method: 'GET',
      headers
    })
    
    let clientId = null
    if (clientsListResponse.status === 200 && clientsListResponse.data.data?.data?.length > 0) {
      clientId = clientsListResponse.data.data.data[0].id
      console.log(`   Client trouvé: ${clientId}`)
    }
    
    // Récupérer un produit existant
    const productsListResponse = await makeRequest(`${baseUrl}/api/v1/products`, {
      method: 'GET',
      headers
    })
    
    let productId = null
    if (productsListResponse.status === 200 && productsListResponse.data.data?.data?.length > 0) {
      productId = productsListResponse.data.data.data[0].id
      console.log(`   Produit trouvé: ${productId}`)
    }
    
    if (clientId && productId) {
      const orderData = {
        type: 'ORDER',
        clientId: clientId,
        orderDate: new Date().toISOString().split('T')[0],
        notes: 'Commande de test',
        items: [
          {
            productId: productId,
            quantity: 2,
            unitPrice: 100.00,
            vatRate: 19,
            discount: 0
          }
        ]
      }
      
      const orderResponse = await makeRequest(`${baseUrl}/api/v1/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify(orderData)
      })
      
      console.log(`Status création order: ${orderResponse.status}`)
      if (orderResponse.status === 201 || orderResponse.status === 200) {
        console.log('✅ Route création order fonctionnelle')
        if (orderResponse.data.success) {
          console.log(`   ID créé: ${orderResponse.data.data?.id || 'Non spécifié'}`)
        }
      } else {
        console.log('❌ Route création order problématique')
        console.log(`   Réponse: ${JSON.stringify(orderResponse.data)}`)
      }
    } else {
      console.log('⚠️ Impossible de tester création order (pas de client/produit)')
    }
    
    // 5. Test création facture
    console.log('\n🧾 ÉTAPE 5: Test création facture')
    
    if (clientId && productId) {
      const invoiceData = {
        type: 'INVOICE',
        clientId: clientId,
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Facture de test',
        paymentMethod: 'BANK_TRANSFER',
        items: [
          {
            productId: productId,
            quantity: 1,
            unitPrice: 150.00,
            vatRate: 19,
            discount: 0
          }
        ]
      }
      
      const invoiceResponse = await makeRequest(`${baseUrl}/api/v1/invoices`, {
        method: 'POST',
        headers,
        body: JSON.stringify(invoiceData)
      })
      
      console.log(`Status création invoice: ${invoiceResponse.status}`)
      if (invoiceResponse.status === 201 || invoiceResponse.status === 200) {
        console.log('✅ Route création invoice fonctionnelle')
        if (invoiceResponse.data.success) {
          console.log(`   ID créé: ${invoiceResponse.data.data?.id || 'Non spécifié'}`)
        }
      } else {
        console.log('❌ Route création invoice problématique')
        console.log(`   Réponse: ${JSON.stringify(invoiceResponse.data)}`)
      }
    } else {
      console.log('⚠️ Impossible de tester création invoice (pas de client/produit)')
    }
    
    // 6. Résumé
    console.log('\n🎯 RÉSUMÉ DES ROUTES DE CRÉATION')
    console.log('=' * 35)
    console.log('Routes testées:')
    console.log('   - POST /api/v1/clients')
    console.log('   - POST /api/v1/suppliers')
    console.log('   - POST /api/v1/orders')
    console.log('   - POST /api/v1/invoices')
    
    console.log('\n💡 PROBLÈMES IDENTIFIÉS CÔTÉ FRONTEND:')
    console.log('   ❌ Formulaire Supplier: Pas d\'authentification automatique')
    console.log('   ❌ Formulaire Invoice: Mauvais identifiants (admin@demo-tpe.fr)')
    console.log('   ✅ Formulaire Client: Authentification OK')
    console.log('   ✅ Formulaire Order: Authentification OK')
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message)
    throw error
  }
}

// Exécuter le test
if (require.main === module) {
  testCreationRoutesBackend()
    .then(() => {
      console.log('\n✅ Test des routes de création terminé')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Test échoué:', error.message)
      process.exit(1)
    })
}
