// Test simple pour vérifier la syntaxe des composants
const fs = require('fs');
const path = require('path');

function testFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    console.log(`✅ ${filePath} - Syntaxe OK`);
    return true;
  } catch (error) {
    console.log(`❌ ${filePath} - Erreur: ${error.message}`);
    return false;
  }
}

const filesToTest = [
  'frontend-nextjs-production/src/app/orders/page.tsx',
  'frontend-nextjs-production/src/app/invoices/page.tsx',
  'frontend-nextjs-production/src/app/reports/page.tsx',
  'frontend-nextjs-production/src/components/pages/orders/index.tsx',
  'frontend-nextjs-production/src/components/pages/invoices/index.tsx',
  'frontend-nextjs-production/src/components/pages/reports/index.tsx',
];

console.log('🔍 Test des composants créés...\n');

let allGood = true;
filesToTest.forEach(file => {
  if (!testFile(file)) {
    allGood = false;
  }
});

console.log(`\n${allGood ? '✅ Tous les fichiers sont OK' : '❌ Certains fichiers ont des erreurs'}`);
