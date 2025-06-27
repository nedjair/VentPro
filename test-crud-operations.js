/**
 * Test complet des opérations CRUD pour toutes les entités
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

async function testCrudOperations() {
  console.log('🔍 TEST COMPLET DES OPÉRATIONS CRUD')
  console.log('=' * 40)
  
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
    
    // 2. Test CRUD Clients
    console.log('\n👥 TEST CRUD CLIENTS')
    console.log('=' * 20)
    
    // CREATE Client
    const clientData = {
      type: 'INDIVIDUAL',
      first_name: 'Test',
      last_name: 'CRUD',
      email: 'test-crud@example.com',
      phone: '+213555123456',
      city: 'Alger',
      address: '123 Rue Test'
    }
    
    const createClientResponse = await makeRequest(`${baseUrl}/api/v1/clients`, {
      method: 'POST',
      headers,
      body: JSON.stringify(clientData)
    })
    
    let clientId = null
    if (createClientResponse.status === 201 || createClientResponse.status === 200) {
      clientId = createClientResponse.data.data.id
      console.log('✅ CREATE Client: Succès')
    } else {
      console.log(`❌ CREATE Client: ${createClientResponse.status}`)
    }
    
    // READ Clients
    const readClientsResponse = await makeRequest(`${baseUrl}/api/v1/clients`, {
      method: 'GET',
      headers
    })
    
    if (readClientsResponse.status === 200) {
      const count = readClientsResponse.data.data?.data?.length || 0
      console.log(`✅ READ Clients: ${count} clients trouvés`)
    } else {
      console.log(`❌ READ Clients: ${readClientsResponse.status}`)
    }
    
    // UPDATE Client (si créé)
    if (clientId) {
      const updateData = {
        phone: '+213555999999',
        city: 'Oran'
      }
      
      const updateClientResponse = await makeRequest(`${baseUrl}/api/v1/clients/${clientId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData)
      })
      
      if (updateClientResponse.status === 200) {
        console.log('✅ UPDATE Client: Succès')
      } else {
        console.log(`❌ UPDATE Client: ${updateClientResponse.status}`)
      }
      
      // DELETE Client
      const deleteClientResponse = await makeRequest(`${baseUrl}/api/v1/clients/${clientId}`, {
        method: 'DELETE',
        headers
      })
      
      if (deleteClientResponse.status === 200 || deleteClientResponse.status === 204) {
        console.log('✅ DELETE Client: Succès')
      } else {
        console.log(`❌ DELETE Client: ${deleteClientResponse.status}`)
      }
    }
    
    // 3. Test CRUD Produits
    console.log('\n📦 TEST CRUD PRODUITS')
    console.log('=' * 20)
    
    // CREATE Product
    const productData = {
      name: 'Produit Test CRUD',
      reference: 'TEST-CRUD-001',
      description: 'Produit de test pour CRUD',
      category: 'Test',
      price: 99.99,
      cost_price: 50.00,
      stock: 100,
      min_stock: 10,
      unit: 'pièce',
      is_active: true,
      track_stock: true,
      allow_backorder: false
    }
    
    const createProductResponse = await makeRequest(`${baseUrl}/api/v1/products`, {
      method: 'POST',
      headers,
      body: JSON.stringify(productData)
    })
    
    let productId = null
    if (createProductResponse.status === 201 || createProductResponse.status === 200) {
      productId = createProductResponse.data.data.id
      console.log('✅ CREATE Product: Succès')
    } else {
      console.log(`❌ CREATE Product: ${createProductResponse.status}`)
    }
    
    // READ Products
    const readProductsResponse = await makeRequest(`${baseUrl}/api/v1/products`, {
      method: 'GET',
      headers
    })
    
    if (readProductsResponse.status === 200) {
      const count = readProductsResponse.data.data?.data?.length || 0
      console.log(`✅ READ Products: ${count} produits trouvés`)
    } else {
      console.log(`❌ READ Products: ${readProductsResponse.status}`)
    }
    
    // UPDATE et DELETE Product (si créé)
    if (productId) {
      const updateProductData = {
        price: 149.99,
        stock: 150
      }
      
      const updateProductResponse = await makeRequest(`${baseUrl}/api/v1/products/${productId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateProductData)
      })
      
      if (updateProductResponse.status === 200) {
        console.log('✅ UPDATE Product: Succès')
      } else {
        console.log(`❌ UPDATE Product: ${updateProductResponse.status}`)
      }
      
      const deleteProductResponse = await makeRequest(`${baseUrl}/api/v1/products/${productId}`, {
        method: 'DELETE',
        headers
      })
      
      if (deleteProductResponse.status === 200 || deleteProductResponse.status === 204) {
        console.log('✅ DELETE Product: Succès')
      } else {
        console.log(`❌ DELETE Product: ${deleteProductResponse.status}`)
      }
    }
    
    // 4. Test READ pour autres entités
    console.log('\n📋 TEST READ AUTRES ENTITÉS')
    console.log('=' * 30)
    
    const readTests = [
      ['Suppliers', '/api/v1/suppliers'],
      ['Orders', '/api/v1/orders'],
      ['Invoices', '/api/v1/invoices']
    ]
    
    for (const [name, path] of readTests) {
      try {
        const response = await makeRequest(`${baseUrl}${path}`, {
          method: 'GET',
          headers
        })
        
        if (response.status === 200) {
          const count = response.data.data?.data?.length || response.data.data?.total || 0
          console.log(`✅ READ ${name}: ${count} éléments`)
        } else {
          console.log(`❌ READ ${name}: ${response.status}`)
        }
      } catch (error) {
        console.log(`❌ READ ${name}: ${error.message}`)
      }
    }
    
    // 5. Test des routes d'authentification
    console.log('\n🔐 TEST ROUTES AUTHENTIFICATION')
    console.log('=' * 35)
    
    const authTests = [
      ['Verify Token', 'GET', '/api/v1/auth/verify'],
      ['Get Profile', 'GET', '/api/v1/auth/profile'],
      ['Logout', 'GET', '/api/v1/auth/logout']
    ]
    
    for (const [name, method, path] of authTests) {
      try {
        const response = await makeRequest(`${baseUrl}${path}`, {
          method,
          headers
        })
        
        if (response.status === 200) {
          console.log(`✅ ${name}: Succès`)
        } else {
          console.log(`❌ ${name}: ${response.status}`)
        }
      } catch (error) {
        console.log(`❌ ${name}: ${error.message}`)
      }
    }
    
    console.log('\n🎉 TEST CRUD COMPLET TERMINÉ')
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message)
    throw error
  }
}

// Exécuter le test
if (require.main === module) {
  testCrudOperations()
    .then(() => {
      console.log('\n✅ Tous les tests CRUD terminés')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Tests CRUD échoués:', error.message)
      process.exit(1)
    })
}
