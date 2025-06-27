/**
 * Script de test de connectivité pour l'application de gestion commerciale
 * Teste la connectivité entre frontend (3000) et backend (3001)
 */

const axios = require('axios');

// Configuration
const BACKEND_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:3000';

// Couleurs pour les logs
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testBackendHealth() {
  try {
    log('\n🔍 Test de connectivité backend (port 3001)...', 'blue');
    
    const response = await axios.get(`${BACKEND_URL}/health`, {
      timeout: 5000
    });
    
    log(`✅ Backend accessible: ${response.status}`, 'green');
    log(`📊 Données: ${JSON.stringify(response.data, null, 2)}`, 'blue');
    
    return true;
  } catch (error) {
    log(`❌ Erreur backend: ${error.message}`, 'red');
    return false;
  }
}

async function testFrontendHealth() {
  try {
    log('\n🔍 Test de connectivité frontend (port 3000)...', 'blue');
    
    const response = await axios.get(`${FRONTEND_URL}`, {
      timeout: 5000,
      validateStatus: () => true // Accepter tous les codes de statut
    });
    
    log(`✅ Frontend accessible: ${response.status}`, 'green');
    
    return true;
  } catch (error) {
    log(`❌ Erreur frontend: ${error.message}`, 'red');
    return false;
  }
}

async function testCorsConfiguration() {
  try {
    log('\n🔍 Test de configuration CORS...', 'blue');
    
    // Test avec Origin header
    const response = await axios.get(`${BACKEND_URL}/health`, {
      headers: {
        'Origin': 'http://localhost:3000'
      },
      timeout: 5000
    });
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': response.headers['access-control-allow-origin'],
      'Access-Control-Allow-Credentials': response.headers['access-control-allow-credentials'],
      'Access-Control-Allow-Methods': response.headers['access-control-allow-methods']
    };
    
    log('✅ Headers CORS reçus:', 'green');
    log(JSON.stringify(corsHeaders, null, 2), 'blue');
    
    return true;
  } catch (error) {
    log(`❌ Erreur test CORS: ${error.message}`, 'red');
    return false;
  }
}

async function testAuthEndpoint() {
  try {
    log('\n🔍 Test endpoint d\'authentification...', 'blue');
    
    // Test de login avec des données de test (utilisateurs mock du backend)
    const loginData = {
      email: 'admin@test.com',
      password: 'password123'
    };
    
    const response = await axios.post(`${BACKEND_URL}/api/v1/auth/login`, loginData, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000'
      },
      timeout: 5000
    });
    
    log(`✅ Authentification réussie: ${response.status}`, 'green');
    log(`📊 Structure de la réponse:`, 'blue');
    log(JSON.stringify(response.data, null, 2), 'blue');

    // Essayer différents chemins pour le token
    const token = response.data.data?.tokens?.accessToken ||
                  response.data.data?.token ||
                  response.data.data?.accessToken ||
                  response.data.token ||
                  response.data.accessToken;

    log(`🔑 Token reçu: ${token ? 'Oui' : 'Non'}`, 'blue');

    return token;
  } catch (error) {
    log(`❌ Erreur authentification: ${error.message}`, 'red');
    if (error.response) {
      log(`📊 Réponse: ${JSON.stringify(error.response.data, null, 2)}`, 'yellow');
    }
    return null;
  }
}

async function testClientsEndpoint(token) {
  try {
    log('\n🔍 Test endpoint clients...', 'blue');
    
    if (!token) {
      log('⚠️ Pas de token disponible, test ignoré', 'yellow');
      return false;
    }
    
    const response = await axios.get(`${BACKEND_URL}/api/v1/clients`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Origin': 'http://localhost:3000'
      },
      timeout: 5000
    });
    
    log(`✅ Endpoint clients accessible: ${response.status}`, 'green');
    log(`📊 Nombre de clients: ${response.data.data?.length || 0}`, 'blue');
    
    return true;
  } catch (error) {
    log(`❌ Erreur endpoint clients: ${error.message}`, 'red');
    if (error.response) {
      log(`📊 Réponse: ${JSON.stringify(error.response.data, null, 2)}`, 'yellow');
    }
    return false;
  }
}

async function runTests() {
  log('🚀 Démarrage des tests de connectivité...', 'blue');
  log('=' .repeat(50), 'blue');
  
  const results = {
    backend: false,
    frontend: false,
    cors: false,
    auth: false,
    clients: false
  };
  
  // Test backend
  results.backend = await testBackendHealth();
  
  // Test frontend
  results.frontend = await testFrontendHealth();
  
  // Test CORS
  results.cors = await testCorsConfiguration();
  
  // Test authentification
  const token = await testAuthEndpoint();
  results.auth = !!token;
  
  // Test endpoint clients
  results.clients = await testClientsEndpoint(token);
  
  // Résumé
  log('\n📋 RÉSUMÉ DES TESTS', 'blue');
  log('=' .repeat(50), 'blue');
  
  Object.entries(results).forEach(([test, success]) => {
    const status = success ? '✅' : '❌';
    const color = success ? 'green' : 'red';
    log(`${status} ${test.toUpperCase()}: ${success ? 'OK' : 'ÉCHEC'}`, color);
  });
  
  const totalSuccess = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  log(`\n🎯 Score: ${totalSuccess}/${totalTests} tests réussis`, totalSuccess === totalTests ? 'green' : 'yellow');
  
  if (totalSuccess === totalTests) {
    log('🎉 Tous les tests sont passés ! Infrastructure prête.', 'green');
  } else {
    log('⚠️ Certains tests ont échoué. Vérifiez la configuration.', 'yellow');
  }
}

// Exécution
runTests().catch(error => {
  log(`💥 Erreur fatale: ${error.message}`, 'red');
  process.exit(1);
});
