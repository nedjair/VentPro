#!/usr/bin/env node

/**
 * Diagnostic complet pour identifier le problème persistant avec l'API des fournisseurs
 */

const API_BASE_URL = 'http://localhost:3001';

async function diagnosticComplet() {
  console.log('🔍 DIAGNOSTIC COMPLET DU PROBLÈME PERSISTANT\n');

  try {
    // 1. Vérifier que le serveur backend répond
    console.log('1️⃣ Test de connectivité du serveur backend...');
    try {
      const healthResponse = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Diagnostic-Script/1.0'
        }
      });
      
      console.log(`   📊 Status: ${healthResponse.status}`);
      console.log(`   📝 Status Text: ${healthResponse.statusText}`);
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log('   ✅ Serveur backend accessible');
        console.log(`   📊 Status: ${healthData.status}`);
        console.log(`   ⏱️ Uptime: ${Math.round(healthData.uptime)}s`);
      } else {
        throw new Error(`Serveur non accessible: ${healthResponse.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Erreur de connectivité: ${error.message}`);
      return;
    }

    // 2. Test de l'endpoint suppliers sans authentification
    console.log('\n2️⃣ Test de l\'endpoint suppliers (sans auth)...');
    try {
      const suppliersResponse = await fetch(`${API_BASE_URL}/api/v1/suppliers`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Diagnostic-Script/1.0'
        }
      });
      
      console.log(`   📊 Status: ${suppliersResponse.status}`);
      console.log(`   📝 Status Text: ${suppliersResponse.statusText}`);
      
      // Lire les headers de réponse
      console.log('   📋 Headers de réponse:');
      for (const [key, value] of suppliersResponse.headers.entries()) {
        console.log(`      ${key}: ${value}`);
      }
      
      if (suppliersResponse.status === 401) {
        console.log('   ✅ Authentification requise (comportement normal)');
        const authError = await suppliersResponse.json();
        console.log(`   📝 Message d'erreur: ${authError.message || 'Non spécifié'}`);
      } else if (suppliersResponse.status === 500) {
        console.log('   ❌ ERREUR 500 DÉTECTÉE !');
        const errorText = await suppliersResponse.text();
        console.log(`   📝 Détails de l'erreur: ${errorText}`);
      } else {
        const responseText = await suppliersResponse.text();
        console.log(`   📄 Réponse: ${responseText.substring(0, 200)}...`);
      }
    } catch (error) {
      console.log(`   ❌ Erreur lors de la requête: ${error.message}`);
    }

    // 3. Test avec authentification
    console.log('\n3️⃣ Test avec authentification...');
    try {
      // D'abord, essayer de se connecter
      const loginResponse = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Diagnostic-Script/1.0'
        },
        body: JSON.stringify({
          email: 'admin@test.com',
          password: 'password123'
        })
      });

      console.log(`   📊 Login Status: ${loginResponse.status}`);
      
      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        const token = loginData.data?.token || loginData.token;
        
        if (token) {
          console.log('   ✅ Connexion réussie');
          console.log(`   🔑 Token reçu: ${token.substring(0, 20)}...`);
          
          // Maintenant tester l'API avec le token
          const authSuppliersResponse = await fetch(`${API_BASE_URL}/api/v1/suppliers`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'User-Agent': 'Diagnostic-Script/1.0'
            }
          });
          
          console.log(`   📊 Suppliers Status (avec auth): ${authSuppliersResponse.status}`);
          
          if (authSuppliersResponse.ok) {
            const suppliersData = await authSuppliersResponse.json();
            console.log('   ✅ API fournisseurs fonctionne avec authentification');
            console.log(`   📊 Nombre de fournisseurs: ${suppliersData.data?.suppliers?.length || 0}`);
          } else if (authSuppliersResponse.status === 500) {
            console.log('   ❌ ERREUR 500 AVEC AUTHENTIFICATION !');
            const errorText = await authSuppliersResponse.text();
            console.log(`   📝 Détails: ${errorText}`);
          } else {
            const errorText = await authSuppliersResponse.text();
            console.log(`   ⚠️ Erreur: ${errorText}`);
          }
        } else {
          console.log('   ❌ Token non reçu dans la réponse');
        }
      } else {
        console.log('   ❌ Échec de la connexion');
        const loginError = await loginResponse.text();
        console.log(`   📝 Erreur de login: ${loginError}`);
      }
    } catch (error) {
      console.log(`   ❌ Erreur lors du test d'authentification: ${error.message}`);
    }

    // 4. Test des autres endpoints
    console.log('\n4️⃣ Test des autres endpoints...');
    const endpoints = [
      '/api/v1/products',
      '/api/v1/clients',
      '/api/v1/categories'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Diagnostic-Script/1.0'
          }
        });
        
        console.log(`   ${endpoint}: ${response.status} ${response.statusText}`);
      } catch (error) {
        console.log(`   ${endpoint}: ERREUR - ${error.message}`);
      }
    }

    console.log('\n🎯 DIAGNOSTIC TERMINÉ');
    console.log('📊 Analysez les résultats ci-dessus pour identifier le problème');

  } catch (error) {
    console.error('\n❌ Erreur lors du diagnostic:', error.message);
    process.exit(1);
  }
}

// Exécuter le diagnostic
diagnosticComplet();
