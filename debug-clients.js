// Debug détaillé de l'endpoint clients
const axios = require('axios');

async function debugClients() {
  try {
    console.log('🔐 Connexion...');
    
    // Connexion
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      email: 'admin@test.com',
      password: 'password123'
    });

    if (!loginResponse.data.success) {
      console.error('❌ Échec de la connexion');
      return;
    }

    const token = loginResponse.data.data.tokens.accessToken;
    console.log('✅ Connexion réussie');
    console.log('🔑 Token reçu');
    
    // Décoder le token pour voir son contenu
    const tokenParts = token.split('.');
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    console.log('📋 Payload du token:', JSON.stringify(payload, null, 2));
    
    // Test de l'endpoint clients avec plus de détails
    console.log('\n📋 Test de l\'endpoint clients...');
    
    try {
      const clientsResponse = await axios.get('http://localhost:3001/api/v1/clients', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000
      });

      console.log('✅ Succès! Réponse clients:');
      console.log('📊 Status:', clientsResponse.status);
      console.log('📊 Data:', JSON.stringify(clientsResponse.data, null, 2));
      
    } catch (clientError) {
      console.error('❌ Erreur sur l\'endpoint clients:');
      console.error('📋 Status:', clientError.response?.status);
      console.error('📋 Status Text:', clientError.response?.statusText);
      console.error('📋 Data:', clientError.response?.data);
      console.error('📋 Headers:', clientError.response?.headers);
      
      if (clientError.code) {
        console.error('📋 Error Code:', clientError.code);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
    if (error.response) {
      console.error('📋 Response Status:', error.response.status);
      console.error('📋 Response Data:', error.response.data);
    }
  }
}

debugClients();
