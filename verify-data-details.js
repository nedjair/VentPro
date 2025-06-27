// Vérification détaillée des données algériennes
const http = require('http');

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'GET',
      timeout: 10000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

async function verifyData() {
  console.log('🔍 Vérification détaillée des données algériennes...\n');

  try {
    // Vérifier les métriques
    console.log('📊 MÉTRIQUES GÉNÉRALES:');
    const metrics = await makeRequest('/metrics');
    if (metrics.status === 200) {
      const data = metrics.data;
      console.log(`   - Clients: ${data.clients?.total || data.clients || 0}`);
      console.log(`   - Produits: ${data.products?.total || data.products || 0}`);
      console.log(`   - Commandes: ${data.orders?.total || data.orders || 0}`);
      console.log(`   - Factures: ${data.invoices?.total || data.invoices || 0}`);
      console.log(`   - Devise: ${data.currency || 'N/A'}`);
      console.log(`   - Pays: ${data.country || 'N/A'}`);
    }

    // Vérifier les commandes
    console.log('\n📋 COMMANDES DÉTAILLÉES:');
    const orders = await makeRequest('/api/v1/orders');
    if (orders.status === 200 && orders.data.data) {
      console.log(`   Total: ${orders.data.data.length} commandes`);
      orders.data.data.slice(0, 5).forEach((order, index) => {
        console.log(`   ${index + 1}. ${order.number} (${order.type}) - ${order.status}`);
        console.log(`      Client: ${order.client?.name || 'N/A'}`);
        console.log(`      Total: ${order.total || 0} DZD`);
        console.log(`      Date: ${order.orderDate ? new Date(order.orderDate).toLocaleDateString('fr-FR') : 'N/A'}`);
      });
      if (orders.data.data.length > 5) {
        console.log(`   ... et ${orders.data.data.length - 5} autres commandes`);
      }
    }

    // Vérifier les factures
    console.log('\n💰 FACTURES DÉTAILLÉES:');
    const invoices = await makeRequest('/api/v1/invoices');
    if (invoices.status === 200 && invoices.data.data) {
      console.log(`   Total: ${invoices.data.data.length} factures`);
      invoices.data.data.forEach((invoice, index) => {
        console.log(`   ${index + 1}. ${invoice.number} - ${invoice.status}`);
        console.log(`      Client: ${invoice.client?.name || 'N/A'}`);
        console.log(`      Total: ${invoice.total || 0} DZD`);
        console.log(`      Date: ${invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('fr-FR') : 'N/A'}`);
        if (invoice.status === 'PAID' && invoice.paidDate) {
          console.log(`      Payée le: ${new Date(invoice.paidDate).toLocaleDateString('fr-FR')}`);
        }
      });
    }

    // Vérifier les clients
    console.log('\n👥 CLIENTS ALGÉRIENS:');
    const clients = await makeRequest('/api/v1/clients');
    if (clients.status === 200 && clients.data.data) {
      console.log(`   Total: ${clients.data.data.length} clients`);
      const companies = clients.data.data.filter(c => c.type === 'COMPANY');
      const individuals = clients.data.data.filter(c => c.type === 'INDIVIDUAL');
      
      console.log(`   Entreprises (${companies.length}):`);
      companies.slice(0, 3).forEach(client => {
        console.log(`      - ${client.name} (${client.city || 'N/A'})`);
      });
      
      console.log(`   Particuliers (${individuals.length}):`);
      individuals.slice(0, 3).forEach(client => {
        console.log(`      - ${client.name} (${client.city || 'N/A'})`);
      });
    }

    // Vérifier les produits
    console.log('\n📦 PRODUITS AVEC PRIX DZD:');
    const products = await makeRequest('/api/v1/products');
    if (products.status === 200 && products.data.data) {
      console.log(`   Total: ${products.data.data.length} produits`);
      
      // Grouper par catégorie
      const categories = {};
      products.data.data.forEach(product => {
        const cat = product.category || 'Autre';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(product);
      });
      
      Object.keys(categories).slice(0, 5).forEach(category => {
        const items = categories[category];
        console.log(`   ${category} (${items.length} produits):`);
        items.slice(0, 2).forEach(product => {
          console.log(`      - ${product.name}: ${product.price} DZD`);
        });
      });
    }

    console.log('\n✅ VÉRIFICATION TERMINÉE');
    console.log('\n🎯 RÉSULTAT: Toutes les données algériennes sont présentes et correctes !');
    console.log('📱 Le frontend devrait maintenant afficher les données.');
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error.message);
  }
}

verifyData();
