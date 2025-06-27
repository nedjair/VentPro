// Script pour vérifier la structure des tables
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://gestion_user:gestion_password_secure_2024@localhost:5432/gestion_commerciale',
  ssl: false
});

async function checkTables() {
  let client;
  try {
    console.log('🔍 Connexion à la base de données...');
    client = await pool.connect();
    console.log('✅ Connexion réussie');

    // Vérifier la structure de la table clients
    console.log('\n📋 Structure de la table CLIENTS:');
    const clientsStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
      ORDER BY ordinal_position
    `);
    
    clientsStructure.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'}`);
    });

    // Vérifier la structure de la table products
    console.log('\n📦 Structure de la table PRODUCTS:');
    const productsStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'products' 
      ORDER BY ordinal_position
    `);
    
    productsStructure.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'}`);
    });

    // Vérifier la structure de la table orders
    console.log('\n📋 Structure de la table ORDERS:');
    const ordersStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      ORDER BY ordinal_position
    `);
    
    ordersStructure.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'}`);
    });

    // Vérifier la structure de la table invoices
    console.log('\n💰 Structure de la table INVOICES:');
    const invoicesStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'invoices' 
      ORDER BY ordinal_position
    `);
    
    invoicesStructure.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'}`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

checkTables();
