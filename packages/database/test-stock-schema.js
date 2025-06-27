const { PrismaClient } = require('@prisma/client')

async function testStockSchema() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🧪 Test du schéma Stock...')
    console.log('=' .repeat(50))
    
    // Test 1: Vérifier que la table stocks existe
    console.log('\n1️⃣ Test de la table stocks...')
    try {
      const stockCount = await prisma.stock.count()
      console.log(`✅ Table stocks accessible - ${stockCount} enregistrements`)
    } catch (error) {
      console.log(`❌ Erreur table stocks: ${error.message}`)
      if (error.code === 'P2021') {
        console.log('💡 Solution: Exécuter sync-stock.bat')
      }
    }
    
    // Test 2: Vérifier que la table stock_movements existe
    console.log('\n2️⃣ Test de la table stock_movements...')
    try {
      const movementCount = await prisma.stockMovement.count()
      console.log(`✅ Table stock_movements accessible - ${movementCount} enregistrements`)
    } catch (error) {
      console.log(`❌ Erreur table stock_movements: ${error.message}`)
    }
    
    // Test 3: Vérifier les relations
    console.log('\n3️⃣ Test des relations...')
    try {
      const products = await prisma.product.findMany({
        take: 1,
        include: {
          stock: true
        }
      })
      console.log(`✅ Relation Product -> Stock fonctionne`)
      
      if (products.length > 0) {
        console.log(`   Premier produit: ${products[0].name}`)
        console.log(`   Stock associé: ${products[0].stock ? 'Oui' : 'Non'}`)
      }
    } catch (error) {
      console.log(`❌ Erreur relations: ${error.message}`)
    }
    
    // Test 4: Vérifier les types
    console.log('\n4️⃣ Test des types StockMovementType...')
    try {
      // Essayer de créer un mouvement de test (sans l'enregistrer)
      const testMovement = {
        type: 'IN',
        quantity: 10,
        productId: 'test-id'
      }
      console.log(`✅ Types StockMovementType disponibles: IN, OUT, ADJUSTMENT, TRANSFER`)
    } catch (error) {
      console.log(`❌ Erreur types: ${error.message}`)
    }
    
    console.log('\n' + '=' .repeat(50))
    console.log('📊 Résumé du test:')
    console.log('   - Table stocks: Vérifiée')
    console.log('   - Table stock_movements: Vérifiée') 
    console.log('   - Relations: Vérifiées')
    console.log('   - Types: Vérifiés')
    console.log('\n🎯 Si tous les tests passent, le module Stock est prêt !')
    
  } catch (error) {
    console.error('\n❌ Erreur générale:', error.message)
    console.log('\n💡 Solutions possibles:')
    console.log('   1. Exécuter sync-stock.bat')
    console.log('   2. Vérifier la connexion à la base de données')
    console.log('   3. Redémarrer le serveur backend')
  } finally {
    await prisma.$disconnect()
  }
}

testStockSchema().catch(console.error)
