const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncUnifiedStock() {
  try {
    console.log('🔄 Synchronisation des données de stock...');
    
    // Récupérer tous les produits physiques avec leurs stocks
    const products = await prisma.product.findMany({
      where: {
        isService: false,
        isActive: true
      },
      include: {
        stock: true
      }
    });
    
    console.log(`📦 ${products.length} produits physiques trouvés`);
    
    let syncedCount = 0;
    let createdCount = 0;
    
    for (const product of products) {
      if (product.stock) {
        // Synchroniser les données existantes - utiliser Stock comme source de vérité
        const needsUpdate = 
          product.stockQuantity !== product.stock.quantiteActuelle ||
          product.minStock !== product.stock.quantiteMinimale ||
          product.maxStock !== product.stock.quantiteMaximale;
        
        if (needsUpdate) {
          await prisma.product.update({
            where: { id: product.id },
            data: {
              stockQuantity: product.stock.quantiteActuelle,
              minStock: product.stock.quantiteMinimale,
              maxStock: product.stock.quantiteMaximale
            }
          });
          
          syncedCount++;
          console.log(`✅ Synchronisé: ${product.name}`);
          console.log(`   Stock: ${product.stockQuantity} → ${product.stock.quantiteActuelle}`);
          console.log(`   Min: ${product.minStock} → ${product.stock.quantiteMinimale}`);
          console.log(`   Max: ${product.maxStock} → ${product.stock.quantiteMaximale}`);
        } else {
          console.log(`✅ ${product.name}: Déjà cohérent`);
        }
      } else {
        // Créer l'enregistrement Stock manquant
        await prisma.stock.create({
          data: {
            productId: product.id,
            companyId: product.companyId,
            quantiteActuelle: product.stockQuantity,
            quantiteMinimale: product.minStock,
            quantiteMaximale: product.maxStock,
            dateLastUpdate: new Date()
          }
        });
        
        createdCount++;
        console.log(`🆕 Stock créé pour: ${product.name}`);
      }
    }
    
    console.log(`\n📊 Résumé de la synchronisation:`);
    console.log(`   - ${products.length} produits traités`);
    console.log(`   - ${syncedCount} produits synchronisés`);
    console.log(`   - ${createdCount} stocks créés`);
    console.log(`   - ${products.length - syncedCount - createdCount} produits déjà cohérents`);
    
    // Vérifier la cohérence après synchronisation
    console.log('\n🔍 Vérification post-synchronisation...');
    const verificationProducts = await prisma.product.findMany({
      where: {
        isService: false,
        isActive: true
      },
      include: {
        stock: true
      },
      take: 5
    });
    
    let inconsistencies = 0;
    verificationProducts.forEach(product => {
      if (product.stock) {
        const stockMatch = product.stockQuantity === product.stock.quantiteActuelle;
        const minMatch = product.minStock === product.stock.quantiteMinimale;
        const maxMatch = product.maxStock === product.stock.quantiteMaximale;
        
        if (!stockMatch || !minMatch || !maxMatch) {
          inconsistencies++;
          console.log(`❌ ${product.name}: Encore incohérent`);
        } else {
          console.log(`✅ ${product.name}: Cohérent`);
        }
      }
    });
    
    if (inconsistencies === 0) {
      console.log('\n🎉 Synchronisation réussie ! Toutes les données sont cohérentes.');
    } else {
      console.log(`\n⚠️ ${inconsistencies} incohérences restantes détectées.`);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

syncUnifiedStock();
