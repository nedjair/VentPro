const fs = require('fs');
const path = require('path');

console.log('🔧 Correction des imports .tsx dans l\'application Next.js');
console.log('=' .repeat(70));

async function fixTsxImports() {
  try {
    // 1. Scanner tous les fichiers .tsx dans src/app
    console.log('\n1. 📋 Recherche des imports .tsx problématiques...');
    
    const pagesDir = path.join(__dirname, 'src/app');
    const fixedFiles = [];
    
    function scanAndFixDirectory(dir, relativePath = '') {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const itemRelativePath = path.join(relativePath, item);
        
        if (fs.statSync(fullPath).isDirectory()) {
          scanAndFixDirectory(fullPath, itemRelativePath);
        } else if (item === 'page.tsx' || item === 'layout.tsx') {
          let content = fs.readFileSync(fullPath, 'utf8');
          let hasChanges = false;
          
          // Remplacer tous les imports se terminant par .tsx
          const originalContent = content;
          content = content.replace(/from\s+['"]([^'"]+)\.tsx['"]/g, (match, importPath) => {
            hasChanges = true;
            return `from '${importPath}'`;
          });
          
          if (hasChanges) {
            fs.writeFileSync(fullPath, content);
            fixedFiles.push({
              file: itemRelativePath,
              path: fullPath
            });
            console.log(`   ✅ Corrigé: ${itemRelativePath}`);
          }
        }
      }
    }
    
    scanAndFixDirectory(pagesDir);
    
    console.log(`\n📊 Résumé: ${fixedFiles.length} fichier(s) corrigé(s)`);
    
    // 2. Vérifier la configuration TypeScript
    console.log('\n2. 🔧 Vérification de la configuration TypeScript...');
    
    const tsconfigPath = path.join(__dirname, 'tsconfig.json');
    if (fs.existsSync(tsconfigPath)) {
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
      
      // Vérifier les options importantes
      const compilerOptions = tsconfig.compilerOptions || {};
      
      console.log('   Configuration actuelle:');
      console.log(`   - moduleResolution: ${compilerOptions.moduleResolution || 'non défini'}`);
      console.log(`   - allowImportingTsExtensions: ${compilerOptions.allowImportingTsExtensions || 'false'}`);
      console.log(`   - noEmit: ${compilerOptions.noEmit || 'false'}`);
      
      // Recommandations
      if (compilerOptions.allowImportingTsExtensions) {
        console.log('   ⚠️ allowImportingTsExtensions est activé - peut causer des problèmes');
      } else {
        console.log('   ✅ Configuration TypeScript appropriée');
      }
    } else {
      console.log('   ❌ tsconfig.json non trouvé');
    }
    
    // 3. Créer un script de test rapide
    console.log('\n3. 🧪 Création d\'un script de test rapide...');
    
    const quickTestScript = `const { spawn } = require('child_process');

console.log('🧪 Test rapide de compilation...');

// Test de compilation TypeScript sans émission
const tscProcess = spawn('npx', ['tsc', '--noEmit', '--skipLibCheck'], {
  stdio: 'pipe',
  shell: true
});

let hasErrors = false;

tscProcess.stderr.on('data', (data) => {
  const error = data.toString();
  if (error.includes('error TS5097')) {
    console.log('❌ Erreurs d\\'extension .tsx détectées:');
    console.log(error);
    hasErrors = true;
  }
});

tscProcess.on('close', (code) => {
  if (code === 0 && !hasErrors) {
    console.log('✅ Aucune erreur d\\'extension .tsx détectée');
  } else if (hasErrors) {
    console.log('⚠️ Des erreurs d\\'extension .tsx persistent');
    console.log('💡 Exécutez: node fix-tsx-imports.js');
  } else {
    console.log(\`ℹ️ Compilation terminée avec le code: \${code}\`);
  }
});

setTimeout(() => {
  tscProcess.kill();
  console.log('⏰ Test interrompu après 30 secondes');
}, 30000);
`;
    
    const quickTestPath = path.join(__dirname, 'quick-test-tsx.js');
    fs.writeFileSync(quickTestPath, quickTestScript);
    console.log(`   ✅ Script de test créé: ${quickTestPath}`);
    
    // 4. Résumé et instructions
    console.log('\n' + '=' .repeat(70));
    console.log('✅ CORRECTION DES IMPORTS .TSX TERMINÉE');
    console.log('=' .repeat(70));
    
    if (fixedFiles.length > 0) {
      console.log(`\n🔧 ${fixedFiles.length} fichier(s) corrigé(s):`);
      fixedFiles.forEach(file => {
        console.log(`   - ${file.file}`);
      });
      
      console.log('\n🚀 PROCHAINES ÉTAPES:');
      console.log('   1. Redémarrer le serveur: npm run dev');
      console.log('   2. Test rapide: node quick-test-tsx.js');
      console.log('   3. Vérifier l\'application dans le navigateur');
    } else {
      console.log('\n✅ Aucun import .tsx problématique trouvé');
    }
    
    console.log('\n💡 CONSEIL: Les imports TypeScript ne doivent pas inclure les extensions .tsx');
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error.message);
  }
}

fixTsxImports();
