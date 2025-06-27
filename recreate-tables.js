// Script pour recréer les tables avec la bonne structure
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://gestion_user:gestion_password_secure_2024@localhost:5432/gestion_commerciale',
  ssl: false
});

async function recreateTables() {
  let client;
  try {
    console.log('🔍 Connexion à la base de données...');
    client = await pool.connect();
    console.log('✅ Connexion réussie');

    console.log('🗑️ Suppression des tables existantes...');
    
    // Supprimer les tables dans l'ordre correct (contraintes de clés étrangères)
    await client.query('DROP TABLE IF EXISTS invoice_items CASCADE');
    await client.query('DROP TABLE IF EXISTS order_items CASCADE');
    await client.query('DROP TABLE IF EXISTS invoices CASCADE');
    await client.query('DROP TABLE IF EXISTS orders CASCADE');
    await client.query('DROP TABLE IF EXISTS products CASCADE');
    await client.query('DROP TABLE IF EXISTS clients CASCADE');
    
    console.log('✅ Tables supprimées');

    console.log('🔧 Création des nouvelles tables...');

    // Table des clients
    await client.query(`
      CREATE TABLE clients (
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
    console.log('✅ Table clients créée');

    // Table des produits
    await client.query(`
      CREATE TABLE products (
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
    console.log('✅ Table products créée');

    // Table des commandes/devis
    await client.query(`
      CREATE TABLE orders (
        id SERIAL PRIMARY KEY,
        number VARCHAR(50) UNIQUE NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('QUOTE', 'ORDER')),
        status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED')),
        client_id INTEGER NOT NULL REFERENCES clients(id),
        order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        valid_until TIMESTAMP,
        delivery_date TIMESTAMP,
        subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
        vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        total DECIMAL(10,2) NOT NULL DEFAULT 0,
        discount DECIMAL(5,2) DEFAULT 0,
        notes TEXT,
        internal_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table orders créée');

    // Table des items de commande
    await client.query(`
      CREATE TABLE order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id),
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        vat_rate DECIMAL(5,2) NOT NULL DEFAULT 20,
        discount DECIMAL(5,2) DEFAULT 0
      )
    `);
    console.log('✅ Table order_items créée');

    // Table des factures
    await client.query(`
      CREATE TABLE invoices (
        id SERIAL PRIMARY KEY,
        number VARCHAR(50) UNIQUE NOT NULL,
        type VARCHAR(20) NOT NULL DEFAULT 'INVOICE' CHECK (type IN ('INVOICE', 'CREDIT_NOTE', 'PROFORMA')),
        status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED')),
        client_id INTEGER NOT NULL REFERENCES clients(id),
        order_id INTEGER REFERENCES orders(id),
        invoice_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        due_date TIMESTAMP NOT NULL,
        paid_date TIMESTAMP,
        subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
        vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        total DECIMAL(10,2) NOT NULL DEFAULT 0,
        paid_amount DECIMAL(10,2) DEFAULT 0,
        discount DECIMAL(5,2) DEFAULT 0,
        notes TEXT,
        payment_method VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table invoices créée');

    // Table des items de facture
    await client.query(`
      CREATE TABLE invoice_items (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id),
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        vat_rate DECIMAL(5,2) NOT NULL DEFAULT 20,
        discount DECIMAL(5,2) DEFAULT 0
      )
    `);
    console.log('✅ Table invoice_items créée');

    console.log('🎉 Toutes les tables ont été recréées avec succès !');
    console.log('🚀 Vous pouvez maintenant redémarrer le backend pour insérer les données algériennes');

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

recreateTables();
