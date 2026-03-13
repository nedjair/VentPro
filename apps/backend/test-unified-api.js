const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testUnifiedAPI() {
  try {
    console.log('🧪 Test de l\'API unifiée de stock...');
    
    // Test 1: Vérifier la cohérence des données
    console.log('\n1. Vérification de la cohérence des données...');
    const products = await prisma.product.findMany({
      where: { isService: false },
      include: { stock: true },
      take: 5
    });
    
    let coherentCount = 0;
    products.forEach(product => {
      if (product.stock) {
        const isCoherent = 
          product.stockQuantity === product.stock.quantiteActuelle &&
          product.minStock === product.stock.quantiteMinimale &&
          product.maxStock === product.stock.quantiteMaximale;
        
        if (isCoherent) {
          coherentCount++;
          console.log(`✅ ${product.name}: Cohérent`);
        } else {
          console.log(`❌ ${product.name}: Incohérent`);
          console.log(`   Product: ${product.stockQuantity}/${product.minStock}/${product.maxStock}`);
          console.log(`   Stock: ${product.stock.quantiteActuelle}/${product.stock.quantiteMinimale}/${product.stock.quantiteMaximale}`);
        }
      }
    });
    
    console.log(`\n📊 Résultat: ${coherentCount}/${products.length} produits cohérents`);
    
    // Test 2: Simuler les données que l'API retournerait
    console.log('\n2. Simulation des données API unifiées...');
    const unifiedProducts = products.map(product => {
      const stockQuantity = product.stock?.quantiteActuelle ?? product.stockQuantity;
      const minStock = product.stock?.quantiteMinimale ?? product.minStock;
      const maxStock = product.stock?.quantiteMaximale ?? product.maxStock;
      
      let status = 'normal';
      if (stockQuantity === 0) {
        status = 'out';
      } else if (minStock > 0 && stockQuantity <= minStock) {
        status = 'low';
      } else if (maxStock && stockQuantity > maxStock) {
        status = 'over';
      }
      
      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        stockQuantity,
        minStock,
        maxStock,
        status,
        statusLabel: getStatusLabel(status),
        value: stockQuantity * Number(product.price),
        unit: product.unit,
        lastUpdate: product.stock?.dateLastUpdate ?? product.updatedAt
      };
    });
    
    console.log('\n📦 Produits unifiés:');
    unifiedProducts.forEach(product => {
      console.log(`  - ${product.name}: ${product.stockQuantity} ${product.unit} (${product.statusLabel})`);
    });
    
    // Test 3: Statistiques
    console.log('\n3. Statistiques unifiées...');
    const stats = {
      total: unifiedProducts.length,
      outOfStock: unifiedProducts.filter(p => p.status === 'out').length,
      lowStock: unifiedProducts.filter(p => p.status === 'low').length,
      overStock: unifiedProducts.filter(p => p.status === 'over').length,
      normal: unifiedProducts.filter(p => p.status === 'normal').length,
      totalValue: unifiedProducts.reduce((sum, p) => sum + p.value, 0)
    };
    
    console.log(`📊 Statistiques:`);
    console.log(`   - Total: ${stats.total} produits`);
    console.log(`   - Rupture: ${stats.outOfStock} produits`);
    console.log(`   - Stock faible: ${stats.lowStock} produits`);
    console.log(`   - Surstock: ${stats.overStock} produits`);
    console.log(`   - Normal: ${stats.normal} produits`);
    console.log(`   - Valeur totale: ${stats.totalValue.toFixed(2)} DA`);
    
    console.log('\n✅ Test de l\'API unifiée terminé avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

function getStatusLabel(status) {
  switch (status) {
    case 'out': return 'Rupture';
    case 'low': return 'Stock faible';
    case 'over': return 'Surstock';
    case 'normal': return 'Normal';
    default: return 'Inconnu';
  }
}

testUnifiedAPI();
