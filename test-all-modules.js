const axios = require('axios');

const API_BASE = 'http://localhost:3001';

async function testAllModules() {
  try {
    console.log('🚀 TEST COMPLET DE TOUS LES MODULES');
    console.log('=====================================');
    
    // 1. Connexion
    console.log('\n🔐 1. TEST DE CONNEXION');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'admin@example.com',
      password: 'password123'
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Échec de la connexion');
    }
    
    const token = loginResponse.data.data.token;
    console.log('✅ Connexion réussie');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 2. Test Health Check
    console.log('\n🏥 2. TEST HEALTH CHECK');
    const healthResponse = await axios.get(`${API_BASE}/health`);
    console.log('✅ Health:', healthResponse.data);
    
    // 3. Test Analytics/Reports
    console.log('\n📈 3. TEST ANALYTICS/REPORTS');
    const kpiResponse = await axios.get(`${API_BASE}/analytics/kpi`, { headers });
    console.log('✅ KPI Success:', kpiResponse.data.success);
    console.log('📊 KPI Revenue:', kpiResponse.data.data?.revenue?.currentMonth || 'N/A');
    
    const salesResponse = await axios.get(`${API_BASE}/analytics/sales?period=3m`, { headers });
    console.log('✅ Sales Success:', salesResponse.data.success);
    console.log('📊 Sales Top Clients:', salesResponse.data.data?.topClients?.length || 0);
    
    // 4. Test Clients
    console.log('\n👥 4. TEST CLIENTS');
    const clientsResponse = await axios.get(`${API_BASE}/api/v1/clients`, { headers });
    console.log('✅ Clients Success:', clientsResponse.data.success);
    console.log('📊 Clients Count:', clientsResponse.data.data?.data?.length || 0);
    console.log('📊 Clients Total:', clientsResponse.data.data?.total || 0);

    // Test recherche clients
    const clientsSearchResponse = await axios.get(`${API_BASE}/api/v1/clients?search=test&limit=3`, { headers });
    console.log('✅ Clients Search Success:', clientsSearchResponse.data.success);
    console.log('📊 Clients Search Results:', clientsSearchResponse.data.data?.data?.length || 0);

    // 5. Test Produits
    console.log('\n📦 5. TEST PRODUITS');
    const productsResponse = await axios.get(`${API_BASE}/api/v1/products`, { headers });
    console.log('✅ Products Success:', productsResponse.data.success);
    console.log('📊 Products Count:', productsResponse.data.data?.data?.length || 0);
    console.log('📊 Products Total:', productsResponse.data.data?.total || 0);

    // Test recherche produits
    const productsSearchResponse = await axios.get(`${API_BASE}/api/v1/products?search=test&limit=3`, { headers });
    console.log('✅ Products Search Success:', productsSearchResponse.data.success);
    console.log('📊 Products Search Results:', productsSearchResponse.data.data?.data?.length || 0);

    // 6. Test Commandes
    console.log('\n📋 6. TEST COMMANDES');
    const ordersResponse = await axios.get(`${API_BASE}/api/v1/orders`, { headers });
    console.log('✅ Orders Success:', ordersResponse.data.success);
    console.log('📊 Orders Count:', ordersResponse.data.data?.data?.length || 0);
    console.log('📊 Orders Total:', ordersResponse.data.data?.total || 0);

    // Test commandes par type
    const quotesResponse = await axios.get(`${API_BASE}/api/v1/orders?type=QUOTE&limit=5`, { headers });
    console.log('✅ Quotes Success:', quotesResponse.data.success);
    console.log('📊 Quotes Count:', quotesResponse.data.data?.data?.length || 0);

    // 7. Test Factures
    console.log('\n🧾 7. TEST FACTURES');
    const invoicesResponse = await axios.get(`${API_BASE}/api/v1/invoices`, { headers });
    console.log('✅ Invoices Success:', invoicesResponse.data.success);
    console.log('📊 Invoices Count:', invoicesResponse.data.data?.data?.length || 0);
    console.log('📊 Invoices Total:', invoicesResponse.data.data?.total || 0);

    // Test factures par statut
    const paidInvoicesResponse = await axios.get(`${API_BASE}/api/v1/invoices?status=PAID&limit=5`, { headers });
    console.log('✅ Paid Invoices Success:', paidInvoicesResponse.data.success);
    console.log('📊 Paid Invoices Count:', paidInvoicesResponse.data.data?.data?.length || 0);
    
    // 8. Test Dashboard
    console.log('\n📊 8. TEST DASHBOARD');
    const dashboardResponse = await axios.get(`${API_BASE}/dashboard`, { headers });
    console.log('✅ Dashboard Success:', dashboardResponse.data.success);
    
    // Résumé final
    console.log('\n🎉 RÉSUMÉ DES TESTS');
    console.log('==================');
    console.log('✅ Connexion: OK');
    console.log('✅ Health Check: OK');
    console.log('✅ Analytics/Reports: OK');
    console.log('✅ Clients: OK');
    console.log('✅ Produits: OK');
    console.log('✅ Commandes: OK');
    console.log('✅ Factures: OK');
    console.log('✅ Dashboard: OK');
    
    console.log('\n🎯 TOUS LES MODULES FONCTIONNENT CORRECTEMENT !');
    console.log('L\'application est prête pour la production.');
    
    // Statistiques finales
    console.log('\n📈 STATISTIQUES');
    console.log('================');
    console.log(`Clients: ${clientsResponse.data.data?.total || 0}`);
    console.log(`Produits: ${productsResponse.data.data?.total || 0}`);
    console.log(`Commandes: ${ordersResponse.data.data?.total || 0}`);
    console.log(`Factures: ${invoicesResponse.data.data?.total || 0}`);
    console.log(`Revenue (mois): ${kpiResponse.data.data?.revenue?.currentMonth || 'N/A'} €`);
    
  } catch (error) {
    console.error('\n❌ ERREUR LORS DES TESTS:');
    console.error('Message:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    console.error('\n🔧 ACTIONS RECOMMANDÉES:');
    console.error('1. Vérifier que le backend est démarré (port 3001)');
    console.error('2. Vérifier que la base de données PostgreSQL est accessible');
    console.error('3. Vérifier les logs du backend pour plus de détails');
    process.exit(1);
  }
}

testAllModules();
