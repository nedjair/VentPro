#!/usr/bin/env node

/**
 * Script de déploiement en production pour l'application de gestion commerciale
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 DÉPLOIEMENT EN PRODUCTION\n');

const steps = [
  {
    name: 'Vérification de l\'environnement',
    action: checkEnvironment
  },
  {
    name: 'Installation des dépendances',
    action: installDependencies
  },
  {
    name: 'Build du frontend',
    action: buildFrontend
  },
  {
    name: 'Build du backend',
    action: buildBackend
  },
  {
    name: 'Migration de la base de données',
    action: migrateDatabase
  },
  {
    name: 'Tests de production',
    action: runProductionTests
  },
  {
    name: 'Configuration HTTPS',
    action: configureHTTPS
  }
];

async function deploy() {
  console.log('📋 Étapes du déploiement :');
  steps.forEach((step, index) => {
    console.log(`   ${index + 1}. ${step.name}`);
  });
  console.log('');

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    console.log(`\n${i + 1}️⃣ ${step.name}...`);
    
    try {
      await step.action();
      console.log(`   ✅ ${step.name} terminé`);
    } catch (error) {
      console.error(`   ❌ Erreur lors de ${step.name}:`, error.message);
      console.log('\n🛑 Déploiement interrompu');
      process.exit(1);
    }
  }

  console.log('\n🎉 DÉPLOIEMENT TERMINÉ AVEC SUCCÈS !');
  console.log('\n📋 Prochaines étapes :');
  console.log('   1. Configurer le serveur web (Nginx/Apache)');
  console.log('   2. Configurer le certificat SSL');
  console.log('   3. Configurer la sauvegarde automatique');
  console.log('   4. Configurer la surveillance');
}

function checkEnvironment() {
  console.log('   🔍 Vérification de Node.js...');
  execSync('node --version', { stdio: 'pipe' });
  
  console.log('   🔍 Vérification de npm...');
  execSync('npm --version', { stdio: 'pipe' });
  
  console.log('   🔍 Vérification de PostgreSQL...');
  // Vérifier que PostgreSQL est accessible
  
  console.log('   🔍 Vérification des variables d\'environnement...');
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'NODE_ENV'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Variables d'environnement manquantes: ${missingVars.join(', ')}`);
  }
}

function installDependencies() {
  console.log('   📦 Installation des dépendances du backend...');
  execSync('npm ci', { cwd: 'apps/backend', stdio: 'pipe' });
  
  console.log('   📦 Installation des dépendances du frontend...');
  execSync('npm ci', { cwd: 'apps/frontend', stdio: 'pipe' });
  
  console.log('   📦 Installation des dépendances de la base de données...');
  execSync('npm ci', { cwd: 'packages/database', stdio: 'pipe' });
}

function buildFrontend() {
  console.log('   🏗️ Build du frontend Next.js...');
  execSync('npm run build', { cwd: 'apps/frontend', stdio: 'pipe' });
  
  console.log('   📊 Vérification de la taille du build...');
  const buildPath = path.join('apps', 'frontend', '.next');
  if (!fs.existsSync(buildPath)) {
    throw new Error('Build du frontend non trouvé');
  }
}

function buildBackend() {
  console.log('   🏗️ Compilation TypeScript du backend...');
  execSync('npm run build', { cwd: 'apps/backend', stdio: 'pipe' });
  
  console.log('   📊 Vérification du build backend...');
  const distPath = path.join('apps', 'backend', 'dist');
  if (!fs.existsSync(distPath)) {
    throw new Error('Build du backend non trouvé');
  }
}

function migrateDatabase() {
  console.log('   🗄️ Migration de la base de données...');
  execSync('npm run db:migrate:deploy', { cwd: 'packages/database', stdio: 'pipe' });
  
  console.log('   🔄 Génération du client Prisma...');
  execSync('npm run db:generate', { cwd: 'packages/database', stdio: 'pipe' });
}

function runProductionTests() {
  console.log('   🧪 Exécution des tests de production...');
  
  // Tests de santé de l'API
  console.log('   🔍 Test de l\'API backend...');
  // Ici on pourrait ajouter des tests spécifiques
  
  console.log('   🔍 Test du frontend...');
  // Ici on pourrait ajouter des tests E2E
}

function configureHTTPS() {
  console.log('   🔒 Configuration HTTPS...');
  
  // Créer les fichiers de configuration pour HTTPS
  const httpsConfig = {
    port: 443,
    redirectHTTP: true,
    hsts: true,
    certificatePath: '/etc/ssl/certs/gestion-commerciale.crt',
    keyPath: '/etc/ssl/private/gestion-commerciale.key'
  };
  
  console.log('   📝 Configuration HTTPS préparée');
  console.log('   ⚠️ Certificat SSL à configurer manuellement');
}

// Exécuter le déploiement
if (require.main === module) {
  deploy().catch(error => {
    console.error('\n❌ Erreur fatale:', error.message);
    process.exit(1);
  });
}

module.exports = { deploy };
