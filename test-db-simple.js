// Test simple de connexion PostgreSQL
const { Pool } = require('pg');

// Configuration directe (valeurs du fichier .env)
const dbConfig = {
  connectionString: 'postgresql://gestion_user:gestion_password_secure_2024@localhost:5432/gestion_commerciale',
  ssl: false,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 10
};

async function testConnection() {
  console.log('🔍 TEST DE CONNEXION POSTGRESQL SIMPLIFIÉ');
  console.log('='.repeat(50));
  
  const pool = new Pool(dbConfig);
  
  try {
    console.log('1️⃣ Test de connexion...');
    const client = await pool.connect();
    console.log('✅ Connexion établie');
    
    console.log('2️⃣ Version PostgreSQL...');
    const versionResult = await client.query('SELECT version()');
    console.log(`✅ Version: ${versionResult.rows[0].version.split(' ')[1]}`);
    
    console.log('3️⃣ Informations base de données...');
    const dbInfo = await client.query(`
      SELECT 
        current_database() as db_name,
        current_user as user_name
    `);
    console.log(`✅ Base: ${dbInfo.rows[0].db_name}`);
    console.log(`✅ Utilisateur: ${dbInfo.rows[0].user_name}`);
    
    console.log('4️⃣ Tables existantes...');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log(`✅ ${tables.rows.length} tables trouvées`);
    
    console.log('5️⃣ Données de test...');
    try {
      const clients = await client.query('SELECT COUNT(*) FROM clients');
      console.log(`✅ Clients: ${clients.rows[0].count}`);
      
      const products = await client.query('SELECT COUNT(*) FROM products');
      console.log(`✅ Produits: ${products.rows[0].count}`);
      
      const orders = await client.query('SELECT COUNT(*) FROM orders');
      console.log(`✅ Commandes: ${orders.rows[0].count}`);
      
      const invoices = await client.query('SELECT COUNT(*) FROM invoices');
      console.log(`✅ Factures: ${invoices.rows[0].count}`);
      
    } catch (dataError) {
      console.log('⚠️ Certaines tables sont vides ou n\'existent pas');
    }
    
    console.log('6️⃣ Test de performance...');
    const start = Date.now();
    await client.query('SELECT 1');
    const end = Date.now();
    console.log(`✅ Temps de réponse: ${end - start}ms`);
    
    client.release();
    console.log('\n🎉 TOUS LES TESTS RÉUSSIS !');
    console.log('✅ La connexion PostgreSQL fonctionne parfaitement');
    
  } catch (error) {
    console.log('\n❌ ERREUR DE CONNEXION:');
    console.log(`   Message: ${error.message}`);
    console.log(`   Code: ${error.code}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 SOLUTIONS POSSIBLES:');
      console.log('   - Vérifiez que PostgreSQL est démarré');
      console.log('   - Vérifiez que Docker est en cours d\'exécution');
      console.log('   - Lancez: docker-compose up -d postgres');
    }
    
  } finally {
    await pool.end();
  }
}

testConnection();
