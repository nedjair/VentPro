const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testAutoSync() {
  console.log('🧪 TEST DE LA SYNCHRONISATION AUTOMATIQUE')
  console.log('=' .repeat(60))

  try {
    // 1. Préparer l'environnement de test
    console.log('\n1️⃣ PRÉPARATION DE L\'ENVIRONNEMENT DE TEST')
    console.log('-'.repeat(50))

    // Créer une entreprise de test
    const testCompany = await prisma.company.upsert({
      where: { id: 'test-auto-sync-company' },
      update: {},
      create: {
        id: 'test-auto-sync-company',
        name: 'Test Auto Sync Company',
        email: 'test-auto-sync@example.com',
        phone: '+213123456789',
        address: 'Test Address for Auto Sync'
      }
    })

    console.log(`✅ Entreprise de test: ${testCompany.name}`)

    // 2. Test de création de produit avec synchronisation automatique
    console.log('\n2️⃣ TEST CRÉATION PRODUIT → SYNCHRONISATION AUTO')
    console.log('-'.repeat(50))

    const testProduct = await prisma.product.create({
      data: {
        id: 'test-auto-sync-product',
        name: 'Produit Test Auto Sync',
        price: 150.00,
        stockQuantity: 25,
        minStock: 5,
        maxStock: 50,
        companyId: testCompany.id,
        isService: false,
        isActive: true
      }
    })

    console.log(`✅ Produit créé: ${testProduct.name}`)
    console.log(`   Stock: ${testProduct.stockQuantity}, Min: ${testProduct.minStock}, Max: ${testProduct.maxStock}`)

    // Vérifier que le stock a été créé automatiquement
    await new Promise(resolve => setTimeout(resolve, 1000)) // Attendre la synchronisation

    const createdStock = await prisma.stock.findUnique({
      where: { productId: testProduct.id }
    })

    if (createdStock) {
      console.log(`✅ Stock créé automatiquement:`)
      console.log(`   Quantité: ${createdStock.quantiteActuelle}`)
      console.log(`   Min: ${createdStock.quantiteMinimale}`)
      console.log(`   Max: ${createdStock.quantiteMaximale}`)
      
      // Vérifier la cohérence
      const isConsistent = 
        createdStock.quantiteActuelle === testProduct.stockQuantity &&
        createdStock.quantiteMinimale === testProduct.minStock &&
        createdStock.quantiteMaximale === testProduct.maxStock

      if (isConsistent) {
        console.log(`✅ SYNCHRONISATION AUTOMATIQUE RÉUSSIE`)
      } else {
        console.log(`❌ SYNCHRONISATION AUTOMATIQUE ÉCHOUÉE`)
        console.log(`   Attendu: ${testProduct.stockQuantity}/${testProduct.minStock}/${testProduct.maxStock}`)
        console.log(`   Obtenu: ${createdStock.quantiteActuelle}/${createdStock.quantiteMinimale}/${createdStock.quantiteMaximale}`)
      }
    } else {
      console.log(`❌ Stock non créé automatiquement`)
    }

    // 3. Test de mise à jour de produit avec synchronisation
    console.log('\n3️⃣ TEST MISE À JOUR PRODUIT → SYNCHRONISATION AUTO')
    console.log('-'.repeat(50))

    const updatedProduct = await prisma.product.update({
      where: { id: testProduct.id },
      data: {
        stockQuantity: 40,
        minStock: 8,
        maxStock: 80
      }
    })

    console.log(`✅ Produit mis à jour:`)
    console.log(`   Nouveau stock: ${updatedProduct.stockQuantity}`)
    console.log(`   Nouveau min: ${updatedProduct.minStock}`)
    console.log(`   Nouveau max: ${updatedProduct.maxStock}`)

    // Vérifier la synchronisation
    await new Promise(resolve => setTimeout(resolve, 1000))

    const updatedStock = await prisma.stock.findUnique({
      where: { productId: testProduct.id }
    })

    if (updatedStock) {
      const isConsistent = 
        updatedStock.quantiteActuelle === updatedProduct.stockQuantity &&
        updatedStock.quantiteMinimale === updatedProduct.minStock &&
        updatedStock.quantiteMaximale === updatedProduct.maxStock

      if (isConsistent) {
        console.log(`✅ SYNCHRONISATION MISE À JOUR RÉUSSIE`)
        console.log(`   Stock synchronisé: ${updatedStock.quantiteActuelle}/${updatedStock.quantiteMinimale}/${updatedStock.quantiteMaximale}`)
      } else {
        console.log(`❌ SYNCHRONISATION MISE À JOUR ÉCHOUÉE`)
        console.log(`   Attendu: ${updatedProduct.stockQuantity}/${updatedProduct.minStock}/${updatedProduct.maxStock}`)
        console.log(`   Obtenu: ${updatedStock.quantiteActuelle}/${updatedStock.quantiteMinimale}/${updatedStock.quantiteMaximale}`)
      }
    }

    // 4. Test de mise à jour de stock avec synchronisation inverse
    console.log('\n4️⃣ TEST MISE À JOUR STOCK → SYNCHRONISATION INVERSE')
    console.log('-'.repeat(50))

    const updatedStockDirect = await prisma.stock.update({
      where: { productId: testProduct.id },
      data: {
        quantiteActuelle: 60,
        quantiteMinimale: 12,
        quantiteMaximale: 120
      }
    })

    console.log(`✅ Stock mis à jour directement:`)
    console.log(`   Nouvelle quantité: ${updatedStockDirect.quantiteActuelle}`)
    console.log(`   Nouveau min: ${updatedStockDirect.quantiteMinimale}`)
    console.log(`   Nouveau max: ${updatedStockDirect.quantiteMaximale}`)

    // Vérifier la synchronisation inverse
    await new Promise(resolve => setTimeout(resolve, 1000))

    const syncedProduct = await prisma.product.findUnique({
      where: { id: testProduct.id }
    })

    if (syncedProduct) {
      const isConsistent = 
        syncedProduct.stockQuantity === updatedStockDirect.quantiteActuelle &&
        syncedProduct.minStock === updatedStockDirect.quantiteMinimale &&
        syncedProduct.maxStock === updatedStockDirect.quantiteMaximale

      if (isConsistent) {
        console.log(`✅ SYNCHRONISATION INVERSE RÉUSSIE`)
        console.log(`   Produit synchronisé: ${syncedProduct.stockQuantity}/${syncedProduct.minStock}/${syncedProduct.maxStock}`)
      } else {
        console.log(`❌ SYNCHRONISATION INVERSE ÉCHOUÉE`)
        console.log(`   Attendu: ${updatedStockDirect.quantiteActuelle}/${updatedStockDirect.quantiteMinimale}/${updatedStockDirect.quantiteMaximale}`)
        console.log(`   Obtenu: ${syncedProduct.stockQuantity}/${syncedProduct.minStock}/${syncedProduct.maxStock}`)
      }
    }

    // 5. Test avec un service (ne doit pas créer de stock)
    console.log('\n5️⃣ TEST PRODUIT SERVICE → PAS DE SYNCHRONISATION')
    console.log('-'.repeat(50))

    const serviceProduct = await prisma.product.create({
      data: {
        id: 'test-auto-sync-service',
        name: 'Service Test Auto Sync',
        price: 200.00,
        stockQuantity: 0,
        minStock: 0,
        maxStock: null,
        companyId: testCompany.id,
        isService: true,
        isActive: true
      }
    })

    console.log(`✅ Service créé: ${serviceProduct.name}`)

    await new Promise(resolve => setTimeout(resolve, 1000))

    const serviceStock = await prisma.stock.findUnique({
      where: { productId: serviceProduct.id }
    })

    if (!serviceStock) {
      console.log(`✅ CORRECT: Aucun stock créé pour le service`)
    } else {
      console.log(`❌ ERREUR: Stock créé pour un service`)
    }

    // 6. Résumé des tests
    console.log('\n6️⃣ RÉSUMÉ DES TESTS')
    console.log('-'.repeat(30))

    const allProducts = await prisma.product.findMany({
      where: { companyId: testCompany.id },
      include: { stock: true }
    })

    console.log(`📊 Produits créés: ${allProducts.length}`)
    
    let physicalProducts = 0
    let servicesProducts = 0
    let withStock = 0
    let consistent = 0

    allProducts.forEach(product => {
      if (product.isService) {
        servicesProducts++
        if (!product.stock) {
          consistent++ // Service sans stock = cohérent
        }
      } else {
        physicalProducts++
        if (product.stock) {
          withStock++
          const isConsistent = 
            product.stock.quantiteActuelle === product.stockQuantity &&
            product.stock.quantiteMinimale === product.minStock &&
            product.stock.quantiteMaximale === product.maxStock
          
          if (isConsistent) {
            consistent++
          }
        }
      }
    })

    console.log(`📦 Produits physiques: ${physicalProducts}`)
    console.log(`🛠️ Services: ${servicesProducts}`)
    console.log(`📋 Avec stock: ${withStock}`)
    console.log(`✅ Cohérents: ${consistent}`)

    const successRate = (consistent / allProducts.length) * 100
    console.log(`🎯 Taux de réussite: ${successRate.toFixed(1)}%`)

    if (successRate === 100) {
      console.log(`\n🎉 TOUS LES TESTS DE SYNCHRONISATION AUTOMATIQUE RÉUSSIS!`)
    } else {
      console.log(`\n⚠️ Certains tests ont échoué. Vérifiez la configuration.`)
    }

    // 7. Nettoyage
    console.log('\n7️⃣ NETTOYAGE')
    console.log('-'.repeat(20))

    await prisma.stock.deleteMany({
      where: { companyId: testCompany.id }
    })

    await prisma.product.deleteMany({
      where: { companyId: testCompany.id }
    })

    await prisma.company.delete({
      where: { id: testCompany.id }
    })

    console.log(`✅ Données de test supprimées`)

  } catch (error) {
    console.error('❌ Erreur lors du test:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Fonction pour tester les triggers PostgreSQL
async function testPostgreSQLTriggers() {
  console.log('\n🔧 TEST DES TRIGGERS POSTGRESQL')
  console.log('=' .repeat(40))

  try {
    const result = await prisma.$queryRaw`SELECT test_stock_sync_triggers() as result`
    console.log('📋 Résultat des tests triggers:', result[0]?.result || 'Aucun résultat')
  } catch (error) {
    console.log('❌ Erreur lors du test des triggers:', error.message)
    console.log('💡 Assurez-vous que les triggers sont installés avec: node scripts/setup-stock-triggers.js')
  }
}

// Exécution des tests
async function runAllTests() {
  console.log('🚀 DÉMARRAGE DES TESTS DE SYNCHRONISATION AUTOMATIQUE')
  console.log('=' .repeat(80))

  await testAutoSync()
  await testPostgreSQLTriggers()

  console.log('\n✅ TESTS TERMINÉS')
}

// Gestion des arguments de ligne de commande
const args = process.argv.slice(2)

if (args.includes('--triggers-only')) {
  testPostgreSQLTriggers()
} else if (args.includes('--help') || args.includes('-h')) {
  console.log('🧪 Script de test de la synchronisation automatique')
  console.log('')
  console.log('Usage:')
  console.log('  node test-auto-sync.js                # Tous les tests')
  console.log('  node test-auto-sync.js --triggers-only # Tests triggers uniquement')
  console.log('  node test-auto-sync.js --help         # Afficher cette aide')
  console.log('')
} else {
  runAllTests()
}
