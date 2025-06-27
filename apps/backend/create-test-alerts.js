const axios = require('axios')

const API_BASE = 'http://localhost:3001'

async function createTestAlerts() {
  console.log('🧪 Création de produits de test pour les alertes...')

  try {
    // 1. Login pour obtenir le token
    console.log('🔐 Connexion...')
    const loginResponse = await axios.post(`${API_BASE}/api/v1/auth/login`, {
      email: 'admin@gestion-dz.com',
      password: 'admin123'
    })

    if (!loginResponse.data.success) {
      console.log('❌ Échec de la connexion')
      return
    }

    const token = loginResponse.data.data.token
    console.log('✅ Connexion réussie')

    // Configuration des headers avec le token
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }

    // 2. Récupérer ou créer une catégorie
    console.log('\n📂 Vérification des catégories...')
    let categoryId = null
    
    try {
      const categoriesResponse = await axios.get(`${API_BASE}/api/v1/categories`, { headers })
      if (categoriesResponse.data.success && categoriesResponse.data.data.data.length > 0) {
        categoryId = categoriesResponse.data.data.data[0].id
        console.log(`✅ Catégorie trouvée: ${categoriesResponse.data.data.data[0].name}`)
      }
    } catch (error) {
      console.log('⚠️ Aucune catégorie trouvée, création d\'une catégorie de test...')
      
      try {
        const newCategoryResponse = await axios.post(`${API_BASE}/api/v1/categories`, {
          name: 'Produits de Test',
          description: 'Catégorie pour les tests d\'alertes de stock'
        }, { headers })
        
        if (newCategoryResponse.data.success) {
          categoryId = newCategoryResponse.data.data.id
          console.log('✅ Catégorie créée')
        }
      } catch (catError) {
        console.log('⚠️ Impossible de créer une catégorie, continuons sans catégorie')
      }
    }

    // 3. Créer des produits de test avec différents niveaux de stock
    console.log('\n📦 Création des produits de test...')
    
    const testProducts = [
      {
        name: 'Produit Test - Rupture de Stock',
        description: 'Produit en rupture pour tester les alertes',
        sku: 'TEST-RUPTURE-001',
        price: 100.00,
        cost: 80.00,
        stockQuantity: 0,        // Rupture de stock
        minStock: 5,
        maxStock: 50,
        unit: 'pièce',
        isActive: true,
        isService: false,
        categoryId: categoryId
      },
      {
        name: 'Produit Test - Stock Faible',
        description: 'Produit avec stock faible pour tester les alertes',
        sku: 'TEST-FAIBLE-001',
        price: 150.00,
        cost: 120.00,
        stockQuantity: 3,        // Stock faible (< minStock)
        minStock: 10,
        maxStock: 100,
        unit: 'pièce',
        isActive: true,
        isService: false,
        categoryId: categoryId
      },
      {
        name: 'Produit Test - Stock Critique',
        description: 'Produit avec stock très faible pour tester les alertes',
        sku: 'TEST-CRITIQUE-001',
        price: 200.00,
        cost: 160.00,
        stockQuantity: 2,        // Stock critique (< minStock)
        minStock: 15,
        maxStock: 80,
        unit: 'pièce',
        isActive: true,
        isService: false,
        categoryId: categoryId
      },
      {
        name: 'Produit Test - Stock Normal',
        description: 'Produit avec stock normal pour contrôle',
        sku: 'TEST-NORMAL-001',
        price: 75.00,
        cost: 60.00,
        stockQuantity: 25,       // Stock normal (> minStock)
        minStock: 10,
        maxStock: 100,
        unit: 'pièce',
        isActive: true,
        isService: false,
        categoryId: categoryId
      }
    ]

    for (const productData of testProducts) {
      try {
        // Vérifier si le produit existe déjà
        const existingResponse = await axios.get(`${API_BASE}/api/v1/products?search=${productData.sku}`, { headers })
        
        if (existingResponse.data.success && existingResponse.data.data.data.length > 0) {
          // Mettre à jour le produit existant
          const existingProduct = existingResponse.data.data.data[0]
          const updateResponse = await axios.put(`${API_BASE}/api/v1/products/${existingProduct.id}`, {
            stockQuantity: productData.stockQuantity,
            minStock: productData.minStock,
            maxStock: productData.maxStock
          }, { headers })
          
          if (updateResponse.data.success) {
            const status = productData.stockQuantity === 0 ? '🔴 RUPTURE' : 
                          productData.stockQuantity <= productData.minStock ? '🟠 FAIBLE' : '🟢 NORMAL'
            console.log(`   🔄 Mis à jour: ${productData.name} (${productData.stockQuantity}/${productData.minStock}) ${status}`)
          }
        } else {
          // Créer un nouveau produit
          const createResponse = await axios.post(`${API_BASE}/api/v1/products`, productData, { headers })
          
          if (createResponse.data.success) {
            const status = productData.stockQuantity === 0 ? '🔴 RUPTURE' : 
                          productData.stockQuantity <= productData.minStock ? '🟠 FAIBLE' : '🟢 NORMAL'
            console.log(`   ✅ Créé: ${productData.name} (${productData.stockQuantity}/${productData.minStock}) ${status}`)
          } else {
            console.log(`   ❌ Erreur création: ${createResponse.data.message}`)
          }
        }
      } catch (error) {
        console.log(`   ❌ Erreur pour ${productData.name}: ${error.response?.data?.message || error.message}`)
      }
    }

    // 4. Tester l'API des alertes
    console.log('\n🚨 Test de l\'API des alertes...')
    
    try {
      const alertsResponse = await axios.get(`${API_BASE}/api/v1/stock/alerts`, { headers })
      
      if (alertsResponse.data.success) {
        const alerts = alertsResponse.data.data
        console.log(`✅ API des alertes fonctionne:`)
        console.log(`   🔴 Ruptures: ${alerts.outOfStock?.length || 0}`)
        console.log(`   🟠 Stock faible: ${alerts.lowStock?.length || 0}`)
        console.log(`   📊 Total alertes: ${alerts.totalAlerts || 0}`)
        
        if (alerts.outOfStock?.length > 0) {
          console.log('\n🔴 Produits en rupture:')
          alerts.outOfStock.forEach(p => {
            console.log(`   - ${p.name}: ${p.stockQuantity}/${p.minStock}`)
          })
        }
        
        if (alerts.lowStock?.length > 0) {
          console.log('\n🟠 Produits stock faible:')
          alerts.lowStock.forEach(p => {
            console.log(`   - ${p.name}: ${p.stockQuantity}/${p.minStock}`)
          })
        }
      } else {
        console.log('❌ Erreur API alertes:', alertsResponse.data.message)
      }
    } catch (error) {
      console.log('❌ Erreur lors du test des alertes:', error.response?.data?.message || error.message)
    }

    console.log('\n🎯 Création des données de test terminée!')
    console.log('   Vous pouvez maintenant tester les alertes dans le tableau de bord.')
    console.log('   URL: http://localhost:3002/dashboard')

  } catch (error) {
    console.error('❌ Erreur générale:', error.response?.data?.message || error.message)
  }
}

createTestAlerts()
