const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function deployUnifiedStockSolution() {
  console.log('🚀 Déploiement de la Solution Unifiée de Gestion des Stocks');
  console.log('=' .repeat(70));
  
  const startTime = Date.now();
  let errors = [];
  let warnings = [];
  
  try {
    // Étape 1: Vérification des prérequis
    console.log('\n1. 🔍 Vérification des prérequis...');
    
    // Vérifier la connexion à la base de données
    try {
      await prisma.$connect();
      console.log('   ✅ Connexion à la base de données : OK');
    } catch (error) {
      errors.push('Connexion à la base de données échouée');
      console.log('   ❌ Connexion à la base de données : ÉCHEC');
    }
    
    // Vérifier l'existence des tables nécessaires
    try {
      const productCount = await prisma.product.count();
      const stockCount = await prisma.stock.count();
      console.log(`   ✅ Table Product : ${productCount} enregistrements`);
      console.log(`   ✅ Table Stock : ${stockCount} enregistrements`);
    } catch (error) {
      errors.push('Tables Product ou Stock manquantes');
      console.log('   ❌ Tables nécessaires : MANQUANTES');
    }
    
    // Vérifier l'existence des services
    const servicesPath = path.join(__dirname, 'src', 'services');
    const requiredServices = [
      'unified-stock.service.ts',
      'stock-audit.service.ts',
      'unified-stock-integration.service.ts'
    ];
    
    for (const service of requiredServices) {
      const servicePath = path.join(servicesPath, service);
      if (fs.existsSync(servicePath)) {
        console.log(`   ✅ Service ${service} : Présent`);
      } else {
        errors.push(`Service ${service} manquant`);
        console.log(`   ❌ Service ${service} : MANQUANT`);
      }
    }
    
    // Étape 2: Analyse de l'état actuel
    console.log('\n2. 📊 Analyse de l\'état actuel...');
    
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
    
    console.log(`   📦 Total produits physiques : ${products.length}`);
    console.log(`   ✅ Produits cohérents : ${coherentCount}`);
    console.log(`   ❌ Produits incohérents : ${inconsistentCount}`);
    console.log(`   ⚠️ Stocks manquants : ${missingStockCount}`);
    
    const coherencePercentage = products.length > 0 ? (coherentCount / products.length * 100).toFixed(1) : 0;
    console.log(`   📈 Taux de cohérence actuel : ${coherencePercentage}%`);
    
    // Étape 3: Sauvegarde de sécurité
    console.log('\n3. 💾 Sauvegarde de sécurité...');
    
    const backupData = {
      timestamp: new Date().toISOString(),
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        stockQuantity: p.stockQuantity,
        minStock: p.minStock,
        maxStock: p.maxStock,
        stock: p.stock ? {
          quantiteActuelle: p.stock.quantiteActuelle,
          quantiteMinimale: p.stock.quantiteMinimale,
          quantiteMaximale: p.stock.quantiteMaximale
        } : null
      }))
    };
    
    const backupPath = path.join(__dirname, `backup-stock-${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    console.log(`   ✅ Sauvegarde créée : ${backupPath}`);
    
    // Étape 4: Synchronisation des données
    console.log('\n4. 🔄 Synchronisation des données...');
    
    if (inconsistentCount > 0 || missingStockCount > 0) {
      console.log('   🔧 Correction des incohérences détectées...');
      
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
        }
      }
      
      console.log(`   ✅ Produits synchronisés : ${syncedCount}`);
      console.log(`   ✅ Stocks créés : ${createdCount}`);
    } else {
      console.log('   ✅ Aucune synchronisation nécessaire');
    }
    
    // Étape 5: Vérification post-synchronisation
    console.log('\n5. ✅ Vérification post-synchronisation...');
    
    const verificationProducts = await prisma.product.findMany({
      where: { isService: false },
      include: { stock: true }
    });
    
    let finalCoherentCount = 0;
    let finalInconsistentCount = 0;
    
    verificationProducts.forEach(product => {
      if (product.stock) {
        const isCoherent = 
          product.stockQuantity === product.stock.quantiteActuelle &&
          product.minStock === product.stock.quantiteMinimale &&
          product.maxStock === product.stock.quantiteMaximale;
        
        if (isCoherent) {
          finalCoherentCount++;
        } else {
          finalInconsistentCount++;
        }
      }
    });
    
    const finalCoherencePercentage = verificationProducts.length > 0 ? 
      (finalCoherentCount / verificationProducts.length * 100).toFixed(1) : 0;
    
    console.log(`   📦 Total produits vérifiés : ${verificationProducts.length}`);
    console.log(`   ✅ Produits cohérents : ${finalCoherentCount}`);
    console.log(`   ❌ Produits incohérents : ${finalInconsistentCount}`);
    console.log(`   📈 Taux de cohérence final : ${finalCoherencePercentage}%`);
    
    if (finalInconsistentCount > 0) {
      warnings.push(`${finalInconsistentCount} produits restent incohérents`);
    }
    
    // Étape 6: Test des performances
    console.log('\n6. ⚡ Test des performances...');
    
    const perfStart = Date.now();
    
    // Test requête simple
    const simpleStart = Date.now();
    await prisma.product.findMany({
      where: { isService: false },
      take: 10
    });
    const simpleTime = Date.now() - simpleStart;
    
    // Test requête avec relations
    const relationStart = Date.now();
    await prisma.product.findMany({
      where: { isService: false },
      include: { stock: true },
      take: 10
    });
    const relationTime = Date.now() - relationStart;
    
    const totalPerfTime = Date.now() - perfStart;
    
    console.log(`   📊 Requête simple : ${simpleTime}ms`);
    console.log(`   📊 Requête avec relations : ${relationTime}ms`);
    console.log(`   📊 Temps total : ${totalPerfTime}ms`);
    
    if (Math.max(simpleTime, relationTime) > 2000) {
      warnings.push('Performances dégradées (> 2s)');
    } else {
      console.log('   ✅ Performances acceptables (< 2s)');
    }
    
    // Étape 7: Validation finale
    console.log('\n7. 🎯 Validation finale...');
    
    const validationChecks = [
      { name: 'Cohérence des données', passed: finalCoherencePercentage >= 95 },
      { name: 'Performance acceptable', passed: Math.max(simpleTime, relationTime) <= 2000 },
      { name: 'Services présents', passed: requiredServices.every(s => fs.existsSync(path.join(servicesPath, s))) },
      { name: 'Base de données accessible', passed: errors.length === 0 }
    ];
    
    validationChecks.forEach(check => {
      console.log(`   ${check.passed ? '✅' : '❌'} ${check.name}`);
    });
    
    const allChecksPassed = validationChecks.every(check => check.passed);
    
    // Résumé final
    const deploymentTime = Date.now() - startTime;
    
    console.log('\n' + '=' .repeat(70));
    console.log('📊 RÉSUMÉ DU DÉPLOIEMENT');
    console.log('=' .repeat(70));
    
    console.log(`⏱️ Temps de déploiement : ${deploymentTime}ms`);
    console.log(`📈 Amélioration cohérence : ${coherencePercentage}% → ${finalCoherencePercentage}%`);
    console.log(`🔧 Produits traités : ${products.length}`);
    console.log(`💾 Sauvegarde : ${backupPath}`);
    
    if (errors.length > 0) {
      console.log('\n❌ ERREURS :');
      errors.forEach(error => console.log(`   - ${error}`));
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️ AVERTISSEMENTS :');
      warnings.forEach(warning => console.log(`   - ${warning}`));
    }
    
    if (allChecksPassed && errors.length === 0) {
      console.log('\n🎉 DÉPLOIEMENT RÉUSSI !');
      console.log('✅ La solution unifiée de gestion des stocks est opérationnelle');
      console.log('📚 Consultez GUIDE_UTILISATEUR_STOCKS.md pour l\'utilisation');
      console.log('🔧 Consultez SOLUTION_STOCK_COHERENCE.md pour la maintenance');
    } else {
      console.log('\n⚠️ DÉPLOIEMENT PARTIEL');
      console.log('🔧 Veuillez corriger les erreurs avant la mise en production');
    }
    
  } catch (error) {
    console.error('\n❌ ERREUR CRITIQUE lors du déploiement:', error.message);
    errors.push(`Erreur critique: ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }
  
  return {
    success: errors.length === 0,
    errors,
    warnings,
    deploymentTime: Date.now() - startTime
  };
}

// Exécution du script
if (require.main === module) {
  deployUnifiedStockSolution()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = { deployUnifiedStockSolution };
