#!/usr/bin/env node

/**
 * Script de validation finale du nettoyage des boutons "Test API"
 * Vérifie que tous les éléments ont été correctement supprimés
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 VALIDATION FINALE DU NETTOYAGE "TEST API"\n');

// Termes interdits qui ne devraient plus apparaître dans les composants
const forbiddenTerms = [
  'Test API',
  'Tester API',
  'API Test',
  'Lancer le test API',
  'Tester l\'API',
  'ApiTestComponent',
  'ClientsApiTestComponent', 
  'ProductsApiTestComponent',
  'InvoicesApiTestComponent',
  'OrdersApiTestComponent',
  'API connectée',
  'API déconnectée',
  'testAPI(',
  'ApiStatus'
];

// Fichiers à vérifier (composants de production uniquement)
const filesToCheck = [
  'frontend-nextjs-production/src/components/pages/reports/index.tsx',
  'frontend-nextjs-production/src/components/pages/clients.tsx', 
  'frontend-nextjs-production/src/components/pages/products.tsx',
  'frontend-nextjs-production/src/components/pages/orders/index.tsx',
  'frontend-nextjs-production/src/components/pages/invoices/index.tsx',
  'frontend-nextjs-production/src/components/layout/sidebar.tsx',
  'frontend-nextjs-production/src/components/layout/header.tsx',
  'frontend-nextjs-production/src/components/dashboard/stats-cards.tsx',
  'frontend-nextjs-production/src/app/page.tsx',
  'frontend-nextjs-production/src/app/layout.tsx'
];

// Dossiers qui ne devraient plus exister
const forbiddenFolders = [
  'frontend-nextjs-production/src/components/debug',
  'frontend-nextjs-production/src/app/test-api',
  'apps/frontend/src/components/debug'
];

// Fichiers qui ne devraient plus exister
const forbiddenFiles = [
  'frontend-nextjs-production/src/components/dashboard/api-tests.tsx',
  'test-frontend.html',
  'test-boutons-direct.html', 
  'test-frontend-backend.html',
  'test-bouton-simple.html'
];

let issuesFound = 0;
let validationsPassed = 0;

console.log('📁 1. VÉRIFICATION DES DOSSIERS SUPPRIMÉS\n');

forbiddenFolders.forEach(folder => {
  if (fs.existsSync(folder)) {
    console.log(`❌ ERREUR: Dossier encore présent: ${folder}`);
    issuesFound++;
  } else {
    console.log(`✅ Dossier supprimé: ${folder}`);
    validationsPassed++;
  }
});

console.log('\n📄 2. VÉRIFICATION DES FICHIERS SUPPRIMÉS\n');

forbiddenFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`❌ ERREUR: Fichier encore présent: ${file}`);
    issuesFound++;
  } else {
    console.log(`✅ Fichier supprimé: ${file}`);
    validationsPassed++;
  }
});

console.log('\n🔍 3. VÉRIFICATION DU CONTENU DES COMPOSANTS\n');

filesToCheck.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    console.log(`📄 Vérification: ${fileName}`);
    
    let fileHasIssues = false;
    
    forbiddenTerms.forEach(term => {
      if (content.includes(term)) {
        console.log(`   ❌ Terme interdit trouvé: "${term}"`);
        issuesFound++;
        fileHasIssues = true;
      }
    });
    
    if (!fileHasIssues) {
      console.log(`   ✅ Aucun terme interdit trouvé`);
      validationsPassed++;
    }
  } else {
    console.log(`⚠️  Fichier non trouvé: ${filePath}`);
  }
});

console.log('\n🔧 4. VÉRIFICATION DES IMPORTS CASSÉS\n');

// Vérifier les imports vers des fichiers supprimés
const brokenImports = [
  '@/components/debug/',
  './debug/',
  '../debug/',
  'api-test',
  'clients-api-test',
  'products-api-test',
  'invoices-api-test',
  'orders-api-test'
];

filesToCheck.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    let fileHasBrokenImports = false;
    
    brokenImports.forEach(importPath => {
      if (content.includes(importPath)) {
        console.log(`❌ Import cassé dans ${fileName}: ${importPath}`);
        issuesFound++;
        fileHasBrokenImports = true;
      }
    });
    
    if (!fileHasBrokenImports) {
      console.log(`✅ Aucun import cassé dans ${fileName}`);
      validationsPassed++;
    }
  }
});

console.log('\n📊 5. RÉSUMÉ DE LA VALIDATION\n');
console.log('='.repeat(50));

if (issuesFound === 0) {
  console.log('🎉 VALIDATION RÉUSSIE !');
  console.log('✅ Tous les boutons "Test API" ont été supprimés');
  console.log('✅ Tous les composants de debug ont été supprimés');
  console.log('✅ Aucun import cassé détecté');
  console.log('✅ L\'application est prête pour la production');
  console.log('');
  console.log(`📈 Validations réussies: ${validationsPassed}`);
  console.log('🚀 L\'interface utilisateur est maintenant propre et professionnelle');
} else {
  console.log('❌ VALIDATION ÉCHOUÉE !');
  console.log(`🚨 ${issuesFound} problème(s) détecté(s)`);
  console.log(`📈 Validations réussies: ${validationsPassed}`);
  console.log('');
  console.log('💡 Actions recommandées:');
  console.log('   1. Corriger les problèmes listés ci-dessus');
  console.log('   2. Relancer ce script de validation');
  console.log('   3. Tester l\'application manuellement');
}

console.log('\n📋 6. PROCHAINES ÉTAPES\n');

if (issuesFound === 0) {
  console.log('✅ Nettoyage terminé avec succès');
  console.log('🔄 Vous pouvez maintenant:');
  console.log('   1. Démarrer l\'application: npm run dev');
  console.log('   2. Tester les fonctionnalités principales');
  console.log('   3. Vérifier que l\'interface est propre');
  console.log('   4. Déployer en production si nécessaire');
} else {
  console.log('⚠️  Nettoyage incomplet');
  console.log('🔧 Actions requises:');
  console.log('   1. Corriger les problèmes identifiés');
  console.log('   2. Relancer la validation');
  console.log('   3. Tester l\'application');
}

console.log('\n' + '='.repeat(50));
console.log(`📊 SCORE FINAL: ${validationsPassed}/${validationsPassed + issuesFound}`);

// Code de sortie
process.exit(issuesFound === 0 ? 0 : 1);
