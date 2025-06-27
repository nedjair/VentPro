#!/usr/bin/env node

const http = require('http');

console.log('🔍 TEST DE LA STRUCTURE DE RÉPONSE D\'AUTHENTIFICATION');
console.log('====================================================\n');

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

async function testAuthResponse() {
  console.log('🔐 Test de la réponse d\'authentification');
  console.log('=========================================');
  
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
    console.log('\n📋 STRUCTURE DE LA RÉPONSE:');
    console.log('============================');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.statusCode === 200 && response.data.success) {
      console.log('\n🔍 ANALYSE DE LA STRUCTURE:');
      console.log('============================');
      
      const data = response.data.data;
      console.log(`✅ success: ${response.data.success}`);
      console.log(`✅ data: ${data ? 'Présent' : 'Manquant'}`);
      
      if (data) {
        console.log(`   📤 data.user: ${data.user ? 'Présent' : 'Manquant'}`);
        console.log(`   🔑 data.token: ${data.token ? 'Présent' : 'Manquant'}`);
        console.log(`   🔑 data.tokens: ${data.tokens ? 'Présent' : 'Manquant'}`);
        console.log(`   🔄 data.refreshToken: ${data.refreshToken ? 'Présent' : 'Manquant'}`);
        
        if (data.user) {
          console.log('\n👤 STRUCTURE USER:');
          console.log(`   - id: ${data.user.id}`);
          console.log(`   - email: ${data.user.email}`);
          console.log(`   - firstName: ${data.user.firstName}`);
          console.log(`   - lastName: ${data.user.lastName}`);
          console.log(`   - role: ${data.user.role}`);
          console.log(`   - companyId: ${data.user.companyId}`);
        }
        
        if (data.token) {
          console.log('\n🔑 TOKEN INFO:');
          console.log(`   - Type: ${typeof data.token}`);
          console.log(`   - Longueur: ${data.token.length} caractères`);
          console.log(`   - Début: ${data.token.substring(0, 20)}...`);
        }
        
        if (data.tokens) {
          console.log('\n🔑 TOKENS OBJECT:');
          console.log(`   - accessToken: ${data.tokens.accessToken ? 'Présent' : 'Manquant'}`);
          console.log(`   - refreshToken: ${data.tokens.refreshToken ? 'Présent' : 'Manquant'}`);
          console.log(`   - expiresIn: ${data.tokens.expiresIn || 'Non défini'}`);
        }
      }
      
      console.log('\n🎯 PROBLÈME IDENTIFIÉ:');
      console.log('======================');
      
      if (data && data.token && !data.tokens) {
        console.log('❌ Le backend retourne "token" mais le frontend attend "tokens"');
        console.log('💡 Solution: Adapter la structure dans le contexte d\'authentification');
      } else if (data && data.tokens) {
        console.log('✅ Structure correcte avec "tokens"');
      } else {
        console.log('❓ Structure inattendue');
      }
      
    } else {
      console.log('❌ Authentification échouée');
      console.log(`   Message: ${response.data.message || 'Erreur inconnue'}`);
    }
    
  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
}

async function testWithWrongCredentials() {
  console.log('\n🔐 Test avec identifiants incorrects');
  console.log('====================================');
  
  const postData = JSON.stringify({
    email: 'wrong@email.com',
    password: 'wrongpassword'
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
    console.log('Réponse:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
}

async function runTests() {
  await testAuthResponse();
  await testWithWrongCredentials();
  
  console.log('\n🔧 RECOMMANDATIONS:');
  console.log('===================');
  console.log('1. Vérifier la structure de réponse du backend');
  console.log('2. Adapter le contexte d\'authentification frontend');
  console.log('3. S\'assurer que les tokens sont correctement stockés');
  console.log('4. Vérifier la gestion des erreurs d\'authentification');
}

runTests().catch(console.error);
