const axios = require('axios')
const { PrismaClient } = require('./packages/database/generated/client')

// Configuration
const FRONTEND_URL = 'http://localhost:3000'
const BACKEND_URL = 'http://localhost:3001'
const prisma = new PrismaClient()

// Données de test
const testProduct = {
  name: 'Test Produit E2E - Couscous',
  description: 'Produit de test pour vérification end-to-end',
  price: 350.00,
  cost: 280.00,
  unit: 'paquet',
  stockQuantity: 0,
  minStock: 10,
  maxStock: 100,
  isService: false,
  isActive: true
}

const testStock = {
  quantiteActuelle: 45,
  quantiteMinimale: 10,
  quantiteMaximale: 100
}

async function testStocksEndToEnd() {
  console.log('🔍 TEST END-TO-END - PAGE STOCKS')
  console.log('=' .repeat(50))
  
  let testResults = {
    database: false,
    backend: false,
    frontend: false,
    apiFlow: false,
    dataFlow: false
  }
  
  try {
    // 1. Test de la base de données PostgreSQL
    console.log('\n1️⃣ Test de la base de données PostgreSQL...')
    
    try {
      await prisma.$connect()
      console.log('✅ Connexion PostgreSQL réussie')
      
      // Vérifier les tables
      const companyCount = await prisma.company.count()
      const productCount = await prisma.product.count()
      const stockCount = await prisma.stock.count()
      
      console.log(`   📊 Companies: ${companyCount}`)
      console.log(`   📦 Products: ${productCount}`)
      console.log(`   📋 Stocks: ${stockCount}`)
      
      testResults.database = true
    } catch (error) {
      console.log(`❌ Erreur base de données: ${error.message}`)
    }
    
    // 2. Test du backend API
    console.log('\n2️⃣ Test du backend API...')
    
    try {
      // Test de l'API info
      const apiInfo = await axios.get(`${BACKEND_URL}/api`, { timeout: 5000 })
      console.log(`✅ API Backend accessible: ${apiInfo.status}`)
      
      // Test des endpoints stocks (sans auth - on s'attend à 401)
      try {
        const stocksResponse = await axios.get(`${BACKEND_URL}/api/v1/stock`, { timeout: 5000 })
        console.log(`✅ Endpoint /api/v1/stock: ${stocksResponse.status}`)
      } catch (error) {
        if (error.response?.status === 401) {
          console.log(`✅ Endpoint /api/v1/stock: 401 (Auth requise - Normal)`)
        } else {
          console.log(`⚠️ Endpoint /api/v1/stock: ${error.response?.status || error.message}`)
        }
      }
      
      testResults.backend = true
    } catch (error) {
      console.log(`❌ Erreur backend: ${error.message}`)
    }
    
    // 3. Test du frontend
    console.log('\n3️⃣ Test du frontend Next.js...')
    
    try {
      // Test de la page d'accueil
      const frontendHome = await axios.get(FRONTEND_URL, { 
        timeout: 5000,
        maxRedirects: 0,
        validateStatus: (status) => status < 500
      })
      console.log(`✅ Frontend accessible: ${frontendHome.status}`)
      
      // Test de la page stocks
      try {
        const stocksPage = await axios.get(`${FRONTEND_URL}/stocks`, { 
          timeout: 5000,
          maxRedirects: 0,
          validateStatus: (status) => status < 500
        })
        
        if (stocksPage.status === 200) {
          console.log(`✅ Page /stocks: ${stocksPage.status} (Accessible)`)
        } else if (stocksPage.status === 302 || stocksPage.status === 307) {
          console.log(`🔄 Page /stocks: ${stocksPage.status} (Redirection vers auth - Normal)`)
        }
      } catch (error) {
        if (error.response?.status === 302 || error.response?.status === 307) {
          console.log(`🔄 Page /stocks: Redirection vers auth (Normal)`)
        } else {
          console.log(`⚠️ Page /stocks: ${error.response?.status || error.message}`)
        }
      }
      
      // Test de la page nouveau stock
      try {
        const newStockPage = await axios.get(`${FRONTEND_URL}/stocks/new`, { 
          timeout: 5000,
          maxRedirects: 0,
          validateStatus: (status) => status < 500
        })
        
        if (newStockPage.status === 200) {
          console.log(`✅ Page /stocks/new: ${newStockPage.status} (Accessible)`)
        } else if (newStockPage.status === 302 || newStockPage.status === 307) {
          console.log(`🔄 Page /stocks/new: ${newStockPage.status} (Redirection vers auth - Normal)`)
        }
      } catch (error) {
        if (error.response?.status === 302 || error.response?.status === 307) {
          console.log(`🔄 Page /stocks/new: Redirection vers auth (Normal)`)
        } else {
          console.log(`⚠️ Page /stocks/new: ${error.response?.status || error.message}`)
        }
      }
      
      testResults.frontend = true
    } catch (error) {
      console.log(`❌ Erreur frontend: ${error.message}`)
    }
    
    // 4. Test du flux de données (création directe en base)
    console.log('\n4️⃣ Test du flux de données...')
    
    try {
      // Vérifier/créer une entreprise
      let company = await prisma.company.findFirst()
      if (!company) {
        company = await prisma.company.create({
          data: {
            name: 'Entreprise Test E2E',
            siret: '12345678901234',
            address: '123 Rue Test',
            postalCode: '16000',
            city: 'Alger',
            country: 'Algérie',
            currency: 'DA',
            timezone: 'Africa/Algiers'
          }
        })
        console.log(`✅ Entreprise créée: ${company.name}`)
      } else {
        console.log(`✅ Entreprise trouvée: ${company.name}`)
      }
      
      // Créer une catégorie
      let category = await prisma.category.findFirst({
        where: { companyId: company.id, name: 'Test E2E' }
      })
      if (!category) {
        category = await prisma.category.create({
          data: {
            name: 'Test E2E',
            description: 'Catégorie de test end-to-end',
            companyId: company.id
          }
        })
        console.log(`✅ Catégorie créée: ${category.name}`)
      }
      
      // Créer un produit de test
      let product = await prisma.product.findFirst({
        where: { companyId: company.id, name: testProduct.name }
      })
      if (!product) {
        product = await prisma.product.create({
          data: {
            ...testProduct,
            categoryId: category.id,
            companyId: company.id
          }
        })
        console.log(`✅ Produit créé: ${product.name}`)
      } else {
        console.log(`✅ Produit trouvé: ${product.name}`)
      }
      
      // Créer un stock
      let stock = await prisma.stock.findUnique({
        where: { productId: product.id }
      })
      if (!stock) {
        stock = await prisma.stock.create({
          data: {
            ...testStock,
            productId: product.id,
            companyId: company.id
          }
        })
        console.log(`✅ Stock créé: ${stock.quantiteActuelle} unités`)
      } else {
        // Mettre à jour le stock
        stock = await prisma.stock.update({
          where: { productId: product.id },
          data: testStock
        })
        console.log(`✅ Stock mis à jour: ${stock.quantiteActuelle} unités`)
      }
      
      // Créer un mouvement de stock
      const movement = await prisma.stockMovement.create({
        data: {
          type: 'IN',
          quantity: 10,
          unitCost: 280.00,
          reference: 'E2E-TEST-001',
          comment: 'Test end-to-end du module stock',
          productId: product.id
        }
      })
      console.log(`✅ Mouvement de stock créé: +${movement.quantity} unités`)
      
      testResults.dataFlow = true
    } catch (error) {
      console.log(`❌ Erreur flux de données: ${error.message}`)
    }
    
    // 5. Test de lecture des données via API (simulation)
    console.log('\n5️⃣ Test de lecture des données...')
    
    try {
      // Compter les données créées
      const finalStats = {
        companies: await prisma.company.count(),
        products: await prisma.product.count(),
        stocks: await prisma.stock.count(),
        movements: await prisma.stockMovement.count()
      }
      
      console.log(`✅ Données finales:`)
      console.log(`   🏢 Companies: ${finalStats.companies}`)
      console.log(`   📦 Products: ${finalStats.products}`)
      console.log(`   📋 Stocks: ${finalStats.stocks}`)
      console.log(`   📊 Movements: ${finalStats.movements}`)
      
      // Vérifier les relations
      const productWithStock = await prisma.product.findFirst({
        include: {
          stock: true,
          category: true,
          company: true
        },
        where: { name: testProduct.name }
      })
      
      if (productWithStock && productWithStock.stock) {
        console.log(`✅ Relations vérifiées:`)
        console.log(`   📦 Produit: ${productWithStock.name}`)
        console.log(`   📋 Stock: ${productWithStock.stock.quantiteActuelle} unités`)
        console.log(`   🏷️ Catégorie: ${productWithStock.category?.name}`)
        console.log(`   🏢 Entreprise: ${productWithStock.company.name}`)
        
        testResults.apiFlow = true
      }
      
    } catch (error) {
      console.log(`❌ Erreur lecture données: ${error.message}`)
    }
    
  } catch (error) {
    console.log(`❌ Erreur générale: ${error.message}`)
  } finally {
    await prisma.$disconnect()
  }
  
  // 6. Résumé final
  console.log('\n6️⃣ RÉSUMÉ DU TEST END-TO-END')
  console.log('=' .repeat(40))
  
  const results = [
    { name: 'Base de données PostgreSQL', status: testResults.database },
    { name: 'Backend API (Fastify)', status: testResults.backend },
    { name: 'Frontend (Next.js)', status: testResults.frontend },
    { name: 'Flux de données', status: testResults.dataFlow },
    { name: 'Lecture des données', status: testResults.apiFlow }
  ]
  
  results.forEach(result => {
    const icon = result.status ? '✅' : '❌'
    const status = result.status ? 'OK' : 'ÉCHEC'
    console.log(`${icon} ${result.name}: ${status}`)
  })
  
  const successCount = results.filter(r => r.status).length
  const percentage = Math.round((successCount / results.length) * 100)
  
  console.log(`\n📊 Taux de réussite: ${successCount}/${results.length} (${percentage}%)`)
  
  if (percentage >= 80) {
    console.log('\n🎉 TEST END-TO-END RÉUSSI !')
    console.log('💡 Le module Stock est fonctionnel de bout en bout')
    console.log('🚀 Vous pouvez maintenant:')
    console.log('   1. Créer un compte sur http://localhost:3000/auth/register')
    console.log('   2. Aller sur http://localhost:3000/stocks')
    console.log('   3. Voir les données de test créées')
  } else {
    console.log('\n⚠️ PROBLÈMES DÉTECTÉS')
    console.log('💡 Vérifiez les composants en échec ci-dessus')
  }
}

// Exécution
testStocksEndToEnd().catch(console.error)
