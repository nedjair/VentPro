#!/usr/bin/env node

/**
 * Test simple d'authentification et création de client
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';

async function testSimple() {
  console.log('🧪 TEST SIMPLE D\'AUTHENTIFICATION\n');
  
  try {
    // 1. Test de connexion
    console.log('1️⃣ Test de connexion...');
    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: 'admin@demo-tpe.fr',
      password: 'demo123'
    }, { timeout: 5000 });
    
    console.log('✅ Connexion réussie');
    console.log('📊 Structure de la réponse:', JSON.stringify(loginResponse.data, null, 2));
    
    const token = loginResponse.data.data.token;
    console.log('🔑 Token obtenu:', token ? 'OUI' : 'NON');
    
    if (!token) {
      throw new Error('Pas de token dans la réponse');
    }
    
    // 2. Test de création de client
    console.log('\n2️⃣ Test de création de client...');
    const clientData = {
      type: 'INDIVIDUAL',
      first_name: 'Test',
      last_name: 'Simple',
      email: 'test.simple@demo.com',
      phone: '+213 555 111 222',
      city: 'Alger'
    };
    
    const createResponse = await axios.post(
      `${API_BASE_URL}/api/v1/clients`,
      clientData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );
    
    console.log('✅ Client créé avec succès');
    console.log('📊 Client créé:', createResponse.data.data);
    
    const clientId = createResponse.data.data.id;
    
    // 3. Nettoyer - supprimer le client de test
    console.log('\n3️⃣ Nettoyage...');
    await axios.delete(
      `${API_BASE_URL}/api/v1/clients/${clientId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 5000
      }
    );
    
    console.log('✅ Client de test supprimé');
    
    console.log('\n🎉 SUCCÈS: L\'authentification et la création de client fonctionnent !');
    console.log('🔗 Vous pouvez maintenant tester sur: http://localhost:3003/clients/new');
    
  } catch (error) {
    console.log('\n❌ ERREUR:', error.message);
    
    if (error.response) {
      console.log('📊 Status:', error.response.status);
      console.log('📊 Données:', JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.log('🔧 Solution: Vérifiez que le backend fonctionne sur le port 3001');
    }
  }
}

testSimple();
