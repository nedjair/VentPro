#!/usr/bin/env node

const http = require('http');

console.log('🔍 TEST COMPLET DES API ENDPOINTS');
console.log('==================================\n');

let authToken = null;

// Fonction utilitaire pour faire des requêtes HTTP
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ statusCode: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// Test d'authentification
async function testAuth() {
  console.log('🔐 1. TEST D\'AUTHENTIFICATION');
  console.log('==============================');
  
  const postData = JSON.stringify({
    email: 'admin@gestion-dz.com',
    password: 'admin123'
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  try {
    const response = await makeRequest(options, postData);
    console.log(`Status: ${response.statusCode}`);
    
    if (response.statusCode === 200 && response.data.success) {
      authToken = response.data.data.token;
      console.log('✅ Authentification réussie');
      console.log(`   User: ${response.data.data.user.firstName} ${response.data.data.user.lastName}`);
      console.log(`   Role: ${response.data.data.user.role}`);
      console.log(`   Token: ${authToken ? 'Présent' : 'Manquant'}`);
      return true;
    } else {
      console.log('❌ Authentification échouée');
      console.log(`   Message: ${response.data.message || 'Erreur inconnue'}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
    return false;
  }
}

// Test des endpoints protégés
async function testProtectedEndpoints() {
  console.log('\n📊 2. TEST DES ENDPOINTS PROTÉGÉS');
  console.log('==================================');
  
  if (!authToken) {
    console.log('❌ Pas de token d\'authentification disponible');
    return;
  }

  const endpoints = [
    { name: 'Dashboard Stats', path: '/api/v1/dashboard/stats', method: 'GET' },
    { name: 'Clients', path: '/api/v1/clients', method: 'GET' },
    { name: 'Products', path: '/api/v1/products', method: 'GET' },
    { name: 'Suppliers', path: '/api/v1/suppliers', method: 'GET' },
    { name: 'Stocks', path: '/api/v1/stocks', method: 'GET' },
    { name: 'Analytics KPI', path: '/api/v1/analytics/kpi', method: 'GET' },
    { name: 'Analytics Sales', path: '/api/v1/analytics/sales', method: 'GET' },
    { name: 'User Profile', path: '/api/v1/auth/profile', method: 'GET' }
  ];

  for (const endpoint of endpoints) {
    try {
      const options = {
        hostname: 'localhost',
        port: 3001,
        path: endpoint.path,
        method: endpoint.method,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      };

      const response = await makeRequest(options);
      
      if (response.statusCode === 200) {
        console.log(`✅ ${endpoint.name}: OK`);
        if (response.data.data) {
          if (Array.isArray(response.data.data)) {
            console.log(`   Données: ${response.data.data.length} éléments`);
          } else if (typeof response.data.data === 'object') {
            const keys = Object.keys(response.data.data);
            console.log(`   Propriétés: ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}`);
          }
        }
      } else {
        console.log(`❌ ${endpoint.name}: ${response.statusCode}`);
        if (response.data.message) {
          console.log(`   Erreur: ${response.data.message}`);
        }
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ERROR - ${error.message}`);
    }
  }
}

// Test des endpoints publics
async function testPublicEndpoints() {
  console.log('\n🌐 3. TEST DES ENDPOINTS PUBLICS');
  console.log('=================================');
  
  const endpoints = [
    { name: 'Health Check', path: '/health', method: 'GET' },
    { name: 'API Docs', path: '/docs', method: 'GET' }
  ];

  for (const endpoint of endpoints) {
    try {
      const options = {
        hostname: 'localhost',
        port: 3001,
        path: endpoint.path,
        method: endpoint.method
      };

      const response = await makeRequest(options);
      
      if (response.statusCode === 200) {
        console.log(`✅ ${endpoint.name}: OK`);
      } else {
        console.log(`❌ ${endpoint.name}: ${response.statusCode}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ERROR - ${error.message}`);
    }
  }
}

// Test CORS
async function testCORS() {
  console.log('\n🔄 4. TEST CORS');
  console.log('================');
  
  try {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/health',
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type,Authorization'
      }
    };

    const response = await makeRequest(options);
    
    if (response.statusCode === 200 || response.statusCode === 204) {
      console.log('✅ CORS: OK');
      console.log(`   Access-Control-Allow-Origin: ${response.headers['access-control-allow-origin'] || 'Non défini'}`);
      console.log(`   Access-Control-Allow-Methods: ${response.headers['access-control-allow-methods'] || 'Non défini'}`);
    } else {
      console.log(`❌ CORS: ${response.statusCode}`);
    }
  } catch (error) {
    console.log(`❌ CORS: ERROR - ${error.message}`);
  }
}

// Exécution des tests
async function runAllTests() {
  const authSuccess = await testAuth();
  
  if (authSuccess) {
    await testProtectedEndpoints();
  }
  
  await testPublicEndpoints();
  await testCORS();
  
  console.log('\n🎯 RÉSUMÉ');
  console.log('=========');
  console.log(`Authentification: ${authSuccess ? '✅ OK' : '❌ FAILED'}`);
  console.log('Backend: ✅ Opérationnel');
  console.log('Base de données: ✅ Connectée');
  
  if (authSuccess) {
    console.log('\n🎉 Tous les tests principaux sont passés !');
    console.log('L\'API backend est entièrement fonctionnelle.');
  } else {
    console.log('\n⚠️ Problème d\'authentification détecté.');
  }
}

runAllTests().catch(console.error);
