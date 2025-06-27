// Script de diagnostic pour Next.js
const { spawn } = require('child_process');
const path = require('path');

console.log('🔍 Diagnostic Next.js - Gestion Commerciale TPE');
console.log('================================================');

// Vérifier l'environnement
console.log('\n📋 Environnement:');
console.log('- Node.js:', process.version);
console.log('- Plateforme:', process.platform);
console.log('- Architecture:', process.arch);
console.log('- Répertoire:', process.cwd());

// Vérifier les fichiers essentiels
const fs = require('fs');
const essentialFiles = [
    'package.json',
    'next.config.mjs',
    'tsconfig.json',
    'middleware.ts',
    'src/app/layout.tsx'
];

console.log('\n📁 Fichiers essentiels:');
essentialFiles.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`${exists ? '✅' : '❌'} ${file}`);
});

// Vérifier node_modules
console.log('\n📦 Dépendances:');
const nodeModulesExists = fs.existsSync('node_modules');
console.log(`${nodeModulesExists ? '✅' : '❌'} node_modules`);

if (nodeModulesExists) {
    const nextExists = fs.existsSync('node_modules/next');
    console.log(`${nextExists ? '✅' : '❌'} next package`);
}

// Essayer de démarrer Next.js avec des logs détaillés
console.log('\n🚀 Tentative de démarrage Next.js...');
console.log('Commande: npx next dev -p 3004');

const nextProcess = spawn('npx', ['next', 'dev', '-p', '3004'], {
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true
});

nextProcess.stdout.on('data', (data) => {
    console.log('📤 STDOUT:', data.toString());
});

nextProcess.stderr.on('data', (data) => {
    console.error('📥 STDERR:', data.toString());
});

nextProcess.on('error', (error) => {
    console.error('❌ Erreur de processus:', error);
});

nextProcess.on('close', (code) => {
    console.log(`\n🔚 Processus terminé avec le code: ${code}`);
    if (code !== 0) {
        console.error('❌ Échec du démarrage de Next.js');
        
        // Suggestions de résolution
        console.log('\n🔧 Suggestions de résolution:');
        console.log('1. Supprimer .next et node_modules, puis réinstaller');
        console.log('2. Vérifier les erreurs TypeScript');
        console.log('3. Vérifier la configuration Next.js');
        console.log('4. Vérifier les imports dans middleware.ts');
    }
});

// Timeout de sécurité
setTimeout(() => {
    console.log('\n⏰ Timeout atteint, arrêt du processus...');
    nextProcess.kill();
}, 60000);
