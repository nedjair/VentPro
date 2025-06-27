const axios = require('axios');

const API_BASE = 'http://localhost:3001';

async function testAnalyticsAPI() {
  try {
    console.log('🔐 Test de connexion...');
    
    // 1. Connexion
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@example.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Connexion réussie');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 2. Test Dashboard Stats
    console.log('\n📊 Test Dashboard Stats...');
    const dashboardResponse = await axios.get(`${API_BASE}/dashboard/stats`, { headers });
    console.log('✅ Dashboard Stats:', JSON.stringify(dashboardResponse.data, null, 2));
    
    // 3. Test KPI
    console.log('\n📈 Test KPI...');
    const kpiResponse = await axios.get(`${API_BASE}/analytics/kpi`, { headers });
    console.log('✅ KPI:', JSON.stringify(kpiResponse.data, null, 2));
    
    // 4. Test Sales Analytics
    console.log('\n💰 Test Sales Analytics...');
    const salesResponse = await axios.get(`${API_BASE}/analytics/sales?period=3m`, { headers });
    console.log('✅ Sales Analytics:', JSON.stringify(salesResponse.data, null, 2));
    
    // 5. Test Product Analytics
    console.log('\n📦 Test Product Analytics...');
    const productResponse = await axios.get(`${API_BASE}/analytics/products?period=3m&limit=5`, { headers });
    console.log('✅ Product Analytics:', JSON.stringify(productResponse.data, null, 2));
    
    // 6. Test Client Analytics
    console.log('\n👥 Test Client Analytics...');
    const clientResponse = await axios.get(`${API_BASE}/analytics/clients`, { headers });
    console.log('✅ Client Analytics:', JSON.stringify(clientResponse.data, null, 2));
    
    // 7. Test Evolution Data
    console.log('\n📈 Test Evolution Data...');
    const evolutionResponse = await axios.get(`${API_BASE}/analytics/evolution?metric=revenue&period=6m`, { headers });
    console.log('✅ Evolution Data:', JSON.stringify(evolutionResponse.data, null, 2));
    
    console.log('\n🎉 Tous les tests Analytics Phase 5 sont réussis !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

testAnalyticsAPI();
