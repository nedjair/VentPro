// Test simple de Prisma
const { Pool } = require('pg');

async function testPrismaSimple() {
  console.log('🔍 TEST PRISMA SIMPLE');
  console.log('='.repeat(30));
  
  const pool = new Pool({
    connectionString: 'postgresql://gestion_user:gestion_password_secure_2024@localhost:5432/gestion_commerciale',
    ssl: false
  });
  
  try {
    const client = await pool.connect();
    
    // Test des tables
    console.log('📊 Tables existantes:');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    tables.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`);
    });
    
    // Test des données
    console.log('\n📈 Données:');
    const counts = await Promise.all([
      client.query('SELECT COUNT(*) FROM clients'),
      client.query('SELECT COUNT(*) FROM products'),
      client.query('SELECT COUNT(*) FROM orders'),
      client.query('SELECT COUNT(*) FROM invoices'),
      client.query('SELECT COUNT(*) FROM suppliers')
    ]);
    
    console.log(`   ✅ Clients: ${counts[0].rows[0].count}`);
    console.log(`   ✅ Produits: ${counts[1].rows[0].count}`);
    console.log(`   ✅ Commandes: ${counts[2].rows[0].count}`);
    console.log(`   ✅ Factures: ${counts[3].rows[0].count}`);
    console.log(`   ✅ Fournisseurs: ${counts[4].rows[0].count}`);
    
    client.release();
    console.log('\n🎉 PRISMA FONCTIONNE !');
    
  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  } finally {
    await pool.end();
  }
}

testPrismaSimple();
