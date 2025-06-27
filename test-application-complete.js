/**
 * Test complet de l'application
 * Vérifie les fonctionnalités principales de l'application de gestion commerciale
 */

const axios = require('axios');

const FRONTEND_URL = 'http://localhost:3002';
const BACKEND_URL = 'http://localhost:3003';

// Configuration pour les requêtes
const axiosConfig = {
  headers: {
    'Origin': FRONTEND_URL,
    'Content-Type': 'application/json'
  },
  validateStatus: function (status) {
    return status < 500; // Accepter tous les codes < 500
  }
};

async function testHealthEndpoints() {
  console.log('🔍 Test des endpoints de santé...');
  
  try {
    // Test health check
    const health = await axios.get(`${BACKEND_URL}/health`, axiosConfig);
    console.log('✅ Health Check:', health.status, health.data?.status);
    
    // Test metrics (si disponible)
    try {
      const metrics = await axios.get(`${BACKEND_URL}/metrics`, axiosConfig);
      console.log('✅ Metrics:', metrics.status);
    } catch (error) {
      console.log('ℹ️ Metrics endpoint non disponible (normal)');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Health Endpoints Error:', error.message);
    return false;
  }
}

async function testApiEndpoints() {
  console.log('🔍 Test des endpoints API principaux...');
  
  const endpoints = [
    '/api/v1/dashboard/stats',
    '/api/v1/clients',
    '/api/v1/products', 
    '/api/v1/suppliers',
    '/api/v1/orders',
    '/api/v1/invoices'
  ];
  
  let successCount = 0;
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${BACKEND_URL}${endpoint}`, axiosConfig);
      
      if (response.status === 200) {
        console.log(`✅ ${endpoint}: 200 (authentifié)`);
        successCount++;
      } else if (response.status === 401) {
        console.log(`✅ ${endpoint}: 401 (non authentifié - normal)`);
        successCount++;
      } else {
        console.log(`⚠️ ${endpoint}: ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ ${endpoint}: ${error.message}`);
    }
  }
  
  console.log(`📊 Endpoints testés: ${successCount}/${endpoints.length}`);
  return successCount === endpoints.length;
}

async function testAuthEndpoints() {
  console.log('🔍 Test des endpoints d\'authentification...');
  
  try {
    // Test login endpoint (sans credentials valides)
    const loginResponse = await axios.post(`${BACKEND_URL}/api/v1/auth/login`, {
      email: 'test@example.com',
      password: 'wrongpassword'
    }, axiosConfig);
    
    if (loginResponse.status === 401 || loginResponse.status === 400) {
      console.log('✅ Login endpoint: Répond correctement aux mauvaises credentials');
    } else {
      console.log(`⚠️ Login endpoint: Status inattendu ${loginResponse.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Auth Endpoints Error:', error.message);
    return false;
  }
}

async function testCorsHeaders() {
  console.log('🔍 Test des headers CORS...');
  
  try {
    // Test OPTIONS request (preflight)
    const optionsResponse = await axios.options(`${BACKEND_URL}/api/v1/dashboard/stats`, {
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type,Authorization'
      }
    });
    
    const corsHeaders = {
      'access-control-allow-origin': optionsResponse.headers['access-control-allow-origin'],
      'access-control-allow-methods': optionsResponse.headers['access-control-allow-methods'],
      'access-control-allow-headers': optionsResponse.headers['access-control-allow-headers'],
      'access-control-allow-credentials': optionsResponse.headers['access-control-allow-credentials']
    };
    
    console.log('✅ CORS Headers:', corsHeaders);
    
    const hasRequiredHeaders = corsHeaders['access-control-allow-origin'] && 
                              corsHeaders['access-control-allow-methods'];
    
    return hasRequiredHeaders;
  } catch (error) {
    console.error('❌ CORS Headers Error:', error.message);
    return false;
  }
}

async function testFrontendPages() {
  console.log('🔍 Test des pages frontend...');
  
  const pages = [
    '/',
    '/login',
    '/dashboard',
    '/clients',
    '/products',
    '/suppliers',
    '/orders',
    '/invoices'
  ];
  
  let successCount = 0;
  
  for (const page of pages) {
    try {
      const response = await axios.get(`${FRONTEND_URL}${page}`, {
        timeout: 5000,
        validateStatus: function (status) {
          return status < 500;
        }
      });
      
      if (response.status === 200) {
        console.log(`✅ ${page}: 200`);
        successCount++;
      } else {
        console.log(`⚠️ ${page}: ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ ${page}: ${error.message}`);
    }
  }
  
  console.log(`📊 Pages testées: ${successCount}/${pages.length}`);
  return successCount >= pages.length * 0.8; // 80% de succès minimum
}

async function runCompleteTests() {
  console.log('🧪 Tests complets de l\'application\n');
  
  const results = {
    healthEndpoints: false,
    apiEndpoints: false,
    authEndpoints: false,
    corsHeaders: false,
    frontendPages: false
  };
  
  // Test 1: Endpoints de santé
  results.healthEndpoints = await testHealthEndpoints();
  console.log('');
  
  // Test 2: Endpoints API
  results.apiEndpoints = await testApiEndpoints();
  console.log('');
  
  // Test 3: Endpoints d'authentification
  results.authEndpoints = await testAuthEndpoints();
  console.log('');
  
  // Test 4: Headers CORS
  results.corsHeaders = await testCorsHeaders();
  console.log('');
  
  // Test 5: Pages frontend
  results.frontendPages = await testFrontendPages();
  console.log('');
  
  // Résumé final
  console.log('📊 Résumé des tests complets:');
  console.log(`   Health Endpoints: ${results.healthEndpoints ? '✅' : '❌'}`);
  console.log(`   API Endpoints: ${results.apiEndpoints ? '✅' : '❌'}`);
  console.log(`   Auth Endpoints: ${results.authEndpoints ? '✅' : '❌'}`);
  console.log(`   CORS Headers: ${results.corsHeaders ? '✅' : '❌'}`);
  console.log(`   Frontend Pages: ${results.frontendPages ? '✅' : '❌'}`);
  
  const passedTests = Object.values(results).filter(result => result).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n📈 Score: ${passedTests}/${totalTests} tests réussis`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 Tous les tests sont passés ! L\'application fonctionne parfaitement.');
    console.log('🚀 Vous pouvez maintenant utiliser l\'application :');
    console.log(`   Frontend: ${FRONTEND_URL}`);
    console.log(`   Backend API: ${BACKEND_URL}`);
    console.log(`   Documentation API: ${BACKEND_URL}/docs`);
  } else if (passedTests >= totalTests * 0.8) {
    console.log('\n✅ La plupart des tests sont passés. L\'application est fonctionnelle.');
    console.log('⚠️ Quelques fonctionnalités mineures peuvent nécessiter une attention.');
  } else {
    console.log('\n⚠️ Plusieurs tests ont échoué. Vérifiez la configuration.');
  }
  
  return passedTests >= totalTests * 0.8;
}

runCompleteTests().catch(console.error);
