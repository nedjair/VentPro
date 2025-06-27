// Script simple pour insérer des données de test
const { Pool } = require('pg');

// Utiliser exactement les mêmes paramètres que le backend
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://gestion_user:gestion_password_secure_2024@localhost:5432/gestion_commerciale',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function insertSimpleData() {
  try {
    console.log('🔍 Test de connexion...');
    
    // Test de connexion simple
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Connexion réussie:', result.rows[0].now);
    
    // Compter les clients existants
    const clientCount = await pool.query('SELECT COUNT(*) FROM clients');
    console.log(`📊 Clients existants: ${clientCount.rows[0].count}`);
    
    // Insérer un client simple
    console.log('👤 Insertion d\'un client test...');
    const insertResult = await pool.query(`
      INSERT INTO clients (type, company_name, email, phone, address, postal_code, city, country)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, company_name
    `, ['COMPANY', 'SONATRACH SPA', 'contact@sonatrach.dz', '+213 21 54 70 00', 'Avenue du 1er Novembre', '16000', 'Alger', 'Algérie']);
    
    console.log('✅ Client inséré:', insertResult.rows[0]);
    
    // Insérer un produit simple
    console.log('📦 Insertion d\'un produit test...');
    const productResult = await pool.query(`
      INSERT INTO products (name, reference, description, category, price, cost_price, stock, min_stock, unit, is_active, track_stock, allow_backorder)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, name, price
    `, ['Téléviseur LED 55"', 'TV-LED-55-001', 'Téléviseur LED 55 pouces Full HD CONDOR', 'Électronique', 89000.00, 65000.00, 25, 5, 'pièce', true, true, false]);
    
    console.log('✅ Produit inséré:', productResult.rows[0]);
    
    // Vérifier les totaux
    const finalClientCount = await pool.query('SELECT COUNT(*) FROM clients');
    const finalProductCount = await pool.query('SELECT COUNT(*) FROM products');
    
    console.log('📊 TOTAUX FINAUX:');
    console.log(`   - Clients: ${finalClientCount.rows[0].count}`);
    console.log(`   - Produits: ${finalProductCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('Code:', error.code);
    console.error('Detail:', error.detail);
  } finally {
    await pool.end();
  }
}

insertSimpleData();
