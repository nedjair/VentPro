/**
 * Test complet des opérations CRUD sur les clients
 * Teste GET, POST, PUT, DELETE avec validation des données
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

let authToken = null;

async function authenticate() {
  log('\n🔐 Authentification...', 'blue');
  
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
    
    authToken = response.data.data.tokens.accessToken;
    log('✅ Authentification réussie', 'green');
    return true;
  } catch (error) {
    log(`❌ Erreur authentification: ${error.message}`, 'red');
    return false;
  }
}

function getAuthHeaders() {
  return {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json',
    'Origin': 'http://localhost:3000'
  };
}

async function testGetClients() {
  log('\n🔍 Test GET - Liste des clients...', 'blue');
  
  try {
    const response = await axios.get(`${BACKEND_URL}/api/v1/clients`, {
      headers: getAuthHeaders()
    });
    
    log(`✅ GET clients réussi: ${response.status}`, 'green');
    
    const clients = response.data.data;
    log(`📊 Nombre de clients: ${clients.length}`, 'cyan');
    
    if (clients.length > 0) {
      const client = clients[0];
      log(`📋 Premier client:`, 'cyan');
      log(`   ID: ${client.id}`, 'cyan');
      log(`   Type: ${client.type}`, 'cyan');
      log(`   Nom: ${client.firstName || client.companyName} ${client.lastName || ''}`, 'cyan');
      log(`   Email: ${client.email || 'N/A'}`, 'cyan');
      log(`   Ville: ${client.city || 'N/A'}`, 'cyan');
    }
    
    return { success: true, clients };
  } catch (error) {
    log(`❌ Erreur GET clients: ${error.message}`, 'red');
    if (error.response) {
      log(`📊 Status: ${error.response.status}`, 'yellow');
      log(`📊 Message: ${error.response.data?.message}`, 'yellow');
    }
    return { success: false, clients: [] };
  }
}

async function testGetClientById(clientId) {
  log('\n🔍 Test GET - Client par ID...', 'blue');
  
  try {
    const response = await axios.get(`${BACKEND_URL}/api/v1/clients/${clientId}`, {
      headers: getAuthHeaders()
    });
    
    log(`✅ GET client par ID réussi: ${response.status}`, 'green');
    
    const client = response.data.data;
    log(`📋 Client récupéré:`, 'cyan');
    log(`   ID: ${client.id}`, 'cyan');
    log(`   Type: ${client.type}`, 'cyan');
    log(`   Nom: ${client.firstName || client.companyName} ${client.lastName || ''}`, 'cyan');
    log(`   Email: ${client.email || 'N/A'}`, 'cyan');
    
    return { success: true, client };
  } catch (error) {
    log(`❌ Erreur GET client par ID: ${error.message}`, 'red');
    if (error.response) {
      log(`📊 Status: ${error.response.status}`, 'yellow');
    }
    return { success: false, client: null };
  }
}

async function testCreateClient() {
  log('\n🔍 Test POST - Création de client...', 'blue');
  
  const newClient = {
    type: 'INDIVIDUAL',
    firstName: 'Test',
    lastName: 'CRUD',
    email: `test.crud.${Date.now()}@example.dz`,
    phone: '+213 555 123 789',
    address: '123 Rue de Test',
    city: 'Alger',
    country: 'Algérie',
    notes: 'Client créé pour test CRUD'
  };
  
  try {
    const response = await axios.post(`${BACKEND_URL}/api/v1/clients`, newClient, {
      headers: getAuthHeaders()
    });
    
    log(`✅ POST client réussi: ${response.status}`, 'green');
    
    const client = response.data.data;
    log(`📋 Client créé:`, 'cyan');
    log(`   ID: ${client.id}`, 'cyan');
    log(`   Nom: ${client.firstName} ${client.lastName}`, 'cyan');
    log(`   Email: ${client.email}`, 'cyan');
    log(`   Téléphone: ${client.phone}`, 'cyan');
    log(`   Ville: ${client.city}`, 'cyan');
    
    return { success: true, client };
  } catch (error) {
    log(`❌ Erreur POST client: ${error.message}`, 'red');
    if (error.response) {
      log(`📊 Status: ${error.response.status}`, 'yellow');
      log(`📊 Message: ${error.response.data?.message}`, 'yellow');
      log(`📊 Données envoyées:`, 'yellow');
      log(JSON.stringify(newClient, null, 2), 'yellow');
    }
    return { success: false, client: null };
  }
}

async function testUpdateClient(clientId) {
  log('\n🔍 Test PUT - Mise à jour de client...', 'blue');
  
  const updateData = {
    phone: '+213 555 987 654',
    address: '456 Rue Mise à Jour',
    notes: 'Client mis à jour via test CRUD'
  };
  
  try {
    const response = await axios.put(`${BACKEND_URL}/api/v1/clients/${clientId}`, updateData, {
      headers: getAuthHeaders()
    });
    
    log(`✅ PUT client réussi: ${response.status}`, 'green');
    
    const client = response.data.data;
    log(`📋 Client mis à jour:`, 'cyan');
    log(`   ID: ${client.id}`, 'cyan');
    log(`   Nouveau téléphone: ${client.phone}`, 'cyan');
    log(`   Nouvelle adresse: ${client.address}`, 'cyan');
    log(`   Notes: ${client.notes}`, 'cyan');
    
    return { success: true, client };
  } catch (error) {
    log(`❌ Erreur PUT client: ${error.message}`, 'red');
    if (error.response) {
      log(`📊 Status: ${error.response.status}`, 'yellow');
      log(`📊 Message: ${error.response.data?.message}`, 'yellow');
    }
    return { success: false, client: null };
  }
}

async function testDeleteClient(clientId) {
  log('\n🔍 Test DELETE - Suppression de client...', 'blue');
  
  try {
    const response = await axios.delete(`${BACKEND_URL}/api/v1/clients/${clientId}`, {
      headers: getAuthHeaders()
    });
    
    log(`✅ DELETE client réussi: ${response.status}`, 'green');
    log(`📋 Message: ${response.data.message}`, 'cyan');
    
    // Vérifier que le client n'existe plus
    try {
      await axios.get(`${BACKEND_URL}/api/v1/clients/${clientId}`, {
        headers: getAuthHeaders()
      });
      log('❌ Client toujours accessible après suppression', 'red');
      return false;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        log('✅ Client correctement supprimé (404 confirmé)', 'green');
        return true;
      } else {
        log(`❌ Erreur inattendue lors de la vérification: ${error.message}`, 'red');
        return false;
      }
    }
  } catch (error) {
    log(`❌ Erreur DELETE client: ${error.message}`, 'red');
    if (error.response) {
      log(`📊 Status: ${error.response.status}`, 'yellow');
      log(`📊 Message: ${error.response.data?.message}`, 'yellow');
    }
    return false;
  }
}

async function testSearchAndFilter() {
  log('\n🔍 Test de recherche et filtrage...', 'blue');
  
  try {
    // Test de recherche par nom
    const searchResponse = await axios.get(`${BACKEND_URL}/api/v1/clients?search=Ahmed`, {
      headers: getAuthHeaders()
    });
    
    log(`✅ Recherche par nom réussie: ${searchResponse.status}`, 'green');
    log(`📊 Résultats trouvés: ${searchResponse.data.data.length}`, 'cyan');
    
    // Test de filtrage par type
    const filterResponse = await axios.get(`${BACKEND_URL}/api/v1/clients?type=COMPANY`, {
      headers: getAuthHeaders()
    });
    
    log(`✅ Filtrage par type réussi: ${filterResponse.status}`, 'green');
    log(`📊 Entreprises trouvées: ${filterResponse.data.data.length}`, 'cyan');
    
    // Test de filtrage par ville
    const cityResponse = await axios.get(`${BACKEND_URL}/api/v1/clients?city=Alger`, {
      headers: getAuthHeaders()
    });
    
    log(`✅ Filtrage par ville réussi: ${cityResponse.status}`, 'green');
    log(`📊 Clients à Alger: ${cityResponse.data.data.length}`, 'cyan');
    
    return true;
  } catch (error) {
    log(`❌ Erreur recherche/filtrage: ${error.message}`, 'red');
    return false;
  }
}

async function testPagination() {
  log('\n🔍 Test de pagination...', 'blue');
  
  try {
    // Test page 1
    const page1Response = await axios.get(`${BACKEND_URL}/api/v1/clients?page=1&limit=5`, {
      headers: getAuthHeaders()
    });
    
    log(`✅ Page 1 récupérée: ${page1Response.status}`, 'green');
    log(`📊 Clients page 1: ${page1Response.data.data.length}`, 'cyan');
    
    // Test page 2
    const page2Response = await axios.get(`${BACKEND_URL}/api/v1/clients?page=2&limit=5`, {
      headers: getAuthHeaders()
    });
    
    log(`✅ Page 2 récupérée: ${page2Response.status}`, 'green');
    log(`📊 Clients page 2: ${page2Response.data.data.length}`, 'cyan');
    
    return true;
  } catch (error) {
    log(`❌ Erreur pagination: ${error.message}`, 'red');
    return false;
  }
}

async function runCRUDTests() {
  log('🚀 TESTS CRUD CLIENTS COMPLETS', 'magenta');
  log('=' .repeat(60), 'magenta');
  
  const results = {
    auth: false,
    getClients: false,
    getClientById: false,
    createClient: false,
    updateClient: false,
    deleteClient: false,
    searchFilter: false,
    pagination: false
  };
  
  // Authentification
  results.auth = await authenticate();
  if (!results.auth) {
    log('❌ Impossible de continuer sans authentification', 'red');
    return results;
  }
  
  // Test GET clients
  const getResult = await testGetClients();
  results.getClients = getResult.success;
  
  // Test GET client par ID (utiliser un client existant)
  if (getResult.clients.length > 0) {
    const testClientId = getResult.clients[0].id;
    const getByIdResult = await testGetClientById(testClientId);
    results.getClientById = getByIdResult.success;
  }
  
  // Test CREATE client
  const createResult = await testCreateClient();
  results.createClient = createResult.success;
  
  // Test UPDATE et DELETE avec le client créé
  if (createResult.success && createResult.client) {
    const clientId = createResult.client.id;
    
    // Test UPDATE
    const updateResult = await testUpdateClient(clientId);
    results.updateClient = updateResult.success;
    
    // Test DELETE
    results.deleteClient = await testDeleteClient(clientId);
  }
  
  // Test recherche et filtrage
  results.searchFilter = await testSearchAndFilter();
  
  // Test pagination
  results.pagination = await testPagination();
  
  // Résumé
  log('\n📋 RÉSUMÉ DES TESTS CRUD', 'magenta');
  log('=' .repeat(60), 'magenta');
  
  Object.entries(results).forEach(([test, success]) => {
    const status = success ? '✅' : '❌';
    const color = success ? 'green' : 'red';
    log(`${status} ${test.toUpperCase()}: ${success ? 'OK' : 'ÉCHEC'}`, color);
  });
  
  const totalSuccess = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  log(`\n🎯 Score CRUD: ${totalSuccess}/${totalTests} tests réussis`, totalSuccess === totalTests ? 'green' : 'yellow');
  
  if (totalSuccess === totalTests) {
    log('🎉 Toutes les opérations CRUD fonctionnent parfaitement !', 'green');
    log('✅ API clients complètement opérationnelle', 'green');
    log('✅ Recherche et filtrage fonctionnels', 'green');
    log('✅ Pagination implémentée', 'green');
  } else {
    log('⚠️ Certaines opérations CRUD ont échoué', 'yellow');
  }
  
  return results;
}

// Exécution
runCRUDTests().catch(error => {
  log(`💥 Erreur fatale: ${error.message}`, 'red');
  process.exit(1);
});
