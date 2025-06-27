#!/usr/bin/env node

const http = require('http');

console.log('🔍 DIAGNOSTIC DES ERREURS FRONTEND-BACKEND');
console.log('==========================================\n');

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

// Test 1: Vérifier la connectivité backend
async function testBackendConnectivity() {
  console.log('🔗 TEST 1: CONNECTIVITÉ BACKEND');
  console.log('===============================');
  
  try {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/health',
      method: 'GET'
    };

    const response = await makeRequest(options);
    
    if (response.statusCode === 200) {
      console.log('✅ Backend accessible sur port 3001');
      console.log(`   Status: ${response.statusCode}`);
      console.log(`   Data: ${JSON.stringify(response.data)}`);
      return true;
    } else {
      console.log(`❌ Backend erreur: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Backend inaccessible: ${error.message}`);
    return false;
  }
}

// Test 2: Vérifier CORS
async function testCORS() {
  console.log('\n🔄 TEST 2: CONFIGURATION CORS');
  console.log('==============================');
  
  try {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/health',
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization'
      }
    };

    const response = await makeRequest(options);
    
    console.log(`Status: ${response.statusCode}`);
    console.log('Headers CORS:');
    console.log(`   Access-Control-Allow-Origin: ${response.headers['access-control-allow-origin'] || 'NON DÉFINI'}`);
    console.log(`   Access-Control-Allow-Methods: ${response.headers['access-control-allow-methods'] || 'NON DÉFINI'}`);
    console.log(`   Access-Control-Allow-Headers: ${response.headers['access-control-allow-headers'] || 'NON DÉFINI'}`);
    
    return response.statusCode === 200 || response.statusCode === 204;
  } catch (error) {
    console.log(`❌ CORS test failed: ${error.message}`);
    return false;
  }
}

// Test 3: Tester l'authentification avec différents identifiants
async function testAuthentication() {
  console.log('\n🔐 TEST 3: AUTHENTIFICATION');
  console.log('============================');
  
  const credentials = [
    { email: 'admin@gestion-dz.com', password: 'admin123', name: 'Admin principal' },
    { email: 'khadija.cherif@gestion-dz.com', password: 'admin123', name: 'Khadija Cherif' },
    { email: 'admin@example.com', password: 'admin123', name: 'Admin générique' }
  ];

  for (const cred of credentials) {
    console.log(`\n🔍 Test avec ${cred.name}:`);
    
    const postData = JSON.stringify({
      email: cred.email,
      password: cred.password
    });

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Origin': 'http://localhost:3000'
      }
    };

    try {
      const response = await makeRequest(options, postData);
      
      console.log(`   Status: ${response.statusCode}`);
      
      if (response.statusCode === 200 && response.data.success) {
        console.log(`   ✅ Succès avec ${cred.email}`);
        console.log(`   👤 Utilisateur: ${response.data.data.user.firstName} ${response.data.data.user.lastName}`);
        console.log(`   🔑 Token: ${response.data.data.token ? 'Généré' : 'Manquant'}`);
        return { success: true, token: response.data.data.token, user: response.data.data.user };
      } else {
        console.log(`   ❌ Échec: ${response.data.message || 'Erreur inconnue'}`);
      }
    } catch (error) {
      console.log(`   ❌ Erreur: ${error.message}`);
    }
  }
  
  return { success: false };
}

// Test 4: Tester les endpoints avec token
async function testProtectedEndpoints(authResult) {
  console.log('\n🛡️ TEST 4: ENDPOINTS PROTÉGÉS');
  console.log('==============================');
  
  if (!authResult.success) {
    console.log('❌ Pas de token valide pour tester les endpoints protégés');
    return false;
  }

  const endpoints = [
    { name: 'Dashboard Stats', path: '/api/v1/dashboard/stats' },
    { name: 'Clients', path: '/api/v1/clients' },
    { name: 'Products', path: '/api/v1/products' }
  ];

  for (const endpoint of endpoints) {
    try {
      const options = {
        hostname: 'localhost',
        port: 3001,
        path: endpoint.path,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authResult.token}`,
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:3000'
        }
      };

      const response = await makeRequest(options);
      
      if (response.statusCode === 200) {
        console.log(`✅ ${endpoint.name}: OK`);
      } else {
        console.log(`❌ ${endpoint.name}: ${response.statusCode} - ${response.data.message || 'Erreur'}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ERROR - ${error.message}`);
    }
  }
}

// Test 5: Vérifier la configuration frontend
async function testFrontendConfig() {
  console.log('\n⚙️ TEST 5: CONFIGURATION FRONTEND');
  console.log('==================================');
  
  try {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET'
    };

    const response = await makeRequest(options);
    
    if (response.statusCode === 200) {
      console.log('✅ Frontend accessible sur port 3000');
    } else {
      console.log(`❌ Frontend erreur: ${response.statusCode}`);
    }
  } catch (error) {
    console.log(`❌ Frontend inaccessible: ${error.message}`);
  }

  // Vérifier les variables d'environnement frontend
  console.log('\n📋 Variables d\'environnement supposées:');
  console.log('   NEXT_PUBLIC_API_BASE_URL: http://localhost:3001');
  console.log('   NEXT_PUBLIC_API_URL: http://localhost:3001');
}

// Exécution complète
async function runDiagnostic() {
  console.log('🚀 DÉBUT DU DIAGNOSTIC');
  console.log('=======================\n');

  const backendOK = await testBackendConnectivity();
  const corsOK = await testCORS();
  const authResult = await testAuthentication();
  
  if (authResult.success) {
    await testProtectedEndpoints(authResult);
  }
  
  await testFrontendConfig();

  console.log('\n🎯 RÉSUMÉ DU DIAGNOSTIC');
  console.log('=======================');
  console.log(`🔗 Backend connectivité: ${backendOK ? '✅ OK' : '❌ FAILED'}`);
  console.log(`🔄 CORS configuration: ${corsOK ? '✅ OK' : '❌ FAILED'}`);
  console.log(`🔐 Authentification: ${authResult.success ? '✅ OK' : '❌ FAILED'}`);

  if (!backendOK) {
    console.log('\n🔧 SOLUTIONS SUGGÉRÉES:');
    console.log('1. Vérifiez que le backend est démarré sur le port 3001');
    console.log('2. Exécutez: cd apps/backend && npm run dev');
  }

  if (!corsOK) {
    console.log('\n🔧 SOLUTIONS CORS:');
    console.log('1. Vérifiez la configuration CORS dans le backend');
    console.log('2. Assurez-vous que localhost:3000 est autorisé');
  }

  if (!authResult.success) {
    console.log('\n🔧 SOLUTIONS AUTHENTIFICATION:');
    console.log('1. Vérifiez les identifiants dans la base de données');
    console.log('2. Vérifiez le hachage des mots de passe');
    console.log('3. Consultez les logs du backend pour plus de détails');
  }
}

runDiagnostic().catch(console.error);
