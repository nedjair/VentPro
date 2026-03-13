#!/usr/bin/env node

/**
 * Script de validation du module utilisateurs
 * Vérifie que tous les composants sont en place et fonctionnels
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Validation du Module Utilisateurs\n');

// Couleurs pour les logs
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`)
};

let errors = 0;
let warnings = 0;

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    log.success(`${description}: ${filePath}`);
    return true;
  } else {
    log.error(`${description} manquant: ${filePath}`);
    errors++;
    return false;
  }
}

function checkDirectory(dirPath, description) {
  if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
    log.success(`${description}: ${dirPath}`);
    return true;
  } else {
    log.error(`${description} manquant: ${dirPath}`);
    errors++;
    return false;
  }
}

function checkFileContent(filePath, searchText, description) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(searchText)) {
      log.success(`${description} trouvé dans ${filePath}`);
      return true;
    } else {
      log.warning(`${description} non trouvé dans ${filePath}`);
      warnings++;
      return false;
    }
  } else {
    log.error(`Fichier manquant pour vérification: ${filePath}`);
    errors++;
    return false;
  }
}

console.log('📁 Vérification de la structure des fichiers...\n');

// Backend - Structure
checkDirectory('apps/backend/src/routes/users', 'Dossier routes utilisateurs backend');
checkFile('apps/backend/src/services/UserService.ts', 'Service utilisateurs backend');
checkFile('apps/backend/src/middleware/auth.ts', 'Middleware authentification');
checkFile('apps/backend/src/middleware/rbac.ts', 'Middleware RBAC');
checkFile('apps/backend/src/types/user.ts', 'Types utilisateurs backend');

// Backend - Routes
checkFile('apps/backend/src/routes/users/index.ts', 'Routes principales utilisateurs');
checkFile('apps/backend/src/routes/users/handlers.ts', 'Handlers routes utilisateurs');
checkFile('apps/backend/src/routes/users/schemas.ts', 'Schémas validation utilisateurs');

// Frontend - Structure
checkDirectory('apps/frontend/src/components/users', 'Dossier composants utilisateurs');
checkFile('apps/frontend/src/services/userService.ts', 'Service utilisateurs frontend');
checkFile('apps/frontend/src/types/user.ts', 'Types utilisateurs frontend');

// Frontend - Pages (Gestion des utilisateurs intégrée dans Settings)
checkFile('apps/frontend/src/app/settings/page.tsx', 'Page Settings avec gestion utilisateurs');
checkFile('apps/frontend/src/components/settings/UserManagementSettings.tsx', 'Composant gestion utilisateurs dans Settings');

// Frontend - Composants
checkFile('apps/frontend/src/components/users/UserTable.tsx', 'Composant tableau utilisateurs');
checkFile('apps/frontend/src/components/users/CreateUserModal.tsx', 'Modal création utilisateur');
checkFile('apps/frontend/src/components/users/EditUserModal.tsx', 'Modal édition utilisateur');
checkFile('apps/frontend/src/components/users/DeleteUserModal.tsx', 'Modal suppression utilisateur');
checkFile('apps/frontend/src/components/users/ChangePasswordModal.tsx', 'Modal changement mot de passe');
checkFile('apps/frontend/src/components/users/UserFilters.tsx', 'Filtres utilisateurs');

// Tests
checkDirectory('apps/backend/src/tests', 'Dossier tests backend');
checkDirectory('apps/frontend/src/tests', 'Dossier tests frontend');
checkFile('apps/backend/src/tests/services/UserService.test.ts', 'Tests service utilisateurs backend');
checkFile('apps/backend/src/tests/routes/users.test.ts', 'Tests routes utilisateurs backend');
checkFile('apps/frontend/src/tests/components/UserTable.test.tsx', 'Tests composant UserTable');
checkFile('apps/frontend/src/tests/components/CreateUserModal.test.tsx', 'Tests modal création');

// Configuration tests
checkFile('apps/backend/vitest.config.ts', 'Configuration Vitest backend');
checkFile('apps/frontend/vitest.config.ts', 'Configuration Vitest frontend');
checkFile('apps/backend/src/tests/setup.ts', 'Setup tests backend');
checkFile('apps/frontend/src/tests/setup.ts', 'Setup tests frontend');

// Documentation
checkFile('docs/api/users.md', 'Documentation API utilisateurs');
checkFile('docs/user/user-management.md', 'Guide utilisateur');
checkFile('docs/deployment/user-module-setup.md', 'Guide déploiement');
checkFile('docs/modules/USER_MODULE_README.md', 'README module utilisateurs');

console.log('\n🔍 Vérification du contenu des fichiers...\n');

// Vérifications de contenu
checkFileContent('packages/database/schema.prisma', 'model User', 'Modèle User dans Prisma');
checkFileContent('packages/database/schema.prisma', 'lastLoginAt', 'Champ lastLoginAt dans User');
checkFileContent('apps/backend/src/services/UserService.ts', 'class UserService', 'Classe UserService');
checkFileContent('apps/backend/src/services/UserService.ts', 'bcrypt', 'Hachage bcrypt');
checkFileContent('apps/backend/src/middleware/auth.ts', 'jwt', 'Authentification JWT');
checkFileContent('apps/backend/src/middleware/rbac.ts', 'ADMIN', 'Contrôle rôle ADMIN');
checkFileContent('apps/frontend/src/services/userService.ts', 'axios', 'Client HTTP axios');
checkFileContent('apps/frontend/src/components/users/UserTable.tsx', 'UserTable', 'Composant UserTable');

console.log('\n📦 Vérification des dépendances...\n');

// Vérification des package.json
try {
  const backendPkg = JSON.parse(fs.readFileSync('apps/backend/package.json', 'utf8'));
  const frontendPkg = JSON.parse(fs.readFileSync('apps/frontend/package.json', 'utf8'));
  
  // Backend dependencies
  const backendDeps = { ...backendPkg.dependencies, ...backendPkg.devDependencies };
  if (backendDeps.bcrypt) log.success('Dépendance bcrypt présente');
  else { log.error('Dépendance bcrypt manquante'); errors++; }
  
  if (backendDeps.jsonwebtoken) log.success('Dépendance jsonwebtoken présente');
  else { log.error('Dépendance jsonwebtoken manquante'); errors++; }
  
  if (backendDeps.vitest) log.success('Dépendance vitest présente (backend)');
  else { log.warning('Dépendance vitest manquante (backend)'); warnings++; }
  
  // Frontend dependencies
  const frontendDeps = { ...frontendPkg.dependencies, ...frontendPkg.devDependencies };
  if (frontendDeps.axios) log.success('Dépendance axios présente');
  else { log.error('Dépendance axios manquante'); errors++; }
  
  if (frontendDeps['lucide-react']) log.success('Dépendance lucide-react présente');
  else { log.error('Dépendance lucide-react manquante'); errors++; }
  
  if (frontendDeps.vitest) log.success('Dépendance vitest présente (frontend)');
  else { log.warning('Dépendance vitest manquante (frontend)'); warnings++; }
  
} catch (error) {
  log.error('Erreur lors de la lecture des package.json');
  errors++;
}

console.log('\n🧪 Vérification des scripts de test...\n');

// Vérification des scripts de test
try {
  const backendPkg = JSON.parse(fs.readFileSync('apps/backend/package.json', 'utf8'));
  const frontendPkg = JSON.parse(fs.readFileSync('apps/frontend/package.json', 'utf8'));
  
  if (backendPkg.scripts && backendPkg.scripts['test:vitest']) {
    log.success('Script test:vitest présent (backend)');
  } else {
    log.warning('Script test:vitest manquant (backend)');
    warnings++;
  }
  
  if (frontendPkg.scripts && frontendPkg.scripts.test) {
    log.success('Script test présent (frontend)');
  } else {
    log.warning('Script test manquant (frontend)');
    warnings++;
  }
  
} catch (error) {
  log.error('Erreur lors de la vérification des scripts');
  errors++;
}

console.log('\n📊 Résumé de la validation...\n');

if (errors === 0 && warnings === 0) {
  log.success('🎉 Module utilisateurs entièrement validé !');
  log.info('Tous les composants sont en place et correctement configurés.');
} else {
  if (errors > 0) {
    log.error(`${errors} erreur(s) critique(s) détectée(s)`);
  }
  if (warnings > 0) {
    log.warning(`${warnings} avertissement(s) détecté(s)`);
  }
  
  console.log('\n📋 Actions recommandées:');
  if (errors > 0) {
    log.info('1. Corriger les erreurs critiques listées ci-dessus');
    log.info('2. Réexécuter ce script de validation');
  }
  if (warnings > 0) {
    log.info('3. Examiner les avertissements (optionnels mais recommandés)');
  }
}

console.log('\n🚀 Prochaines étapes:');
log.info('1. Exécuter les tests: pnpm run test');
log.info('2. Démarrer l\'application: pnpm start');
log.info('3. Tester les fonctionnalités utilisateurs dans l\'interface');
log.info('4. Consulter la documentation dans docs/');

process.exit(errors > 0 ? 1 : 0);
