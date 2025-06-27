/**
 * Test de connectivité CORS - Backend port 3003, Frontend port 3002
 */

const axios = require('axios');

async function testCorsConnectivity() {
  console.log('🔍 Test de connectivité CORS - Backend 3003, Frontend 3002');
  console.log('=' .repeat(60));

  // Test 1: Health check du backend
  try {
    console.log('\n1️⃣ Test Health Check Backend (port 3003)...');
    const healthResponse = await axios.get('http://localhost:3003/health', {
      timeout: 5000
    });
    console.log('✅ Backend Health Check:', healthResponse.status, healthResponse.data);
  } catch (error) {
    console.log('❌ Backend Health Check Error:', error.message);
    return;
  }

  // Test 2: Test CORS avec Origin du frontend
  try {
    console.log('\n2️⃣ Test CORS avec Origin Frontend (port 3002)...');
    const corsResponse = await axios.get('http://localhost:3003/health', {
      headers: {
        'Origin': 'http://localhost:3002',
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    console.log('✅ CORS Test:', corsResponse.status);
    console.log('✅ CORS Headers:', {
      'Access-Control-Allow-Origin': corsResponse.headers['access-control-allow-origin'],
      'Access-Control-Allow-Credentials': corsResponse.headers['access-control-allow-credentials']
    });
  } catch (error) {
    console.log('❌ CORS Test Error:', error.message);
  }

  // Test 3: Test API Dashboard
  try {
    console.log('\n3️⃣ Test API Dashboard...');
    const dashboardResponse = await axios.get('http://localhost:3003/api/v1/dashboard/stats', {
      headers: {
        'Origin': 'http://localhost:3002',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    console.log('✅ Dashboard API:', dashboardResponse.status);
    if (dashboardResponse.data && dashboardResponse.data.data) {
      console.log('✅ Dashboard Data Keys:', Object.keys(dashboardResponse.data.data));
    }
  } catch (error) {
    console.log('❌ Dashboard API Error:', error.message);
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', error.response.data);
    }
  }

  // Test 4: Test API Products
  try {
    console.log('\n4️⃣ Test API Products...');
    const productsResponse = await axios.get('http://localhost:3003/api/v1/products?limit=5', {
      headers: {
        'Origin': 'http://localhost:3002',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    console.log('✅ Products API:', productsResponse.status);
    if (productsResponse.data && productsResponse.data.data) {
      console.log('✅ Products Count:', productsResponse.data.data.data?.length || 0);
    }
  } catch (error) {
    console.log('❌ Products API Error:', error.message);
    if (error.response) {
      console.log('   Status:', error.response.status);
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log('🎯 Test terminé - Vérifiez les résultats ci-dessus');
  console.log('📝 Configuration actuelle:');
  console.log('   - Backend: http://localhost:3003');
  console.log('   - Frontend: http://localhost:3002');
  console.log('   - CORS Origin autorisée: http://localhost:3002');
}

// Exécuter le test
testCorsConnectivity().catch(console.error);
