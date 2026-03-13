const fs = require('fs');
const path = require('path');

console.log('🔧 Correction des erreurs d\'import dans l\'application Next.js');
console.log('=' .repeat(70));

async function fixImportErrors() {
  try {
    // 1. Vérifier les imports problématiques dans les pages
    console.log('\n1. 📋 Vérification des imports dans les pages...');
    
    const pagesDir = path.join(__dirname, 'src/app');
    const problematicImports = [];
    
    function scanDirectory(dir, relativePath = '') {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const itemRelativePath = path.join(relativePath, item);
        
        if (fs.statSync(fullPath).isDirectory()) {
          scanDirectory(fullPath, itemRelativePath);
        } else if (item === 'page.tsx' || item === 'layout.tsx') {
          const content = fs.readFileSync(fullPath, 'utf8');
          
          // Chercher les imports problématiques
          const importRegex = /import\s+.*from\s+['"]([^'"]+)['"]/g;
          let match;
          
          while ((match = importRegex.exec(content)) !== null) {
            const importPath = match[1];
            
            // Vérifier les imports vers des dossiers sans index
            if (importPath.startsWith('@/components/pages/') && !importPath.endsWith('.tsx')) {
              const componentPath = importPath.replace('@/', 'src/');
              const tsxPath = componentPath + '.tsx';
              const indexPath = path.join(componentPath, 'index.tsx');
              
              const tsxExists = fs.existsSync(path.join(__dirname, tsxPath));
              const indexExists = fs.existsSync(path.join(__dirname, indexPath));
              
              if (tsxExists && !indexExists) {
                problematicImports.push({
                  file: fullPath,
                  relativePath: itemRelativePath,
                  importPath,
                  suggestedFix: importPath + '.tsx'
                });
              }
            }
          }
        }
      }
    }
    
    scanDirectory(pagesDir);
    
    if (problematicImports.length > 0) {
      console.log(`   ⚠️ ${problematicImports.length} import(s) problématique(s) trouvé(s):`);
      
      for (const issue of problematicImports) {
        console.log(`   📄 ${issue.relativePath}`);
        console.log(`      Import: ${issue.importPath}`);
        console.log(`      Correction: ${issue.suggestedFix}`);
        
        // Corriger automatiquement
        let content = fs.readFileSync(issue.file, 'utf8');
        content = content.replace(
          `from '${issue.importPath}'`,
          `from '${issue.suggestedFix}'`
        );
        content = content.replace(
          `from "${issue.importPath}"`,
          `from "${issue.suggestedFix}"`
        );
        
        fs.writeFileSync(issue.file, content);
        console.log(`      ✅ Corrigé automatiquement`);
      }
    } else {
      console.log('   ✅ Aucun import problématique trouvé');
    }
    
    // 2. Vérifier les exports manquants
    console.log('\n2. 📤 Vérification des exports...');
    
    const componentsDir = path.join(__dirname, 'src/components/pages');
    const exportIssues = [];
    
    function checkExports(dir) {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        
        if (item.endsWith('.tsx')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          
          // Vérifier si le fichier a un export
          const hasExport = /export\s+(default\s+)?function|export\s+(default\s+)?const|export\s+\{/.test(content);
          
          if (!hasExport) {
            exportIssues.push({
              file: fullPath,
              name: item
            });
          }
        }
      }
    }
    
    if (fs.existsSync(componentsDir)) {
      checkExports(componentsDir);
    }
    
    if (exportIssues.length > 0) {
      console.log(`   ⚠️ ${exportIssues.length} fichier(s) sans export trouvé(s):`);
      exportIssues.forEach(issue => {
        console.log(`   📄 ${issue.name}`);
      });
    } else {
      console.log('   ✅ Tous les composants ont des exports');
    }
    
    // 3. Vérifier les dépendances manquantes
    console.log('\n3. 📦 Vérification des dépendances...');
    
    const packageJsonPath = path.join(__dirname, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      const requiredDeps = [
        'react',
        'react-dom',
        'next',
        'lucide-react',
        'axios'
      ];
      
      const missingDeps = requiredDeps.filter(dep => !dependencies[dep]);
      
      if (missingDeps.length > 0) {
        console.log(`   ⚠️ Dépendances manquantes: ${missingDeps.join(', ')}`);
      } else {
        console.log('   ✅ Toutes les dépendances requises sont présentes');
      }
    }
    
    // 4. Créer un fichier de diagnostic
    console.log('\n4. 📋 Création du rapport de diagnostic...');
    
    const diagnosticReport = {
      timestamp: new Date().toISOString(),
      importIssues: problematicImports,
      exportIssues: exportIssues,
      summary: {
        totalIssuesFound: problematicImports.length + exportIssues.length,
        importIssuesFixed: problematicImports.length,
        exportIssuesFound: exportIssues.length
      }
    };
    
    const reportPath = path.join(__dirname, 'import-diagnostic-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(diagnosticReport, null, 2));
    console.log(`   ✅ Rapport sauvegardé: ${reportPath}`);
    
    // 5. Créer un script de test des imports
    console.log('\n5. 🧪 Création d\'un script de test...');
    
    const testScript = `const { spawn } = require('child_process');

console.log('🧪 Test de compilation TypeScript...');

const tscProcess = spawn('npx', ['tsc', '--noEmit'], {
  stdio: 'pipe',
  shell: true
});

let output = '';
let errorOutput = '';

tscProcess.stdout.on('data', (data) => {
  output += data.toString();
});

tscProcess.stderr.on('data', (data) => {
  errorOutput += data.toString();
});

tscProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Compilation TypeScript réussie - Aucune erreur d\\'import');
  } else {
    console.log('❌ Erreurs de compilation détectées:');
    console.log(errorOutput);
    console.log(output);
  }
  
  console.log('\\n🔍 Vérification des imports spécifiques...');
  
  // Test des imports critiques
  const criticalImports = [
    '@/components/pages/stocks.tsx',
    '@/hooks/useUnifiedStockCache',
    '@/lib/api-patch',
    '@/lib/stock-utils'
  ];
  
  criticalImports.forEach(importPath => {
    try {
      const resolvedPath = importPath.replace('@/', 'src/');
      const fs = require('fs');
      const path = require('path');
      
      let exists = false;
      if (resolvedPath.endsWith('.tsx') || resolvedPath.endsWith('.ts')) {
        exists = fs.existsSync(path.join(__dirname, resolvedPath));
      } else {
        exists = fs.existsSync(path.join(__dirname, resolvedPath + '.ts')) ||
                fs.existsSync(path.join(__dirname, resolvedPath + '.tsx')) ||
                fs.existsSync(path.join(__dirname, resolvedPath, 'index.ts')) ||
                fs.existsSync(path.join(__dirname, resolvedPath, 'index.tsx'));
      }
      
      console.log(\`   \${exists ? '✅' : '❌'} \${importPath}\`);
    } catch (error) {
      console.log(\`   ❌ \${importPath} - Erreur: \${error.message}\`);
    }
  });
});
`;
    
    const testScriptPath = path.join(__dirname, 'test-imports.js');
    fs.writeFileSync(testScriptPath, testScript);
    console.log(`   ✅ Script de test créé: ${testScriptPath}`);
    
    // 6. Résumé
    console.log('\n' + '=' .repeat(70));
    console.log('✅ CORRECTION DES IMPORTS TERMINÉE');
    console.log('=' .repeat(70));
    
    console.log(`\n📊 Résumé:`);
    console.log(`   🔧 Imports corrigés: ${problematicImports.length}`);
    console.log(`   ⚠️ Exports manquants: ${exportIssues.length}`);
    console.log(`   📋 Rapport généré: import-diagnostic-report.json`);
    console.log(`   🧪 Script de test: test-imports.js`);
    
    if (problematicImports.length > 0) {
      console.log('\n🚀 PROCHAINES ÉTAPES:');
      console.log('   1. Redémarrer le serveur: npm run dev');
      console.log('   2. Tester les imports: node test-imports.js');
      console.log('   3. Vérifier l\'application dans le navigateur');
    }
    
    if (exportIssues.length > 0) {
      console.log('\n⚠️ ATTENTION: Certains fichiers n\'ont pas d\'exports.');
      console.log('   Vérifiez manuellement ces fichiers si nécessaire.');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error.message);
  }
}

fixImportErrors();
