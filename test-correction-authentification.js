#!/usr/bin/env node

/**
 * Test de la correction d'authentification
 * Vérifie que la création de client fonctionne maintenant
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';

console.log('🧪 TEST DE LA CORRECTION D\'AUTHENTIFICATION\n');

async function testWithAuthentication() {
  console.log('1️⃣ Test avec authentification...');
  
  try {
    // Étape 1: Se connecter
    console.log('🔐 Connexion avec les identifiants de démonstration...');
    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: 'admin@demo-tpe.fr',
      password: 'demo123'
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Échec de la connexion');
    }
    
    const token = loginResponse.data.data.accessToken;
    console.log('✅ Connexion réussie, token obtenu');
    
    // Étape 2: Créer un client de test
    console.log('\n📝 Création d\'un client de test...');
    const clientData = {
      type: 'INDIVIDUAL',
      first_name: 'Test',
      last_name: 'Correction',
      email: 'test.correction@demo.com',
      phone: '+213 555 999 888',
      city: 'Alger'
    };
    
    const createResponse = await axios.post(
      `${API_BASE_URL}/api/v1/clients`,
      clientData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Client créé avec succès:', createResponse.data);
    const clientId = createResponse.data.data.id;
    
    // Étape 3: Vérifier que le client existe
    console.log('\n🔍 Vérification de l\'existence du client...');
    const getResponse = await axios.get(
      `${API_BASE_URL}/api/v1/clients/${clientId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('✅ Client trouvé:', getResponse.data.data.email);
    
    // Étape 4: Supprimer le client de test
    console.log('\n🗑️ Suppression du client de test...');
    await axios.delete(
      `${API_BASE_URL}/api/v1/clients/${clientId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('✅ Client de test supprimé');
    
    return true;
    
  } catch (error) {
    console.log('❌ Erreur:', error.response?.data || error.message);
    return false;
  }
}

async function testFrontendFlow() {
  console.log('\n2️⃣ Test du flux frontend...');
  
  try {
    // Simuler le flux frontend
    console.log('🌐 Test de l\'endpoint frontend...');
    const response = await axios.get('http://localhost:3003/clients');
    
    if (response.status === 200) {
      console.log('✅ Page clients accessible');
    }
    
    // Test de l'API depuis le frontend
    console.log('🔗 Test de l\'API depuis le frontend...');
    const apiResponse = await axios.get('http://localhost:3003/api/clients');
    
    console.log('📊 Réponse API frontend:', apiResponse.status);
    
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('ℹ️  Endpoint frontend API non configuré (normal)');
    } else {
      console.log('⚠️  Erreur frontend:', error.message);
    }
  }
}

async function runTests() {
  console.log('🚀 Démarrage des tests de correction...\n');
  
  const authTestPassed = await testWithAuthentication();
  await testFrontendFlow();
  
  console.log('\n📋 RÉSUMÉ DES TESTS:');
  
  if (authTestPassed) {
    console.log('✅ AUTHENTIFICATION: Fonctionne correctement');
    console.log('✅ CRÉATION CLIENT: Fonctionne avec token');
    console.log('✅ SUPPRESSION CLIENT: Fonctionne avec token');
    console.log('✅ LECTURE CLIENT: Fonctionne avec token');
  } else {
    console.log('❌ AUTHENTIFICATION: Problème détecté');
  }
  
  console.log('\n🎯 CONCLUSION:');
  
  if (authTestPassed) {
    console.log('✅ La correction d\'authentification fonctionne !');
    console.log('🧪 Le formulaire de création client devrait maintenant fonctionner');
    console.log('🔗 Testez sur: http://localhost:3003/clients/new');
    
    console.log('\n📋 ÉTAPES DE TEST MANUEL:');
    console.log('1. Aller sur http://localhost:3003/clients/new');
    console.log('2. Remplir le formulaire (nom, email obligatoires)');
    console.log('3. Cliquer "Sauvegarder"');
    console.log('4. Vérifier la redirection vers /clients');
    console.log('5. Vérifier que le nouveau client apparaît dans la liste');
    
  } else {
    console.log('❌ La correction nécessite des ajustements');
    console.log('🔧 Vérifiez:');
    console.log('   - Que le backend fonctionne');
    console.log('   - Les identifiants de démonstration');
    console.log('   - La configuration de l\'API');
  }
  
  console.log('\n✅ Tests terminés !');
}

// Exécution
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
