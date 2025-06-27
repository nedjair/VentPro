// Test d'authentification et récupération du token
const axios = require('axios');

async function testAuth() {
  try {
    console.log('🔐 Test de connexion...');
    
    const response = await axios.post('http://localhost:3001/api/v1/auth/login', {
      email: 'admin@test.com',
      password: 'password123'
    });

    const data = response.data;
    
    if (data.success && data.data?.tokens?.accessToken) {
      console.log('✅ Connexion réussie');
      console.log('🔑 Token:', data.data.tokens.accessToken);
      
      // Test de l'endpoint clients avec le token
      console.log('\n📋 Test de l\'endpoint clients...');
      
      const clientsResponse = await axios.get('http://localhost:3001/api/v1/clients', {
        headers: {
          'Authorization': `Bearer ${data.data.tokens.accessToken}`,
          'Content-Type': 'application/json',
        }
      });

      const clientsData = clientsResponse.data;
      console.log('📊 Réponse clients:', JSON.stringify(clientsData, null, 2));
      
    } else {
      console.error('❌ Échec de la connexion:', data);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.response) {
      console.error('📋 Status:', error.response.status);
      console.error('📋 Data:', error.response.data);
    }
  }
}

testAuth();
