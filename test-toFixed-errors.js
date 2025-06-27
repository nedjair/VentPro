#!/usr/bin/env node

/**
 * Script de test pour vérifier les corrections des erreurs toFixed
 * Teste les pages factures et commandes avec des données simulées
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:3003';

// Configuration de test
const testConfig = {
  credentials: {
    email: 'admin@demo-tpe.fr',
    password: 'demo123'
  }
};

let authToken = null;

async function login() {
  try {
    console.log('🔐 Connexion au backend...');
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, testConfig.credentials);
    
    if (response.data.success && response.data.token) {
      authToken = response.data.token;
      console.log('✅ Connexion réussie');
      return true;
    } else {
      throw new Error('Échec de la connexion');
    }
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);
    return false;
  }
}

async function testInvoicesAPI() {
  try {
    console.log('\n🧾 Test de l\'API Factures...');
    const response = await axios.get(`${API_BASE_URL}/api/v1/invoices`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success && response.data.data) {
      const invoices = response.data.data;
      console.log(`✅ ${invoices.length} factures récupérées`);
      
      // Vérifier les types de données
      if (invoices.length > 0) {
        const invoice = invoices[0];
        console.log('📊 Vérification des types de données:');
        console.log(`   - total: ${typeof invoice.total} (${invoice.total})`);
        console.log(`   - subtotal: ${typeof invoice.subtotal} (${invoice.subtotal})`);
        console.log(`   - vatAmount: ${typeof invoice.vatAmount} (${invoice.vatAmount})`);
        
        // Test de conversion Number()
        try {
          const totalFixed = Number(invoice.total).toFixed(2);
          console.log(`   - Number(total).toFixed(2): ${totalFixed} ✅`);
        } catch (error) {
          console.log(`   - Number(total).toFixed(2): ERREUR - ${error.message} ❌`);
        }
      }
      
      return true;
    } else {
      throw new Error('Format de réponse invalide');
    }
  } catch (error) {
    console.error('❌ Erreur API Factures:', error.message);
    return false;
  }
}

async function testOrdersAPI() {
  try {
    console.log('\n📋 Test de l\'API Commandes...');
    const response = await axios.get(`${API_BASE_URL}/api/v1/orders`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success && response.data.data) {
      const orders = response.data.data;
      console.log(`✅ ${orders.length} commandes récupérées`);
      
      // Vérifier les types de données
      if (orders.length > 0) {
        const order = orders[0];
        console.log('📊 Vérification des types de données:');
        console.log(`   - total: ${typeof order.total} (${order.total})`);
        console.log(`   - subtotal: ${typeof order.subtotal} (${order.subtotal})`);
        console.log(`   - vatAmount: ${typeof order.vatAmount} (${order.vatAmount})`);
        
        // Test de conversion Number()
        try {
          const totalFixed = Number(order.total).toFixed(2);
          console.log(`   - Number(total).toFixed(2): ${totalFixed} ✅`);
        } catch (error) {
          console.log(`   - Number(total).toFixed(2): ERREUR - ${error.message} ❌`);
        }
      }
      
      return true;
    } else {
      throw new Error('Format de réponse invalide');
    }
  } catch (error) {
    console.error('❌ Erreur API Commandes:', error.message);
    return false;
  }
}

async function testFrontendAccess() {
  try {
    console.log('\n🌐 Test d\'accès au frontend...');
    const response = await axios.get(FRONTEND_URL, { timeout: 5000 });
    
    if (response.status === 200) {
      console.log('✅ Frontend accessible');
      return true;
    } else {
      throw new Error(`Status: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Erreur d\'accès frontend:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🔧 Test des corrections d\'erreurs toFixed\n');
  
  const results = {
    login: false,
    invoicesAPI: false,
    ordersAPI: false,
    frontendAccess: false
  };

  // Test de connexion
  results.login = await login();
  if (!results.login) {
    console.log('\n❌ Impossible de continuer sans authentification');
    return;
  }

  // Test des APIs
  results.invoicesAPI = await testInvoicesAPI();
  results.ordersAPI = await testOrdersAPI();
  
  // Test d'accès frontend
  results.frontendAccess = await testFrontendAccess();

  // Résumé
  console.log('\n📊 RÉSUMÉ DES TESTS:');
  console.log(`   🔐 Authentification: ${results.login ? '✅' : '❌'}`);
  console.log(`   🧾 API Factures: ${results.invoicesAPI ? '✅' : '❌'}`);
  console.log(`   📋 API Commandes: ${results.ordersAPI ? '✅' : '❌'}`);
  console.log(`   🌐 Frontend: ${results.frontendAccess ? '✅' : '❌'}`);

  const successCount = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Résultat: ${successCount}/${totalTests} tests réussis`);
  
  if (successCount === totalTests) {
    console.log('🎉 Tous les tests sont passés ! Les corrections semblent fonctionner.');
  } else {
    console.log('⚠️  Certains tests ont échoué. Vérifiez les services.');
  }

  console.log('\n📋 PROCHAINES ÉTAPES:');
  console.log('1. Ouvrir http://localhost:3003 dans le navigateur');
  console.log('2. Se connecter avec admin@demo-tpe.fr / demo123');
  console.log('3. Naviguer vers les pages Factures et Commandes');
  console.log('4. Vérifier qu\'il n\'y a plus d\'erreurs toFixed');
}

// Exécution du script
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
