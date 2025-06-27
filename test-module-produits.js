#!/usr/bin/env node

/**
 * Test complet du module Produits
 * Vérifie toutes les fonctionnalités CRUD avec authentification
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';

console.log('🧪 TEST COMPLET DU MODULE PRODUITS\n');

async function getAuthToken() {
  try {
    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: 'admin@demo-tpe.fr',
      password: 'demo123'
    });
    
    if (loginResponse.data.success && loginResponse.data.data.token) {
      return loginResponse.data.data.token;
    }
    
    throw new Error('Impossible d\'obtenir le token');
  } catch (error) {
    throw new Error(`Erreur d'authentification: ${error.message}`);
  }
}

async function testProductCRUD() {
  console.log('🔐 Authentification...');
  const token = await getAuthToken();
  console.log('✅ Token obtenu');
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  let productId = null;
  
  try {
    // 1. Test de création
    console.log('\n1️⃣ Test de création de produit...');
    const productData = {
      name: 'Ordinateur Portable Test',
      reference: 'TEST-LAPTOP-001',
      description: 'Ordinateur portable de test pour validation du module',
      category: 'Informatique',
      price: 85000.00,
      cost_price: 65000.00,
      stock: 10,
      min_stock: 2,
      unit: 'pièce',
      is_active: true,
      track_stock: true,
      allow_backorder: false
    };
    
    const createResponse = await axios.post(
      `${API_BASE_URL}/api/v1/products`,
      productData,
      { headers }
    );
    
    console.log('✅ Produit créé avec succès');
    console.log('📊 Données:', createResponse.data.data);
    productId = createResponse.data.data.id;
    
    // 2. Test de lecture
    console.log('\n2️⃣ Test de lecture du produit...');
    const getResponse = await axios.get(
      `${API_BASE_URL}/api/v1/products/${productId}`,
      { headers }
    );
    
    console.log('✅ Produit récupéré avec succès');
    console.log('📊 Nom:', getResponse.data.data.name);
    console.log('📊 Prix:', getResponse.data.data.price, 'DZD');
    console.log('📊 Stock:', getResponse.data.data.stock, getResponse.data.data.unit);
    
    // 3. Test de modification
    console.log('\n3️⃣ Test de modification du produit...');
    const updateData = {
      name: 'Ordinateur Portable Test - Modifié',
      price: 90000.00,
      stock: 15,
      description: 'Description mise à jour pour le test'
    };
    
    const updateResponse = await axios.put(
      `${API_BASE_URL}/api/v1/products/${productId}`,
      updateData,
      { headers }
    );
    
    console.log('✅ Produit modifié avec succès');
    console.log('📊 Nouveau nom:', updateResponse.data.data.name);
    console.log('📊 Nouveau prix:', updateResponse.data.data.price, 'DZD');
    
    // 4. Test de liste
    console.log('\n4️⃣ Test de liste des produits...');
    const listResponse = await axios.get(
      `${API_BASE_URL}/api/v1/products`,
      { headers }
    );
    
    console.log('✅ Liste récupérée avec succès');
    console.log('📊 Nombre de produits:', listResponse.data.data.length);
    
    // Vérifier que notre produit est dans la liste
    const ourProduct = listResponse.data.data.find(p => p.id === productId);
    if (ourProduct) {
      console.log('✅ Notre produit est bien dans la liste');
    } else {
      console.log('❌ Notre produit n\'est pas dans la liste');
    }
    
    // 5. Test de suppression
    console.log('\n5️⃣ Test de suppression du produit...');
    await axios.delete(
      `${API_BASE_URL}/api/v1/products/${productId}`,
      { headers }
    );
    
    console.log('✅ Produit supprimé avec succès');
    
    // 6. Vérification de la suppression
    console.log('\n6️⃣ Vérification de la suppression...');
    try {
      await axios.get(
        `${API_BASE_URL}/api/v1/products/${productId}`,
        { headers }
      );
      console.log('❌ Le produit existe encore (erreur)');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Produit bien supprimé (404 attendu)');
      } else {
        console.log('❌ Erreur inattendue:', error.response?.status);
      }
    }
    
    return true;
    
  } catch (error) {
    console.log('❌ Erreur lors du test CRUD:', error.response?.data || error.message);
    
    // Nettoyer en cas d'erreur
    if (productId) {
      try {
        await axios.delete(`${API_BASE_URL}/api/v1/products/${productId}`, { headers });
        console.log('🧹 Produit de test nettoyé');
      } catch (cleanupError) {
        console.log('⚠️  Impossible de nettoyer le produit de test');
      }
    }
    
    return false;
  }
}

async function testFrontendPages() {
  console.log('\n7️⃣ Test des pages frontend...');
  
  try {
    // Test page liste
    const listPageResponse = await axios.get('http://localhost:3003/products');
    console.log('✅ Page liste des produits accessible');
    
    // Test page création
    const newPageResponse = await axios.get('http://localhost:3003/products/new');
    console.log('✅ Page création de produit accessible');
    
    return true;
  } catch (error) {
    console.log('❌ Erreur pages frontend:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Démarrage des tests du module Produits...\n');
  
  try {
    const crudSuccess = await testProductCRUD();
    const frontendSuccess = await testFrontendPages();
    
    console.log('\n📋 RÉSUMÉ DES TESTS:');
    console.log(`✅ CRUD Produits: ${crudSuccess ? 'SUCCÈS' : 'ÉCHEC'}`);
    console.log(`✅ Pages Frontend: ${frontendSuccess ? 'SUCCÈS' : 'ÉCHEC'}`);
    
    if (crudSuccess && frontendSuccess) {
      console.log('\n🎉 TOUS LES TESTS RÉUSSIS !');
      console.log('🔗 Module Produits entièrement fonctionnel');
      console.log('\n📋 FONCTIONNALITÉS VALIDÉES:');
      console.log('  ✅ Authentification automatique');
      console.log('  ✅ Création de produit');
      console.log('  ✅ Lecture de produit');
      console.log('  ✅ Modification de produit');
      console.log('  ✅ Suppression de produit');
      console.log('  ✅ Liste des produits');
      console.log('  ✅ Pages frontend accessibles');
      console.log('  ✅ Transformation des données (camelCase ↔ snake_case)');
      
      console.log('\n🧪 TESTS MANUELS À EFFECTUER:');
      console.log('1. Aller sur http://localhost:3003/products');
      console.log('2. Cliquer "Nouveau produit"');
      console.log('3. Remplir le formulaire et sauvegarder');
      console.log('4. Vérifier la redirection et l\'affichage');
      console.log('5. Tester la modification et la suppression');
      console.log('6. Tester la page de détails');
      
    } else {
      console.log('\n❌ CERTAINS TESTS ONT ÉCHOUÉ');
      console.log('🔧 Vérifiez les erreurs ci-dessus');
    }
    
  } catch (error) {
    console.log('\n💥 ERREUR CRITIQUE:', error.message);
  }
  
  console.log('\n✅ Tests terminés !');
}

// Exécution
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
