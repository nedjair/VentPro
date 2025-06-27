#!/usr/bin/env node

/**
 * Diagnostic de la création de client
 * Teste l'API de création pour identifier le problème
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';

console.log('🔍 DIAGNOSTIC - CRÉATION DE CLIENT\n');

async function testBackendHealth() {
  console.log('1️⃣ Test de santé du backend...');
  try {
    const response = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
    console.log('✅ Backend accessible:', response.status);
    console.log('📊 Réponse:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Backend non accessible:', error.message);
    return false;
  }
}

async function testClientEndpoints() {
  console.log('\n2️⃣ Test des endpoints clients...');
  
  // Test GET /api/v1/clients
  try {
    const response = await axios.get(`${API_BASE_URL}/api/v1/clients`, { timeout: 5000 });
    console.log('✅ GET /api/v1/clients:', response.status);
    console.log('📊 Nombre de clients:', response.data?.data?.length || 0);
  } catch (error) {
    console.log('❌ GET /api/v1/clients échoué:', error.response?.status || error.message);
    if (error.response?.data) {
      console.log('📊 Détails erreur:', error.response.data);
    }
  }
}

async function testClientCreation() {
  console.log('\n3️⃣ Test de création de client...');
  
  const testClients = [
    {
      name: 'Test Particulier',
      data: {
        type: 'INDIVIDUAL',
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean.dupont@test.com',
        phone: '+213 555 123 456',
        address: '123 Rue de la Paix',
        city: 'Alger',
        postalCode: '16000',
        country: 'Algérie'
      }
    },
    {
      name: 'Test Entreprise',
      data: {
        type: 'COMPANY',
        companyName: 'Test SARL',
        email: 'contact@test-sarl.dz',
        phone: '+213 555 789 012',
        address: '456 Boulevard Mohamed V',
        city: 'Oran',
        postalCode: '31000',
        country: 'Algérie'
      }
    }
  ];

  for (const testClient of testClients) {
    console.log(`\n🧪 Test: ${testClient.name}`);
    console.log('📤 Données envoyées:', JSON.stringify(testClient.data, null, 2));
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/clients`,
        testClient.data,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      console.log('✅ Création réussie:', response.status);
      console.log('📊 Client créé:', response.data);
      
      // Tenter de supprimer le client de test
      if (response.data?.data?.id) {
        try {
          await axios.delete(`${API_BASE_URL}/api/v1/clients/${response.data.data.id}`);
          console.log('🧹 Client de test supprimé');
        } catch (deleteError) {
          console.log('⚠️  Impossible de supprimer le client de test');
        }
      }
      
    } catch (error) {
      console.log('❌ Création échouée:', error.response?.status || error.message);
      
      if (error.response?.data) {
        console.log('📊 Détails erreur:', JSON.stringify(error.response.data, null, 2));
      }
      
      if (error.response?.status === 400) {
        console.log('🔍 Erreur de validation - Vérifiez les champs requis');
      } else if (error.response?.status === 500) {
        console.log('🔍 Erreur serveur - Vérifiez la base de données');
      } else if (error.code === 'ECONNREFUSED') {
        console.log('🔍 Connexion refusée - Backend non démarré');
      }
    }
  }
}

async function testDatabaseConnection() {
  console.log('\n4️⃣ Test de connexion base de données...');
  
  try {
    // Tenter d'accéder à un endpoint qui nécessite la DB
    const response = await axios.get(`${API_BASE_URL}/api/v1/clients`, { timeout: 5000 });
    console.log('✅ Base de données accessible');
    return true;
  } catch (error) {
    if (error.response?.status === 500) {
      console.log('❌ Erreur de base de données');
      console.log('📊 Détails:', error.response.data);
      return false;
    } else if (error.response?.status === 404) {
      console.log('❌ Endpoint non trouvé - Vérifiez les routes');
      return false;
    } else {
      console.log('❌ Erreur inconnue:', error.message);
      return false;
    }
  }
}

async function testCORS() {
  console.log('\n5️⃣ Test CORS...');
  
  try {
    const response = await axios.options(`${API_BASE_URL}/api/v1/clients`, {
      headers: {
        'Origin': 'http://localhost:3003',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    console.log('✅ CORS configuré:', response.status);
    console.log('📊 Headers CORS:', response.headers);
  } catch (error) {
    console.log('❌ Problème CORS:', error.message);
    console.log('🔍 Vérifiez la configuration CORS du backend');
  }
}

async function runDiagnostic() {
  console.log('🚀 Démarrage du diagnostic...\n');
  
  const backendOk = await testBackendHealth();
  
  if (!backendOk) {
    console.log('\n🚨 PROBLÈME CRITIQUE: Backend non accessible');
    console.log('🔧 Solutions:');
    console.log('   1. Vérifiez que le backend est démarré');
    console.log('   2. Vérifiez le port 3001');
    console.log('   3. Redémarrez le backend si nécessaire');
    return;
  }
  
  await testClientEndpoints();
  await testDatabaseConnection();
  await testCORS();
  await testClientCreation();
  
  console.log('\n📋 RÉSUMÉ DU DIAGNOSTIC:');
  console.log('1. Vérifiez les logs ci-dessus pour identifier les erreurs');
  console.log('2. Si erreur 400: problème de validation des données');
  console.log('3. Si erreur 500: problème de base de données');
  console.log('4. Si erreur CORS: problème de configuration');
  console.log('5. Si création réussie: problème côté frontend');
  
  console.log('\n🔧 SOLUTIONS POSSIBLES:');
  console.log('- Vérifier les champs requis dans le formulaire');
  console.log('- Vérifier la validation côté backend');
  console.log('- Vérifier la configuration de la base de données');
  console.log('- Vérifier les headers HTTP');
  console.log('- Vérifier la gestion d\'erreurs côté frontend');
  
  console.log('\n✅ Diagnostic terminé !');
}

// Exécution
if (require.main === module) {
  runDiagnostic().catch(console.error);
}

module.exports = { runDiagnostic };
