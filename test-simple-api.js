const axios = require('axios');

async function testSimpleAPI() {
  try {
    console.log('🔍 Test de connexion simple...');
    
    // Test health check
    const healthResponse = await axios.get('http://localhost:3001/health');
    console.log('✅ Health check:', healthResponse.data);
    
    // Test login
    console.log('\n🔐 Test de login...');
    const loginResponse = await axios.post('http://localhost:3001/auth/login', {
      email: 'admin@example.com',
      password: 'password123'
    });
    
    console.log('✅ Login réussi:', loginResponse.data.success);
    const token = loginResponse.data.data.token;
    console.log('Token:', token.substring(0, 20) + '...');
    
    // Test KPI avec token
    console.log('\n📈 Test KPI...');
    const kpiResponse = await axios.get('http://localhost:3001/analytics/kpi', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ KPI Response:', JSON.stringify(kpiResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Erreur détaillée:');
    console.error('Message:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    console.error('Stack:', error.stack);
  }
}

testSimpleAPI();
