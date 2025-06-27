const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://gestion_user:gestion_password_secure_2024@localhost:5432/gestion_commerciale',
  ssl: false
});

async function createTables() {
  try {
    console.log('🚀 Création des tables pour Phase 5...');

    // Table orders (commandes/devis)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        number VARCHAR(50) UNIQUE NOT NULL,
        type VARCHAR(20) NOT NULL DEFAULT 'ORDER', -- ORDER, QUOTE
        status VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- DRAFT, SENT, ACCEPTED, REJECTED, CANCELLED
        client_id VARCHAR(36) REFERENCES clients(id) ON DELETE CASCADE,
        order_date DATE NOT NULL DEFAULT CURRENT_DATE,
        valid_until DATE,
        subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
        vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        total DECIMAL(10,2) NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table orders créée');

    // Table order_items
    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        product_id VARCHAR(36) REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price DECIMAL(10,2) NOT NULL,
        vat_rate DECIMAL(5,2) NOT NULL DEFAULT 20.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table order_items créée');

    // Table invoices (factures)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        number VARCHAR(50) UNIQUE NOT NULL,
        type VARCHAR(20) NOT NULL DEFAULT 'INVOICE', -- INVOICE, CREDIT_NOTE
        status VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- DRAFT, SENT, PAID, PARTIAL, OVERDUE, CANCELLED
        client_id VARCHAR(36) REFERENCES clients(id) ON DELETE CASCADE,
        order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
        invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
        due_date DATE NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
        vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        total DECIMAL(10,2) NOT NULL DEFAULT 0,
        paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table invoices créée');

    // Table invoice_items
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
        product_id VARCHAR(36) REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price DECIMAL(10,2) NOT NULL,
        vat_rate DECIMAL(5,2) NOT NULL DEFAULT 20.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table invoice_items créée');

    // Index pour optimiser les requêtes analytics
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_client_date ON orders(client_id, order_date);
      CREATE INDEX IF NOT EXISTS idx_orders_status_date ON orders(status, order_date);
      CREATE INDEX IF NOT EXISTS idx_invoices_client_date ON invoices(client_id, invoice_date);
      CREATE INDEX IF NOT EXISTS idx_invoices_status_date ON invoices(status, invoice_date);
      CREATE INDEX IF NOT EXISTS idx_invoice_items_product ON invoice_items(product_id);
      CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
    `);
    console.log('✅ Index créés pour optimiser les analytics');

    // Trigger pour mettre à jour updated_at
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
      CREATE TRIGGER update_orders_updated_at 
        BEFORE UPDATE ON orders 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
      CREATE TRIGGER update_invoices_updated_at 
        BEFORE UPDATE ON invoices 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('✅ Triggers créés');

    console.log('🎉 Toutes les tables Phase 5 ont été créées avec succès !');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await pool.end();
  }
}

createTables();
