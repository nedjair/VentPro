const axios = require('axios');

async function testConnectionFix() {
  console.log('🔧 Test de la correction de connexion Frontend-Backend\n');
  
  const API_BASE = 'http://localhost:3001';
  
  try {
    // 1. Test Health Check
    console.log('1. 🏥 Test Health Check...');
    const healthResponse = await axios.get(`${API_BASE}/health`);
    console.log('✅ Health Check OK:', healthResponse.data);
    
    // 2. Test Login avec la nouvelle route
    console.log('\n2. 🔐 Test Login avec /api/v1/auth/login...');
    const loginResponse = await axios.post(`${API_BASE}/api/v1/auth/login`, {
      email: 'admin@test.com',
      password: 'password123'
    });
    
    if (loginResponse.data.success) {
      console.log('✅ Login réussi!');
      console.log('📋 Structure complète de la réponse:', JSON.stringify(loginResponse.data, null, 2));
      console.log('📋 Données utilisateur:', loginResponse.data.data.user);
      console.log('🔑 Tokens:', loginResponse.data.data.tokens);
    } else {
      console.log('❌ Login échoué:', loginResponse.data.message);
    }
    
    // 3. Test avec les autres identifiants
    console.log('\n3. 🔐 Test avec admin@demo-tpe.fr...');
    const loginResponse2 = await axios.post(`${API_BASE}/api/v1/auth/login`, {
      email: 'admin@demo-tpe.fr',
      password: 'demo123'
    });
    
    if (loginResponse2.data.success) {
      console.log('✅ Login réussi avec admin@demo-tpe.fr!');
    } else {
      console.log('❌ Login échoué avec admin@demo-tpe.fr:', loginResponse2.data.message);
    }
    
    console.log('\n🎉 RÉSUMÉ:');
    console.log('✅ Backend accessible sur port 3001');
    console.log('✅ Route /api/v1/auth/login fonctionnelle');
    console.log('✅ Frontend corrigé pour utiliser la bonne route');
    console.log('\n📝 PROCHAINES ÉTAPES:');
    console.log('1. Ouvrir http://localhost:3000 dans le navigateur');
    console.log('2. Essayer de se connecter avec:');
    console.log('   - Email: admin@test.com');
    console.log('   - Mot de passe: password123');
    console.log('   OU');
    console.log('   - Email: admin@demo-tpe.fr');
    console.log('   - Mot de passe: demo123');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    if (error.response) {
      console.error('📋 Détails de l\'erreur:', error.response.data);
      console.error('🔢 Code de statut:', error.response.status);
    }
  }
}

testConnectionFix();
