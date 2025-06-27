const axios = require('axios');

const API_BASE = 'http://localhost:3001';

async function testQuickAPI() {
  try {
    console.log('🔍 Test rapide de l\'API...');
    
    // Test Health
    console.log('\n1. Test Health Check...');
    try {
      const healthResponse = await axios.get(`${API_BASE}/health`, { timeout: 5000 });
      console.log('✅ Health OK:', healthResponse.data);
    } catch (error) {
      console.log('❌ Health Error:', error.message);
      return;
    }
    
    // Test Login
    console.log('\n2. Test Login...');
    try {
      const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
        email: 'admin@example.com',
        password: 'password123'
      }, { timeout: 10000 });
      
      console.log('✅ Login Success:', loginResponse.data.success);
      
      if (!loginResponse.data.success) {
        console.log('❌ Login failed:', loginResponse.data);
        return;
      }
      
      const token = loginResponse.data.data.token;
      console.log('🔑 Token obtenu:', token.substring(0, 20) + '...');
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      // Test Clients
      console.log('\n3. Test Clients...');
      const clientsResponse = await axios.get(`${API_BASE}/api/v1/clients?limit=5`, { 
        headers, 
        timeout: 10000 
      });
      console.log('✅ Clients Success:', clientsResponse.data.success);
      console.log('📊 Clients Count:', clientsResponse.data.data?.data?.length || 0);
      
      // Test Products
      console.log('\n4. Test Products...');
      const productsResponse = await axios.get(`${API_BASE}/api/v1/products?limit=5`, { 
        headers, 
        timeout: 10000 
      });
      console.log('✅ Products Success:', productsResponse.data.success);
      console.log('📊 Products Count:', productsResponse.data.data?.data?.length || 0);
      
      // Test Analytics
      console.log('\n5. Test Analytics...');
      const analyticsResponse = await axios.get(`${API_BASE}/analytics/kpi`, { 
        headers, 
        timeout: 10000 
      });
      console.log('✅ Analytics Success:', analyticsResponse.data.success);
      console.log('📊 Analytics Data:', analyticsResponse.data.data ? 'Present' : 'Missing');
      
      console.log('\n🎉 Tous les tests API sont OK !');
      console.log('Le problème vient probablement du frontend.');
      
    } catch (loginError) {
      console.log('❌ Login Error:', loginError.message);
      if (loginError.response) {
        console.log('Status:', loginError.response.status);
        console.log('Data:', loginError.response.data);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

testQuickAPI();
