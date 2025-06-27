// Test final de l'API backend
const http = require('http');

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'GET',
      timeout: 5000
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

async function testAPI() {
  console.log('🔍 Test de l\'API backend...\n');

  // Test 1: Health Check
  try {
    console.log('1. Test Health Check...');
    const health = await makeRequest('/health');
    if (health.status === 200) {
      console.log('✅ Health: OK');
      console.log(`   Status: ${health.data.status}`);
    } else {
      console.log(`❌ Health: ${health.status}`);
    }
  } catch (error) {
    console.log(`❌ Health: ${error.message}`);
  }

  // Test 2: Métriques
  try {
    console.log('\n2. Test Métriques...');
    const metrics = await makeRequest('/metrics');
    if (metrics.status === 200) {
      console.log('✅ Métriques: OK');
      console.log(`   Clients: ${metrics.data.clients || 0}`);
      console.log(`   Produits: ${metrics.data.products || 0}`);
      console.log(`   Commandes: ${metrics.data.orders || 0}`);
      console.log(`   Factures: ${metrics.data.invoices || 0}`);
    } else {
      console.log(`❌ Métriques: ${metrics.status}`);
    }
  } catch (error) {
    console.log(`❌ Métriques: ${error.message}`);
  }

  // Test 3: API Commandes
  try {
    console.log('\n3. Test API Commandes...');
    const orders = await makeRequest('/api/v1/orders');
    if (orders.status === 200) {
      console.log('✅ API Commandes: OK');
      console.log(`   Commandes trouvées: ${orders.data.data?.length || 0}`);
      if (orders.data.data && orders.data.data.length > 0) {
        const first = orders.data.data[0];
        console.log(`   Première: ${first.number} - ${first.client?.name || 'N/A'}`);
      }
    } else {
      console.log(`❌ API Commandes: ${orders.status}`);
      if (orders.data.error) {
        console.log(`   Erreur: ${orders.data.error}`);
      }
    }
  } catch (error) {
    console.log(`❌ API Commandes: ${error.message}`);
  }

  // Test 4: API Factures
  try {
    console.log('\n4. Test API Factures...');
    const invoices = await makeRequest('/api/v1/invoices');
    if (invoices.status === 200) {
      console.log('✅ API Factures: OK');
      console.log(`   Factures trouvées: ${invoices.data.data?.length || 0}`);
      if (invoices.data.data && invoices.data.data.length > 0) {
        const first = invoices.data.data[0];
        console.log(`   Première: ${first.number} - ${first.client?.name || 'N/A'}`);
      }
    } else {
      console.log(`❌ API Factures: ${invoices.status}`);
      if (invoices.data.error) {
        console.log(`   Erreur: ${invoices.data.error}`);
      }
    }
  } catch (error) {
    console.log(`❌ API Factures: ${error.message}`);
  }

  console.log('\n🏁 Tests terminés');
  
  // Vérifier si le backend fonctionne
  try {
    const health = await makeRequest('/health');
    if (health.status === 200) {
      console.log('\n🎉 BACKEND FONCTIONNEL !');
      console.log('📊 URLs disponibles:');
      console.log('   - Health: http://localhost:3001/health');
      console.log('   - Métriques: http://localhost:3001/metrics');
      console.log('   - Commandes: http://localhost:3001/api/v1/orders');
      console.log('   - Factures: http://localhost:3001/api/v1/invoices');
    } else {
      console.log('\n❌ Backend non fonctionnel');
    }
  } catch (error) {
    console.log('\n❌ Backend non accessible');
    console.log('💡 Solutions possibles:');
    console.log('   1. Redémarrer le backend: node production-backend.js');
    console.log('   2. Vérifier PostgreSQL: docker ps');
    console.log('   3. Vérifier les logs d\'erreur');
  }
}

testAPI();
