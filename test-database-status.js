#!/usr/bin/env node

/**
 * Script de vérification de l'état de la base de données PostgreSQL
 * Analyse la connectivité, les tables existantes et le contenu des données
 */

const { PrismaClient } = require('./packages/database/generated/client');
const { execSync } = require('child_process');

// Configuration des couleurs pour l'affichage
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

async function checkDatabaseConnection() {
  logSection('VÉRIFICATION DE LA CONNECTIVITÉ POSTGRESQL');
  
  const prisma = new PrismaClient({
    log: ['error'],
  });

  try {
    // Test de connexion basique
    await prisma.$connect();
    logSuccess('Connexion à PostgreSQL établie');
    
    // Test de requête simple
    const result = await prisma.$queryRaw`SELECT version() as version, current_database() as database, current_user as user`;
    logInfo(`Version PostgreSQL: ${result[0].version}`);
    logInfo(`Base de données: ${result[0].database}`);
    logInfo(`Utilisateur: ${result[0].user}`);
    
    return { success: true, prisma };
  } catch (error) {
    logError(`Impossible de se connecter à PostgreSQL: ${error.message}`);
    return { success: false, error };
  }
}

async function checkTablesExistence(prisma) {
  logSection('VÉRIFICATION DES TABLES EXISTANTES');
  
  try {
    // Récupérer la liste des tables
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    if (tables.length === 0) {
      logWarning('Aucune table trouvée dans la base de données');
      return { tables: [], isEmpty: true };
    }
    
    logSuccess(`${tables.length} table(s) trouvée(s):`);
    tables.forEach(table => {
      logInfo(`  - ${table.table_name}`);
    });
    
    return { tables: tables.map(t => t.table_name), isEmpty: false };
  } catch (error) {
    logError(`Erreur lors de la vérification des tables: ${error.message}`);
    return { tables: [], error };
  }
}

async function checkTableContents(prisma, tables) {
  logSection('ANALYSE DU CONTENU DES TABLES');
  
  const tableStats = {};
  
  // Tables principales à vérifier
  const mainTables = ['users', 'companies', 'clients', 'products', 'suppliers', 'stocks', 'categories'];
  
  for (const tableName of mainTables) {
    if (tables.includes(tableName)) {
      try {
        const count = await prisma.$queryRaw`SELECT COUNT(*) as count FROM ${prisma.$queryRawUnsafe(`"${tableName}"`)}`;
        const recordCount = parseInt(count[0].count);
        tableStats[tableName] = recordCount;
        
        if (recordCount > 0) {
          logSuccess(`${tableName}: ${recordCount} enregistrement(s)`);
        } else {
          logWarning(`${tableName}: table vide`);
        }
      } catch (error) {
        logError(`Erreur lors de la vérification de ${tableName}: ${error.message}`);
        tableStats[tableName] = 'error';
      }
    } else {
      logWarning(`${tableName}: table non trouvée`);
      tableStats[tableName] = 'missing';
    }
  }
  
  return tableStats;
}

async function checkPrismaStatus() {
  logSection('VÉRIFICATION DU STATUT PRISMA');
  
  try {
    // Vérifier si le client Prisma est généré
    logInfo('Vérification du client Prisma...');
    
    // Vérifier les migrations
    logInfo('Vérification des migrations...');
    
    try {
      const migrationsResult = execSync('cd apps/backend && npx prisma migrate status', { 
        encoding: 'utf8',
        timeout: 10000 
      });
      logSuccess('Statut des migrations vérifié');
      logInfo(migrationsResult);
    } catch (error) {
      logWarning('Impossible de vérifier le statut des migrations');
      logInfo(error.message);
    }
    
  } catch (error) {
    logError(`Erreur lors de la vérification Prisma: ${error.message}`);
  }
}

async function generateReport(connectionResult, tablesResult, tableStats) {
  logSection('RAPPORT DE DIAGNOSTIC');
  
  const report = {
    timestamp: new Date().toISOString(),
    database: {
      connected: connectionResult.success,
      error: connectionResult.error?.message
    },
    tables: {
      total: tablesResult.tables.length,
      list: tablesResult.tables,
      isEmpty: tablesResult.isEmpty
    },
    data: tableStats
  };
  
  // Résumé général
  if (connectionResult.success) {
    logSuccess('✅ CONNECTIVITÉ: PostgreSQL accessible');
  } else {
    logError('❌ CONNECTIVITÉ: PostgreSQL inaccessible');
  }
  
  if (tablesResult.tables.length > 0) {
    logSuccess(`✅ STRUCTURE: ${tablesResult.tables.length} table(s) présente(s)`);
  } else {
    logWarning('⚠️  STRUCTURE: Base de données vide');
  }
  
  // Analyse des données
  const totalRecords = Object.values(tableStats)
    .filter(count => typeof count === 'number')
    .reduce((sum, count) => sum + count, 0);
  
  if (totalRecords > 0) {
    logSuccess(`✅ DONNÉES: ${totalRecords} enregistrement(s) total`);
  } else {
    logWarning('⚠️  DONNÉES: Aucune donnée trouvée');
  }
  
  // Recommandations
  logSection('RECOMMANDATIONS');
  
  if (!connectionResult.success) {
    logError('🔧 Démarrer PostgreSQL avec: docker-compose up -d postgres');
  }
  
  if (tablesResult.isEmpty) {
    logWarning('🔧 Créer les tables avec: cd apps/backend && npx prisma db push');
  }
  
  if (totalRecords === 0 && tablesResult.tables.length > 0) {
    logWarning('🔧 Peupler la base avec: cd packages/database && npm run db:seed');
  }
  
  return report;
}

async function main() {
  log('🔍 DIAGNOSTIC DE LA BASE DE DONNÉES POSTGRESQL', 'bright');
  log('Application de Gestion Commerciale TPE', 'cyan');
  
  try {
    // 1. Test de connectivité
    const connectionResult = await checkDatabaseConnection();
    
    if (!connectionResult.success) {
      await generateReport(connectionResult, { tables: [], isEmpty: true }, {});
      process.exit(1);
    }
    
    // 2. Vérification des tables
    const tablesResult = await checkTablesExistence(connectionResult.prisma);
    
    // 3. Analyse du contenu
    const tableStats = await checkTableContents(connectionResult.prisma, tablesResult.tables);
    
    // 4. Vérification Prisma
    await checkPrismaStatus();
    
    // 5. Génération du rapport
    const report = await generateReport(connectionResult, tablesResult, tableStats);
    
    // Fermeture de la connexion
    await connectionResult.prisma.$disconnect();
    
    logSection('DIAGNOSTIC TERMINÉ');
    logSuccess('Rapport généré avec succès');
    
  } catch (error) {
    logError(`Erreur fatale: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Exécution du script
if (require.main === module) {
  main().catch(console.error);
}
