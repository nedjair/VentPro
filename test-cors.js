/**
 * Script de test CORS pour vérifier la configuration
 */

const http = require('http');

function testCORS(origin, method = 'GET', path = '/health') {
  return new Promise((resolve, reject) => {
    const headers = {
      'Origin': origin,
      'Content-Type': 'application/json'
    };

    // Ajouter les headers de preflight pour les requêtes OPTIONS
    if (method === 'OPTIONS') {
      headers['Access-Control-Request-Method'] = 'GET';
      headers['Access-Control-Request-Headers'] = 'Content-Type,Authorization';
    }

    const options = {
      hostname: 'localhost',
      port: 3003,
      path: path,
      method: method,
      headers: headers
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
          origin: origin,
          method: method,
          path: path
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Test de la configuration CORS\n');
  
  const origins = [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3004',
    'http://localhost:3005'
  ];

  for (const origin of origins) {
    try {
      console.log(`🔍 Test avec origine: ${origin}`);
      
      // Test OPTIONS (preflight) sur un endpoint API
      const optionsResult = await testCORS(origin, 'OPTIONS', '/api/v1/dashboard/stats');
      console.log(`   OPTIONS: ${optionsResult.statusCode}`);
      console.log(`   Access-Control-Allow-Origin: ${optionsResult.headers['access-control-allow-origin'] || 'Non défini'}`);
      console.log(`   Access-Control-Allow-Methods: ${optionsResult.headers['access-control-allow-methods'] || 'Non défini'}`);

      // Test GET sur health (endpoint public)
      const getResult = await testCORS(origin, 'GET', '/health');
      console.log(`   GET: ${getResult.statusCode}`);
      console.log(`   Access-Control-Allow-Origin: ${getResult.headers['access-control-allow-origin'] || 'Non défini'}`);
      
      console.log('');
    } catch (error) {
      console.error(`❌ Erreur pour ${origin}:`, error.message);
      console.log('');
    }
  }
  
  console.log('✅ Tests CORS terminés');
}

runTests().catch(console.error);
