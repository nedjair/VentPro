// Test du nouveau format d'API avec pagination
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

async function testNewFormat() {
  console.log('🔍 Test du nouveau format d\'API...\n');

  try {
    // Test commandes avec nouveau format
    console.log('📋 TEST COMMANDES:');
    const orders = await makeRequest('/api/v1/orders');
    if (orders.status === 200) {
      console.log('✅ Endpoint accessible');
      console.log('📊 Structure de la réponse:');
      console.log(`   - success: ${orders.data.success}`);
      console.log(`   - data.data: ${Array.isArray(orders.data.data?.data) ? 'Array' : typeof orders.data.data?.data}`);
      console.log(`   - data.total: ${orders.data.data?.total}`);
      console.log(`   - data.page: ${orders.data.data?.page}`);
      console.log(`   - data.totalPages: ${orders.data.data?.totalPages}`);
      
      if (orders.data.data?.data && orders.data.data.data.length > 0) {
        console.log(`   - Commandes trouvées: ${orders.data.data.data.length}`);
        const first = orders.data.data.data[0];
        console.log(`   - Première commande: ${first.number} (${first.type}) - ${first.status}`);
        console.log(`   - Client: ${first.client?.name}`);
        console.log(`   - Total: ${first.total} DZD`);
      } else {
        console.log('   - Aucune commande trouvée');
      }
    } else {
      console.log(`❌ Erreur: ${orders.status}`);
    }

    // Test factures avec nouveau format
    console.log('\n💰 TEST FACTURES:');
    const invoices = await makeRequest('/api/v1/invoices');
    if (invoices.status === 200) {
      console.log('✅ Endpoint accessible');
      console.log('📊 Structure de la réponse:');
      console.log(`   - success: ${invoices.data.success}`);
      console.log(`   - data.data: ${Array.isArray(invoices.data.data?.data) ? 'Array' : typeof invoices.data.data?.data}`);
      console.log(`   - data.total: ${invoices.data.data?.total}`);
      
      if (invoices.data.data?.data && invoices.data.data.data.length > 0) {
        console.log(`   - Factures trouvées: ${invoices.data.data.data.length}`);
        const first = invoices.data.data.data[0];
        console.log(`   - Première facture: ${first.number} - ${first.status}`);
        console.log(`   - Client: ${first.client?.name}`);
        console.log(`   - Total: ${first.total} DZD`);
      } else {
        console.log('   - Aucune facture trouvée');
      }
    } else {
      console.log(`❌ Erreur: ${invoices.status}`);
    }

    // Test métriques détaillées
    console.log('\n📊 TEST MÉTRIQUES DÉTAILLÉES:');
    const metrics = await makeRequest('/metrics');
    if (metrics.status === 200) {
      console.log('✅ Métriques accessibles');
      const data = metrics.data;
      console.log(`   - Clients: ${JSON.stringify(data.clients)}`);
      console.log(`   - Produits: ${JSON.stringify(data.products)}`);
      console.log(`   - Commandes: ${JSON.stringify(data.orders)}`);
      console.log(`   - Factures: ${JSON.stringify(data.invoices)}`);
    }

    console.log('\n🔍 DIAGNOSTIC:');
    console.log('Le backend fonctionne mais le format de réponse a changé.');
    console.log('Les données sont maintenant dans data.data.data au lieu de data.');
    console.log('Le frontend doit être adapté à ce nouveau format.');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testNewFormat();
