#!/usr/bin/env node

/**
 * Diagnostic avancé des problèmes de boutons
 * Analyse les erreurs JavaScript et les problèmes de compilation
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 DIAGNOSTIC AVANCÉ DES PROBLÈMES DE BOUTONS\n');

// Vérifier les erreurs de syntaxe dans les fichiers modifiés
const filesToCheck = [
  'frontend-nextjs-production/src/components/pages/clients.tsx',
  'frontend-nextjs-production/src/components/pages/products.tsx',
  'frontend-nextjs-production/src/components/pages/orders/index.tsx',
  'frontend-nextjs-production/src/components/pages/invoices/index.tsx',
  'frontend-nextjs-production/src/components/pages/orders/order-detail.tsx',
  'frontend-nextjs-production/src/components/pages/invoices/invoice-detail.tsx'
];

console.log('📁 Vérification des erreurs de syntaxe:\n');

let syntaxErrors = 0;
let importErrors = 0;

filesToCheck.forEach(filePath => {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const fileName = path.basename(filePath);
      
      console.log(`📄 ${fileName}:`);
      
      // Vérifier les imports manquants
      const requiredImports = ['useState', 'useEffect', 'Link'];
      const importLine = content.split('\n').find(line => line.includes('import'));
      
      requiredImports.forEach(imp => {
        if (!content.includes(imp)) {
          console.log(`   ⚠️  Import manquant: ${imp}`);
          importErrors++;
        }
      });
      
      // Vérifier les erreurs de syntaxe courantes
      const commonErrors = [
        { pattern: /onClick={[^}]*}[^>]*onClick={/, message: 'Double onClick détecté' },
        { pattern: /const\s+\w+\s*=\s*\(\s*\)\s*=>\s*{[^}]*}[^;]/, message: 'Point-virgule manquant après fonction' },
        { pattern: /}\s*\)\s*$/, message: 'Parenthèse fermante orpheline' },
        { pattern: /{\s*$/, message: 'Accolade ouvrante orpheline' }
      ];
      
      commonErrors.forEach(error => {
        if (error.pattern.test(content)) {
          console.log(`   ❌ ${error.message}`);
          syntaxErrors++;
        }
      });
      
      // Vérifier les gestionnaires d'événements
      const handlers = content.match(/const\s+handle\w+\s*=/g) || [];
      const onClicks = content.match(/onClick={handle\w+}/g) || [];
      
      console.log(`   ✅ Gestionnaires définis: ${handlers.length}`);
      console.log(`   ✅ onClick utilisés: ${onClicks.length}`);
      
      // Vérifier les erreurs TypeScript
      const tsErrors = [
        { pattern: /window\.location\.href/, message: 'Utilisation de window.location.href (peut causer des erreurs SSR)' },
        { pattern: /console\.log/, message: 'console.log présent (normal pour debug)' }
      ];
      
      tsErrors.forEach(error => {
        const matches = content.match(error.pattern);
        if (matches) {
          console.log(`   ℹ️  ${error.message}: ${matches.length} occurrence(s)`);
        }
      });
      
      console.log('');
      
    } else {
      console.log(`❌ Fichier non trouvé: ${filePath}`);
    }
  } catch (error) {
    console.log(`❌ Erreur lors de la lecture de ${filePath}: ${error.message}`);
    syntaxErrors++;
  }
});

console.log('📊 RÉSUMÉ DU DIAGNOSTIC:\n');
console.log(`❌ Erreurs de syntaxe: ${syntaxErrors}`);
console.log(`⚠️  Imports manquants: ${importErrors}`);

// Vérifier la configuration Next.js
console.log('\n🔧 Vérification de la configuration Next.js:\n');

const nextConfigPath = 'frontend-nextjs-production/next.config.mjs';
if (fs.existsSync(nextConfigPath)) {
  console.log('✅ next.config.mjs trouvé');
  const nextConfig = fs.readFileSync(nextConfigPath, 'utf8');
  if (nextConfig.includes('experimental')) {
    console.log('⚠️  Configuration expérimentale détectée');
  }
} else {
  console.log('❌ next.config.mjs manquant');
}

// Vérifier package.json
const packagePath = 'frontend-nextjs-production/package.json';
if (fs.existsSync(packagePath)) {
  console.log('✅ package.json trouvé');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  console.log(`   - Next.js version: ${packageJson.dependencies?.next || 'non trouvé'}`);
  console.log(`   - React version: ${packageJson.dependencies?.react || 'non trouvé'}`);
} else {
  console.log('❌ package.json manquant');
}

// Vérifier tsconfig.json
const tsconfigPath = 'frontend-nextjs-production/tsconfig.json';
if (fs.existsSync(tsconfigPath)) {
  console.log('✅ tsconfig.json trouvé');
} else {
  console.log('❌ tsconfig.json manquant');
}

console.log('\n🚨 PROBLÈMES POTENTIELS IDENTIFIÉS:\n');

if (syntaxErrors > 0) {
  console.log('❌ ERREURS DE SYNTAXE:');
  console.log('   - Vérifiez les accolades et parenthèses');
  console.log('   - Vérifiez les points-virgules manquants');
  console.log('   - Vérifiez les doubles onClick');
}

if (importErrors > 0) {
  console.log('❌ IMPORTS MANQUANTS:');
  console.log('   - Ajoutez les imports React nécessaires');
  console.log('   - Vérifiez les imports de composants');
}

console.log('\n🔧 SOLUTIONS RECOMMANDÉES:\n');

console.log('1. 🔄 REDÉMARRER LE SERVEUR DE DÉVELOPPEMENT:');
console.log('   cd frontend-nextjs-production');
console.log('   npm run dev');

console.log('\n2. 🧹 NETTOYER LE CACHE:');
console.log('   rm -rf .next');
console.log('   npm run dev');

console.log('\n3. 🔍 VÉRIFIER LES ERREURS DE COMPILATION:');
console.log('   - Ouvrir la console du navigateur (F12)');
console.log('   - Chercher les erreurs JavaScript');
console.log('   - Vérifier les erreurs de compilation Next.js');

console.log('\n4. 🐛 DEBUGGING ÉTAPE PAR ÉTAPE:');
console.log('   - Tester un seul bouton à la fois');
console.log('   - Ajouter des console.log dans les gestionnaires');
console.log('   - Vérifier que les événements se déclenchent');

console.log('\n5. 🔧 VÉRIFICATIONS SUPPLÉMENTAIRES:');
console.log('   - Vérifier que React est bien importé');
console.log('   - Vérifier que les composants sont bien exportés');
console.log('   - Vérifier que les props sont bien passées');

console.log('\n📋 PROCHAINES ÉTAPES:\n');
console.log('1. Corriger les erreurs de syntaxe identifiées');
console.log('2. Redémarrer le serveur de développement');
console.log('3. Tester un bouton simple en premier');
console.log('4. Vérifier la console du navigateur pour les erreurs');
console.log('5. Ajouter des logs de debug si nécessaire');

console.log('\n🔗 LIENS DE TEST:\n');
console.log('- Application: http://localhost:3003');
console.log('- Console développeur: F12 → Console');
console.log('- Network tab: F12 → Network (pour vérifier les requêtes)');

if (syntaxErrors === 0 && importErrors === 0) {
  console.log('\n🎉 AUCUNE ERREUR ÉVIDENTE DÉTECTÉE');
  console.log('Le problème pourrait être lié à:');
  console.log('- La compilation Next.js');
  console.log('- Les erreurs runtime JavaScript');
  console.log('- Les problèmes de cache du navigateur');
  console.log('- Les erreurs de hydratation React');
} else {
  console.log('\n⚠️  ERREURS DÉTECTÉES - CORRECTION NÉCESSAIRE');
}
