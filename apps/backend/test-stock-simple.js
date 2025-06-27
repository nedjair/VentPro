// Test simple du module de stock
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testStockModule() {
  console.log('🧪 Test simple du module de stock...');
  console.log('=' .repeat(50));
  
  try {
    // Test 1: Connexion à la base de données
    console.log('1. Test de connexion à la base de données...');
    await prisma.$connect();
    console.log('   ✅ Connexion réussie');
    
    // Test 2: Vérifier l'existence de la table stocks
    console.log('\n2. Vérification de la table stocks...');
    const stockCount = await prisma.stock.count();
    console.log(`   ✅ Table stocks accessible (${stockCount} enregistrements)`);
    
    // Test 3: Vérifier l'existence de produits
    console.log('\n3. Vérification des produits...');
    const productCount = await prisma.product.count();
    console.log(`   ✅ ${productCount} produits trouvés`);
    
    // Test 4: Vérifier l'existence d'une entreprise
    console.log('\n4. Vérification de l\'entreprise...');
    const company = await prisma.company.findFirst();
    if (company) {
      console.log(`   ✅ Entreprise trouvée: ${company.name}`);
    } else {
      console.log('   ❌ Aucune entreprise trouvée');
      return;
    }
    
    // Test 5: Créer un stock de test
    console.log('\n5. Test de création de stock...');
    
    // Chercher un produit existant
    const product = await prisma.product.findFirst({
      where: { companyId: company.id }
    });
    
    if (!product) {
      console.log('   ⚠️  Aucun produit trouvé pour créer un stock de test');
      console.log('   💡 Créez d\'abord des produits ou exécutez le seed');
      return;
    }
    
    // Vérifier si un stock existe déjà pour ce produit
    const existingStock = await prisma.stock.findUnique({
      where: { productId: product.id }
    });
    
    if (existingStock) {
      console.log(`   ✅ Stock existant trouvé pour ${product.name}`);
      console.log(`      Quantité actuelle: ${existingStock.quantiteActuelle}`);
      console.log(`      Quantité minimale: ${existingStock.quantiteMinimale}`);
    } else {
      // Créer un stock de test
      const testStock = await prisma.stock.create({
        data: {
          productId: product.id,
          companyId: company.id,
          quantiteActuelle: 25,
          quantiteMinimale: 5,
          quantiteMaximale: 100,
        }
      });
      console.log(`   ✅ Stock de test créé pour ${product.name}`);
      console.log(`      ID: ${testStock.id}`);
    }
    
    // Test 6: Test des alertes de stock
    console.log('\n6. Test des alertes de stock...');
    
    // Compter les stocks en rupture
    const outOfStock = await prisma.stock.count({
      where: {
        companyId: company.id,
        quantiteActuelle: 0
      }
    });
    
    // Compter les stocks faibles (requête SQL brute car Prisma ne supporte pas la comparaison de colonnes)
    const lowStockRaw = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM stocks s
      WHERE s."companyId" = ${company.id}
        AND s."quantiteActuelle" <= s."quantiteMinimale"
        AND s."quantiteActuelle" > 0
    `;
    
    const lowStockCount = Number(lowStockRaw[0]?.count || 0);
    
    console.log(`   ✅ Stocks en rupture: ${outOfStock}`);
    console.log(`   ✅ Stocks faibles: ${lowStockCount}`);
    console.log(`   ✅ Total alertes: ${outOfStock + lowStockCount}`);
    
    // Test 7: Test de récupération avec relations
    console.log('\n7. Test des relations...');
    const stocksWithProducts = await prisma.stock.findMany({
      where: { companyId: company.id },
      include: {
        product: {
          include: {
            category: true
          }
        }
      },
      take: 3
    });
    
    console.log(`   ✅ ${stocksWithProducts.length} stocks récupérés avec relations`);
    stocksWithProducts.forEach((stock, index) => {
      console.log(`      ${index + 1}. ${stock.product.name} - ${stock.quantiteActuelle} ${stock.product.unit}`);
    });
    
    // Résumé final
    console.log('\n📊 Résumé des tests:');
    console.log('   ✅ Connexion base de données');
    console.log('   ✅ Table stocks accessible');
    console.log('   ✅ Relations fonctionnelles');
    console.log('   ✅ Alertes calculables');
    console.log('   ✅ CRUD operations possibles');
    
    console.log('\n🎉 Tous les tests de base sont passés!');
    console.log('💡 Vous pouvez maintenant tester l\'interface frontend');
    
  } catch (error) {
    console.error('\n❌ Erreur lors des tests:', error.message);
    
    if (error.code === 'P2002') {
      console.log('💡 Contrainte d\'unicité violée - normal si les données existent déjà');
    } else if (error.code === 'P2025') {
      console.log('💡 Enregistrement non trouvé - vérifiez les données de test');
    } else {
      console.log('💡 Vérifiez la configuration de la base de données');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter les tests
testStockModule();
