/**
 * Script de test pour valider la connectivité du tableau de bord
 * Frontend Next.js (port 3000) ↔ Backend Fastify (port 3001)
 */

const fetch = require('node-fetch');

const BACKEND_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:3000';

// Données de test pour l'authentification
const testUser = {
  email: 'admin@technocommerce.dz',
  password: 'Admin123!'
};

async function testConnectivity() {
  console.log('🔍 Test de connectivité du tableau de bord');
  console.log('=====================================\n');

  try {
    // 1. Test de santé du backend
    console.log('1️⃣ Test de santé du backend...');
    const healthResponse = await fetch(`${BACKEND_URL}/health`);
    if (!healthResponse.ok) {
      throw new Error(`Backend health check failed: ${healthResponse.status}`);
    }
    const healthData = await healthResponse.json();
    console.log('✅ Backend accessible:', healthData.message);

    // 2. Test d'authentification
    console.log('\n2️⃣ Test d\'authentification...');
    const loginResponse = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser),
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.data.tokens.accessToken;
    console.log('✅ Authentification réussie');

    // 3. Test de l'API dashboard/stats
    console.log('\n3️⃣ Test de l\'API dashboard/stats...');
    const dashResponse = await fetch(`${BACKEND_URL}/api/v1/dashboard/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!dashResponse.ok) {
      throw new Error(`Dashboard API failed: ${dashResponse.status}`);
    }

    const dashData = await dashResponse.json();
    console.log('✅ API dashboard accessible');
    console.log('📊 Structure des données:');
    console.log('- Success:', dashData.success);
    console.log('- Clients total:', dashData.data?.clients?.total || 'N/A');
    console.log('- Produits total:', dashData.data?.products?.total || 'N/A');
    console.log('- CA du mois:', dashData.data?.sales?.currentMonth || 'N/A', 'DZD');
    console.log('- Commandes total:', dashData.data?.orders?.total || 'N/A');

    // 4. Test des autres endpoints analytics
    console.log('\n4️⃣ Test des endpoints analytics...');
    
    const endpoints = [
      '/api/v1/analytics/kpi',
      '/api/v1/analytics/sales',
      '/api/v1/analytics/clients',
      '/api/v1/analytics/products',
      '/api/v1/analytics/evolution'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${BACKEND_URL}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`✅ ${endpoint} - OK (${data.success ? 'success' : 'error'})`);
        } else {
          console.log(`❌ ${endpoint} - ERREUR ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ ${endpoint} - ERREUR: ${error.message}`);
      }
    }

    // 5. Test de la configuration CORS
    console.log('\n5️⃣ Test de la configuration CORS...');
    const corsResponse = await fetch(`${BACKEND_URL}/api/v1/dashboard/stats`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization, Content-Type'
      }
    });

    if (corsResponse.ok) {
      console.log('✅ Configuration CORS valide');
      console.log('- Access-Control-Allow-Origin:', corsResponse.headers.get('access-control-allow-origin'));
      console.log('- Access-Control-Allow-Methods:', corsResponse.headers.get('access-control-allow-methods'));
    } else {
      console.log('❌ Problème de configuration CORS');
    }

    // 6. Validation de la structure des données
    console.log('\n6️⃣ Validation de la structure des données...');
    const requiredFields = [
      'clients.total',
      'products.total', 
      'sales.currentMonth',
      'orders.total'
    ];

    let structureValid = true;
    for (const field of requiredFields) {
      const fieldPath = field.split('.');
      let value = dashData.data;
      
      for (const key of fieldPath) {
        value = value?.[key];
      }
      
      if (value === undefined || value === null) {
        console.log(`❌ Champ manquant: ${field}`);
        structureValid = false;
      } else {
        console.log(`✅ ${field}: ${value}`);
      }
    }

    if (structureValid) {
      console.log('✅ Structure des données valide');
    } else {
      console.log('❌ Structure des données incomplète');
    }

    console.log('\n🎉 Test de connectivité terminé avec succès !');
    
  } catch (error) {
    console.error('\n❌ Erreur lors du test de connectivité:', error.message);
    process.exit(1);
  }
}

// Exécuter le test
testConnectivity();
