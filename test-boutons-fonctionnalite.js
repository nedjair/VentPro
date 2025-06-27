#!/usr/bin/env node

/**
 * Script de test pour valider la fonctionnalité des boutons
 * Teste tous les boutons dans l'application Gestion Commerciale TPE
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

async function testPageAccess(pagePath, pageName) {
  try {
    const response = await axios.get(`${FRONTEND_URL}${pagePath}`, { timeout: 5000 });
    
    if (response.status === 200) {
      console.log(`✅ ${pageName} accessible`);
      return true;
    } else {
      throw new Error(`Status: ${response.status}`);
    }
  } catch (error) {
    console.error(`❌ Erreur d'accès ${pageName}:`, error.message);
    return false;
  }
}

async function runTests() {
  console.log('🔧 Test de fonctionnalité des boutons - Gestion Commerciale TPE\n');
  
  const results = {
    login: false,
    frontendAccess: false,
    pagesAccess: {
      clients: false,
      products: false,
      orders: false,
      invoices: false,
      reports: false
    }
  };

  // Test de connexion
  results.login = await login();
  if (!results.login) {
    console.log('\n❌ Impossible de continuer sans authentification');
    return;
  }

  // Test d'accès frontend
  results.frontendAccess = await testFrontendAccess();
  if (!results.frontendAccess) {
    console.log('\n❌ Frontend inaccessible');
    return;
  }

  // Test d'accès aux pages principales
  console.log('\n📄 Test d\'accès aux pages principales:');
  const pages = [
    { path: '/clients', name: 'Clients', key: 'clients' },
    { path: '/products', name: 'Produits', key: 'products' },
    { path: '/orders', name: 'Commandes', key: 'orders' },
    { path: '/invoices', name: 'Factures', key: 'invoices' },
    { path: '/reports', name: 'Rapports', key: 'reports' }
  ];

  for (const page of pages) {
    results.pagesAccess[page.key] = await testPageAccess(page.path, page.name);
  }

  // Résumé
  console.log('\n📊 RÉSUMÉ DES TESTS:');
  console.log(`   🔐 Authentification: ${results.login ? '✅' : '❌'}`);
  console.log(`   🌐 Frontend: ${results.frontendAccess ? '✅' : '❌'}`);
  console.log('   📄 Pages:');
  
  Object.entries(results.pagesAccess).forEach(([key, success]) => {
    const pageName = pages.find(p => p.key === key)?.name || key;
    console.log(`      - ${pageName}: ${success ? '✅' : '❌'}`);
  });

  const pagesSuccessCount = Object.values(results.pagesAccess).filter(Boolean).length;
  const totalPages = Object.keys(results.pagesAccess).length;
  
  console.log(`\n🎯 Résultat: ${pagesSuccessCount}/${totalPages} pages accessibles`);
  
  if (pagesSuccessCount === totalPages && results.frontendAccess && results.login) {
    console.log('🎉 Tous les tests d\'accès sont passés !');
  } else {
    console.log('⚠️  Certains tests ont échoué. Vérifiez les services.');
  }

  console.log('\n📋 TESTS MANUELS À EFFECTUER:');
  console.log('\n1. 👥 PAGE CLIENTS (http://localhost:3003/clients):');
  console.log('   ✅ Bouton "Filtres" - doit afficher un message dans la console');
  console.log('   ✅ Bouton "Export" - doit afficher un message dans la console');
  console.log('   ✅ Bouton "Nouveau client" - doit afficher un message dans la console');
  console.log('   ✅ Bouton "Voir" dans le tableau - doit naviguer vers les détails');
  console.log('   ✅ Bouton "Modifier" dans le tableau - doit afficher un message');
  console.log('   ✅ Bouton "Supprimer" dans le tableau - doit demander confirmation');

  console.log('\n2. 📦 PAGE PRODUITS (http://localhost:3003/products):');
  console.log('   ✅ Bouton "Filtres" - doit afficher un message dans la console');
  console.log('   ✅ Bouton "Export" - doit afficher un message dans la console');
  console.log('   ✅ Bouton "Nouveau produit" - doit afficher un message dans la console');
  console.log('   ✅ Bouton "Voir" dans le tableau - doit afficher un message');
  console.log('   ✅ Bouton "Modifier" dans le tableau - doit afficher un message');
  console.log('   ✅ Bouton "Supprimer" dans le tableau - doit demander confirmation');

  console.log('\n3. 📋 PAGE COMMANDES (http://localhost:3003/orders):');
  console.log('   ✅ Bouton "Filtres" - doit afficher un message dans la console');
  console.log('   ✅ Bouton "Export" - doit afficher un message dans la console');
  console.log('   ✅ Bouton "Nouvelle commande" - doit naviguer vers /orders/new');
  console.log('   ✅ Bouton "Voir" dans le tableau - doit naviguer vers /orders/[id]');
  console.log('   ✅ Bouton "Modifier" dans le tableau - doit naviguer vers /orders/[id]/edit');
  console.log('   ✅ Bouton "Supprimer" dans le tableau - doit demander confirmation');

  console.log('\n4. 🧾 PAGE FACTURES (http://localhost:3003/invoices):');
  console.log('   ✅ Bouton "Filtres" - doit afficher un message dans la console');
  console.log('   ✅ Bouton "Export" - doit afficher un message dans la console');
  console.log('   ✅ Bouton "Nouvelle facture" - doit naviguer vers /invoices/new');
  console.log('   ✅ Bouton "Voir" dans le tableau - doit naviguer vers /invoices/[id]');
  console.log('   ✅ Bouton "Modifier" dans le tableau - doit naviguer vers /invoices/[id]/edit');
  console.log('   ✅ Bouton "Supprimer" dans le tableau - doit demander confirmation');

  console.log('\n5. 📊 PAGE RAPPORTS (http://localhost:3003/reports):');
  console.log('   ✅ Bouton "Export global" - doit afficher un message dans la console');
  console.log('   ✅ Bouton "Nouveau rapport" - doit afficher un message dans la console');
  console.log('   ✅ Boutons "Voir les rapports" - doivent naviguer vers les sous-pages');

  console.log('\n6. 📄 PAGES DE DÉTAIL:');
  console.log('   ✅ Boutons "Télécharger PDF" - doivent afficher un message');
  console.log('   ✅ Boutons "Envoyer par email" - doivent afficher un message');
  console.log('   ✅ Boutons "Modifier" - doivent naviguer vers les pages d\'édition');
  console.log('   ✅ Boutons "Retour" - doivent naviguer vers les listes');

  console.log('\n7. 📝 FORMULAIRES:');
  console.log('   ✅ Boutons "Sauvegarder/Créer" - doivent soumettre le formulaire');
  console.log('   ✅ Boutons "Retour" - doivent naviguer vers les listes');
  console.log('   ✅ Pas de double soumission (onClick + type="submit")');

  console.log('\n🔍 COMMENT TESTER:');
  console.log('1. Ouvrir http://localhost:3003 dans le navigateur');
  console.log('2. Se connecter avec admin@demo-tpe.fr / demo123');
  console.log('3. Ouvrir les outils de développement (F12) → Console');
  console.log('4. Naviguer vers chaque page et tester tous les boutons');
  console.log('5. Vérifier les messages dans la console et les navigations');
  console.log('6. Confirmer qu\'aucune erreur JavaScript n\'apparaît');

  console.log('\n🎯 CRITÈRES DE RÉUSSITE:');
  console.log('✅ Tous les boutons répondent aux clics');
  console.log('✅ Les navigations fonctionnent correctement');
  console.log('✅ Les confirmations de suppression s\'affichent');
  console.log('✅ Les messages de console s\'affichent pour les actions TODO');
  console.log('✅ Aucune erreur JavaScript dans la console');
  console.log('✅ Les formulaires se soumettent correctement');
}

// Exécution du script
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
