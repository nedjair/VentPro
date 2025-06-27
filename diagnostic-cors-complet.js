#!/usr/bin/env node

const http = require('http');

console.log('🔍 DIAGNOSTIC CORS COMPLET');
console.log('==========================\n');

// Fonction utilitaire pour faire des requêtes HTTP
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ 
            statusCode: res.statusCode, 
            data: parsed, 
            headers: res.headers,
            rawData: data
          });
        } catch (e) {
          resolve({ 
            statusCode: res.statusCode, 
            data: data, 
            headers: res.headers,
            rawData: data
          });
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

async function testHealthCheck() {
  console.log('🏥 1. TEST HEALTH CHECK');
  console.log('======================');
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/health',
    method: 'GET',
    headers: {
      'Origin': 'http://localhost:3000'
    }
  };

  try {
    const response = await makeRequest(options);
    
    console.log(`📊 Status: ${response.statusCode}`);
    console.log('🔍 Headers CORS reçus:');
    
    const corsHeaders = [
      'access-control-allow-origin',
      'access-control-allow-methods', 
      'access-control-allow-headers',
      'access-control-allow-credentials',
      'access-control-max-age'
    ];
    
    corsHeaders.forEach(header => {
      const value = response.headers[header];
      console.log(`   ${header}: ${value || 'NON DÉFINI'}`);
    });
    
    if (response.statusCode === 200) {
      console.log('✅ Backend accessible');
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

async function testOptionsRequest() {
  console.log('\n🔄 2. TEST REQUÊTE OPTIONS (PREFLIGHT)');
  console.log('======================================');
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/auth/login',
    method: 'OPTIONS',
    headers: {
      'Origin': 'http://localhost:3000',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type, Authorization'
    }
  };

  try {
    const response = await makeRequest(options);
    
    console.log(`📊 Status: ${response.statusCode}`);
    console.log('🔍 Headers CORS reçus:');
    
    const corsHeaders = [
      'access-control-allow-origin',
      'access-control-allow-methods', 
      'access-control-allow-headers',
      'access-control-allow-credentials',
      'access-control-max-age'
    ];
    
    corsHeaders.forEach(header => {
      const value = response.headers[header];
      console.log(`   ${header}: ${value || 'NON DÉFINI'}`);
    });
    
    if (response.statusCode === 200 || response.statusCode === 204) {
      console.log('✅ Requête OPTIONS réussie');
      return true;
    } else {
      console.log(`❌ Requête OPTIONS échouée: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Erreur OPTIONS: ${error.message}`);
    return false;
  }
}

async function testLoginRequest() {
  console.log('\n🔐 3. TEST REQUÊTE LOGIN AVEC CORS');
  console.log('==================================');
  
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
      'Content-Length': Buffer.byteLength(postData),
      'Origin': 'http://localhost:3000'
    }
  };

  try {
    const response = await makeRequest(options, postData);
    
    console.log(`📊 Status: ${response.statusCode}`);
    console.log('🔍 Headers CORS reçus:');
    
    const corsHeaders = [
      'access-control-allow-origin',
      'access-control-allow-methods', 
      'access-control-allow-headers',
      'access-control-allow-credentials'
    ];
    
    corsHeaders.forEach(header => {
      const value = response.headers[header];
      console.log(`   ${header}: ${value || 'NON DÉFINI'}`);
    });
    
    if (response.statusCode === 200 && response.data.success) {
      console.log('✅ Login réussi avec CORS');
      console.log(`👤 Utilisateur: ${response.data.data.user.firstName} ${response.data.data.user.lastName}`);
      return {
        success: true,
        token: response.data.data.tokens.accessToken
      };
    } else {
      console.log(`❌ Login échoué: ${response.statusCode}`);
      console.log(`   Message: ${response.data.message || 'Erreur inconnue'}`);
      return { success: false };
    }
  } catch (error) {
    console.log(`❌ Erreur login: ${error.message}`);
    return { success: false };
  }
}

async function testProtectedEndpoint(token) {
  if (!token) {
    console.log('\n❌ Pas de token disponible pour tester les endpoints protégés');
    return false;
  }

  console.log('\n🛡️ 4. TEST ENDPOINT PROTÉGÉ AVEC CORS');
  console.log('=====================================');
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/clients',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:3000'
    }
  };

  try {
    const response = await makeRequest(options);
    
    console.log(`📊 Status: ${response.statusCode}`);
    console.log('🔍 Headers CORS reçus:');
    
    const corsHeaders = [
      'access-control-allow-origin',
      'access-control-allow-credentials'
    ];
    
    corsHeaders.forEach(header => {
      const value = response.headers[header];
      console.log(`   ${header}: ${value || 'NON DÉFINI'}`);
    });
    
    if (response.statusCode === 200 && response.data.success) {
      console.log('✅ Endpoint protégé accessible avec CORS');
      console.log(`📋 Nombre de clients: ${response.data.data.length}`);
      return true;
    } else {
      console.log(`❌ Endpoint protégé échoué: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Erreur endpoint protégé: ${error.message}`);
    return false;
  }
}

async function testCorsConfiguration() {
  console.log('\n⚙️ 5. VÉRIFICATION CONFIGURATION CORS');
  console.log('=====================================');
  
  // Test avec différentes origines
  const origins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://localhost:3000',
    'http://localhost:3001'
  ];

  for (const origin of origins) {
    console.log(`\n🔍 Test avec origine: ${origin}`);
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/health',
      method: 'GET',
      headers: {
        'Origin': origin
      }
    };

    try {
      const response = await makeRequest(options);
      const allowedOrigin = response.headers['access-control-allow-origin'];
      
      if (allowedOrigin === origin) {
        console.log(`   ✅ Origine autorisée: ${allowedOrigin}`);
      } else if (allowedOrigin) {
        console.log(`   ⚠️ Origine différente retournée: ${allowedOrigin}`);
      } else {
        console.log(`   ❌ Aucune origine autorisée`);
      }
    } catch (error) {
      console.log(`   ❌ Erreur: ${error.message}`);
    }
  }
}

async function runDiagnostic() {
  console.log('🚀 DÉBUT DU DIAGNOSTIC CORS');
  console.log('============================\n');

  const healthOK = await testHealthCheck();
  const optionsOK = await testOptionsRequest();
  const loginResult = await testLoginRequest();
  const protectedOK = await testProtectedEndpoint(loginResult.token);
  await testCorsConfiguration();
  
  console.log('\n🎯 RÉSUMÉ DU DIAGNOSTIC');
  console.log('=======================');
  console.log(`✅ Backend accessible: ${healthOK ? 'OUI' : 'NON'}`);
  console.log(`✅ Requête OPTIONS: ${optionsOK ? 'OK' : 'FAILED'}`);
  console.log(`✅ Login avec CORS: ${loginResult.success ? 'OK' : 'FAILED'}`);
  console.log(`✅ Endpoint protégé: ${protectedOK ? 'OK' : 'FAILED'}`);
  
  if (healthOK && optionsOK && loginResult.success && protectedOK) {
    console.log('\n🎉 CORS FONCTIONNE CORRECTEMENT !');
    console.log('Le problème vient probablement du frontend.');
    console.log('\n💡 SOLUTIONS POSSIBLES:');
    console.log('1. Vérifiez que le frontend utilise http://localhost:3000');
    console.log('2. Vérifiez la configuration API_BASE_URL dans le frontend');
    console.log('3. Désactivez temporairement les extensions de navigateur');
    console.log('4. Testez dans un navigateur en mode incognito');
    console.log('5. Vérifiez la console du navigateur pour d\'autres erreurs');
  } else {
    console.log('\n❌ PROBLÈME CORS DÉTECTÉ');
    console.log('========================');
    
    if (!healthOK) {
      console.log('🔧 Le backend n\'est pas accessible');
    }
    if (!optionsOK) {
      console.log('🔧 Les requêtes OPTIONS (preflight) échouent');
    }
    if (!loginResult.success) {
      console.log('🔧 L\'authentification avec CORS échoue');
    }
    if (!protectedOK) {
      console.log('🔧 Les endpoints protégés avec CORS échouent');
    }
  }
}

runDiagnostic().catch(console.error);
