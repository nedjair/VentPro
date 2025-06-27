/**
 * Test détaillé de la configuration CORS
 * Valide tous les aspects de la communication frontend-backend
 */

const axios = require('axios');

const BACKEND_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:3000';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testCorsHeaders() {
  log('\n🔍 Test des headers CORS...', 'blue');
  
  try {
    const response = await axios.get(`${BACKEND_URL}/health`, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': response.headers['access-control-allow-origin'],
      'Access-Control-Allow-Credentials': response.headers['access-control-allow-credentials'],
      'Access-Control-Allow-Methods': response.headers['access-control-allow-methods'],
      'Access-Control-Allow-Headers': response.headers['access-control-allow-headers'],
      'Access-Control-Max-Age': response.headers['access-control-max-age']
    };
    
    log('✅ Headers CORS reçus:', 'green');
    Object.entries(corsHeaders).forEach(([key, value]) => {
      if (value) {
        log(`   ${key}: ${value}`, 'cyan');
      }
    });
    
    // Validation des headers critiques
    const validations = {
      'Origin autorisée': corsHeaders['Access-Control-Allow-Origin'] === 'http://localhost:3000',
      'Credentials autorisés': corsHeaders['Access-Control-Allow-Credentials'] === 'true',
      'Méthodes HTTP': corsHeaders['Access-Control-Allow-Methods']?.includes('GET'),
    };
    
    log('\n📋 Validation des headers:', 'yellow');
    Object.entries(validations).forEach(([test, passed]) => {
      const status = passed ? '✅' : '❌';
      const color = passed ? 'green' : 'red';
      log(`   ${status} ${test}`, color);
    });
    
    return Object.values(validations).every(Boolean);
    
  } catch (error) {
    log(`❌ Erreur test headers CORS: ${error.message}`, 'red');
    return false;
  }
}

async function testPreflightRequest() {
  log('\n🔍 Test de requête preflight OPTIONS...', 'blue');
  
  try {
    const response = await axios.options(`${BACKEND_URL}/api/v1/clients`, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      },
      validateStatus: () => true
    });
    
    log(`✅ Preflight réponse: ${response.status}`, 'green');
    
    const preflightHeaders = {
      'Access-Control-Allow-Origin': response.headers['access-control-allow-origin'],
      'Access-Control-Allow-Methods': response.headers['access-control-allow-methods'],
      'Access-Control-Allow-Headers': response.headers['access-control-allow-headers'],
      'Access-Control-Max-Age': response.headers['access-control-max-age']
    };
    
    log('📊 Headers preflight:', 'cyan');
    Object.entries(preflightHeaders).forEach(([key, value]) => {
      if (value) {
        log(`   ${key}: ${value}`, 'cyan');
      }
    });
    
    return response.status === 200 || response.status === 204;
    
  } catch (error) {
    log(`❌ Erreur preflight: ${error.message}`, 'red');
    return false;
  }
}

async function testCorsWithCredentials() {
  log('\n🔍 Test CORS avec credentials...', 'blue');
  
  try {
    // Test avec credentials
    const response = await axios.post(`${BACKEND_URL}/api/v1/auth/login`, {
      email: 'admin@test.com',
      password: 'password123'
    }, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });
    
    log(`✅ Requête avec credentials: ${response.status}`, 'green');
    
    const token = response.data.data?.tokens?.accessToken;
    if (token) {
      log('🔑 Token JWT reçu avec credentials', 'green');
      return token;
    } else {
      log('❌ Pas de token reçu', 'red');
      return null;
    }
    
  } catch (error) {
    log(`❌ Erreur credentials: ${error.message}`, 'red');
    return null;
  }
}

async function testCorsWithAuthenticatedRequest(token) {
  log('\n🔍 Test requête authentifiée avec CORS...', 'blue');
  
  if (!token) {
    log('⚠️ Pas de token disponible', 'yellow');
    return false;
  }
  
  try {
    const response = await axios.get(`${BACKEND_URL}/api/v1/clients`, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });
    
    log(`✅ Requête authentifiée: ${response.status}`, 'green');
    log(`📊 Clients reçus: ${response.data.data?.length || 0}`, 'cyan');
    
    return true;
    
  } catch (error) {
    log(`❌ Erreur requête authentifiée: ${error.message}`, 'red');
    if (error.response) {
      log(`📊 Status: ${error.response.status}`, 'yellow');
      log(`📊 Message: ${error.response.data?.message}`, 'yellow');
    }
    return false;
  }
}

async function testCorsConfiguration() {
  log('\n🔍 Test de configuration CORS complète...', 'blue');
  
  // Vérifier la configuration côté backend
  try {
    const configResponse = await axios.get(`${BACKEND_URL}/health`);
    log('✅ Backend accessible pour vérification config', 'green');
  } catch (error) {
    log('❌ Backend inaccessible', 'red');
    return false;
  }
  
  // Test des origines non autorisées
  try {
    const response = await axios.get(`${BACKEND_URL}/health`, {
      headers: {
        'Origin': 'http://localhost:8080' // Origin non autorisée
      },
      validateStatus: () => true
    });
    
    const corsOrigin = response.headers['access-control-allow-origin'];
    if (corsOrigin === 'http://localhost:8080') {
      log('⚠️ ATTENTION: Origin non autorisée acceptée', 'yellow');
      return false;
    } else {
      log('✅ Origin non autorisée correctement rejetée', 'green');
      return true;
    }
    
  } catch (error) {
    log(`❌ Erreur test origin: ${error.message}`, 'red');
    return false;
  }
}

async function runCorsTests() {
  log('🚀 TESTS CORS DÉTAILLÉS', 'magenta');
  log('=' .repeat(60), 'magenta');
  
  const results = {
    headers: false,
    preflight: false,
    credentials: false,
    authenticated: false,
    configuration: false
  };
  
  // Test 1: Headers CORS
  results.headers = await testCorsHeaders();
  
  // Test 2: Requête preflight
  results.preflight = await testPreflightRequest();
  
  // Test 3: Credentials
  const token = await testCorsWithCredentials();
  results.credentials = !!token;
  
  // Test 4: Requête authentifiée
  results.authenticated = await testCorsWithAuthenticatedRequest(token);
  
  // Test 5: Configuration sécurisée
  results.configuration = await testCorsConfiguration();
  
  // Résumé
  log('\n📋 RÉSUMÉ DES TESTS CORS', 'magenta');
  log('=' .repeat(60), 'magenta');
  
  Object.entries(results).forEach(([test, success]) => {
    const status = success ? '✅' : '❌';
    const color = success ? 'green' : 'red';
    log(`${status} ${test.toUpperCase()}: ${success ? 'OK' : 'ÉCHEC'}`, color);
  });
  
  const totalSuccess = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  log(`\n🎯 Score CORS: ${totalSuccess}/${totalTests} tests réussis`, totalSuccess === totalTests ? 'green' : 'yellow');
  
  if (totalSuccess === totalTests) {
    log('🎉 Configuration CORS parfaitement fonctionnelle !', 'green');
    log('✅ Communication frontend-backend sécurisée', 'green');
    log('✅ Authentification JWT compatible CORS', 'green');
  } else {
    log('⚠️ Problèmes détectés dans la configuration CORS', 'yellow');
    log('🔧 Vérifiez la configuration dans apps/backend/src/config/cors.ts', 'yellow');
  }
  
  return results;
}

// Exécution
runCorsTests().catch(error => {
  log(`💥 Erreur fatale: ${error.message}`, 'red');
  process.exit(1);
});
