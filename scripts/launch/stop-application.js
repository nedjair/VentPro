#!/usr/bin/env node

/**
 * Script d'arrêt unifié pour l'application de gestion commerciale.
 * Centralisé dans scripts/launch pour regrouper les points d'entrée locaux.
 */

const { spawn } = require('child_process');

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

async function runCommand(command, cwd = process.cwd()) {
  return new Promise((resolve) => {
    log(`🔄 Exécution: ${command}`, colors.cyan);
    const child = spawn(command, {
      shell: true,
      cwd,
      stdio: 'inherit'
    });

    child.on('close', (code) => {
      resolve(code);
    });
  });
}

async function killProcessOnPort(port) {
  try {
    log(`🔍 Recherche de processus sur le port ${port}...`, colors.yellow);

    if (process.platform === 'win32') {
      await runCommand(`netstat -ano | findstr :${port}`);
      await runCommand(`for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port}') do taskkill /PID %a /F`);
    } else {
      await runCommand(`lsof -ti:${port} | xargs kill -9`);
    }

    log(`✅ Processus sur le port ${port} arrêtés`, colors.green);
  } catch (error) {
    log(`⚠️ Aucun processus trouvé sur le port ${port}`, colors.yellow);
  }
}

async function stopDocker() {
  log('🐳 Arrêt des conteneurs Docker...', colors.blue);
  try {
    await runCommand('docker compose down');
    log('✅ Conteneurs Docker arrêtés', colors.green);
  } catch (error) {
    log('⚠️ Erreur lors de l\'arrêt de Docker (peut-être déjà arrêté)', colors.yellow);
  }
}

async function stopNodeProcesses() {
  log('🛑 Arrêt des processus Node.js...', colors.blue);

  await killProcessOnPort(3001);
  await killProcessOnPort(3006);
  await killProcessOnPort(3005);

  try {
    if (process.platform === 'win32') {
      await runCommand('taskkill /F /IM node.exe /T');
      await runCommand('taskkill /F /IM tsx.exe /T');
    } else {
      await runCommand('pkill -f "node.*gestion"');
      await runCommand('pkill -f "tsx.*gestion"');
    }
    log('✅ Processus Node.js arrêtés', colors.green);
  } catch (error) {
    log('⚠️ Certains processus Node.js peuvent encore être actifs', colors.yellow);
  }
}

async function cleanupTempFiles() {
  log('🧹 Nettoyage des fichiers temporaires...', colors.blue);
  try {
    await runCommand('rm -rf apps/frontend/.next');
    await runCommand('rm -rf apps/frontend/out');
    await runCommand('rm -rf apps/backend/dist');

    log('✅ Fichiers temporaires nettoyés', colors.green);
  } catch (error) {
    log('⚠️ Erreur lors du nettoyage (fichiers peut-être déjà supprimés)', colors.yellow);
  }
}

async function main() {
  try {
    log('🛑 Arrêt de l\'application de gestion commerciale', colors.bright);
    log('===============================================', colors.bright);

    await stopNodeProcesses();
    await stopDocker();
    await cleanupTempFiles();

    log('🎉 Application arrêtée avec succès!', colors.green);
    log('💡 Vous pouvez maintenant fermer cette fenêtre', colors.cyan);
  } catch (error) {
    log(`❌ Erreur: ${error.message}`, colors.red);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, stopDocker, stopNodeProcesses, cleanupTempFiles };