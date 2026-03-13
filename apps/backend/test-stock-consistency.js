const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testStockConsistency() {
  try {
    console.log('🧪 Test de cohérence des données de stock...');
    
    // Test 1: Cohérence entre tables Product et Stock
    console.log('\n1. Test de cohérence Product ↔ Stock...');
    
    const products = await prisma.product.findMany({
      where: {
        isService: false,
        isActive: true
      },
      include: {
        stock: true
      }
    });
    
    let totalProducts = products.length;
    let coherentProducts = 0;
    let inconsistentProducts = [];
    let missingStockRecords = 0;
    
    products.forEach(product => {
      if (!product.stock) {
        missingStockRecords++;
        inconsistentProducts.push({
          id: product.id,
          name: product.name,
          issue: 'Missing stock record'
        });
      } else {
        const stockMatch = product.stockQuantity === product.stock.quantiteActuelle;
        const minMatch = product.minStock === product.stock.quantiteMinimale;
        const maxMatch = product.maxStock === product.stock.quantiteMaximale;
        
        if (stockMatch && minMatch && maxMatch) {
          coherentProducts++;
        } else {
          inconsistentProducts.push({
            id: product.id,
            name: product.name,
            issue: 'Data mismatch',
            details: {
              stock: `${product.stockQuantity} vs ${product.stock.quantiteActuelle}`,
              min: `${product.minStock} vs ${product.stock.quantiteMinimale}`,
              max: `${product.maxStock} vs ${product.stock.quantiteMaximale}`
            }
          });
        }
      }
    });
    
    console.log(`📊 Résultats de cohérence:`);
    console.log(`   - Total produits: ${totalProducts}`);
    console.log(`   - Produits cohérents: ${coherentProducts}`);
    console.log(`   - Produits incohérents: ${inconsistentProducts.length}`);
    console.log(`   - Enregistrements Stock manquants: ${missingStockRecords}`);
    
    if (inconsistentProducts.length > 0) {
      console.log('\n❌ Incohérences détectées:');
      inconsistentProducts.slice(0, 5).forEach(item => {
        console.log(`   - ${item.name}: ${item.issue}`);
        if (item.details) {
          console.log(`     Stock: ${item.details.stock}`);
          console.log(`     Min: ${item.details.min}`);
          console.log(`     Max: ${item.details.max}`);
        }
      });
      if (inconsistentProducts.length > 5) {
        console.log(`   ... et ${inconsistentProducts.length - 5} autres`);
      }
    }
    
    // Test 2: Simulation de l'API unifiée
    console.log('\n2. Test de l\'API unifiée simulée...');
    
    const unifiedData = products.map(product => {
      // Logique de l'API unifiée
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
        stockQuantity,
        minStock,
        maxStock,
        status,
        source: product.stock ? 'stock_table' : 'product_table'
      };
    });
    
    const statusCounts = {
      normal: unifiedData.filter(p => p.status === 'normal').length,
      low: unifiedData.filter(p => p.status === 'low').length,
      out: unifiedData.filter(p => p.status === 'out').length,
      over: unifiedData.filter(p => p.status === 'over').length
    };
    
    console.log(`📈 Statistiques unifiées:`);
    console.log(`   - Normal: ${statusCounts.normal}`);
    console.log(`   - Stock faible: ${statusCounts.low}`);
    console.log(`   - Rupture: ${statusCounts.out}`);
    console.log(`   - Surstock: ${statusCounts.over}`);
    
    // Test 3: Vérification des sources de données
    console.log('\n3. Test des sources de données...');
    
    const sourceStats = {
      stock_table: unifiedData.filter(p => p.source === 'stock_table').length,
      product_table: unifiedData.filter(p => p.source === 'product_table').length
    };
    
    console.log(`📋 Sources de données:`);
    console.log(`   - Table Stock: ${sourceStats.stock_table}`);
    console.log(`   - Table Product: ${sourceStats.product_table}`);
    
    // Test 4: Validation des règles métier
    console.log('\n4. Test des règles métier...');
    
    let businessRuleViolations = [];
    
    unifiedData.forEach(product => {
      // Règle 1: Stock ne peut pas être négatif
      if (product.stockQuantity < 0) {
        businessRuleViolations.push({
          product: product.name,
          rule: 'Stock négatif',
          value: product.stockQuantity
        });
      }
      
      // Règle 2: Stock minimum ne peut pas être négatif
      if (product.minStock < 0) {
        businessRuleViolations.push({
          product: product.name,
          rule: 'Stock minimum négatif',
          value: product.minStock
        });
      }
      
      // Règle 3: Stock maximum doit être supérieur au minimum
      if (product.maxStock && product.maxStock <= product.minStock) {
        businessRuleViolations.push({
          product: product.name,
          rule: 'Stock maximum ≤ minimum',
          value: `max:${product.maxStock} min:${product.minStock}`
        });
      }
    });
    
    if (businessRuleViolations.length === 0) {
      console.log('✅ Toutes les règles métier sont respectées');
    } else {
      console.log(`❌ ${businessRuleViolations.length} violations de règles métier:`);
      businessRuleViolations.forEach(violation => {
        console.log(`   - ${violation.product}: ${violation.rule} (${violation.value})`);
      });
    }
    
    // Résumé final
    console.log('\n📊 Résumé du test de cohérence:');
    
    const coherencePercentage = (coherentProducts / totalProducts * 100).toFixed(1);
    console.log(`   - Cohérence globale: ${coherencePercentage}%`);
    
    if (coherencePercentage >= 95) {
      console.log('🎉 Excellente cohérence des données');
    } else if (coherencePercentage >= 80) {
      console.log('✅ Bonne cohérence des données');
    } else if (coherencePercentage >= 60) {
      console.log('⚠️ Cohérence acceptable, améliorations recommandées');
    } else {
      console.log('❌ Cohérence insuffisante, correction urgente nécessaire');
    }
    
    console.log(`   - Violations règles métier: ${businessRuleViolations.length}`);
    console.log(`   - API unifiée fonctionnelle: ${sourceStats.stock_table > 0 ? 'Oui' : 'Non'}`);
    
  } catch (error) {
    console.error('❌ Erreur lors du test de cohérence:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testStockConsistency();
