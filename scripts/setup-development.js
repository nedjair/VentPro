#!/usr/bin/env node

/**
 * Script de configuration initiale pour l'environnement de développement
 * Remplace les scripts d'installation et de configuration
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function checkFileExists(filePath) {
  return fs.existsSync(path.resolve(filePath));
}

async function runCommand(command, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    log(`🔄 Exécution: ${command}`, colors.cyan);
    const child = spawn(command, { 
      shell: true, 
      cwd,
      stdio: 'inherit'
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
}

async function checkPrerequisites() {
  log('🔍 Vérification des prérequis...', colors.blue);
  
  const prerequisites = [
    { name: 'Node.js', command: 'node --version' },
    { name: 'pnpm', command: 'pnpm --version' },
    { name: 'Docker', command: 'docker --version' },
    { name: 'Docker Compose', command: 'docker-compose --version' }
  ];
  
  for (const prereq of prerequisites) {
    try {
      await runCommand(prereq.command);
      log(`✅ ${prereq.name} installé`, colors.green);
    } catch (error) {
      log(`❌ ${prereq.name} non trouvé`, colors.red);
      throw new Error(`${prereq.name} est requis mais non installé`);
    }
  }
}

async function installDependencies() {
  log('📦 Installation des dépendances...', colors.blue);
  
  // Installation des dépendances racine
  log('📦 Installation des dépendances racine...', colors.yellow);
  await runCommand('pnpm install');
  
  // Installation des dépendances backend
  log('📦 Installation des dépendances backend...', colors.yellow);
  await runCommand('pnpm install', 'apps/backend');
  
  // Installation des dépendances frontend
  log('📦 Installation des dépendances frontend...', colors.yellow);
  await runCommand('pnpm install', 'apps/frontend');
  
  // Installation des dépendances des packages
  log('📦 Installation des dépendances des packages...', colors.yellow);
  await runCommand('pnpm install', 'packages/database');
  await runCommand('pnpm install', 'packages/shared');
  
  log('✅ Toutes les dépendances installées', colors.green);
}

async function setupEnvironmentFiles() {
  log('⚙️ Configuration des fichiers d\'environnement...', colors.blue);
  
  // Vérifier et créer les fichiers .env s'ils n'existent pas
  const envFiles = [
    {
      path: 'apps/backend/.env',
      template: 'apps/backend/.env.example'
    },
    {
      path: 'apps/frontend/.env.local',
      template: null,
      content: `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
NODE_ENV=development`
    }
  ];
  
  for (const envFile of envFiles) {
    if (!checkFileExists(envFile.path)) {
      if (envFile.template && checkFileExists(envFile.template)) {
        // Copier depuis le template
        const templateContent = fs.readFileSync(envFile.template, 'utf8');
        fs.writeFileSync(envFile.path, templateContent);
        log(`✅ Fichier ${envFile.path} créé depuis le template`, colors.green);
      } else if (envFile.content) {
        // Créer avec le contenu fourni
        fs.writeFileSync(envFile.path, envFile.content);
        log(`✅ Fichier ${envFile.path} créé`, colors.green);
      }
    } else {
      log(`ℹ️ Fichier ${envFile.path} existe déjà`, colors.yellow);
    }
  }
}

async function setupDatabase() {
  log('🗄️ Configuration de la base de données...', colors.blue);
  
  try {
    // Démarrer Docker si nécessaire
    log('🐳 Démarrage des services Docker...', colors.yellow);
    await runCommand('docker-compose up -d postgres redis');
    
    // Attendre que PostgreSQL soit prêt
    log('⏳ Attente de PostgreSQL...', colors.yellow);
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Générer le client Prisma
    log('🔧 Génération du client Prisma...', colors.yellow);
    await runCommand('pnpm prisma:generate', 'apps/backend');
    
    // Appliquer les migrations
    log('🔄 Application des migrations...', colors.yellow);
    await runCommand('pnpm prisma db push --schema=../../packages/database/schema.prisma', 'apps/backend');
    
    log('✅ Base de données configurée', colors.green);
    
  } catch (error) {
    log('⚠️ Erreur lors de la configuration de la base de données', colors.yellow);
    log('💡 Vous pouvez configurer la base de données manuellement plus tard', colors.cyan);
  }
}

async function main() {
  try {
    log('🚀 Configuration de l\'environnement de développement', colors.bright);
    log('==================================================', colors.bright);
    
    // Vérifier que nous sommes dans le bon répertoire
    if (!checkFileExists('package.json') || !checkFileExists('apps')) {
      throw new Error('Ce script doit être exécuté depuis la racine du projet');
    }
    
    // Étapes de configuration
    await checkPrerequisites();
    await installDependencies();
    await setupEnvironmentFiles();
    await setupDatabase();
    
    log('🎉 Configuration terminée avec succès!', colors.green);
    log('', colors.reset);
    log('📋 Prochaines étapes:', colors.bright);
    log('  1. Vérifiez les fichiers .env dans apps/backend/ et apps/frontend/', colors.cyan);
    log('  2. Lancez l\'application avec: pnpm start', colors.cyan);
    log('  3. Accédez à http://localhost:3006 pour le frontend', colors.cyan);
    log('  4. Accédez à http://localhost:3001 pour l\'API backend', colors.cyan);
    
  } catch (error) {
    log(`❌ Erreur: ${error.message}`, colors.red);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, checkPrerequisites, installDependencies, setupEnvironmentFiles, setupDatabase };
