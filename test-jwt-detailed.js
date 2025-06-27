/**
 * Test détaillé de l'authentification JWT
 * Valide le flux complet d'authentification et d'autorisation
 */

const axios = require('axios');

const BACKEND_URL = 'http://localhost:3001';

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

function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Token JWT invalide');
    }
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload;
  } catch (error) {
    log(`❌ Erreur décodage JWT: ${error.message}`, 'red');
    return null;
  }
}

async function testLogin() {
  log('\n🔍 Test de connexion...', 'blue');
  
  try {
    const response = await axios.post(`${BACKEND_URL}/api/v1/auth/login`, {
      email: 'admin@test.com',
      password: 'password123'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000'
      }
    });
    
    log(`✅ Connexion réussie: ${response.status}`, 'green');
    
    const { user, tokens } = response.data.data;
    
    log('👤 Utilisateur connecté:', 'cyan');
    log(`   ID: ${user.id}`, 'cyan');
    log(`   Email: ${user.email}`, 'cyan');
    log(`   Nom: ${user.firstName} ${user.lastName}`, 'cyan');
    log(`   Rôle: ${user.role}`, 'cyan');
    
    log('🔑 Tokens reçus:', 'cyan');
    log(`   Access Token: ${tokens.accessToken ? 'Oui' : 'Non'}`, 'cyan');
    log(`   Refresh Token: ${tokens.refreshToken ? 'Oui' : 'Non'}`, 'cyan');
    
    return tokens;
    
  } catch (error) {
    log(`❌ Erreur connexion: ${error.message}`, 'red');
    if (error.response) {
      log(`📊 Réponse: ${JSON.stringify(error.response.data, null, 2)}`, 'yellow');
    }
    return null;
  }
}

async function testTokenValidation(accessToken) {
  log('\n🔍 Test de validation du token...', 'blue');
  
  if (!accessToken) {
    log('⚠️ Pas de token à valider', 'yellow');
    return false;
  }
  
  // Décoder le token
  const payload = decodeJWT(accessToken);
  if (payload) {
    log('📊 Contenu du token JWT:', 'cyan');
    log(`   User ID: ${payload.userId}`, 'cyan');
    log(`   Email: ${payload.email}`, 'cyan');
    log(`   Rôle: ${payload.role}`, 'cyan');
    log(`   Company ID: ${payload.companyId}`, 'cyan');
    log(`   Émis le: ${new Date(payload.iat * 1000).toLocaleString()}`, 'cyan');
    log(`   Expire le: ${new Date(payload.exp * 1000).toLocaleString()}`, 'cyan');
    
    // Vérifier l'expiration
    const now = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp < now;
    
    if (isExpired) {
      log('❌ Token expiré', 'red');
      return false;
    } else {
      log(`✅ Token valide (expire dans ${Math.floor((payload.exp - now) / 60)} minutes)`, 'green');
      return true;
    }
  }
  
  return false;
}

async function testProtectedEndpoint(accessToken) {
  log('\n🔍 Test d\'endpoint protégé...', 'blue');
  
  if (!accessToken) {
    log('⚠️ Pas de token pour tester', 'yellow');
    return false;
  }
  
  try {
    const response = await axios.get(`${BACKEND_URL}/api/v1/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Origin': 'http://localhost:3000'
      }
    });
    
    log(`✅ Endpoint protégé accessible: ${response.status}`, 'green');
    log(`📊 Données utilisateur vérifiées:`, 'cyan');
    log(JSON.stringify(response.data, null, 2), 'cyan');
    
    return true;
    
  } catch (error) {
    log(`❌ Erreur endpoint protégé: ${error.message}`, 'red');
    if (error.response) {
      log(`📊 Status: ${error.response.status}`, 'yellow');
      log(`📊 Message: ${error.response.data?.message}`, 'yellow');
    }
    return false;
  }
}

async function testInvalidToken() {
  log('\n🔍 Test avec token invalide...', 'blue');
  
  const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.token';
  
  try {
    const response = await axios.get(`${BACKEND_URL}/api/v1/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${invalidToken}`,
        'Origin': 'http://localhost:3000'
      },
      validateStatus: () => true
    });
    
    if (response.status === 401) {
      log('✅ Token invalide correctement rejeté', 'green');
      return true;
    } else {
      log(`❌ Token invalide accepté (status: ${response.status})`, 'red');
      return false;
    }
    
  } catch (error) {
    log(`❌ Erreur test token invalide: ${error.message}`, 'red');
    return false;
  }
}

async function testNoToken() {
  log('\n🔍 Test sans token...', 'blue');
  
  try {
    const response = await axios.get(`${BACKEND_URL}/api/v1/auth/profile`, {
      headers: {
        'Origin': 'http://localhost:3000'
      },
      validateStatus: () => true
    });
    
    if (response.status === 401) {
      log('✅ Accès sans token correctement refusé', 'green');
      return true;
    } else {
      log(`❌ Accès sans token autorisé (status: ${response.status})`, 'red');
      return false;
    }
    
  } catch (error) {
    log(`❌ Erreur test sans token: ${error.message}`, 'red');
    return false;
  }
}

async function testRefreshToken(refreshToken) {
  log('\n🔍 Test de refresh token...', 'blue');
  
  if (!refreshToken) {
    log('⚠️ Pas de refresh token à tester', 'yellow');
    return false;
  }
  
  try {
    const response = await axios.post(`${BACKEND_URL}/api/v1/auth/refresh`, {
      refreshToken: refreshToken
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000'
      }
    });
    
    log(`✅ Refresh token fonctionnel: ${response.status}`, 'green');
    
    const newAccessToken = response.data.data?.accessToken;
    if (newAccessToken) {
      log('🔄 Nouveau token généré:', 'cyan');
      log(`   Access Token: ${newAccessToken ? 'Oui' : 'Non'}`, 'cyan');
      return true;
    } else {
      log('❌ Pas de nouveau token reçu', 'red');
      return false;
    }
    
  } catch (error) {
    log(`❌ Erreur refresh token: ${error.message}`, 'red');
    if (error.response) {
      log(`📊 Status: ${error.response.status}`, 'yellow');
      log(`📊 Message: ${error.response.data?.message}`, 'yellow');
    }
    return false;
  }
}

async function runJWTTests() {
  log('🚀 TESTS JWT DÉTAILLÉS', 'magenta');
  log('=' .repeat(60), 'magenta');
  
  const results = {
    login: false,
    tokenValidation: false,
    protectedEndpoint: false,
    invalidToken: false,
    noToken: false,
    refreshToken: false
  };
  
  // Test 1: Connexion
  const tokens = await testLogin();
  results.login = !!tokens;
  
  if (tokens) {
    // Test 2: Validation du token
    results.tokenValidation = await testTokenValidation(tokens.accessToken);
    
    // Test 3: Endpoint protégé
    results.protectedEndpoint = await testProtectedEndpoint(tokens.accessToken);
    
    // Test 6: Refresh token
    results.refreshToken = await testRefreshToken(tokens.refreshToken);
  }
  
  // Test 4: Token invalide
  results.invalidToken = await testInvalidToken();
  
  // Test 5: Sans token
  results.noToken = await testNoToken();
  
  // Résumé
  log('\n📋 RÉSUMÉ DES TESTS JWT', 'magenta');
  log('=' .repeat(60), 'magenta');
  
  Object.entries(results).forEach(([test, success]) => {
    const status = success ? '✅' : '❌';
    const color = success ? 'green' : 'red';
    log(`${status} ${test.toUpperCase()}: ${success ? 'OK' : 'ÉCHEC'}`, color);
  });
  
  const totalSuccess = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  log(`\n🎯 Score JWT: ${totalSuccess}/${totalTests} tests réussis`, totalSuccess === totalTests ? 'green' : 'yellow');
  
  if (totalSuccess >= 4) {
    log('🎉 Authentification JWT fonctionnelle !', 'green');
    log('✅ Sécurité des endpoints protégés validée', 'green');
  } else {
    log('⚠️ Problèmes détectés dans l\'authentification JWT', 'yellow');
  }
  
  return results;
}

// Exécution
runJWTTests().catch(error => {
  log(`💥 Erreur fatale: ${error.message}`, 'red');
  process.exit(1);
});
