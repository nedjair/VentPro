#!/usr/bin/env node

/**
 * Script de test pour l'API des fournisseurs
 * Teste l'authentification et les opérations CRUD
 */

const API_BASE = 'http://localhost:3001';
const FRONTEND_BASE = 'http://localhost:3000';

// Credentials de test
const TEST_CREDENTIALS = {
  email: 'admin@test.com',
  password: 'password123'
};

// Couleurs pour les logs
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Fonction pour faire des requêtes HTTP
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const data = await response.json().catch(() => null);
    
    return {
      ok: response.ok,
      status: response.status,
      data,
      response
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error.message
    };
  }
}

// Test de connexion et récupération du token JWT
async function authenticate() {
  logInfo('🔐 Test d\'authentification...');
  
  const result = await makeRequest(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    body: JSON.stringify(TEST_CREDENTIALS)
  });

  if (!result.ok) {
    logError(`Échec de l'authentification: ${result.status} - ${result.data?.message || result.error}`);
    return null;
  }

  if (!result.data?.tokens?.accessToken) {
    logError('Token JWT non reçu dans la réponse');
    logError('Réponse reçue:', JSON.stringify(result.data, null, 2));
    return null;
  }

  logSuccess('Authentification réussie');
  logInfo(`Token reçu: ${result.data.tokens.accessToken.substring(0, 50)}...`);

  return result.data.tokens.accessToken;
}

// Test de récupération des fournisseurs
async function testGetSuppliers(token) {
  logInfo('📋 Test de récupération des fournisseurs...');
  
  const result = await makeRequest(`${API_BASE}/api/v1/suppliers`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!result.ok) {
    logError(`Échec de récupération: ${result.status} - ${result.data?.message || result.error}`);
    return false;
  }

  logSuccess(`${result.data?.length || 0} fournisseurs récupérés`);
  if (result.data?.length > 0) {
    logInfo(`Premier fournisseur: ${result.data[0].name}`);
  }
  
  return result.data;
}

// Test de création d'un fournisseur
async function testCreateSupplier(token) {
  logInfo('➕ Test de création d\'un fournisseur...');
  
  const newSupplier = {
    name: 'Test Supplier API',
    email: 'test@supplier-api.com',
    phone: '+33123456789',
    address: '123 Test Street',
    city: 'Test City',
    postalCode: '12345',
    country: 'France',
    contactPerson: 'John Test',
    paymentTerms: 30,
    isActive: true
  };

  const result = await makeRequest(`${API_BASE}/api/v1/suppliers`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(newSupplier)
  });

  if (!result.ok) {
    logError(`Échec de création: ${result.status} - ${result.data?.message || result.error}`);
    return null;
  }

  logSuccess(`Fournisseur créé avec l'ID: ${result.data.id}`);
  return result.data;
}

// Test de modification d'un fournisseur
async function testUpdateSupplier(token, supplierId) {
  logInfo(`✏️  Test de modification du fournisseur ${supplierId}...`);
  
  const updateData = {
    name: 'Test Supplier API - Updated',
    phone: '+33987654321'
  };

  const result = await makeRequest(`${API_BASE}/api/v1/suppliers/${supplierId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(updateData)
  });

  if (!result.ok) {
    logError(`Échec de modification: ${result.status} - ${result.data?.message || result.error}`);
    return false;
  }

  logSuccess('Fournisseur modifié avec succès');
  return result.data;
}

// Test de suppression d'un fournisseur
async function testDeleteSupplier(token, supplierId) {
  logInfo(`🗑️  Test de suppression du fournisseur ${supplierId}...`);
  
  const result = await makeRequest(`${API_BASE}/api/v1/suppliers/${supplierId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!result.ok) {
    logError(`Échec de suppression: ${result.status} - ${result.data?.message || result.error}`);
    return false;
  }

  logSuccess('Fournisseur supprimé avec succès');
  return true;
}

// Test principal
async function runTests() {
  log('\n🚀 Démarrage des tests API des fournisseurs\n', 'bold');
  
  // Test 1: Authentification
  const token = await authenticate();
  if (!token) {
    logError('Impossible de continuer sans token d\'authentification');
    process.exit(1);
  }

  // Test 2: Récupération des fournisseurs
  const suppliers = await testGetSuppliers(token);
  if (suppliers === false) {
    logError('Échec du test de récupération');
    process.exit(1);
  }

  // Test 3: Création d'un fournisseur
  const newSupplier = await testCreateSupplier(token);
  if (!newSupplier) {
    logError('Échec du test de création');
    process.exit(1);
  }

  // Test 4: Modification du fournisseur créé
  const updatedSupplier = await testUpdateSupplier(token, newSupplier.id);
  if (!updatedSupplier) {
    logError('Échec du test de modification');
    process.exit(1);
  }

  // Test 5: Suppression du fournisseur créé
  const deleted = await testDeleteSupplier(token, newSupplier.id);
  if (!deleted) {
    logError('Échec du test de suppression');
    process.exit(1);
  }

  // Test final: Vérification que le fournisseur a été supprimé
  const finalSuppliers = await testGetSuppliers(token);
  const supplierExists = finalSuppliers && finalSuppliers.some(s => s.id === newSupplier.id);
  
  if (supplierExists) {
    logError('Le fournisseur n\'a pas été correctement supprimé');
    process.exit(1);
  }

  log('\n🎉 Tous les tests ont réussi !', 'green');
  log('✅ Authentification JWT', 'green');
  log('✅ Récupération des fournisseurs', 'green');
  log('✅ Création d\'un fournisseur', 'green');
  log('✅ Modification d\'un fournisseur', 'green');
  log('✅ Suppression d\'un fournisseur', 'green');
  log('✅ Synchronisation des données\n', 'green');
}

// Vérification que fetch est disponible (Node.js 18+)
if (typeof fetch === 'undefined') {
  logError('Ce script nécessite Node.js 18+ avec fetch natif');
  process.exit(1);
}

// Exécution des tests
runTests().catch(error => {
  logError(`Erreur inattendue: ${error.message}`);
  console.error(error);
  process.exit(1);
});
