const { spawn } = require('child_process');

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
    console.log('❌ Erreurs d\'extension .tsx détectées:');
    console.log(error);
    hasErrors = true;
  }
});

tscProcess.on('close', (code) => {
  if (code === 0 && !hasErrors) {
    console.log('✅ Aucune erreur d\'extension .tsx détectée');
  } else if (hasErrors) {
    console.log('⚠️ Des erreurs d\'extension .tsx persistent');
    console.log('💡 Exécutez: node fix-tsx-imports.js');
  } else {
    console.log(`ℹ️ Compilation terminée avec le code: ${code}`);
  }
});

setTimeout(() => {
  tscProcess.kill();
  console.log('⏰ Test interrompu après 30 secondes');
}, 30000);
