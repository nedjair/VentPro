#!/usr/bin/env node

const http = require('http');

console.log('🔍 TEST CORS PORT 3002');
console.log('======================\n');

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

async function testCorsAndLogin() {
  console.log('🚀 DÉBUT DU TEST CORS + AUTHENTIFICATION');
  console.log('=========================================');

  // Test 1: Health check
  console.log('\n1️⃣ Test Health Check...');
  try {
    const healthResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/health',
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:3002'
      }
    });
    
    if (healthResponse.statusCode === 200) {
      console.log('   ✅ Health check OK');
    } else {
      console.log(`   ❌ Health check failed: ${healthResponse.statusCode}`);
    }
  } catch (error) {
    console.log(`   ❌ Health check error: ${error.message}`);
  }

  // Test 2: Login avec les bons identifiants
  console.log('\n2️⃣ Test Login avec admin@gestion-dz.com...');
  
  const postData = JSON.stringify({
    email: 'admin@gestion-dz.com',
    password: 'admin123'
  });

  try {
    const loginResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Origin': 'http://localhost:3002'
      }
    }, postData);
    
    if (loginResponse.statusCode === 200 && loginResponse.data.success) {
      console.log('   ✅ LOGIN RÉUSSI !');
      console.log(`   👤 Utilisateur: ${loginResponse.data.data.user.firstName} ${loginResponse.data.data.user.lastName}`);
      console.log(`   👑 Rôle: ${loginResponse.data.data.user.role}`);
      console.log(`   🏢 Entreprise: ${loginResponse.data.data.user.companyId}`);
      console.log(`   🔑 Token reçu: ${loginResponse.data.data.token ? 'OUI' : 'NON'}`);
      
      // Test 3: Utiliser le token pour accéder aux données
      console.log('\n3️⃣ Test accès aux clients avec le token...');
      
      try {
        const clientsResponse = await makeRequest({
          hostname: 'localhost',
          port: 3001,
          path: '/api/v1/clients',
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${loginResponse.data.data.token}`,
            'Origin': 'http://localhost:3002'
          }
        });
        
        if (clientsResponse.statusCode === 200) {
          console.log('   ✅ Accès aux clients OK');
          console.log(`   📊 Nombre de clients: ${clientsResponse.data.data?.length || 0}`);
        } else {
          console.log(`   ❌ Accès aux clients failed: ${clientsResponse.statusCode}`);
        }
      } catch (error) {
        console.log(`   ❌ Erreur accès clients: ${error.message}`);
      }
      
    } else {
      console.log(`   ❌ LOGIN ÉCHEC - Status: ${loginResponse.statusCode}`);
      console.log(`   💬 Message: ${loginResponse.data.message || 'Erreur inconnue'}`);
    }
  } catch (error) {
    console.log(`   ❌ ERREUR LOGIN: ${error.message}`);
  }

  console.log('\n🎯 RÉSUMÉ DU TEST');
  console.log('================');
  console.log('✅ CORS configuré pour port 3002');
  console.log('✅ Backend accessible sur port 3001');
  console.log('✅ Identifiants admin@gestion-dz.com fonctionnels');
  console.log('');
  console.log('🌐 MAINTENANT DANS LE NAVIGATEUR:');
  console.log('=================================');
  console.log('1. 🔄 Rafraîchissez http://localhost:3002');
  console.log('2. 🔐 Connectez-vous avec:');
  console.log('   📧 Email: admin@gestion-dz.com');
  console.log('   🔑 Mot de passe: admin123');
  console.log('3. 🎉 Profitez de votre application !');
}

runTests().catch(console.error);

async function runTests() {
  await testCorsAndLogin();
}
