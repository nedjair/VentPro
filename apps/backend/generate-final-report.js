const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function generateFinalReport() {
  console.log('📊 Génération du Rapport Final - Solution Stocks Unifiée');
  console.log('=' .repeat(70));
  
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {},
    metrics: {},
    validation: {},
    files: {}
  };
  
  try {
    // 1. Métriques de cohérence
    console.log('\n📈 Analyse de cohérence...');
    
    const products = await prisma.product.findMany({
      where: { isService: false },
      include: { stock: true }
    });
    
    let coherentCount = 0;
    let inconsistentCount = 0;
    let missingStockCount = 0;
    
    products.forEach(product => {
      if (!product.stock) {
        missingStockCount++;
      } else {
        const isCoherent = 
          product.stockQuantity === product.stock.quantiteActuelle &&
          product.minStock === product.stock.quantiteMinimale &&
          product.maxStock === product.stock.quantiteMaximale;
        
        if (isCoherent) {
          coherentCount++;
        } else {
          inconsistentCount++;
        }
      }
    });
    
    const coherencePercentage = products.length > 0 ? (coherentCount / products.length * 100) : 0;
    
    reportData.metrics.coherence = {
      totalProducts: products.length,
      coherentProducts: coherentCount,
      inconsistentProducts: inconsistentCount,
      missingStocks: missingStockCount,
      coherencePercentage: Math.round(coherencePercentage * 10) / 10
    };
    
    console.log(`   Total produits: ${products.length}`);
    console.log(`   Cohérents: ${coherentCount} (${coherencePercentage.toFixed(1)}%)`);
    console.log(`   Incohérents: ${inconsistentCount}`);
    console.log(`   Stocks manquants: ${missingStockCount}`);
    
    // 2. Métriques de performance
    console.log('\n⚡ Test de performance...');
    
    const perfTests = [];
    
    // Test requête simple
    const simpleStart = Date.now();
    await prisma.product.findMany({
      where: { isService: false },
      take: 10
    });
    const simpleTime = Date.now() - simpleStart;
    perfTests.push({ name: 'Requête simple', time: simpleTime });
    
    // Test requête avec relations
    const relationStart = Date.now();
    await prisma.product.findMany({
      where: { isService: false },
      include: { stock: true, category: true },
      take: 10
    });
    const relationTime = Date.now() - relationStart;
    perfTests.push({ name: 'Requête avec relations', time: relationTime });
    
    // Test recherche
    const searchStart = Date.now();
    await prisma.product.findMany({
      where: {
        isService: false,
        name: { contains: 'HP', mode: 'insensitive' }
      },
      include: { stock: true }
    });
    const searchTime = Date.now() - searchStart;
    perfTests.push({ name: 'Recherche textuelle', time: searchTime });
    
    // Test concurrent
    const concurrentStart = Date.now();
    await Promise.all([
      prisma.product.findMany({ where: { isService: false }, take: 5 }),
      prisma.product.findMany({ where: { isService: false }, take: 5 }),
      prisma.product.findMany({ where: { isService: false }, take: 5 })
    ]);
    const concurrentTime = Date.now() - concurrentStart;
    perfTests.push({ name: 'Requêtes concurrentes', time: concurrentTime });
    
    reportData.metrics.performance = {
      tests: perfTests,
      maxTime: Math.max(...perfTests.map(t => t.time)),
      avgTime: Math.round(perfTests.reduce((sum, t) => sum + t.time, 0) / perfTests.length),
      under2s: perfTests.every(t => t.time < 2000)
    };
    
    perfTests.forEach(test => {
      console.log(`   ${test.name}: ${test.time}ms`);
    });
    console.log(`   Performance < 2s: ${reportData.metrics.performance.under2s ? 'OUI' : 'NON'}`);
    
    // 3. Validation des fichiers
    console.log('\n📁 Validation des fichiers...');
    
    const requiredFiles = [
      'src/services/unified-stock.service.ts',
      'src/services/stock-audit.service.ts',
      'src/services/unified-stock-integration.service.ts',
      '../frontend/src/hooks/useUnifiedStockCache.ts'
    ];
    
    const fileValidation = {};
    
    requiredFiles.forEach(file => {
      const filePath = path.join(__dirname, file);
      const exists = fs.existsSync(filePath);
      const size = exists ? fs.statSync(filePath).size : 0;
      
      fileValidation[file] = {
        exists,
        size,
        sizeKB: Math.round(size / 1024 * 10) / 10
      };
      
      console.log(`   ${file}: ${exists ? '✅' : '❌'} (${fileValidation[file].sizeKB}KB)`);
    });
    
    reportData.files = fileValidation;
    
    // 4. Validation des API endpoints
    console.log('\n🔗 Validation des endpoints...');
    
    const routesFile = path.join(__dirname, 'src/routes/stock.ts');
    const routesContent = fs.existsSync(routesFile) ? fs.readFileSync(routesFile, 'utf8') : '';
    
    const expectedEndpoints = [
      '/unified/sync',
      '/unified/products',
      '/unified/products/:id'
    ];
    
    const endpointValidation = {};
    expectedEndpoints.forEach(endpoint => {
      const exists = routesContent.includes(endpoint);
      endpointValidation[endpoint] = exists;
      console.log(`   ${endpoint}: ${exists ? '✅' : '❌'}`);
    });
    
    reportData.validation.endpoints = endpointValidation;
    
    // 5. Analyse des statuts de stock
    console.log('\n📊 Analyse des statuts de stock...');
    
    const stockStatuses = {
      normal: 0,
      low: 0,
      out: 0,
      over: 0
    };
    
    products.forEach(product => {
      const stockQuantity = product.stock?.quantiteActuelle ?? product.stockQuantity;
      const minStock = product.stock?.quantiteMinimale ?? product.minStock;
      const maxStock = product.stock?.quantiteMaximale ?? product.maxStock;
      
      if (stockQuantity === 0) {
        stockStatuses.out++;
      } else if (minStock > 0 && stockQuantity <= minStock) {
        stockStatuses.low++;
      } else if (maxStock && stockQuantity > maxStock) {
        stockStatuses.over++;
      } else {
        stockStatuses.normal++;
      }
    });
    
    reportData.metrics.stockStatuses = stockStatuses;
    
    Object.entries(stockStatuses).forEach(([status, count]) => {
      const percentage = products.length > 0 ? (count / products.length * 100).toFixed(1) : 0;
      console.log(`   ${status}: ${count} produits (${percentage}%)`);
    });
    
    // 6. Calcul du score global
    console.log('\n🎯 Calcul du score global...');
    
    const scores = {
      coherence: Math.min(100, coherencePercentage),
      performance: reportData.metrics.performance.under2s ? 100 : 50,
      files: Object.values(fileValidation).filter(f => f.exists).length / requiredFiles.length * 100,
      endpoints: Object.values(endpointValidation).filter(e => e).length / expectedEndpoints.length * 100
    };
    
    const globalScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length;
    
    reportData.summary = {
      globalScore: Math.round(globalScore * 10) / 10,
      scores,
      status: globalScore >= 95 ? 'EXCELLENT' : globalScore >= 80 ? 'BON' : globalScore >= 60 ? 'ACCEPTABLE' : 'INSUFFISANT',
      readyForProduction: globalScore >= 90 && coherencePercentage >= 95
    };
    
    Object.entries(scores).forEach(([category, score]) => {
      console.log(`   ${category}: ${score.toFixed(1)}%`);
    });
    console.log(`   Score global: ${globalScore.toFixed(1)}%`);
    console.log(`   Statut: ${reportData.summary.status}`);
    console.log(`   Prêt pour production: ${reportData.summary.readyForProduction ? 'OUI' : 'NON'}`);
    
    // 7. Génération du rapport
    console.log('\n📄 Génération du rapport...');
    
    const reportPath = path.join(__dirname, `rapport-final-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    
    // Génération du rapport markdown
    const markdownReport = generateMarkdownReport(reportData);
    const markdownPath = path.join(__dirname, `rapport-final-${Date.now()}.md`);
    fs.writeFileSync(markdownPath, markdownReport);
    
    console.log(`   Rapport JSON: ${reportPath}`);
    console.log(`   Rapport Markdown: ${markdownPath}`);
    
    // 8. Résumé final
    console.log('\n' + '=' .repeat(70));
    console.log('🎉 RAPPORT FINAL GÉNÉRÉ');
    console.log('=' .repeat(70));
    
    console.log(`📊 Score Global: ${globalScore.toFixed(1)}% (${reportData.summary.status})`);
    console.log(`🎯 Cohérence: ${coherencePercentage.toFixed(1)}%`);
    console.log(`⚡ Performance: ${reportData.metrics.performance.under2s ? 'EXCELLENTE' : 'À AMÉLIORER'}`);
    console.log(`🚀 Prêt pour production: ${reportData.summary.readyForProduction ? 'OUI' : 'NON'}`);
    
    if (reportData.summary.readyForProduction) {
      console.log('\n✅ VALIDATION COMPLÈTE - DÉPLOIEMENT RECOMMANDÉ');
    } else {
      console.log('\n⚠️ AMÉLIORATIONS NÉCESSAIRES AVANT DÉPLOIEMENT');
    }
    
    return reportData;
    
  } catch (error) {
    console.error('❌ Erreur lors de la génération du rapport:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function generateMarkdownReport(data) {
  return `# 📊 Rapport Final - Solution Stocks Unifiée

**Date:** ${new Date(data.timestamp).toLocaleString()}
**Score Global:** ${data.summary.globalScore}% (${data.summary.status})

## 🎯 Résumé Exécutif

- **Cohérence des données:** ${data.metrics.coherence.coherencePercentage}%
- **Performance:** ${data.metrics.performance.under2s ? 'Excellente' : 'À améliorer'}
- **Prêt pour production:** ${data.summary.readyForProduction ? 'OUI' : 'NON'}

## 📈 Métriques Détaillées

### Cohérence des Données
- Total produits: ${data.metrics.coherence.totalProducts}
- Produits cohérents: ${data.metrics.coherence.coherentProducts}
- Produits incohérents: ${data.metrics.coherence.inconsistentProducts}
- Stocks manquants: ${data.metrics.coherence.missingStocks}

### Performance
${data.metrics.performance.tests.map(test => `- ${test.name}: ${test.time}ms`).join('\n')}
- Temps maximum: ${data.metrics.performance.maxTime}ms
- Temps moyen: ${data.metrics.performance.avgTime}ms

### Statuts de Stock
- Normal: ${data.metrics.stockStatuses.normal} produits
- Stock faible: ${data.metrics.stockStatuses.low} produits
- Rupture: ${data.metrics.stockStatuses.out} produits
- Surstock: ${data.metrics.stockStatuses.over} produits

## ✅ Validation

### Fichiers
${Object.entries(data.files).map(([file, info]) => `- ${file}: ${info.exists ? '✅' : '❌'} (${info.sizeKB}KB)`).join('\n')}

### Endpoints API
${Object.entries(data.validation.endpoints).map(([endpoint, exists]) => `- ${endpoint}: ${exists ? '✅' : '❌'}`).join('\n')}

## 🎉 Conclusion

${data.summary.readyForProduction ? 
  '✅ **SOLUTION VALIDÉE** - Prête pour le déploiement en production' : 
  '⚠️ **AMÉLIORATIONS NÉCESSAIRES** - Corriger les points identifiés avant déploiement'}
`;
}

// Exécution du script
if (require.main === module) {
  generateFinalReport()
    .then(report => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = { generateFinalReport };
