/**
 * Test de connectivité Frontend-Backend
 * Vérifie que le frontend peut communiquer avec le backend
 */

const axios = require('axios');

const FRONTEND_URL = 'http://localhost:3002';
const BACKEND_URL = 'http://localhost:3003';

async function testBackendHealth() {
  console.log('🔍 Test de santé du backend...');
  try {
    const response = await axios.get(`${BACKEND_URL}/health`);
    console.log('✅ Backend Health:', response.status, response.data);
    return true;
  } catch (error) {
    console.error('❌ Backend Health Error:', error.message);
    return false;
  }
}

async function testFrontendAccess() {
  console.log('🔍 Test d\'accès au frontend...');
  try {
    const response = await axios.get(FRONTEND_URL);
    console.log('✅ Frontend accessible:', response.status);
    return true;
  } catch (error) {
    console.error('❌ Frontend Access Error:', error.message);
    return false;
  }
}

async function testCorsFromFrontend() {
  console.log('🔍 Test CORS depuis le frontend...');
  try {
    // Simuler une requête CORS comme le ferait le frontend
    const response = await axios.get(`${BACKEND_URL}/health`, {
      headers: {
        'Origin': FRONTEND_URL,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ CORS Test:', response.status);
    console.log('   Access-Control-Allow-Origin:', response.headers['access-control-allow-origin']);
    return true;
  } catch (error) {
    console.error('❌ CORS Test Error:', error.message);
    return false;
  }
}

async function testApiEndpoint() {
  console.log('🔍 Test d\'un endpoint API...');
  try {
    // Test d'un endpoint qui ne nécessite pas d'authentification
    const response = await axios.get(`${BACKEND_URL}/api/v1/dashboard/stats`, {
      headers: {
        'Origin': FRONTEND_URL,
        'Content-Type': 'application/json'
      },
      validateStatus: function (status) {
        // Accepter les codes 200 et 401 (401 = pas authentifié, mais l'endpoint répond)
        return status === 200 || status === 401;
      }
    });
    
    if (response.status === 200) {
      console.log('✅ API Endpoint accessible (authentifié):', response.status);
    } else if (response.status === 401) {
      console.log('✅ API Endpoint accessible (non authentifié - normal):', response.status);
    }
    return true;
  } catch (error) {
    console.error('❌ API Endpoint Error:', error.message);
    return false;
  }
}

async function runConnectivityTests() {
  console.log('🧪 Tests de connectivité Frontend-Backend\n');
  
  const results = {
    backendHealth: false,
    frontendAccess: false,
    corsTest: false,
    apiEndpoint: false
  };
  
  // Test 1: Santé du backend
  results.backendHealth = await testBackendHealth();
  console.log('');
  
  // Test 2: Accès au frontend
  results.frontendAccess = await testFrontendAccess();
  console.log('');
  
  // Test 3: CORS
  results.corsTest = await testCorsFromFrontend();
  console.log('');
  
  // Test 4: Endpoint API
  results.apiEndpoint = await testApiEndpoint();
  console.log('');
  
  // Résumé
  console.log('📊 Résumé des tests:');
  console.log(`   Backend Health: ${results.backendHealth ? '✅' : '❌'}`);
  console.log(`   Frontend Access: ${results.frontendAccess ? '✅' : '❌'}`);
  console.log(`   CORS Test: ${results.corsTest ? '✅' : '❌'}`);
  console.log(`   API Endpoint: ${results.apiEndpoint ? '✅' : '❌'}`);
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 Tous les tests de connectivité sont passés !');
    console.log('🚀 L\'application est prête à être utilisée :');
    console.log(`   Frontend: ${FRONTEND_URL}`);
    console.log(`   Backend: ${BACKEND_URL}`);
  } else {
    console.log('\n⚠️ Certains tests ont échoué. Vérifiez les logs ci-dessus.');
  }
  
  return allPassed;
}

runConnectivityTests().catch(console.error);
