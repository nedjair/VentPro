const { spawn } = require('child_process');

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
    console.log('✅ Compilation TypeScript réussie - Aucune erreur d\'import');
  } else {
    console.log('❌ Erreurs de compilation détectées:');
    console.log(errorOutput);
    console.log(output);
  }
  
  console.log('\n🔍 Vérification des imports spécifiques...');
  
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
      
      console.log(`   ${exists ? '✅' : '❌'} ${importPath}`);
    } catch (error) {
      console.log(`   ❌ ${importPath} - Erreur: ${error.message}`);
    }
  });
});
