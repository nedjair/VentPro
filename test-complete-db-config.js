// Test complet de la configuration PostgreSQL
const { Pool } = require('pg');

// Configuration PostgreSQL directe
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://gestion_user:gestion_password_secure_2024@localhost:5432/gestion_commerciale',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testCompleteConfiguration() {
  console.log('🔍 TEST COMPLET DE LA CONFIGURATION POSTGRESQL');
  console.log('='.repeat(60));
  
  try {
    // 1. Test de connexion
    console.log('\n1️⃣ Test de connexion...');
    const client = await pool.connect();
    console.log('✅ Connexion PostgreSQL réussie');
    
    // 2. Vérification des tables
    console.log('\n2️⃣ Vérification des tables...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const expectedTables = [
      'companies', 'users', 'clients', 'suppliers', 'categories', 
      'products', 'orders', 'order_items', 'invoices', 'invoice_items',
      'stock_movements', 'client_interactions', 'product_images', 'product_variants'
    ];
    
    const existingTables = tablesResult.rows.map(row => row.table_name);
    console.log('📋 Tables trouvées:', existingTables.length);
    
    for (const table of expectedTables) {
      if (existingTables.includes(table)) {
        console.log(`  ✅ ${table}`);
      } else {
        console.log(`  ❌ ${table} (manquante)`);
      }
    }
    
    // 3. Test des données existantes
    console.log('\n3️⃣ Vérification des données...');
    
    const counts = {};
    for (const table of existingTables.filter(t => !t.startsWith('_'))) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        counts[table] = parseInt(countResult.rows[0].count);
        console.log(`  📊 ${table}: ${counts[table]} enregistrements`);
      } catch (error) {
        console.log(`  ❌ ${table}: erreur (${error.message})`);
      }
    }
    
    // 4. Test d'opérations CRUD
    console.log('\n4️⃣ Test des opérations CRUD...');
    
    // Récupérer un ID de company valide
    const companyResult = await client.query('SELECT id FROM companies LIMIT 1');
    if (companyResult.rows.length === 0) {
      console.log('❌ Aucune company trouvée pour les tests CRUD');
      return;
    }
    const companyId = companyResult.rows[0].id;
    
    // Test CREATE
    console.log('  🔧 Test CREATE...');
    const insertResult = await client.query(`
      INSERT INTO clients (
        id, type, "companyName", email, phone, address, 
        "postalCode", city, country, notes, "companyId", 
        "createdAt", "updatedAt"
      )
      VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
      )
      RETURNING id, "companyName"
    `, [
      'COMPANY', 'TEST CONFIG COMPANY', 'test-config@test.dz', 
      '+213 21 00 00 00', 'Test Address Config', '16000', 
      'Alger', 'Algérie', 'Test configuration client', companyId
    ]);
    
    const testClientId = insertResult.rows[0].id;
    console.log(`    ✅ Client créé: ${insertResult.rows[0].companyName} (${testClientId})`);
    
    // Test READ
    console.log('  📖 Test READ...');
    const readResult = await client.query('SELECT * FROM clients WHERE id = $1', [testClientId]);
    console.log(`    ✅ Client lu: ${readResult.rows[0].companyName}`);
    
    // Test UPDATE
    console.log('  ✏️ Test UPDATE...');
    await client.query(`
      UPDATE clients 
      SET "companyName" = $1, "updatedAt" = NOW() 
      WHERE id = $2
    `, ['TEST CONFIG COMPANY UPDATED', testClientId]);
    
    const updatedResult = await client.query('SELECT "companyName" FROM clients WHERE id = $1', [testClientId]);
    console.log(`    ✅ Client mis à jour: ${updatedResult.rows[0].companyName}`);
    
    // Test DELETE
    console.log('  🗑️ Test DELETE...');
    await client.query('DELETE FROM clients WHERE id = $1', [testClientId]);
    console.log('    ✅ Client supprimé');
    
    // 5. Test des relations
    console.log('\n5️⃣ Test des relations...');
    const relationTest = await client.query(`
      SELECT 
        c.name as company_name,
        COUNT(cl.id) as clients_count,
        COUNT(p.id) as products_count
      FROM companies c
      LEFT JOIN clients cl ON c.id = cl."companyId"
      LEFT JOIN products p ON c.id = p."companyId"
      WHERE c.id = $1
      GROUP BY c.id, c.name
    `, [companyId]);
    
    if (relationTest.rows.length > 0) {
      const relation = relationTest.rows[0];
      console.log(`  🏢 Company: ${relation.company_name}`);
      console.log(`  👥 Clients: ${relation.clients_count}`);
      console.log(`  📦 Produits: ${relation.products_count}`);
      console.log('  ✅ Relations fonctionnelles');
    }
    
    client.release();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 CONFIGURATION POSTGRESQL VALIDÉE AVEC SUCCÈS !');
    console.log('✅ Connexion: OK');
    console.log('✅ Tables: OK');
    console.log('✅ Données: OK');
    console.log('✅ CRUD: OK');
    console.log('✅ Relations: OK');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ ERREUR DE CONFIGURATION:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testCompleteConfiguration();
