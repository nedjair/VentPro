#!/usr/bin/env node

/**
 * Test direct de l'API des fournisseurs pour identifier le problème
 */

const API_BASE_URL = 'http://localhost:3001';

async function testSuppliersAPI() {
  console.log('🔍 TEST DIRECT DE L\'API FOURNISSEURS\n');

  try {
    // 1. Test de santé
    console.log('1️⃣ Vérification du serveur...');
    const healthResponse = await fetch(`${API_BASE_URL}/health`);
    
    if (healthResponse.ok) {
      console.log('   ✅ Serveur accessible');
    } else {
      throw new Error(`Serveur non accessible: ${healthResponse.status}`);
    }

    // 2. Test de l'endpoint suppliers sans auth (doit retourner 401)
    console.log('\n2️⃣ Test endpoint suppliers sans authentification...');
    const noAuthResponse = await fetch(`${API_BASE_URL}/api/v1/suppliers`);
    console.log(`   📊 Status: ${noAuthResponse.status}`);
    
    if (noAuthResponse.status === 401) {
      console.log('   ✅ Authentification requise (normal)');
    } else if (noAuthResponse.status === 500) {
      console.log('   ❌ ERREUR 500 DÉTECTÉE !');
      const errorText = await noAuthResponse.text();
      console.log(`   📝 Erreur: ${errorText}`);
      return; // Arrêter ici si erreur 500
    }

    // 3. Tentative de connexion
    console.log('\n3️⃣ Tentative de connexion...');
    const loginResponse = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@test.com',
        password: 'password123'
      })
    });

    console.log(`   📊 Login Status: ${loginResponse.status}`);
    
    if (loginResponse.status === 500) {
      console.log('   ❌ ERREUR 500 SUR LOGIN !');
      const errorText = await loginResponse.text();
      console.log(`   📝 Erreur: ${errorText}`);
      return;
    } else if (loginResponse.status === 404) {
      console.log('   ⚠️ Endpoint de login non trouvé - vérifier les routes');
      return;
    } else if (!loginResponse.ok) {
      console.log('   ⚠️ Échec de connexion - probablement pas d\'utilisateur admin');
      const errorText = await loginResponse.text();
      console.log(`   📝 Détails: ${errorText}`);
      
      // Continuer quand même pour tester l'endpoint suppliers
      console.log('\n4️⃣ Test de l\'endpoint suppliers sans token valide...');
      const testResponse = await fetch(`${API_BASE_URL}/api/v1/suppliers`, {
        headers: {
          'Authorization': 'Bearer fake-token'
        }
      });
      
      console.log(`   📊 Status avec fake token: ${testResponse.status}`);
      
      if (testResponse.status === 500) {
        console.log('   ❌ ERREUR 500 AVEC FAKE TOKEN !');
        const errorText = await testResponse.text();
        console.log(`   📝 Erreur: ${errorText}`);
      } else {
        console.log('   ✅ Pas d\'erreur 500 avec fake token');
      }
      
      return;
    }

    // 4. Si login réussi, tester avec token
    const loginData = await loginResponse.json();
    const token = loginData.data?.token || loginData.token;
    
    if (token) {
      console.log('   ✅ Connexion réussie');
      
      console.log('\n4️⃣ Test avec authentification valide...');
      const authResponse = await fetch(`${API_BASE_URL}/api/v1/suppliers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`   📊 Status avec auth: ${authResponse.status}`);
      
      if (authResponse.status === 500) {
        console.log('   ❌ ERREUR 500 AVEC AUTHENTIFICATION !');
        const errorText = await authResponse.text();
        console.log(`   📝 Erreur: ${errorText}`);
      } else if (authResponse.ok) {
        const data = await authResponse.json();
        console.log('   ✅ API fournisseurs fonctionne !');
        console.log(`   📊 Fournisseurs trouvés: ${data.data?.suppliers?.length || 0}`);
      } else {
        console.log(`   ⚠️ Erreur ${authResponse.status}`);
        const errorText = await authResponse.text();
        console.log(`   📝 Détails: ${errorText}`);
      }
    }

    console.log('\n🎯 TEST TERMINÉ');

  } catch (error) {
    console.error('\n❌ Erreur lors du test:', error.message);
  }
}

// Exécuter le test
testSuppliersAPI();
