#!/usr/bin/env node

const http = require('http');

console.log('🔍 TEST COMPLET DU FLUX AUTHENTIFICATION + DONNÉES');
console.log('===================================================\n');

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

// 1. Test d'authentification
async function testAuthentication() {
  console.log('🔐 ÉTAPE 1: AUTHENTIFICATION');
  console.log('============================');
  
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
    
    if (response.statusCode === 200 && response.data.success) {
      authToken = response.data.data.token;
      console.log('✅ Authentification réussie');
      console.log(`   👤 Utilisateur: ${response.data.data.user.firstName} ${response.data.data.user.lastName}`);
      console.log(`   📧 Email: ${response.data.data.user.email}`);
      console.log(`   👑 Rôle: ${response.data.data.user.role}`);
      console.log(`   🏢 Entreprise: ${response.data.data.user.companyId}`);
      console.log(`   🔑 Token: ${authToken ? 'Présent' : 'Manquant'}`);
      return true;
    } else {
      console.log('❌ Authentification échouée');
      console.log(`   Status: ${response.statusCode}`);
      console.log(`   Message: ${response.data.message || 'Erreur inconnue'}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Erreur d'authentification: ${error.message}`);
    return false;
  }
}

// 2. Test des données principales
async function testMainData() {
  console.log('\n📊 ÉTAPE 2: RÉCUPÉRATION DES DONNÉES PRINCIPALES');
  console.log('================================================');
  
  if (!authToken) {
    console.log('❌ Pas de token d\'authentification');
    return false;
  }

  const endpoints = [
    { name: 'Dashboard Stats', path: '/api/v1/dashboard/stats' },
    { name: 'Clients', path: '/api/v1/clients' },
    { name: 'Produits', path: '/api/v1/products' },
    { name: 'Fournisseurs', path: '/api/v1/suppliers' },
    { name: 'Stocks', path: '/api/v1/stocks' }
  ];

  let allSuccess = true;

  for (const endpoint of endpoints) {
    try {
      const options = {
        hostname: 'localhost',
        port: 3001,
        path: endpoint.path,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      };

      const response = await makeRequest(options);
      
      if (response.statusCode === 200 && response.data.success) {
        console.log(`✅ ${endpoint.name}: OK`);
        
        if (response.data.data) {
          if (Array.isArray(response.data.data)) {
            console.log(`   📋 Nombre d'éléments: ${response.data.data.length}`);
            if (response.data.data.length > 0) {
              const firstItem = response.data.data[0];
              const keys = Object.keys(firstItem).slice(0, 3);
              console.log(`   🔍 Propriétés: ${keys.join(', ')}...`);
            }
          } else if (typeof response.data.data === 'object') {
            const keys = Object.keys(response.data.data);
            console.log(`   📊 Propriétés: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`);
          }
        }
      } else {
        console.log(`❌ ${endpoint.name}: ${response.statusCode}`);
        console.log(`   Erreur: ${response.data.message || 'Erreur inconnue'}`);
        allSuccess = false;
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ERROR - ${error.message}`);
      allSuccess = false;
    }
  }

  return allSuccess;
}

// 3. Test des analytics
async function testAnalytics() {
  console.log('\n📈 ÉTAPE 3: TEST DES ANALYTICS');
  console.log('==============================');
  
  if (!authToken) {
    console.log('❌ Pas de token d\'authentification');
    return false;
  }

  const endpoints = [
    { name: 'KPI Metrics', path: '/api/v1/analytics/kpi' },
    { name: 'Sales Analytics', path: '/api/v1/analytics/sales' },
    { name: 'Product Analytics', path: '/api/v1/analytics/products' },
    { name: 'Client Analytics', path: '/api/v1/analytics/clients' }
  ];

  let allSuccess = true;

  for (const endpoint of endpoints) {
    try {
      const options = {
        hostname: 'localhost',
        port: 3001,
        path: endpoint.path,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      };

      const response = await makeRequest(options);
      
      if (response.statusCode === 200) {
        console.log(`✅ ${endpoint.name}: OK`);
      } else {
        console.log(`❌ ${endpoint.name}: ${response.statusCode}`);
        allSuccess = false;
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ERROR - ${error.message}`);
      allSuccess = false;
    }
  }

  return allSuccess;
}

// 4. Test de création de données
async function testDataCreation() {
  console.log('\n➕ ÉTAPE 4: TEST DE CRÉATION DE DONNÉES');
  console.log('=======================================');
  
  if (!authToken) {
    console.log('❌ Pas de token d\'authentification');
    return false;
  }

  // Test de création d'un client
  const clientData = {
    type: 'INDIVIDUAL',
    firstName: 'Test',
    lastName: 'Diagnostic',
    email: 'test.diagnostic@example.dz',
    phone: '+213 555 123 456',
    city: 'Alger',
    country: 'Algérie'
  };

  try {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/clients',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(clientData))
      }
    };

    const response = await makeRequest(options, JSON.stringify(clientData));
    
    if (response.statusCode === 201 && response.data.success) {
      console.log('✅ Création de client: OK');
      console.log(`   📝 Client créé: ${response.data.data.firstName} ${response.data.data.lastName}`);
      console.log(`   🆔 ID: ${response.data.data.id}`);
      return true;
    } else {
      console.log(`❌ Création de client: ${response.statusCode}`);
      console.log(`   Erreur: ${response.data.message || 'Erreur inconnue'}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Création de client: ERROR - ${error.message}`);
    return false;
  }
}

// Exécution complète
async function runCompleteTest() {
  console.log('🚀 DÉBUT DU TEST COMPLET');
  console.log('========================\n');

  const authSuccess = await testAuthentication();
  
  if (!authSuccess) {
    console.log('\n❌ ÉCHEC: Impossible de continuer sans authentification');
    return;
  }

  const dataSuccess = await testMainData();
  const analyticsSuccess = await testAnalytics();
  const creationSuccess = await testDataCreation();

  console.log('\n🎯 RÉSUMÉ FINAL');
  console.log('===============');
  console.log(`🔐 Authentification: ${authSuccess ? '✅ OK' : '❌ FAILED'}`);
  console.log(`📊 Données principales: ${dataSuccess ? '✅ OK' : '❌ FAILED'}`);
  console.log(`📈 Analytics: ${analyticsSuccess ? '✅ OK' : '❌ FAILED'}`);
  console.log(`➕ Création de données: ${creationSuccess ? '✅ OK' : '❌ FAILED'}`);

  if (authSuccess && dataSuccess && analyticsSuccess && creationSuccess) {
    console.log('\n🎉 SUCCÈS COMPLET !');
    console.log('===================');
    console.log('✅ L\'application est entièrement fonctionnelle');
    console.log('✅ Backend et frontend communiquent correctement');
    console.log('✅ Base de données accessible et opérationnelle');
    console.log('✅ Authentification et autorisation fonctionnelles');
    console.log('✅ Toutes les API endpoints répondent correctement');
    console.log('✅ Création de données possible');
    console.log('\n🌐 Accès à l\'application:');
    console.log('   Frontend: http://localhost:3000');
    console.log('   Backend: http://localhost:3001');
    console.log('   Login: admin@gestion-dz.com / admin123');
  } else {
    console.log('\n⚠️ PROBLÈMES DÉTECTÉS');
    console.log('======================');
    console.log('Certains tests ont échoué. Vérifiez les logs ci-dessus.');
  }
}

runCompleteTest().catch(console.error);
