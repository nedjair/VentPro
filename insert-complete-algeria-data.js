// Script complet pour insérer toutes les données algériennes
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://gestion_user:gestion_password_secure_2024@localhost:5432/gestion_commerciale',
  ssl: false
});

async function insertCompleteAlgerianData() {
  let client;
  try {
    console.log('🔍 Connexion à la base de données...');
    client = await pool.connect();
    console.log('✅ Connexion réussie');

    // Supprimer les données existantes
    console.log('🗑️ Suppression des données existantes...');
    await client.query('DELETE FROM invoice_items');
    await client.query('DELETE FROM order_items');
    await client.query('DELETE FROM invoices');
    await client.query('DELETE FROM orders');
    await client.query('DELETE FROM products');
    await client.query('DELETE FROM clients');
    console.log('✅ Données supprimées');

    // Recréer les tables si nécessaire
    console.log('🔧 Vérification des tables...');
    
    // Vérifier si la table clients a la bonne structure
    try {
      await client.query('SELECT notes FROM clients LIMIT 1');
      console.log('✅ Table clients OK');
    } catch (error) {
      console.log('🔧 Recréation de la table clients...');
      await client.query('DROP TABLE IF EXISTS clients CASCADE');
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
      console.log('✅ Table clients recréée');
    }

    // Vérifier si la table products a la bonne structure
    try {
      await client.query('SELECT reference FROM products LIMIT 1');
      console.log('✅ Table products OK');
    } catch (error) {
      console.log('🔧 Recréation de la table products...');
      await client.query('DROP TABLE IF EXISTS products CASCADE');
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
      console.log('✅ Table products recréée');
    }

    // Insérer les clients algériens
    console.log('👥 Insertion des clients algériens...');
    const testClients = [
      // Entreprises algériennes
      ['COMPANY', null, null, 'SONATRACH SPA', 'contact@sonatrach.dz', '+213 21 54 70 00', 'Avenue du 1er Novembre', '16000', 'Alger', 'Algérie', 'Compagnie nationale des hydrocarbures'],
      ['COMPANY', null, null, 'CEVITAL SARL', 'info@cevital.dz', '+213 34 77 60 00', 'Nouveau Port de Bejaia', '06000', 'Béjaïa', 'Algérie', 'Groupe agroalimentaire'],
      ['COMPANY', null, null, 'CONDOR Electronics EURL', 'commercial@condor.dz', '+213 25 93 20 00', 'Zone Industrielle Rouiba', '16012', 'Alger', 'Algérie', 'Fabricant d\'électronique'],
      ['COMPANY', null, null, 'SAIDAL SPA', 'contact@saidal.dz', '+213 21 52 14 00', 'Rue Bachir Attar', '16000', 'Alger', 'Algérie', 'Laboratoire pharmaceutique'],
      ['COMPANY', null, null, 'ENIEM SARL', 'info@eniem.dz', '+213 24 93 50 00', 'Zone Industrielle Oued Aissi', '15000', 'Tizi Ouzou', 'Algérie', 'Électroménager'],
      ['COMPANY', null, null, 'ALFADITEX SARL', 'contact@alfaditex.dz', '+213 31 41 20 00', 'Zone Industrielle Es-Sénia', '31000', 'Oran', 'Algérie', 'Textile et confection'],
      
      // Particuliers algériens
      ['INDIVIDUAL', 'Ahmed', 'Benali', null, 'ahmed.benali@gmail.com', '+213 555 123 456', '15 Rue Didouche Mourad', '16000', 'Alger', 'Algérie', 'Client régulier'],
      ['INDIVIDUAL', 'Fatima', 'Bouzid', null, 'fatima.bouzid@hotmail.com', '+213 661 789 012', '42 Boulevard de la République', '31000', 'Oran', 'Algérie', 'Achats fréquents'],
      ['INDIVIDUAL', 'Mohamed', 'Khelifi', null, 'mohamed.khelifi@yahoo.fr', '+213 770 345 678', '8 Rue Larbi Ben M\'hidi', '25000', 'Constantine', 'Algérie', null],
      ['INDIVIDUAL', 'Aicha', 'Hamidi', null, 'aicha.hamidi@outlook.com', '+213 698 901 234', '23 Avenue Boumediène', '23000', 'Annaba', 'Algérie', 'Préfère les paiements en espèces'],
      ['INDIVIDUAL', 'Karim', 'Meziane', null, 'karim.meziane@gmail.com', '+213 542 567 890', '67 Rue des Frères Bouadou', '09000', 'Blida', 'Algérie', 'Client VIP'],
      ['INDIVIDUAL', 'Samira', 'Cherif', null, 'samira.cherif@live.com', '+213 779 123 456', '12 Cité 20 Août 1955', '16000', 'Alger', 'Algérie', null],
      ['INDIVIDUAL', 'Youcef', 'Brahimi', null, 'youcef.brahimi@gmail.com', '+213 663 789 012', '34 Rue Emir Abdelkader', '31000', 'Oran', 'Algérie', 'Commandes en ligne'],
      ['INDIVIDUAL', 'Nadia', 'Boumediene', null, 'nadia.boumediene@hotmail.fr', '+213 551 345 678', '56 Boulevard Zighout Youcef', '25000', 'Constantine', 'Algérie', 'Paiement par chèque']
    ];

    for (let i = 0; i < testClients.length; i++) {
      const client_data = testClients[i];
      await client.query(`
        INSERT INTO clients (type, first_name, last_name, company_name, email, phone, address, postal_code, city, country, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, client_data);
      console.log(`✅ Client ${i + 1}/${testClients.length}: ${client_data[3] || client_data[1] + ' ' + client_data[2]}`);
    }

    // Insérer les produits algériens (prix en DZD)
    console.log('📦 Insertion des produits algériens...');
    const testProducts = [
      // Électronique
      ['Téléviseur LED 55"', 'TV-LED-55-001', 'Téléviseur LED 55 pouces Full HD CONDOR', 'Électronique', 89000.00, 65000.00, 25, 5, 'pièce', true, true, false],
      ['Réfrigérateur 350L', 'FRIGO-350-001', 'Réfrigérateur ENIEM 350 litres', 'Électroménager', 125000.00, 95000.00, 15, 3, 'pièce', true, true, false],
      ['Climatiseur 12000 BTU', 'CLIM-12K-001', 'Climatiseur split 12000 BTU', 'Électroménager', 75000.00, 55000.00, 20, 5, 'pièce', true, true, false],
      ['Smartphone Android', 'PHONE-AND-001', 'Smartphone Android 128GB', 'Électronique', 45000.00, 32000.00, 50, 10, 'pièce', true, true, false],
      ['Ordinateur portable', 'LAPTOP-HP-001', 'Ordinateur portable HP Core i5', 'Informatique', 135000.00, 105000.00, 12, 3, 'pièce', true, true, false],
      
      // Textile
      ['Djellaba homme', 'DJEL-H-001', 'Djellaba traditionnelle pour homme', 'Textile', 8500.00, 5500.00, 30, 5, 'pièce', true, true, false],
      ['Haïk femme', 'HAIK-F-001', 'Haïk traditionnel algérien', 'Textile', 12000.00, 8000.00, 20, 3, 'pièce', true, true, false],
      ['Burnous laine', 'BURN-L-001', 'Burnous en laine pure', 'Textile', 15000.00, 10000.00, 15, 2, 'pièce', true, true, false],
      
      // Alimentaire
      ['Huile d\'olive 1L', 'HUILE-OL-1L', 'Huile d\'olive extra vierge de Kabylie', 'Alimentaire', 850.00, 600.00, 100, 20, 'litre', true, true, false],
      ['Couscous 1kg', 'COUSCOUS-1K', 'Couscous grain moyen 1kg', 'Alimentaire', 320.00, 220.00, 200, 30, 'kg', true, true, false],
      ['Dattes Deglet Nour 500g', 'DATTES-DN-500', 'Dattes Deglet Nour de Biskra', 'Alimentaire', 1200.00, 800.00, 80, 15, 'paquet', true, true, false],
      ['Miel naturel 500g', 'MIEL-NAT-500', 'Miel naturel de montagne', 'Alimentaire', 2500.00, 1800.00, 40, 8, 'pot', true, true, false],
      
      // Artisanat
      ['Tapis berbère 2x3m', 'TAPIS-BER-2X3', 'Tapis berbère fait main', 'Artisanat', 45000.00, 30000.00, 8, 2, 'pièce', true, true, false],
      ['Poterie kabyle', 'POT-KAB-001', 'Poterie traditionnelle kabyle', 'Artisanat', 3500.00, 2200.00, 25, 5, 'pièce', true, true, false],
      ['Bijoux en argent', 'BIJ-ARG-001', 'Bijoux traditionnels en argent', 'Artisanat', 8500.00, 6000.00, 15, 3, 'pièce', true, true, false],
      
      // Construction
      ['Ciment CPA 50kg', 'CIM-CPA-50', 'Ciment Portland CPA 325', 'Construction', 950.00, 750.00, 500, 50, 'sac', true, true, false],
      ['Carrelage 60x60', 'CAR-60X60-001', 'Carrelage grès cérame 60x60cm', 'Construction', 2800.00, 2000.00, 100, 20, 'm²', true, true, false],
      ['Peinture murale 15L', 'PEIN-MUR-15L', 'Peinture acrylique mate 15L', 'Construction', 4500.00, 3200.00, 30, 5, 'bidon', true, true, false],
      
      // Automobile
      ['Pneu 195/65 R15', 'PNEU-195-65-15', 'Pneu tourisme 195/65 R15', 'Automobile', 12000.00, 8500.00, 40, 8, 'pièce', true, true, false],
      ['Batterie 12V 70Ah', 'BAT-12V-70AH', 'Batterie auto 12V 70Ah', 'Automobile', 15000.00, 11000.00, 25, 5, 'pièce', true, true, false]
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
    
    console.log('📊 RÉSULTATS FINAUX:');
    console.log(`   - Clients: ${finalClientCount.rows[0].count}`);
    console.log(`   - Produits: ${finalProductCount.rows[0].count}`);
    console.log('✅ Données algériennes insérées avec succès !');
    console.log('🚀 Vous pouvez maintenant redémarrer le backend');

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

insertCompleteAlgerianData();
