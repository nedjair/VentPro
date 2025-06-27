// Script de vérification complète de la connexion PostgreSQL
// pour l'application de gestion commerciale

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration de couleurs pour l'affichage
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

function logStep(step, message) {
  log(`${step} ${message}`, 'blue');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️ ${message}`, 'yellow');
}

// Configuration de la base de données
const dbConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://gestion_user:gestion_password_secure_2024@localhost:5432/gestion_commerciale',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 10
};

async function testDatabaseConnection() {
  logSection('🔍 VÉRIFICATION COMPLÈTE DE LA CONNEXION POSTGRESQL');
  
  const pool = new Pool(dbConfig);
  let connectionSuccessful = false;
  
  try {
    // Test 1: Connexion de base
    logStep('1️⃣', 'Test de connexion de base...');
    const client = await pool.connect();
    logSuccess('Connexion PostgreSQL établie');
    
    // Test 2: Version PostgreSQL
    logStep('2️⃣', 'Vérification de la version PostgreSQL...');
    const versionResult = await client.query('SELECT version()');
    logSuccess(`Version PostgreSQL: ${versionResult.rows[0].version.split(' ')[1]}`);
    
    // Test 3: Informations sur la base de données
    logStep('3️⃣', 'Informations sur la base de données...');
    const dbInfoResult = await client.query(`
      SELECT 
        current_database() as database_name,
        current_user as current_user,
        inet_server_addr() as server_address,
        inet_server_port() as server_port
    `);
    const dbInfo = dbInfoResult.rows[0];
    logSuccess(`Base de données: ${dbInfo.database_name}`);
    logSuccess(`Utilisateur: ${dbInfo.current_user}`);
    logSuccess(`Serveur: ${dbInfo.server_address || 'localhost'}:${dbInfo.server_port || '5432'}`);
    
    // Test 4: Vérification des tables existantes
    logStep('4️⃣', 'Vérification des tables existantes...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length > 0) {
      logSuccess(`${tablesResult.rows.length} tables trouvées:`);
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      logWarning('Aucune table trouvée dans la base de données');
    }
    
    // Test 5: Vérification des données de test
    logStep('5️⃣', 'Vérification des données de test...');
    try {
      const clientsResult = await client.query('SELECT COUNT(*) FROM clients');
      logSuccess(`Clients: ${clientsResult.rows[0].count}`);
      
      const productsResult = await client.query('SELECT COUNT(*) FROM products');
      logSuccess(`Produits: ${productsResult.rows[0].count}`);
      
      const ordersResult = await client.query('SELECT COUNT(*) FROM orders');
      logSuccess(`Commandes: ${ordersResult.rows[0].count}`);
      
      const invoicesResult = await client.query('SELECT COUNT(*) FROM invoices');
      logSuccess(`Factures: ${invoicesResult.rows[0].count}`);
      
      const suppliersResult = await client.query('SELECT COUNT(*) FROM suppliers');
      logSuccess(`Fournisseurs: ${suppliersResult.rows[0].count}`);
      
    } catch (dataError) {
      logWarning('Certaines tables n\'existent pas encore ou sont vides');
      console.log('   Détail:', dataError.message);
    }
    
    // Test 6: Test de performance
    logStep('6️⃣', 'Test de performance de la connexion...');
    const startTime = Date.now();
    await client.query('SELECT 1');
    const endTime = Date.now();
    logSuccess(`Temps de réponse: ${endTime - startTime}ms`);
    
    client.release();
    connectionSuccessful = true;
    
  } catch (error) {
    logError(`Erreur de connexion: ${error.message}`);
    console.log('Détails de l\'erreur:', error);
    
    // Diagnostics supplémentaires
    logStep('🔍', 'Diagnostics de connexion...');
    console.log('Configuration utilisée:');
    console.log(`   Host: ${dbConfig.connectionString.includes('@') ? dbConfig.connectionString.split('@')[1].split('/')[0] : 'localhost:5432'}`);
    console.log(`   Database: ${dbConfig.connectionString.split('/').pop()}`);
    console.log(`   SSL: ${dbConfig.ssl ? 'Activé' : 'Désactivé'}`);
    
  } finally {
    await pool.end();
  }
  
  return connectionSuccessful;
}

async function checkEnvironmentVariables() {
  logSection('🔧 VÉRIFICATION DES VARIABLES D\'ENVIRONNEMENT');
  
  const requiredVars = [
    'DATABASE_URL',
    'DIRECT_DATABASE_URL',
    'PORT',
    'NODE_ENV'
  ];
  
  const optionalVars = [
    'JWT_SECRET',
    'CORS_ORIGIN',
    'REDIS_URL'
  ];
  
  logStep('1️⃣', 'Variables requises...');
  let allRequired = true;
  
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      logSuccess(`${varName}: ${varName.includes('PASSWORD') || varName.includes('SECRET') ? '***' : process.env[varName]}`);
    } else {
      logError(`${varName}: Non définie`);
      allRequired = false;
    }
  });
  
  logStep('2️⃣', 'Variables optionnelles...');
  optionalVars.forEach(varName => {
    if (process.env[varName]) {
      logSuccess(`${varName}: ${varName.includes('PASSWORD') || varName.includes('SECRET') ? '***' : process.env[varName]}`);
    } else {
      logWarning(`${varName}: Non définie`);
    }
  });
  
  return allRequired;
}

async function checkConfigurationFiles() {
  logSection('📁 VÉRIFICATION DES FICHIERS DE CONFIGURATION');
  
  const configFiles = [
    { path: '.env', required: false },
    { path: 'apps/backend/.env', required: false },
    { path: 'apps/backend/prisma/schema.prisma', required: true },
    { path: 'packages/database/schema.prisma', required: true },
    { path: 'docker-compose.yml', required: true }
  ];
  
  let allFilesOk = true;
  
  configFiles.forEach(file => {
    const fullPath = path.join(process.cwd(), file.path);
    if (fs.existsSync(fullPath)) {
      logSuccess(`${file.path}: Trouvé`);
      
      // Vérification spéciale pour les schémas Prisma
      if (file.path.includes('schema.prisma')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('provider = "postgresql"')) {
          logSuccess(`   └─ Configuration PostgreSQL détectée`);
        } else if (content.includes('provider = "sqlite"')) {
          logError(`   └─ Configuration SQLite détectée (doit être PostgreSQL)`);
          allFilesOk = false;
        }
      }
    } else {
      if (file.required) {
        logError(`${file.path}: Manquant (requis)`);
        allFilesOk = false;
      } else {
        logWarning(`${file.path}: Manquant (optionnel)`);
      }
    }
  });
  
  return allFilesOk;
}

async function checkCorsConfiguration() {
  logSection('🔒 VÉRIFICATION DE LA CONFIGURATION CORS');
  
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const backendPort = process.env.PORT || '3001';
  
  logStep('1️⃣', 'Configuration CORS...');
  logSuccess(`Origines autorisées: ${corsOrigin}`);
  logSuccess(`URL Frontend: ${frontendUrl}`);
  logSuccess(`Port Backend: ${backendPort}`);
  
  // Vérifier que le port 3000 est inclus
  if (corsOrigin.includes('3000')) {
    logSuccess('Port 3000 (frontend) autorisé dans CORS');
  } else {
    logError('Port 3000 (frontend) manquant dans la configuration CORS');
    return false;
  }
  
  return true;
}

async function main() {
  console.log('🚀 DÉMARRAGE DE LA VÉRIFICATION COMPLÈTE POSTGRESQL\n');
  
  const results = {
    environment: false,
    configuration: false,
    cors: false,
    database: false
  };
  
  try {
    // Chargement des variables d'environnement
    try {
      require('dotenv').config();
      require('dotenv').config({ path: 'apps/backend/.env' });
    } catch (e) {
      logWarning('Module dotenv non disponible, utilisation des variables système');
    }
    
    // Tests séquentiels
    results.environment = await checkEnvironmentVariables();
    results.configuration = await checkConfigurationFiles();
    results.cors = await checkCorsConfiguration();
    results.database = await testDatabaseConnection();
    
    // Résumé final
    logSection('📊 RÉSUMÉ DE LA VÉRIFICATION');
    
    Object.entries(results).forEach(([test, success]) => {
      if (success) {
        logSuccess(`${test.toUpperCase()}: OK`);
      } else {
        logError(`${test.toUpperCase()}: ÉCHEC`);
      }
    });
    
    const allSuccess = Object.values(results).every(result => result);
    
    if (allSuccess) {
      logSuccess('\n🎉 TOUTES LES VÉRIFICATIONS SONT RÉUSSIES !');
      logSuccess('✅ L\'application est prête pour la production');
    } else {
      logError('\n❌ CERTAINES VÉRIFICATIONS ONT ÉCHOUÉ');
      logWarning('⚠️ Corrigez les problèmes avant de continuer');
    }
    
    process.exit(allSuccess ? 0 : 1);
    
  } catch (error) {
    logError(`Erreur lors de la vérification: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Exécution du script
if (require.main === module) {
  main();
}

module.exports = {
  testDatabaseConnection,
  checkEnvironmentVariables,
  checkConfigurationFiles,
  checkCorsConfiguration
};
