#!/usr/bin/env node

/**
 * Script de démarrage unifié pour l'application de gestion commerciale.
 * Centralisé dans scripts/launch pour regrouper les points d'entrée locaux.
 */

const { spawn, spawnSync } = require('child_process');
const http = require('http');
const https = require('https');
const net = require('net');
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

function commandExists(command) {
  const checkCommand = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(checkCommand, [command], { stdio: 'ignore', shell: true });
  return result.status === 0;
}

function isDockerEngineReady() {
  if (!commandExists('docker')) {
    return false;
  }

  const result = spawnSync('docker', ['info'], { stdio: 'ignore', shell: true });
  return result.status === 0;
}

function startDockerDesktopOnWindows() {
  if (process.platform !== 'win32') {
    return false;
  }

  const candidates = [
    'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe',
    'C:\\Program Files (x86)\\Docker\\Docker\\Docker Desktop.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Docker', 'Docker', 'Docker Desktop.exe')
  ].filter(Boolean);

  const executable = candidates.find((candidate) => fs.existsSync(candidate));
  if (!executable) {
    return false;
  }

  const child = spawn(executable, [], {
    detached: true,
    stdio: 'ignore',
    shell: false,
  });

  child.unref();
  return true;
}

async function waitForDockerEngine(timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (isDockerEngineReady()) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  return false;
}

function isPortListeningOnWindows(port) {
  const result = spawnSync(`netstat -ano -p TCP | findstr LISTENING | findstr /R /C:":${port} "`, {
    stdio: 'ignore',
    shell: true,
  });

  return result.status === 0;
}

async function runCommand(command, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    log(`🔄 Exécution: ${command}`, colors.cyan);

    const isWindows = process.platform === 'win32';
    let actualCommand = command;

    if (isWindows && command.startsWith('pnpm')) {
      actualCommand = `cmd /c ${command}`;
    }

    const child = spawn(actualCommand, {
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

    child.on('error', (error) => {
      reject(error);
    });
  });
}

function isPortBusy(port, host = '127.0.0.1') {
  if (process.platform === 'win32') {
    return Promise.resolve(isPortListeningOnWindows(port));
  }

  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });

    socket.setTimeout(1500);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
  });
}

function isHttpUrlReachable(url, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const client = url.startsWith('https://') ? https : http;
    const request = client.get(url, { timeout: timeoutMs }, (response) => {
      response.resume();
      resolve(true);
    });

    request.on('timeout', () => {
      request.destroy();
      resolve(false);
    });

    request.on('error', () => {
      resolve(false);
    });
  });
}

async function startDocker() {
  log('🐳 Démarrage de Docker...', colors.blue);
  try {
    const postgresBusy = await isPortBusy(5434);

    if (!isDockerEngineReady()) {
      log('⚠️ Docker Desktop / le moteur Docker n\'est pas lancé.', colors.yellow);

      const dockerDesktopStarted = startDockerDesktopOnWindows();
      if (dockerDesktopStarted) {
        log('ℹ️ Docker Desktop a ete lance automatiquement. Attente du moteur Docker...', colors.cyan);
        const dockerReady = await waitForDockerEngine();
        if (dockerReady) {
          log('✅ Docker Desktop est pret.', colors.green);
        }
      }

      if (!isDockerEngineReady()) {
        if (postgresBusy) {
          log('ℹ️ PostgreSQL VentesPro est déjà disponible sur localhost:5434', colors.cyan);
          log('ℹ️ Le service requis est déjà disponible localement, poursuite du démarrage', colors.cyan);
          return;
        }

        throw new Error(`Docker n'est pas disponible et PostgreSQL VentesPro (5434) n'est pas accessible.`);
      }

      log('ℹ️ Le moteur Docker est maintenant disponible, reprise du démarrage.', colors.cyan);
    }

    const servicesToStart = [];

    if (postgresBusy) {
      log('⚠️ PostgreSQL VentesPro déjà détecté sur localhost:5434, réutilisation de l’instance existante', colors.yellow);
    } else {
      servicesToStart.push('postgres', 'adminer');
    }

    if (servicesToStart.length > 0) {
      await runCommand(`docker compose up -d ${servicesToStart.join(' ')}`);
    } else {
      log('ℹ️ Aucun service Docker additionnel à démarrer', colors.cyan);
    }

    log('✅ Docker démarré avec succès', colors.green);
    log('⏳ Attente de la disponibilité des services...', colors.yellow);
    await new Promise((resolve) => setTimeout(resolve, 10000));
  } catch (error) {
    log('❌ Erreur lors du démarrage de Docker', colors.red);
    throw error;
  }
}

async function startBackend() {
  const backendBusy = await isPortBusy(3001);

  if (backendBusy) {
    const backendReachable = await isHttpUrlReachable('http://127.0.0.1:3001/health');

    if (backendReachable) {
      log('ℹ️ Backend déjà détecté sur localhost:3001, aucun redémarrage nécessaire', colors.cyan);
      return false;
    }

    throw new Error('Le port 3001 est occupé mais l’API backend n’est pas joignable. Libérez ce port ou arrêtez le processus en conflit.');
  }

  log('🚀 Démarrage du backend...', colors.blue);
  try {
    const backendPath = path.resolve('apps/backend');
    if (!checkFileExists(backendPath)) {
      throw new Error('Dossier backend non trouvé');
    }

    if (!checkFileExists(path.join(backendPath, 'node_modules'))) {
      log('📦 Installation des dépendances backend...', colors.yellow);
      await runCommand('pnpm install', backendPath);
    }

    log('🔄 Lancement du serveur backend...', colors.cyan);

    const isWindows = process.platform === 'win32';
    let command;
    let args;

    if (isWindows) {
      command = 'cmd';
      args = ['/c', 'pnpm', 'dev'];
    } else {
      command = 'pnpm';
      args = ['dev'];
    }

    const backend = spawn(command, args, {
      cwd: backendPath,
      stdio: 'inherit',
      detached: true,
      shell: true
    });

    backend.unref();
    log('✅ Backend démarré', colors.green);
    return true;
  } catch (error) {
    log('❌ Erreur lors du démarrage du backend', colors.red);
    throw error;
  }
}

async function startFrontend() {
  const frontendBusy = await isPortBusy(3000);

  if (frontendBusy) {
    const frontendReachable = await isHttpUrlReachable('http://127.0.0.1:3000');

    if (frontendReachable) {
      log('ℹ️ Frontend déjà détecté sur localhost:3000, aucun redémarrage nécessaire', colors.cyan);
      return false;
    }

    throw new Error('Le port 3000 est occupé mais le frontend n’est pas joignable. Libérez ce port ou arrêtez le processus en conflit.');
  }

  log('🎨 Démarrage du frontend...', colors.blue);
  try {
    const frontendPath = path.resolve('apps/frontend');
    if (!checkFileExists(frontendPath)) {
      throw new Error('Dossier frontend non trouvé');
    }

    if (!checkFileExists(path.join(frontendPath, 'node_modules'))) {
      log('📦 Installation des dépendances frontend...', colors.yellow);
      await runCommand('pnpm install', frontendPath);
    }

    log('🔄 Lancement du serveur frontend...', colors.cyan);
    await runCommand('pnpm dev', frontendPath);
    return true;
  } catch (error) {
    log('❌ Erreur lors du démarrage du frontend', colors.red);
    throw error;
  }
}

async function main() {
  try {
    const checkOnly = process.argv.includes('--check');

    log('🚀 Démarrage de l\'application de gestion commerciale', colors.bright);
    log('================================================', colors.bright);

    if (!checkFileExists('package.json') || !checkFileExists('apps')) {
      throw new Error('Ce script doit être exécuté depuis la racine du projet');
    }

    if (!commandExists('pnpm')) {
      throw new Error('pnpm est introuvable dans le PATH');
    }

    const frontendBusy = await isPortBusy(3000);
    const backendBusy = await isPortBusy(3001);
    const frontendReachable = frontendBusy ? await isHttpUrlReachable('http://127.0.0.1:3000') : false;
    const backendReachable = backendBusy ? await isHttpUrlReachable('http://127.0.0.1:3001/health') : false;

    if (frontendBusy && backendBusy && frontendReachable && backendReachable) {
      log('ℹ️ Frontend et backend semblent déjà actifs. Aucun nouveau lancement nécessaire.', colors.cyan);
      log('📱 Frontend: http://localhost:3000', colors.cyan);
      log('🔧 Backend: http://localhost:3001', colors.cyan);
      return;
    }

    await startDocker();

    if (checkOnly) {
      log('✅ Vérification terminée. Aucun lancement effectué car --check a été demandé.', colors.green);
      log('📱 Frontend: http://localhost:3000', colors.cyan);
      log('🔧 Backend: http://localhost:3001', colors.cyan);
      log('🗄️  PostgreSQL: localhost:5434', colors.cyan);
      return;
    }

    const backendStarted = await startBackend();

    if (backendStarted) {
      log('⏳ Attente du démarrage complet du backend...', colors.yellow);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    await startFrontend();

    log('🎉 Application démarrée avec succès!', colors.green);
    log('📱 Frontend: http://localhost:3000', colors.cyan);
    log('🔧 Backend: http://localhost:3001', colors.cyan);
    log('🗄️  Adminer: http://localhost:8080', colors.cyan);
  } catch (error) {
    log(`❌ Erreur: ${error.message}`, colors.red);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, startDocker, startBackend, startFrontend };




