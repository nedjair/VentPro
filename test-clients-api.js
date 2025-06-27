const axios = require('axios');

async function testClientsAPI() {
  try {
    console.log('🔍 Test de l\'API Clients...');
    
    // 1. Connexion
    console.log('1. Connexion...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@demo-tpe.fr',
      password: 'demo123'
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Échec de la connexion');
    }
    
    const token = loginResponse.data.data.token;
    console.log('✅ Connexion réussie');
    
    // 2. Test route /api/clients
    console.log('2. Test route /api/clients...');
    const clientsResponse = await axios.get('http://localhost:3001/api/clients', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Route /api/clients fonctionne');
    console.log('📊 Nombre de clients:', clientsResponse.data.data.length);
    
    // 3. Test route /clients (alternative)
    console.log('3. Test route /clients...');
    const clientsAltResponse = await axios.get('http://localhost:3001/clients', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Route /clients fonctionne');
    console.log('📊 Données clients:', clientsAltResponse.data.data.data.length);
    
    // 4. Test route /api/v1/clients
    console.log('4. Test route /api/v1/clients...');
    const clientsV1Response = await axios.get('http://localhost:3001/api/v1/clients', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Route /api/v1/clients fonctionne');
    console.log('📊 Nombre de clients v1:', clientsV1Response.data.data.length);
    
    console.log('\n🎉 Tous les tests sont passés !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.response) {
      console.error('📄 Réponse:', error.response.data);
      console.error('🔢 Status:', error.response.status);
    }
  }
}

testClientsAPI();
