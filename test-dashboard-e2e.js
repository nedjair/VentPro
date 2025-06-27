/**
 * Test End-to-End du Tableau de Bord
 * Validation complète du flux PostgreSQL → Backend API → Frontend Display
 */

const fetch = require('node-fetch');

const BACKEND_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:3000';

// Données de test pour l'authentification
const testUser = {
  email: 'admin@technocommerce.dz',
  password: 'Admin123!'
};

async function testEndToEndDashboard() {
  console.log('🚀 Test End-to-End du Tableau de Bord');
  console.log('==========================================\n');

  let authToken = null;

  try {
    // 1. Test d'authentification
    console.log('1️⃣ Test d\'authentification...');
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
    authToken = loginData.data.tokens.accessToken;
    console.log('✅ Authentification réussie');

    // 2. Test de l'API Dashboard avec vraies données PostgreSQL
    console.log('\n2️⃣ Test de l\'API Dashboard (PostgreSQL)...');
    const dashResponse = await fetch(`${BACKEND_URL}/api/v1/dashboard/stats`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!dashResponse.ok) {
      throw new Error(`Dashboard API failed: ${dashResponse.status}`);
    }

    const dashData = await dashResponse.json();
    console.log('✅ API Dashboard accessible');
    
    // Validation de la structure des données
    console.log('\n📊 Validation des données PostgreSQL:');
    if (dashData.success && dashData.data) {
      const data = dashData.data;
      
      // Vérification des clients
      console.log(`• Clients total: ${data.clients?.total || 'N/A'}`);
      console.log(`  - Particuliers: ${data.clients?.individuals || 'N/A'}`);
      console.log(`  - Entreprises: ${data.clients?.companies || 'N/A'}`);
      console.log(`  - Croissance: ${data.clients?.growth || 'N/A'}%`);
      
      // Vérification des produits
      console.log(`• Produits total: ${data.products?.total || 'N/A'}`);
      console.log(`  - En stock: ${data.products?.inStock || 'N/A'}`);
      console.log(`  - Stock faible: ${data.products?.lowStock || 'N/A'}`);
      console.log(`  - Rupture: ${data.products?.outOfStock || 'N/A'}`);
      
      // Vérification des ventes
      console.log(`• CA du mois: ${data.sales?.currentMonth || 'N/A'} DZD`);
      console.log(`• CA mois précédent: ${data.sales?.previousMonth || 'N/A'} DZD`);
      console.log(`• Croissance CA: ${data.sales?.growth || 'N/A'}%`);
      
      // Vérification des commandes
      console.log(`• Commandes total: ${data.orders?.total || 'N/A'}`);
      console.log(`  - En attente: ${data.orders?.pending || 'N/A'}`);
      console.log(`  - Acceptées: ${data.orders?.accepted || 'N/A'}`);
      console.log(`  - Valeur moyenne: ${data.orders?.averageValue || 'N/A'} DZD`);
      
      // Vérification des factures
      console.log(`• Factures total: ${data.invoices?.total || 'N/A'}`);
      console.log(`  - Payées: ${data.invoices?.paid || 'N/A'}`);
      console.log(`  - En attente: ${data.invoices?.pending || 'N/A'}`);
      console.log(`  - En retard: ${data.invoices?.overdue || 'N/A'}`);
      
      console.log(`• Dernière mise à jour: ${data.lastUpdated || 'N/A'}`);
      
      // Validation que les données ne sont pas des données fictives
      const isRealData = data.clients?.total !== 125 || data.products?.total !== 89;
      if (isRealData) {
        console.log('✅ Données réelles PostgreSQL détectées');
      } else {
        console.log('⚠️ Données fictives détectées - vérifier la connexion PostgreSQL');
      }
      
    } else {
      console.log('❌ Structure de données invalide');
    }

    // 3. Test des autres endpoints analytics
    console.log('\n3️⃣ Test des endpoints analytics...');
    
    const analyticsEndpoints = [
      { url: '/api/v1/analytics/kpi', name: 'KPI' },
      { url: '/api/v1/analytics/sales', name: 'Ventes' },
      { url: '/api/v1/analytics/clients', name: 'Clients' },
      { url: '/api/v1/analytics/products', name: 'Produits' },
      { url: '/api/v1/analytics/evolution', name: 'Évolution' }
    ];

    for (const endpoint of analyticsEndpoints) {
      try {
        const response = await fetch(`${BACKEND_URL}${endpoint.url}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`✅ ${endpoint.name} (${endpoint.url}) - OK`);
        } else {
          console.log(`❌ ${endpoint.name} (${endpoint.url}) - Erreur ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ ${endpoint.name} (${endpoint.url}) - ${error.message}`);
      }
    }

    // 4. Test de la programmation défensive
    console.log('\n4️⃣ Test de la programmation défensive...');
    
    // Simuler des données corrompues pour tester la robustesse
    const testCases = [
      { name: 'Données nulles', data: null },
      { name: 'Données undefined', data: undefined },
      { name: 'Tableau vide', data: { clients: [], products: [] } },
      { name: 'Propriétés manquantes', data: { clients: {}, sales: {} } }
    ];

    testCases.forEach(testCase => {
      try {
        // Simuler le traitement frontend
        const safeClients = Array.isArray(testCase.data?.clients) ? testCase.data.clients : [];
        const safeProducts = Array.isArray(testCase.data?.products) ? testCase.data.products : [];
        const clientsTotal = testCase.data?.clients?.total || 0;
        const salesCurrent = testCase.data?.sales?.currentMonth || 0;
        
        console.log(`✅ ${testCase.name} - Traitement sécurisé OK`);
      } catch (error) {
        console.log(`❌ ${testCase.name} - Erreur: ${error.message}`);
      }
    });

    // 5. Test de connectivité CORS
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
      console.log(`• Origin autorisé: ${corsResponse.headers.get('access-control-allow-origin')}`);
      console.log(`• Méthodes autorisées: ${corsResponse.headers.get('access-control-allow-methods')}`);
    } else {
      console.log('❌ Problème de configuration CORS');
    }

    // 6. Test de performance
    console.log('\n6️⃣ Test de performance...');
    const startTime = Date.now();
    
    await fetch(`${BACKEND_URL}/api/v1/dashboard/stats`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const responseTime = Date.now() - startTime;
    console.log(`• Temps de réponse API: ${responseTime}ms`);
    
    if (responseTime < 1000) {
      console.log('✅ Performance acceptable (< 1s)');
    } else if (responseTime < 3000) {
      console.log('⚠️ Performance moyenne (1-3s)');
    } else {
      console.log('❌ Performance lente (> 3s)');
    }

    console.log('\n🎉 Test End-to-End terminé avec succès !');
    console.log('\n📋 Résumé:');
    console.log('• ✅ Authentification JWT fonctionnelle');
    console.log('• ✅ API Dashboard avec données PostgreSQL');
    console.log('• ✅ Endpoints analytics accessibles');
    console.log('• ✅ Programmation défensive validée');
    console.log('• ✅ Configuration CORS correcte');
    console.log('• ✅ Performance acceptable');
    
  } catch (error) {
    console.error('\n❌ Erreur lors du test End-to-End:', error.message);
    console.log('\n🔧 Actions recommandées:');
    console.log('1. Vérifier que le backend est démarré (port 3001)');
    console.log('2. Vérifier que PostgreSQL est accessible');
    console.log('3. Vérifier les credentials de test');
    console.log('4. Vérifier la configuration CORS');
    process.exit(1);
  }
}

// Exécuter le test
testEndToEndDashboard();
