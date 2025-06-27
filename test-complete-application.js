#!/usr/bin/env node

/**
 * Test complet de l'application avec les données algériennes
 * Vérifie la connectivité backend, frontend et base de données
 */

const http = require('http');
const https = require('https');
const { PrismaClient } = require('./packages/database/generated/client');

const prisma = new PrismaClient();

// Configuration des couleurs
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

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Fonction pour tester une URL HTTP
function testHttpEndpoint(url, timeout = 5000) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.get(url, { timeout }, (res) => {
      resolve({
        success: true,
        status: res.statusCode,
        headers: res.headers
      });
    });
    
    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Timeout'
      });
    });
  });
}

// Test de la base de données
async function testDatabase() {
  logSection('TEST DE LA BASE DE DONNÉES');
  
  try {
    await prisma.$connect();
    logSuccess('Connexion PostgreSQL établie');
    
    // Compter les enregistrements par table
    const counts = {
      companies: await prisma.company.count(),
      users: await prisma.user.count(),
      categories: await prisma.category.count(),
      suppliers: await prisma.supplier.count(),
      products: await prisma.product.count(),
      clients: await prisma.client.count(),
      stocks: await prisma.stock.count(),
      stockMovements: await prisma.stockMovement.count()
    };
    
    logInfo('Nombre d\'enregistrements par table:');
    Object.entries(counts).forEach(([table, count]) => {
      if (count > 0) {
        logSuccess(`   ${table}: ${count}`);
      } else {
        logWarning(`   ${table}: ${count}`);
      }
    });
    
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    logInfo(`Total: ${total} enregistrements`);
    
    // Vérifier les données algériennes
    const algerianCompany = await prisma.company.findFirst({
      where: { country: 'Algérie' }
    });
    
    if (algerianCompany) {
      logSuccess(`Entreprise algérienne trouvée: ${algerianCompany.name}`);
      logInfo(`   Ville: ${algerianCompany.city}`);
      logInfo(`   Devise: ${algerianCompany.currency}`);
    }
    
    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@gestion-dz.com' }
    });
    
    if (adminUser) {
      logSuccess(`Utilisateur admin trouvé: ${adminUser.firstName} ${adminUser.lastName}`);
    }
    
    return { success: true, total, counts };
    
  } catch (error) {
    logError(`Erreur base de données: ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

// Test du backend
async function testBackend() {
  logSection('TEST DU BACKEND');
  
  const backendUrl = 'http://localhost:3001';
  
  // Test de l'endpoint de santé
  logInfo('Test de l\'endpoint de santé...');
  const healthResult = await testHttpEndpoint(`${backendUrl}/health`);
  
  if (healthResult.success) {
    logSuccess(`Backend accessible (Status: ${healthResult.status})`);
  } else {
    logError(`Backend inaccessible: ${healthResult.error}`);
    return { success: false, error: healthResult.error };
  }
  
  // Test de l'API des utilisateurs
  logInfo('Test de l\'API utilisateurs...');
  const usersResult = await testHttpEndpoint(`${backendUrl}/api/users`);
  
  if (usersResult.success) {
    logSuccess(`API utilisateurs accessible (Status: ${usersResult.status})`);
  } else {
    logWarning(`API utilisateurs: ${usersResult.error}`);
  }
  
  // Test de l'API des produits
  logInfo('Test de l\'API produits...');
  const productsResult = await testHttpEndpoint(`${backendUrl}/api/products`);
  
  if (productsResult.success) {
    logSuccess(`API produits accessible (Status: ${productsResult.status})`);
  } else {
    logWarning(`API produits: ${productsResult.error}`);
  }
  
  return { success: true, endpoints: { health: healthResult, users: usersResult, products: productsResult } };
}

// Test du frontend
async function testFrontend() {
  logSection('TEST DU FRONTEND');
  
  const frontendUrl = 'http://localhost:3000';
  
  logInfo('Test de la page d\'accueil...');
  const homeResult = await testHttpEndpoint(frontendUrl);
  
  if (homeResult.success) {
    logSuccess(`Frontend accessible (Status: ${homeResult.status})`);
  } else {
    logError(`Frontend inaccessible: ${homeResult.error}`);
    return { success: false, error: homeResult.error };
  }
  
  // Test de la page de connexion
  logInfo('Test de la page de connexion...');
  const loginResult = await testHttpEndpoint(`${frontendUrl}/auth/login`);
  
  if (loginResult.success) {
    logSuccess(`Page de connexion accessible (Status: ${loginResult.status})`);
  } else {
    logWarning(`Page de connexion: ${loginResult.error}`);
  }
  
  return { success: true, pages: { home: homeResult, login: loginResult } };
}

// Fonction principale
async function main() {
  log('🧪 TEST COMPLET DE L\'APPLICATION', 'bright');
  log('Application de Gestion Commerciale TPE avec Données Algériennes', 'cyan');
  
  const results = {
    database: await testDatabase(),
    backend: await testBackend(),
    frontend: await testFrontend()
  };
  
  logSection('RÉSUMÉ DES TESTS');
  
  // Résumé base de données
  if (results.database.success) {
    logSuccess(`✅ BASE DE DONNÉES: ${results.database.total} enregistrements`);
  } else {
    logError('❌ BASE DE DONNÉES: Échec');
  }
  
  // Résumé backend
  if (results.backend.success) {
    logSuccess('✅ BACKEND: Opérationnel sur port 3001');
  } else {
    logError('❌ BACKEND: Non accessible');
  }
  
  // Résumé frontend
  if (results.frontend.success) {
    logSuccess('✅ FRONTEND: Opérationnel sur port 3000');
  } else {
    logError('❌ FRONTEND: Non accessible');
  }
  
  logSection('INFORMATIONS DE CONNEXION');
  
  if (results.database.success && results.frontend.success) {
    logSuccess('🎉 Application prête à utiliser !');
    logInfo('');
    logInfo('🔗 Accès à l\'application:');
    logInfo('   URL: http://localhost:3000');
    logInfo('   Email: admin@gestion-dz.com');
    logInfo('   Mot de passe: admin123');
    logInfo('');
    logInfo('📊 API Backend:');
    logInfo('   URL: http://localhost:3001');
    logInfo('   Documentation: http://localhost:3001/docs');
    logInfo('');
    logInfo('🇩🇿 Données algériennes disponibles:');
    logInfo('   - Entreprises, utilisateurs, produits');
    logInfo('   - Clients, fournisseurs, stocks');
    logInfo('   - Villes algériennes, téléphones +213');
    logInfo('   - Devise DA (Dinar Algérien)');
  } else {
    logError('⚠️  Problèmes détectés - Vérifiez les services');
    
    if (!results.database.success) {
      logError('   - Base de données non accessible');
    }
    if (!results.backend.success) {
      logError('   - Backend non démarré (npm run dev dans apps/backend)');
    }
    if (!results.frontend.success) {
      logError('   - Frontend non démarré (npm run dev dans apps/frontend)');
    }
  }
  
  const allSuccess = results.database.success && results.backend.success && results.frontend.success;
  process.exit(allSuccess ? 0 : 1);
}

// Exécution
if (require.main === module) {
  main().catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });
}
