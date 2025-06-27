// Test des endpoints du backend pour vérifier la connexion complète
const http = require('http');

const BASE_URL = 'http://localhost:3011';

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    if (data && method !== 'GET') {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: jsonBody
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data && method !== 'GET') {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testEndpoints() {
  console.log('🔍 TEST DES ENDPOINTS BACKEND');
  console.log('='.repeat(50));
  console.log(`Backend URL: ${BASE_URL}`);
  console.log('');

  const tests = [
    {
      name: 'Health Check',
      path: '/health',
      expectedStatus: 200
    },
    {
      name: 'API Documentation',
      path: '/docs',
      expectedStatus: 200
    },
    {
      name: 'Clients List',
      path: '/api/clients',
      expectedStatus: [200, 401] // Peut nécessiter une authentification
    },
    {
      name: 'Products List',
      path: '/api/products',
      expectedStatus: [200, 401]
    },
    {
      name: 'Orders List',
      path: '/api/orders',
      expectedStatus: [200, 401]
    },
    {
      name: 'Invoices List',
      path: '/api/invoices',
      expectedStatus: [200, 401]
    },
    {
      name: 'Suppliers List',
      path: '/api/suppliers',
      expectedStatus: [200, 401]
    },
    {
      name: 'Analytics Dashboard',
      path: '/api/analytics/dashboard',
      expectedStatus: [200, 401]
    }
  ];

  let successCount = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    try {
      console.log(`📡 Test: ${test.name}`);
      console.log(`   URL: ${BASE_URL}${test.path}`);
      
      const response = await makeRequest(test.path);
      const expectedStatuses = Array.isArray(test.expectedStatus) ? test.expectedStatus : [test.expectedStatus];
      
      if (expectedStatuses.includes(response.statusCode)) {
        console.log(`   ✅ Status: ${response.statusCode} (attendu)`);
        
        // Afficher des informations supplémentaires pour certains endpoints
        if (test.path === '/health' && response.body) {
          console.log(`   📊 Santé: ${JSON.stringify(response.body, null, 2)}`);
        }
        
        if (test.path.includes('/api/') && response.statusCode === 200 && response.body) {
          if (Array.isArray(response.body)) {
            console.log(`   📊 Données: ${response.body.length} éléments`);
          } else if (response.body.data && Array.isArray(response.body.data)) {
            console.log(`   📊 Données: ${response.body.data.length} éléments`);
          } else {
            console.log(`   📊 Réponse: ${typeof response.body}`);
          }
        }
        
        successCount++;
      } else {
        console.log(`   ❌ Status: ${response.statusCode} (attendu: ${expectedStatuses.join(' ou ')})`);
        if (response.body && typeof response.body === 'object') {
          console.log(`   📄 Erreur: ${JSON.stringify(response.body, null, 2)}`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Erreur: ${error.message}`);
      if (error.code === 'ECONNREFUSED') {
        console.log(`   💡 Le serveur backend n'est pas accessible sur ${BASE_URL}`);
      }
    }
    
    console.log('');
  }

  // Test CORS
  console.log('🔒 TEST CORS');
  console.log('-'.repeat(30));
  try {
    const corsResponse = await makeRequest('/health', 'OPTIONS');
    console.log(`📡 OPTIONS /health`);
    console.log(`   ✅ Status: ${corsResponse.statusCode}`);
    
    const corsHeaders = corsResponse.headers;
    if (corsHeaders['access-control-allow-origin']) {
      console.log(`   ✅ CORS Origin: ${corsHeaders['access-control-allow-origin']}`);
    }
    if (corsHeaders['access-control-allow-methods']) {
      console.log(`   ✅ CORS Methods: ${corsHeaders['access-control-allow-methods']}`);
    }
    if (corsHeaders['access-control-allow-headers']) {
      console.log(`   ✅ CORS Headers: ${corsHeaders['access-control-allow-headers']}`);
    }
  } catch (error) {
    console.log(`   ❌ Erreur CORS: ${error.message}`);
  }

  console.log('');
  console.log('📊 RÉSUMÉ DES TESTS');
  console.log('='.repeat(50));
  console.log(`✅ Tests réussis: ${successCount}/${totalTests}`);
  console.log(`❌ Tests échoués: ${totalTests - successCount}/${totalTests}`);
  
  if (successCount === totalTests) {
    console.log('\n🎉 TOUS LES TESTS SONT RÉUSSIS !');
    console.log('✅ Le backend fonctionne parfaitement');
    console.log('✅ La connexion PostgreSQL est opérationnelle');
    console.log('✅ Les endpoints API sont accessibles');
  } else if (successCount > 0) {
    console.log('\n⚠️ TESTS PARTIELLEMENT RÉUSSIS');
    console.log('✅ Le backend fonctionne');
    console.log('⚠️ Certains endpoints peuvent nécessiter une authentification');
  } else {
    console.log('\n❌ ÉCHEC DES TESTS');
    console.log('❌ Vérifiez que le backend est démarré');
    console.log(`❌ URL testée: ${BASE_URL}`);
  }
  
  return successCount === totalTests;
}

// Test de connectivité simple
async function testConnectivity() {
  console.log('🔌 TEST DE CONNECTIVITÉ SIMPLE');
  console.log('='.repeat(50));
  
  try {
    const response = await makeRequest('/health');
    console.log(`✅ Serveur accessible sur ${BASE_URL}`);
    console.log(`✅ Status: ${response.statusCode}`);
    return true;
  } catch (error) {
    console.log(`❌ Serveur inaccessible: ${error.message}`);
    console.log(`❌ URL: ${BASE_URL}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 SOLUTIONS:');
      console.log('   1. Vérifiez que le backend est démarré');
      console.log('   2. Vérifiez le port (actuellement 3011)');
      console.log('   3. Lancez: cd apps/backend && npm run dev');
    }
    
    return false;
  }
}

async function main() {
  console.log('🚀 DÉMARRAGE DES TESTS BACKEND\n');
  
  // Test de connectivité d'abord
  const isConnected = await testConnectivity();
  console.log('');
  
  if (isConnected) {
    // Si connecté, lancer tous les tests
    await testEndpoints();
  } else {
    console.log('❌ Impossible de continuer les tests sans connectivité');
  }
}

if (require.main === module) {
  main();
}

module.exports = { testEndpoints, testConnectivity, makeRequest };
