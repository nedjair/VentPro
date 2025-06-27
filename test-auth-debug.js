// Test d'authentification simple pour diagnostiquer le problème
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';
const credentials = {
  email: 'admin@demo-tpe.fr',
  password: 'demo123'
};

console.log('🔍 DIAGNOSTIC D\'AUTHENTIFICATION');
console.log('================================');
console.log(`Backend: ${API_BASE_URL}`);
console.log(`Email: ${credentials.email}`);
console.log('');

async function testAuth() {
  try {
    console.log('📡 Test de connexion au backend...');
    
    // Test 1: Health check
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Backend accessible:', healthResponse.status);
    
    // Test 2: Authentification
    console.log('🔐 Test d\'authentification...');
    const authResponse = await axios.post(`${API_BASE_URL}/auth/login`, credentials, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3003'
      },
      timeout: 10000
    });
    
    console.log('✅ Authentification réussie!');
    console.log('📊 Réponse:', JSON.stringify(authResponse.data, null, 2));
    
    return authResponse.data;
    
  } catch (error) {
    console.log('❌ Erreur d\'authentification:');
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', JSON.stringify(error.response.data, null, 2));
      console.log('   Headers:', error.response.headers);
    } else if (error.request) {
      console.log('   Pas de réponse du serveur');
      console.log('   Request:', error.request);
    } else {
      console.log('   Erreur:', error.message);
    }
    throw error;
  }
}

// Exécuter le test
testAuth()
  .then(() => {
    console.log('');
    console.log('🎉 Test terminé avec succès!');
    process.exit(0);
  })
  .catch(() => {
    console.log('');
    console.log('💥 Test échoué!');
    process.exit(1);
  });
