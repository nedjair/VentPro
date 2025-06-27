// Script pour créer des données de test de base
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestData() {
  console.log('🌱 Création des données de test pour le module de stock...');
  console.log('=' .repeat(60));
  
  try {
    await prisma.$connect();
    
    // Récupérer ou créer une entreprise
    let company = await prisma.company.findFirst();
    
    if (!company) {
      console.log('Création d\'une entreprise de test...');
      company = await prisma.company.create({
        data: {
          name: 'Entreprise Test Stock',
          siret: '12345678901234',
          address: '123 Rue de Test',
          postalCode: '16000',
          city: 'Alger',
          country: 'Algérie',
          phone: '+213 21 123 456',
          email: 'test@stock.dz',
          currency: 'DA',
          timezone: 'Africa/Algiers'
        }
      });
      console.log(`✅ Entreprise créée: ${company.name}`);
    } else {
      console.log(`✅ Entreprise existante: ${company.name}`);
    }
    
    // Créer une catégorie de test
    let category = await prisma.category.findFirst({
      where: { companyId: company.id }
    });
    
    if (!category) {
      category = await prisma.category.create({
        data: {
          name: 'Produits Alimentaires',
          description: 'Produits alimentaires algériens',
          companyId: company.id
        }
      });
      console.log(`✅ Catégorie créée: ${category.name}`);
    } else {
      console.log(`✅ Catégorie existante: ${category.name}`);
    }
    
    // Produits de test algériens
    const testProducts = [
      {
        name: 'Couscous Ferrero 1kg',
        sku: 'COUSCOUS-1KG',
        price: 350.00,
        cost: 280.00,
        unit: 'kg',
        stockQuantity: 45,
        minStock: 10,
        maxStock: 100
      },
      {
        name: 'Huile Elio 1L',
        sku: 'HUILE-ELIO-1L',
        price: 420.00,
        cost: 350.00,
        unit: 'L',
        stockQuantity: 8, // Stock faible
        minStock: 15,
        maxStock: 80
      },
      {
        name: 'Thé Vert Palais des Thés 200g',
        sku: 'THE-VERT-200G',
        price: 180.00,
        cost: 140.00,
        unit: 'paquet',
        stockQuantity: 0, // Rupture de stock
        minStock: 5,
        maxStock: 50
      },
      {
        name: 'Harissa Traditionnelle 200g',
        sku: 'HARISSA-200G',
        price: 250.00,
        cost: 200.00,
        unit: 'pot',
        stockQuantity: 3, // Stock faible
        minStock: 10,
        maxStock: 40
      },
      {
        name: 'Savon Doux Alger 100g',
        sku: 'SAVON-ALGER-100G',
        price: 85.00,
        cost: 60.00,
        unit: 'pièce',
        stockQuantity: 120,
        minStock: 20,
        maxStock: 200
      }
    ];
    
    console.log('\nCréation des produits et stocks...');
    
    for (const productData of testProducts) {
      // Vérifier si le produit existe déjà
      const existingProduct = await prisma.product.findFirst({
        where: {
          OR: [
            { sku: productData.sku },
            { name: productData.name }
          ],
          companyId: company.id
        }
      });
      
      if (existingProduct) {
        console.log(`⚠️  Produit existant: ${productData.name}`);
        
        // Vérifier si un stock existe pour ce produit
        const existingStock = await prisma.stock.findUnique({
          where: { productId: existingProduct.id }
        });
        
        if (!existingStock) {
          // Créer le stock pour le produit existant
          await prisma.stock.create({
            data: {
              productId: existingProduct.id,
              companyId: company.id,
              quantiteActuelle: productData.stockQuantity,
              quantiteMinimale: productData.minStock,
              quantiteMaximale: productData.maxStock,
            }
          });
          console.log(`   ✅ Stock créé pour ${productData.name}`);
        } else {
          console.log(`   ⚠️  Stock déjà existant pour ${productData.name}`);
        }
        continue;
      }
      
      // Créer le produit
      const product = await prisma.product.create({
        data: {
          name: productData.name,
          sku: productData.sku,
          price: productData.price,
          cost: productData.cost,
          unit: productData.unit,
          stockQuantity: productData.stockQuantity,
          minStock: productData.minStock,
          maxStock: productData.maxStock,
          categoryId: category.id,
          companyId: company.id,
          isActive: true
        }
      });
      
      // Créer le stock correspondant
      await prisma.stock.create({
        data: {
          productId: product.id,
          companyId: company.id,
          quantiteActuelle: productData.stockQuantity,
          quantiteMinimale: productData.minStock,
          quantiteMaximale: productData.maxStock,
        }
      });
      
      // Créer un mouvement de stock initial si quantité > 0
      if (productData.stockQuantity > 0) {
        await prisma.stockMovement.create({
          data: {
            type: 'IN',
            quantity: productData.stockQuantity,
            reference: 'STOCK_INITIAL',
            comment: 'Stock initial - données de test',
            productId: product.id
          }
        });
      }
      
      console.log(`✅ Produit et stock créés: ${productData.name} (${productData.stockQuantity} ${productData.unit})`);
    }
    
    // Statistiques finales
    const totalStocks = await prisma.stock.count({
      where: { companyId: company.id }
    });
    
    const outOfStock = await prisma.stock.count({
      where: {
        companyId: company.id,
        quantiteActuelle: 0
      }
    });
    
    const lowStockRaw = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM stocks s
      WHERE s."companyId" = ${company.id}
        AND s."quantiteActuelle" <= s."quantiteMinimale"
        AND s."quantiteActuelle" > 0
    `;
    
    const lowStockCount = Number(lowStockRaw[0]?.count || 0);
    
    console.log('\n📊 Résumé des données créées:');
    console.log(`   📦 Total stocks: ${totalStocks}`);
    console.log(`   🔴 Ruptures de stock: ${outOfStock}`);
    console.log(`   🟠 Stocks faibles: ${lowStockCount}`);
    console.log(`   🟢 Stocks normaux: ${totalStocks - outOfStock - lowStockCount}`);
    
    console.log('\n🎉 Données de test créées avec succès!');
    console.log('💡 Vous pouvez maintenant tester le module de stock');
    
  } catch (error) {
    console.error('❌ Erreur lors de la création des données:', error.message);
    
    if (error.code === 'P2002') {
      console.log('💡 Certaines données existent déjà (normal)');
    }
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();
