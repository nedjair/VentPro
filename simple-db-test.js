#!/usr/bin/env node

/**
 * Test simple de connectivité PostgreSQL
 */

let Client;

try {
  ({ Client } = require('pg'));
} catch {
  ({ Client } = require('./apps/backend/node_modules/pg'));
}

if (typeof process.loadEnvFile === 'function') {
  process.loadEnvFile('.env');
}

function buildDbConfig() {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    const parsed = new URL(databaseUrl);
    return {
      host: parsed.hostname,
      port: Number(parsed.port || 5432),
      database: parsed.pathname.replace(/^\//, ''),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
    };
  }

  return {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT || 5434),
    database: process.env.POSTGRES_DB || 'gestion_commerciale_tpe',
    user: process.env.POSTGRES_USER || 'tpe_user',
    password: process.env.POSTGRES_PASSWORD || 'tpe_password_2024',
  };
}

// Configuration de la base de données depuis l'URL complète ou les variables unitaires.
const dbConfig = buildDbConfig();

console.log('🔍 TEST DE CONNECTIVITÉ POSTGRESQL');
console.log('=====================================');
console.log(`Host: ${dbConfig.host}:${dbConfig.port}`);
console.log(`Database: ${dbConfig.database}`);
console.log(`User: ${dbConfig.user}`);
console.log('');

async function testConnection() {
  const client = new Client(dbConfig);
  
  try {
    console.log('⏳ Tentative de connexion...');
    await client.connect();
    console.log('✅ Connexion PostgreSQL réussie !');
    
    // Test de requête simple
    const result = await client.query('SELECT version(), current_database(), current_user');
    console.log('');
    console.log('📊 INFORMATIONS DE LA BASE :');
    console.log(`Version: ${result.rows[0].version}`);
    console.log(`Base de données: ${result.rows[0].current_database}`);
    console.log(`Utilisateur: ${result.rows[0].current_user}`);
    
    // Vérifier les tables existantes
    console.log('');
    console.log('📋 TABLES EXISTANTES :');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length === 0) {
      console.log('⚠️  Aucune table trouvée - Base de données vide');
    } else {
      console.log(`✅ ${tablesResult.rows.length} table(s) trouvée(s) :`);
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
      
      // Compter les enregistrements dans les tables principales
      console.log('');
      console.log('📈 NOMBRE D\'ENREGISTREMENTS :');
      const mainTables = ['User', 'Client', 'Product', 'Supplier', 'Stock', 'Order', 'Invoice'];
      
      for (const tableName of mainTables) {
        const tableExists = tablesResult.rows.some(row => row.table_name === tableName);
        if (tableExists) {
          try {
            const countResult = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
            const count = parseInt(countResult.rows[0].count);
            console.log(`   ${tableName}: ${count} enregistrement(s)`);
          } catch (error) {
            console.log(`   ${tableName}: Erreur - ${error.message}`);
          }
        } else {
          console.log(`   ${tableName}: Table non trouvée`);
        }
      }
    }
    
    await client.end();
    
    console.log('');
    console.log('✅ Test terminé avec succès !');
    return true;
    
  } catch (error) {
    console.log('❌ Erreur de connexion PostgreSQL :');
    console.log(`   ${error.message}`);
    console.log('');
    console.log('🔧 SOLUTIONS POSSIBLES :');
    console.log('   1. Vérifier que PostgreSQL est démarré');
    console.log('   2. Vérifier les paramètres de connexion dans .env');
    console.log('   3. Démarrer PostgreSQL avec: docker-compose up -d postgres');
    
    if (client._connected) {
      await client.end();
    }
    return false;
  }
}

// Exécution du test
testConnection().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});
