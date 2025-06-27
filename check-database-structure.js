const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://gestion_user:gestion_password_secure_2024@localhost:5432/gestion_commerciale',
  ssl: false
});

async function checkStructure() {
  try {
    console.log('🔍 Vérification de la structure de la base de données...');

    // Vérifier les colonnes de la table products
    const productColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'products' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📦 Colonnes de la table products:');
    productColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Vérifier les colonnes de la table clients
    const clientColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n👥 Colonnes de la table clients:');
    clientColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Vérifier les tables existantes
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n📋 Tables existantes:');
    tables.rows.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });

    // Vérifier quelques produits
    const products = await pool.query('SELECT * FROM products LIMIT 3');
    console.log('\n📦 Exemples de produits:');
    console.log(JSON.stringify(products.rows, null, 2));

    // Vérifier quelques clients
    const clients = await pool.query('SELECT * FROM clients LIMIT 3');
    console.log('\n👥 Exemples de clients:');
    console.log(JSON.stringify(clients.rows, null, 2));

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await pool.end();
  }
}

checkStructure();
