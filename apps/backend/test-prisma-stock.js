// Test simple pour vérifier si le client Prisma reconnaît le modèle Stock
const { PrismaClient } = require('@prisma/client')

async function testPrismaStock() {
  console.log('🧪 Test du client Prisma pour le modèle Stock...')
  
  const prisma = new PrismaClient()
  
  try {
    // Test 1: Vérifier que prisma.stock existe
    console.log('\n1️⃣ Vérification de prisma.stock...')
    if (prisma.stock) {
      console.log('✅ prisma.stock existe dans le client')
      
      // Test 2: Essayer de compter les stocks
      try {
        const count = await prisma.stock.count()
        console.log(`✅ Requête count réussie: ${count} stocks`)
      } catch (error) {
        if (error.code === 'P2021') {
          console.log('⚠️ Table stocks n\'existe pas encore en DB')
          console.log('💡 Exécuter: npx prisma migrate dev')
        } else {
          console.log(`❌ Erreur count: ${error.message}`)
        }
      }
    } else {
      console.log('❌ prisma.stock n\'existe pas dans le client')
      console.log('💡 Exécuter: npx prisma generate')
    }
    
    // Test 3: Vérifier prisma.stockMovement
    console.log('\n2️⃣ Vérification de prisma.stockMovement...')
    if (prisma.stockMovement) {
      console.log('✅ prisma.stockMovement existe dans le client')
      
      try {
        const count = await prisma.stockMovement.count()
        console.log(`✅ Requête count réussie: ${count} mouvements`)
      } catch (error) {
        if (error.code === 'P2021') {
          console.log('⚠️ Table stock_movements n\'existe pas encore en DB')
        } else {
          console.log(`❌ Erreur count: ${error.message}`)
        }
      }
    } else {
      console.log('❌ prisma.stockMovement n\'existe pas dans le client')
    }
    
    // Test 4: Vérifier les relations Product
    console.log('\n3️⃣ Vérification des relations Product...')
    try {
      const products = await prisma.product.findMany({
        take: 1,
        select: {
          id: true,
          name: true
        }
      })
      
      if (products.length > 0) {
        console.log(`✅ ${products.length} produit(s) trouvé(s)`)
        console.log(`   Premier produit: ${products[0].name}`)
        
        // Essayer d'inclure le stock
        try {
          const productWithStock = await prisma.product.findFirst({
            include: {
              stock: true
            }
          })
          console.log('✅ Relation Product -> Stock fonctionne')
        } catch (error) {
          console.log(`❌ Erreur relation: ${error.message}`)
        }
      } else {
        console.log('⚠️ Aucun produit trouvé en DB')
      }
    } catch (error) {
      console.log(`❌ Erreur produits: ${error.message}`)
    }
    
    console.log('\n' + '='.repeat(50))
    console.log('📊 Résumé:')
    console.log('   Client Prisma: Généré')
    console.log('   Modèle Stock: ' + (prisma.stock ? 'Disponible' : 'Manquant'))
    console.log('   Modèle StockMovement: ' + (prisma.stockMovement ? 'Disponible' : 'Manquant'))
    console.log('\n🎯 Prochaines étapes:')
    console.log('   1. Si modèles manquants: npx prisma generate')
    console.log('   2. Si tables manquantes: npx prisma migrate dev')
    console.log('   3. Redémarrer le serveur backend')
    
  } catch (error) {
    console.error('\n❌ Erreur générale:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

// Exécuter le test
testPrismaStock().catch(console.error)
