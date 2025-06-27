// Script pour insérer manuellement les données algériennes
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://gestion_user:gestion_password_secure_2024@localhost:5432/gestion_commerciale',
  ssl: false
});

async function manualInsert() {
  let client;
  try {
    console.log('🔍 Connexion à la base de données...');
    client = await pool.connect();
    console.log('✅ Connexion réussie');

    // Vérifier les données existantes
    const clientCount = await client.query('SELECT COUNT(*) FROM clients');
    console.log(`📊 Clients existants: ${clientCount.rows[0].count}`);

    if (parseInt(clientCount.rows[0].count) > 0) {
      console.log('🗑️ Suppression des données existantes...');
      await client.query('DELETE FROM invoice_items');
      await client.query('DELETE FROM order_items');
      await client.query('DELETE FROM invoices');
      await client.query('DELETE FROM orders');
      await client.query('DELETE FROM products');
      await client.query('DELETE FROM clients');
      console.log('✅ Données supprimées');
    }

    // D'abord, créons les tables si elles n'existent pas
    console.log('🔧 Création des tables si nécessaire...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        type VARCHAR(20) NOT NULL CHECK (type IN ('INDIVIDUAL', 'COMPANY')),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        company_name VARCHAR(200),
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        address TEXT,
        postal_code VARCHAR(20),
        city VARCHAR(100),
        country VARCHAR(100) DEFAULT 'France',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        reference VARCHAR(100),
        description TEXT,
        category VARCHAR(100),
        price DECIMAL(10,2) NOT NULL,
        cost_price DECIMAL(10,2),
        stock INTEGER DEFAULT 0,
        min_stock INTEGER DEFAULT 0,
        unit VARCHAR(50) DEFAULT 'pièce',
        is_active BOOLEAN DEFAULT true,
        track_stock BOOLEAN DEFAULT true,
        allow_backorder BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Tables créées');

    // Insérer les clients algériens
    console.log('👥 Insertion des clients algériens...');
    const testClients = [
      ['COMPANY', null, null, 'SONATRACH SPA', 'contact@sonatrach.dz', '+213 21 54 70 00', 'Avenue du 1er Novembre', '16000', 'Alger', 'Algérie', 'Compagnie nationale des hydrocarbures'],
      ['COMPANY', null, null, 'CEVITAL SARL', 'info@cevital.dz', '+213 34 77 60 00', 'Nouveau Port de Bejaia', '06000', 'Béjaïa', 'Algérie', 'Groupe agroalimentaire'],
      ['COMPANY', null, null, 'CONDOR Electronics EURL', 'commercial@condor.dz', '+213 25 93 20 00', 'Zone Industrielle Rouiba', '16012', 'Alger', 'Algérie', 'Fabricant d\'électronique'],
      ['INDIVIDUAL', 'Ahmed', 'Benali', null, 'ahmed.benali@gmail.com', '+213 555 123 456', '15 Rue Didouche Mourad', '16000', 'Alger', 'Algérie', 'Client régulier'],
      ['INDIVIDUAL', 'Fatima', 'Bouzid', null, 'fatima.bouzid@hotmail.com', '+213 661 789 012', '42 Boulevard de la République', '31000', 'Oran', 'Algérie', 'Achats fréquents']
    ];

    for (let i = 0; i < testClients.length; i++) {
      const client_data = testClients[i];
      await client.query(`
        INSERT INTO clients (type, first_name, last_name, company_name, email, phone, address, postal_code, city, country, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, client_data);
      console.log(`✅ Client ${i + 1}/${testClients.length}: ${client_data[3] || client_data[1] + ' ' + client_data[2]}`);
    }

    // Insérer les produits algériens
    console.log('📦 Insertion des produits algériens...');
    const testProducts = [
      ['Téléviseur LED 55"', 'TV-LED-55-001', 'Téléviseur LED 55 pouces Full HD CONDOR', 'Électronique', 89000.00, 65000.00, 25, 5, 'pièce', true, true, false],
      ['Réfrigérateur 350L', 'FRIGO-350-001', 'Réfrigérateur ENIEM 350 litres', 'Électroménager', 125000.00, 95000.00, 15, 3, 'pièce', true, true, false],
      ['Djellaba homme', 'DJEL-H-001', 'Djellaba traditionnelle pour homme', 'Textile', 8500.00, 5500.00, 30, 5, 'pièce', true, true, false],
      ['Huile d\'olive 1L', 'HUILE-OL-1L', 'Huile d\'olive extra vierge de Kabylie', 'Alimentaire', 850.00, 600.00, 100, 20, 'litre', true, true, false],
      ['Couscous 1kg', 'COUSCOUS-1K', 'Couscous grain moyen 1kg', 'Alimentaire', 320.00, 220.00, 200, 30, 'kg', true, true, false]
    ];

    for (let i = 0; i < testProducts.length; i++) {
      const product = testProducts[i];
      await client.query(`
        INSERT INTO products (name, reference, description, category, price, cost_price, stock, min_stock, unit, is_active, track_stock, allow_backorder)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, product);
      console.log(`✅ Produit ${i + 1}/${testProducts.length}: ${product[0]} (${product[4]} DZD)`);
    }

    // Vérifier les résultats
    const finalClientCount = await client.query('SELECT COUNT(*) FROM clients');
    const finalProductCount = await client.query('SELECT COUNT(*) FROM products');
    
    console.log('📊 RÉSULTATS:');
    console.log(`   - Clients: ${finalClientCount.rows[0].count}`);
    console.log(`   - Produits: ${finalProductCount.rows[0].count}`);
    console.log('✅ Insertion manuelle terminée avec succès !');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

manualInsert();
