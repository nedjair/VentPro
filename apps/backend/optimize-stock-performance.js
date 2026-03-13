const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function optimizeStockPerformance() {
  try {
    console.log('🚀 Optimisation des performances de stock...');
    
    // Test 1: Mesurer les performances des requêtes actuelles
    console.log('\n1. Test de performance des requêtes...');
    
    const startTime = Date.now();
    
    // Requête unifiée optimisée
    const products = await prisma.product.findMany({
      where: {
        isService: false,
        isActive: true
      },
      include: {
        stock: {
          select: {
            quantiteActuelle: true,
            quantiteMinimale: true,
            quantiteMaximale: true,
            dateLastUpdate: true
          }
        },
        category: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    const endTime = Date.now();
    const queryTime = endTime - startTime;
    
    console.log(`📊 Requête exécutée en ${queryTime}ms pour ${products.length} produits`);
    
    if (queryTime > 2000) {
      console.log('⚠️ Requête trop lente (>2s), optimisation nécessaire');
    } else {
      console.log('✅ Performance acceptable (<2s)');
    }
    
    // Test 2: Vérifier les index existants
    console.log('\n2. Vérification des index...');
    
    const indexes = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND (tablename = 'products' OR tablename = 'stocks')
      ORDER BY tablename, indexname;
    `;
    
    console.log('📋 Index existants:');
    indexes.forEach(index => {
      console.log(`  - ${index.tablename}.${index.indexname}`);
    });
    
    // Test 3: Analyser les requêtes lentes potentielles
    console.log('\n3. Test de requêtes spécifiques...');
    
    // Test recherche par nom
    const searchStart = Date.now();
    const searchResults = await prisma.product.findMany({
      where: {
        isService: false,
        isActive: true,
        name: {
          contains: 'HP',
          mode: 'insensitive'
        }
      },
      include: {
        stock: true
      }
    });
    const searchTime = Date.now() - searchStart;
    console.log(`🔍 Recherche par nom: ${searchTime}ms (${searchResults.length} résultats)`);
    
    // Test filtrage par statut de stock
    const filterStart = Date.now();
    const lowStockProducts = await prisma.product.findMany({
      where: {
        isService: false,
        isActive: true,
        stock: {
          quantiteActuelle: {
            lte: prisma.stock.fields.quantiteMinimale
          }
        }
      },
      include: {
        stock: true
      }
    });
    const filterTime = Date.now() - filterStart;
    console.log(`📊 Filtrage stock faible: ${filterTime}ms (${lowStockProducts.length} résultats)`);
    
    // Test 4: Recommandations d'optimisation
    console.log('\n4. Recommandations d\'optimisation...');
    
    const recommendations = [];
    
    if (queryTime > 1000) {
      recommendations.push('Ajouter un index composite sur (companyId, isService, isActive)');
    }
    
    if (searchTime > 500) {
      recommendations.push('Ajouter un index GIN pour la recherche textuelle sur le nom');
    }
    
    if (filterTime > 500) {
      recommendations.push('Optimiser les requêtes de filtrage avec des vues matérialisées');
    }
    
    if (recommendations.length === 0) {
      console.log('✅ Aucune optimisation nécessaire, performances acceptables');
    } else {
      console.log('📝 Recommandations:');
      recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }
    
    // Test 5: Simulation de charge
    console.log('\n5. Test de charge simulé...');
    
    const concurrentRequests = 5;
    const promises = [];
    
    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(
        prisma.product.findMany({
          where: {
            isService: false,
            isActive: true
          },
          include: {
            stock: true
          },
          take: 20
        })
      );
    }
    
    const loadTestStart = Date.now();
    await Promise.all(promises);
    const loadTestTime = Date.now() - loadTestStart;
    
    console.log(`🔄 ${concurrentRequests} requêtes concurrentes: ${loadTestTime}ms`);
    console.log(`📈 Temps moyen par requête: ${(loadTestTime / concurrentRequests).toFixed(2)}ms`);
    
    // Résumé final
    console.log('\n📊 Résumé des performances:');
    console.log(`   - Requête principale: ${queryTime}ms`);
    console.log(`   - Recherche: ${searchTime}ms`);
    console.log(`   - Filtrage: ${filterTime}ms`);
    console.log(`   - Charge concurrente: ${loadTestTime}ms`);
    
    const overallPerformance = Math.max(queryTime, searchTime, filterTime);
    if (overallPerformance < 500) {
      console.log('🚀 Excellentes performances');
    } else if (overallPerformance < 1000) {
      console.log('✅ Bonnes performances');
    } else if (overallPerformance < 2000) {
      console.log('⚠️ Performances acceptables');
    } else {
      console.log('❌ Performances insuffisantes');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test de performance:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

optimizeStockPerformance();
