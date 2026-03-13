const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPerformance() {
  try {
    console.log('🚀 Test de performance simple...');
    
    // Test 1: Requête de base
    console.log('\n1. Test requête de base...');
    const start1 = Date.now();
    
    const products = await prisma.product.findMany({
      where: {
        isService: false
      },
      take: 10
    });
    
    const time1 = Date.now() - start1;
    console.log(`✅ ${products.length} produits récupérés en ${time1}ms`);
    
    // Test 2: Requête avec relations
    console.log('\n2. Test requête avec relations...');
    const start2 = Date.now();
    
    const productsWithStock = await prisma.product.findMany({
      where: {
        isService: false
      },
      include: {
        stock: true,
        category: true
      },
      take: 10
    });
    
    const time2 = Date.now() - start2;
    console.log(`✅ ${productsWithStock.length} produits avec relations en ${time2}ms`);
    
    // Test 3: Vérification de cohérence
    console.log('\n3. Test de cohérence...');
    const start3 = Date.now();
    
    let coherentCount = 0;
    productsWithStock.forEach(product => {
      if (product.stock && product.stockQuantity === product.stock.quantiteActuelle) {
        coherentCount++;
      }
    });
    
    const time3 = Date.now() - start3;
    console.log(`✅ ${coherentCount}/${productsWithStock.length} produits cohérents vérifiés en ${time3}ms`);
    
    // Résumé
    console.log('\n📊 Résumé des performances:');
    console.log(`   - Requête simple: ${time1}ms`);
    console.log(`   - Requête avec relations: ${time2}ms`);
    console.log(`   - Vérification cohérence: ${time3}ms`);
    
    const maxTime = Math.max(time1, time2, time3);
    if (maxTime < 100) {
      console.log('🚀 Excellentes performances');
    } else if (maxTime < 500) {
      console.log('✅ Bonnes performances');
    } else if (maxTime < 2000) {
      console.log('⚠️ Performances acceptables');
    } else {
      console.log('❌ Performances insuffisantes');
    }
    
    console.log('\n✅ Test de performance terminé');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testPerformance();
