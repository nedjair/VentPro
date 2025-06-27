const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://gestion_user:gestion_password_secure_2024@localhost:5432/gestion_commerciale',
  ssl: false
});

async function createTestData() {
  try {
    console.log('🚀 Création des données de test pour Phase 5...');

    // Vérifier si les tables existent
    const tablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('orders', 'invoices', 'order_items', 'invoice_items')
    `);
    
    console.log('📋 Tables existantes:', tablesCheck.rows.map(r => r.table_name));

    // Récupérer les clients et produits existants
    const clients = await pool.query('SELECT id FROM clients LIMIT 3');
    const products = await pool.query('SELECT id, price FROM products LIMIT 5');

    if (clients.rows.length === 0 || products.rows.length === 0) {
      console.log('❌ Pas assez de clients ou produits pour créer des données de test');
      return;
    }

    console.log(`📊 Clients disponibles: ${clients.rows.length}, Produits: ${products.rows.length}`);

    // Créer des commandes de test
    const orders = [];
    for (let i = 0; i < 10; i++) {
      const clientId = clients.rows[Math.floor(Math.random() * clients.rows.length)].id;
      const type = Math.random() > 0.5 ? 'QUOTE' : 'ORDER';
      const status = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'][Math.floor(Math.random() * 4)];
      
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 90)); // 90 derniers jours
      
      const orderNumber = `${type}-${orderDate.getFullYear()}${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(4, '0')}`;
      
      const subtotal = 100 + Math.random() * 1000;
      const vatAmount = subtotal * 0.2;
      const total = subtotal + vatAmount;

      try {
        const orderResult = await pool.query(`
          INSERT INTO orders (number, type, status, client_id, order_date, subtotal, vat_amount, total)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id
        `, [orderNumber, type, status, clientId, orderDate, subtotal, vatAmount, total]);

        orders.push({ id: orderResult.rows[0].id, total, clientId });
        console.log(`✅ Commande créée: ${orderNumber}`);
      } catch (error) {
        console.log(`⚠️ Erreur création commande ${orderNumber}:`, error.message);
      }
    }

    // Créer des factures de test
    for (let i = 0; i < 15; i++) {
      const clientId = clients.rows[Math.floor(Math.random() * clients.rows.length)].id;
      const orderId = orders.length > 0 ? orders[Math.floor(Math.random() * orders.length)].id : null;
      const status = ['DRAFT', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE'][Math.floor(Math.random() * 5)];
      
      const invoiceDate = new Date();
      invoiceDate.setDate(invoiceDate.getDate() - Math.floor(Math.random() * 120)); // 120 derniers jours
      
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 30);
      
      const invoiceNumber = `FAC-${invoiceDate.getFullYear()}${String(invoiceDate.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(4, '0')}`;
      
      const subtotal = 150 + Math.random() * 1500;
      const vatAmount = subtotal * 0.2;
      const total = subtotal + vatAmount;
      const paidAmount = status === 'PAID' ? total : (status === 'PARTIAL' ? total * 0.5 : 0);

      try {
        const invoiceResult = await pool.query(`
          INSERT INTO invoices (number, type, status, client_id, order_id, invoice_date, due_date, subtotal, vat_amount, total, paid_amount)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `, [invoiceNumber, 'INVOICE', status, clientId, orderId, invoiceDate, dueDate, subtotal, vatAmount, total, paidAmount]);

        // Créer des items de facture
        const numItems = 1 + Math.floor(Math.random() * 3);
        for (let j = 0; j < numItems; j++) {
          const product = products.rows[Math.floor(Math.random() * products.rows.length)];
          const quantity = 1 + Math.floor(Math.random() * 5);
          const unitPrice = parseFloat(product.price);
          
          await pool.query(`
            INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, vat_rate)
            VALUES ($1, $2, $3, $4, $5)
          `, [invoiceResult.rows[0].id, product.id, quantity, unitPrice, 20]);
        }

        console.log(`✅ Facture créée: ${invoiceNumber} (${status})`);
      } catch (error) {
        console.log(`⚠️ Erreur création facture ${invoiceNumber}:`, error.message);
      }
    }

    console.log('🎉 Données de test créées avec succès !');
    console.log('📊 Vous pouvez maintenant tester les analytics Phase 5');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await pool.end();
  }
}

createTestData();
