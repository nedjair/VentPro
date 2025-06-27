const axios = require('axios');

const API_BASE = 'http://localhost:3001';

async function testAPIStructure() {
  try {
    console.log('🔍 Test de la structure des données API...\n');
    
    // 1. Test Login
    console.log('1. 🔐 Test Login...');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'admin@example.com',
      password: 'password123'
    });
    
    console.log('Login Success:', loginResponse.data.success);
    console.log('Login Data Structure:', Object.keys(loginResponse.data));
    
    if (!loginResponse.data.success) {
      console.log('❌ Login failed:', loginResponse.data);
      return;
    }
    
    const token = loginResponse.data.data.token;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 2. Test Clients API
    console.log('\n2. 👥 Test Clients API...');
    const clientsResponse = await axios.get(`${API_BASE}/api/v1/clients?limit=3`, { headers });
    
    console.log('Clients Response Status:', clientsResponse.status);
    console.log('Clients Response Success:', clientsResponse.data.success);
    console.log('Clients Response Structure:', Object.keys(clientsResponse.data));
    
    if (clientsResponse.data.data) {
      console.log('Clients Data Structure:', Object.keys(clientsResponse.data.data));
      console.log('Clients Data Type:', typeof clientsResponse.data.data);
      console.log('Clients Data Is Array:', Array.isArray(clientsResponse.data.data));
      
      if (clientsResponse.data.data.data) {
        console.log('Clients Data.Data Structure:', Object.keys(clientsResponse.data.data.data));
        console.log('Clients Data.Data Type:', typeof clientsResponse.data.data.data);
        console.log('Clients Data.Data Is Array:', Array.isArray(clientsResponse.data.data.data));
        console.log('Clients Data.Data Length:', clientsResponse.data.data.data?.length);
        
        if (clientsResponse.data.data.data.length > 0) {
          console.log('First Client Structure:', Object.keys(clientsResponse.data.data.data[0]));
        }
      }
    }
    
    console.log('Full Clients Response:', JSON.stringify(clientsResponse.data, null, 2));
    
    // 3. Test Products API
    console.log('\n3. 📦 Test Products API...');
    const productsResponse = await axios.get(`${API_BASE}/api/v1/products?limit=3`, { headers });
    
    console.log('Products Response Success:', productsResponse.data.success);
    console.log('Products Response Structure:', Object.keys(productsResponse.data));
    
    if (productsResponse.data.data) {
      console.log('Products Data Structure:', Object.keys(productsResponse.data.data));
      if (productsResponse.data.data.data) {
        console.log('Products Data.Data Length:', productsResponse.data.data.data?.length);
      }
    }
    
    // 4. Test Analytics API
    console.log('\n4. 📈 Test Analytics API...');
    const analyticsResponse = await axios.get(`${API_BASE}/analytics/kpi`, { headers });
    
    console.log('Analytics Response Success:', analyticsResponse.data.success);
    console.log('Analytics Response Structure:', Object.keys(analyticsResponse.data));
    
    if (analyticsResponse.data.data) {
      console.log('Analytics Data Structure:', Object.keys(analyticsResponse.data.data));
    }
    
    console.log('\n🎯 RÉSUMÉ:');
    console.log('- Login:', loginResponse.data.success ? '✅' : '❌');
    console.log('- Clients:', clientsResponse.data.success ? '✅' : '❌');
    console.log('- Products:', productsResponse.data.success ? '✅' : '❌');
    console.log('- Analytics:', analyticsResponse.data.success ? '✅' : '❌');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testAPIStructure();
