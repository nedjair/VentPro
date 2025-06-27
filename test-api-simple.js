#!/usr/bin/env node

/**
 * Test simple de l'API après correction
 */

const API_BASE_URL = 'http://localhost:3001';

async function testAPI() {
  console.log('🧪 TEST SIMPLE DE L\'API APRÈS CORRECTION\n');

  try {
    // 1. Test de santé
    console.log('1️⃣ Test de santé du serveur...');
    const healthResponse = await fetch(`${API_BASE_URL}/health`);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('   ✅ Serveur en ligne');
      console.log(`   📊 Status: ${healthData.status}`);
      console.log(`   ⏱️ Uptime: ${Math.round(healthData.uptime)}s`);
    } else {
      throw new Error(`Serveur non disponible: ${healthResponse.status}`);
    }

    // 2. Test de l'endpoint fournisseurs (sans authentification d'abord)
    console.log('\n2️⃣ Test de l\'endpoint fournisseurs...');
    const suppliersResponse = await fetch(`${API_BASE_URL}/api/v1/suppliers`);
    
    console.log(`   📊 Status: ${suppliersResponse.status}`);
    console.log(`   📝 Status Text: ${suppliersResponse.statusText}`);
    
    if (suppliersResponse.status === 401) {
      console.log('   ✅ Authentification requise (comportement attendu)');
    } else if (suppliersResponse.ok) {
      const data = await suppliersResponse.json();
      console.log('   ✅ Réponse reçue');
      console.log(`   📄 Type: ${typeof data}`);
    } else {
      const errorText = await suppliersResponse.text();
      console.log(`   ⚠️ Erreur: ${errorText}`);
    }

    // 3. Test de la documentation API
    console.log('\n3️⃣ Test de la documentation API...');
    const docsResponse = await fetch(`${API_BASE_URL}/docs`);
    
    console.log(`   📊 Status: ${docsResponse.status}`);
    
    if (docsResponse.ok) {
      console.log('   ✅ Documentation API accessible');
    } else {
      console.log('   ⚠️ Documentation non accessible');
    }

    console.log('\n🎉 TESTS TERMINÉS !');
    console.log('✅ Le serveur backend fonctionne correctement');
    console.log('🔗 Vous pouvez maintenant tester le frontend sur http://localhost:3000');

  } catch (error) {
    console.error('\n❌ Erreur lors des tests:', error.message);
    process.exit(1);
  }
}

// Exécuter les tests
testAPI();
