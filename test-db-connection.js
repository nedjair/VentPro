// Test de connexion à la base de données
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://gestion_user:gestion_password_secure_2024@localhost:5432/gestion_commerciale',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testConnection() {
  try {
    console.log('🔍 Test de connexion à PostgreSQL...');
    
    // Test de connexion
    const client = await pool.connect();
    console.log('✅ Connexion réussie');
    
    // Vérifier les tables existantes
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📋 Tables existantes:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Vérifier le contenu des tables principales
    const tables = ['clients', 'products', 'orders', 'invoices'];
    
    for (const table of tables) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`📊 ${table}: ${countResult.rows[0].count} enregistrements`);
      } catch (error) {
        console.log(`❌ Erreur table ${table}:`, error.message);
      }
    }
    
    // Test d'insertion simple
    console.log('\n🧪 Test d\'insertion d\'un client...');
    try {
      // Récupérer un ID de company valide
      const companyResult = await client.query('SELECT id FROM companies LIMIT 1');
      if (companyResult.rows.length === 0) {
        console.log('❌ Aucune company trouvée pour le test');
        return;
      }
      const companyId = companyResult.rows[0].id;

      const insertResult = await client.query(`
        INSERT INTO clients (id, type, "companyName", email, phone, address, "postalCode", city, country, notes, "companyId", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING id
      `, ['COMPANY', 'TEST COMPANY', 'test@test.dz', '+213 21 00 00 00', 'Test Address', '16000', 'Alger', 'Algérie', 'Test client', companyId]);

      console.log('✅ Insertion réussie, ID:', insertResult.rows[0].id);

      // Supprimer le test
      await client.query('DELETE FROM clients WHERE id = $1', [insertResult.rows[0].id]);
      console.log('🗑️ Client test supprimé');

    } catch (insertError) {
      console.log('❌ Erreur insertion:', insertError.message);
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);
  } finally {
    await pool.end();
  }
}

testConnection();
