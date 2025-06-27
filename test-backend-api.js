// Test simple du backend API
const http = require('http');

function testEndpoint(path, description) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log(`✅ ${description}: ${res.statusCode}`);
          if (path === '/metrics') {
            console.log(`   - Clients: ${json.clients?.total || 0}`);
            console.log(`   - Produits: ${json.products?.total || 0}`);
            console.log(`   - Commandes: ${json.orders?.total || 0}`);
            console.log(`   - Factures: ${json.invoices?.total || 0}`);
          } else if (path === '/api/v1/orders') {
            console.log(`   - Commandes trouvées: ${json.data?.length || 0}`);
          } else if (path === '/api/v1/invoices') {
            console.log(`   - Factures trouvées: ${json.data?.length || 0}`);
          }
          resolve(true);
        } catch (error) {
          console.log(`✅ ${description}: ${res.statusCode} (non-JSON)`);
          resolve(true);
        }
      });
    });

    req.on('error', (error) => {
      console.log(`❌ ${description}: ${error.message}`);
      resolve(false);
    });

    req.setTimeout(5000, () => {
      console.log(`⏰ ${description}: Timeout`);
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

async function testBackend() {
  console.log('🔍 Test du backend sur le port 3001...\n');

  const tests = [
    ['/health', 'Health Check'],
    ['/metrics', 'Métriques'],
    ['/api/v1/clients', 'API Clients'],
    ['/api/v1/products', 'API Produits'],
    ['/api/v1/orders', 'API Commandes'],
    ['/api/v1/invoices', 'API Factures'],
    ['/dashboard/stats', 'Dashboard Stats']
  ];

  for (const [path, description] of tests) {
    await testEndpoint(path, description);
    await new Promise(resolve => setTimeout(resolve, 500)); // Pause entre les tests
  }

  console.log('\n🏁 Tests terminés');
}

testBackend();
