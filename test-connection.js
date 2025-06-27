// Script de test de connectivité frontend-backend
const http = require('http');

function testBackendConnection() {
  console.log('🔍 Test de connectivité backend...');

  // Test 1: Health check
  console.log('\n1️⃣ Test Health Check...');

  const healthOptions = {
    hostname: 'localhost',
    port: 3001,
    path: '/health',
    method: 'GET'
  };

  const healthReq = http.request(healthOptions, (res) => {
    console.log('✅ Health Check Status:', res.statusCode);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('✅ Health Check Response:', data);

      // Test 2: Login endpoint
      console.log('\n2️⃣ Test Login Endpoint...');

      const loginData = JSON.stringify({
        email: 'admin@demo-tpe.fr',
        password: 'demo123'
      });

      const loginOptions = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Content-Length': Buffer.byteLength(loginData)
        }
      };

      const loginReq = http.request(loginOptions, (loginRes) => {
        console.log('📊 Login Response Status:', loginRes.statusCode);
        console.log('📊 Login Headers:', loginRes.headers);

        let loginResponseData = '';
        loginRes.on('data', (chunk) => {
          loginResponseData += chunk;
        });

        loginRes.on('end', () => {
          console.log('📊 Login Response:', loginResponseData);
        });
      });

      loginReq.on('error', (error) => {
        console.error('❌ Erreur Login:', error.message);
      });

      loginReq.write(loginData);
      loginReq.end();
    });
  });

  healthReq.on('error', (error) => {
    console.error('❌ Erreur Health Check:', error.message);
    console.log('🔍 Le backend n\'est probablement pas démarré sur le port 3001');
  });

  healthReq.end();
}

// Exécuter le test
testBackendConnection();
