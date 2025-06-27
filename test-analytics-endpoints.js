const axios = require('axios');

const API_BASE = 'http://localhost:3001';

async function testAnalyticsEndpoints() {
  try {
    console.log('🔐 Test de connexion...');
    
    // 1. Connexion
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
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
    console.log('\n🏥 Test Health Check...');
    const healthResponse = await axios.get(`${API_BASE}/health`);
    console.log('✅ Health:', healthResponse.data);
    
    // 3. Test KPI
    console.log('\n📈 Test KPI Metrics...');
    const kpiResponse = await axios.get(`${API_BASE}/analytics/kpi`, { headers });
    console.log('✅ KPI Success:', kpiResponse.data.success);
    console.log('📊 KPI Data:', JSON.stringify(kpiResponse.data.data, null, 2));
    
    // 4. Test Sales Analytics
    console.log('\n💰 Test Sales Analytics...');
    const salesResponse = await axios.get(`${API_BASE}/analytics/sales?period=3m`, { headers });
    console.log('✅ Sales Success:', salesResponse.data.success);
    console.log('📊 Sales Data Keys:', Object.keys(salesResponse.data.data || {}));
    
    // 5. Test Product Analytics
    console.log('\n📦 Test Product Analytics...');
    const productResponse = await axios.get(`${API_BASE}/analytics/products?period=3m&limit=5`, { headers });
    console.log('✅ Product Success:', productResponse.data.success);
    console.log('📊 Product Data Keys:', Object.keys(productResponse.data.data || {}));
    
    // 6. Test Client Analytics
    console.log('\n👥 Test Client Analytics...');
    const clientResponse = await axios.get(`${API_BASE}/analytics/clients`, { headers });
    console.log('✅ Client Success:', clientResponse.data.success);
    console.log('📊 Client Data Keys:', Object.keys(clientResponse.data.data || {}));
    
    console.log('\n🎉 Tous les tests Analytics sont réussis !');
    
    // Résumé des données
    console.log('\n📋 RÉSUMÉ DES DONNÉES:');
    console.log('- KPI Revenue (mois):', kpiResponse.data.data?.revenue?.currentMonth || 'N/A');
    console.log('- KPI Marge brute:', kpiResponse.data.data?.margin?.grossMargin || 'N/A');
    console.log('- KPI Taux conversion:', kpiResponse.data.data?.conversion?.rate || 'N/A');
    console.log('- Sales Top Clients:', salesResponse.data.data?.topClients?.length || 0);
    console.log('- Products Top:', productResponse.data.data?.topProducts?.length || 0);
    console.log('- Clients Segments:', clientResponse.data.data?.segmentation?.length || 0);
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

testAnalyticsEndpoints();
