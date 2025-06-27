#!/usr/bin/env node

/**
 * Script de vérification du nettoyage de l'interface utilisateur
 * Vérifie que tous les éléments de test/débogage ont été supprimés
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 VÉRIFICATION DU NETTOYAGE DE L\'INTERFACE UTILISATEUR\n');

// Termes à rechercher qui indiquent des éléments de test/débogage
const testTerms = [
  'Test API',
  'Tester l\'API',
  'Lancer le test',
  'API connectée',
  'API déconnectée',
  'testAPI',
  'ApiTestComponent',
  'ConnectionTestComponent',
  'AuthStatusComponent',
  'debug/',
  'ApiStatus'
];

// Fichiers à vérifier
const filesToCheck = [
  'apps/frontend/src/components/pages/dashboard.tsx',
  'apps/frontend/src/components/pages/clients.tsx',
  'apps/frontend/src/components/pages/products.tsx',
  'apps/frontend/src/components/pages/orders/index.tsx',
  'apps/frontend/src/components/pages/invoices/index.tsx',
  'apps/frontend/src/components/pages/reports/index.tsx',
  'apps/frontend/src/components/layout/header.tsx',
  'apps/frontend/src/components/layout/sidebar.tsx',
  'apps/frontend/src/components/layout/main-layout.tsx'
];

// Dossiers qui ne devraient plus exister
const foldersToCheck = [
  'apps/frontend/src/components/debug',
  'apps/frontend/src/app/test-api',
  'apps/frontend/src/app/test',
  'apps/frontend/src/app/test-boutons',
  'apps/frontend/src/app/test-minimal',
  'apps/frontend/src/app/test-simple'
];

let issuesFound = 0;

function checkFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Fichier non trouvé: ${filePath}`);
    return;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    let fileHasIssues = false;

    testTerms.forEach(term => {
      if (content.includes(term)) {
        if (!fileHasIssues) {
          console.log(`❌ ${fileName}:`);
          fileHasIssues = true;
          issuesFound++;
        }
        
        // Trouver les lignes contenant le terme
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (line.includes(term)) {
            console.log(`   Ligne ${index + 1}: "${term}" trouvé`);
            console.log(`   Contexte: ${line.trim().substring(0, 80)}...`);
          }
        });
      }
    });

    if (!fileHasIssues) {
      console.log(`✅ ${fileName}: Propre`);
    }

  } catch (error) {
    console.log(`❌ Erreur lors de la lecture de ${filePath}: ${error.message}`);
    issuesFound++;
  }
}

function checkFolder(folderPath) {
  const folderName = path.basename(folderPath);
  
  if (fs.existsSync(folderPath)) {
    console.log(`❌ Dossier de test encore présent: ${folderName}`);
    issuesFound++;
    
    // Lister le contenu du dossier
    try {
      const files = fs.readdirSync(folderPath);
      if (files.length > 0) {
        console.log(`   Contenu: ${files.join(', ')}`);
      } else {
        console.log(`   Dossier vide (peut être supprimé)`);
      }
    } catch (error) {
      console.log(`   Erreur lors de la lecture du dossier: ${error.message}`);
    }
  } else {
    console.log(`✅ Dossier de test supprimé: ${folderName}`);
  }
}

// Vérification des fichiers
console.log('📄 VÉRIFICATION DES FICHIERS:');
console.log('============================');
filesToCheck.forEach(checkFile);

console.log('\n📁 VÉRIFICATION DES DOSSIERS:');
console.log('=============================');
foldersToCheck.forEach(checkFolder);

// Vérification supplémentaire : recherche de fichiers de debug restants
console.log('\n🔍 RECHERCHE DE FICHIERS DE DEBUG RESTANTS:');
console.log('===========================================');

function searchDebugFiles(dir) {
  if (!fs.existsSync(dir)) return;
  
  try {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Ignorer node_modules et .next
        if (!item.startsWith('.') && item !== 'node_modules') {
          searchDebugFiles(fullPath);
        }
      } else if (stat.isFile()) {
        // Vérifier les noms de fichiers suspects
        const suspiciousNames = ['test', 'debug', 'api-test'];
        const fileName = item.toLowerCase();
        
        if (suspiciousNames.some(name => fileName.includes(name))) {
          console.log(`⚠️  Fichier suspect trouvé: ${fullPath}`);
          issuesFound++;
        }
      }
    });
  } catch (error) {
    // Ignorer les erreurs de permission
  }
}

searchDebugFiles('apps/frontend/src');

// Résumé final
console.log('\n📊 RÉSUMÉ:');
console.log('==========');

if (issuesFound === 0) {
  console.log('🎉 NETTOYAGE COMPLET ! Aucun élément de test/débogage trouvé.');
  console.log('✅ L\'interface utilisateur est maintenant propre et professionnelle.');
} else {
  console.log(`❌ ${issuesFound} problème(s) trouvé(s).`);
  console.log('⚠️  Des éléments de test/débogage sont encore présents.');
  console.log('💡 Veuillez corriger les problèmes listés ci-dessus.');
}

console.log('\n🔄 PROCHAINES ÉTAPES:');
console.log('=====================');
console.log('1. Corriger les problèmes identifiés (si applicable)');
console.log('2. Redémarrer le frontend: cd apps/frontend && npm run dev');
console.log('3. Vérifier l\'interface sur http://localhost:3000');
console.log('4. Confirmer que les boutons de test ont disparu');

process.exit(issuesFound > 0 ? 1 : 0);
