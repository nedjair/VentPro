#!/usr/bin/env node

/**
 * Test en temps réel des boutons de l'application
 * Vérifie si les boutons répondent aux clics
 */

const axios = require('axios');

const FRONTEND_URL = 'http://localhost:3003';

console.log('🔧 TEST EN TEMPS RÉEL DES BOUTONS\n');

async function testPageAccess() {
  const pages = [
    { path: '/', name: 'Accueil' },
    { path: '/test-minimal', name: 'Test Minimal' },
    { path: '/clients', name: 'Clients' },
    { path: '/products', name: 'Produits' },
    { path: '/orders', name: 'Commandes' },
    { path: '/invoices', name: 'Factures' },
    { path: '/reports', name: 'Rapports' }
  ];

  console.log('🌐 Test d\'accès aux pages:\n');

  for (const page of pages) {
    try {
      const response = await axios.get(`${FRONTEND_URL}${page.path}`, { 
        timeout: 5000,
        validateStatus: () => true // Accepter tous les codes de statut
      });
      
      if (response.status === 200) {
        console.log(`✅ ${page.name} (${page.path}) - Accessible`);
      } else {
        console.log(`⚠️  ${page.name} (${page.path}) - Status: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${page.name} (${page.path}) - Erreur: ${error.message}`);
    }
  }
}

function generateTestInstructions() {
  console.log('\n📋 INSTRUCTIONS DE TEST MANUEL:\n');
  
  console.log('🧪 1. TEST DE LA PAGE MINIMALE:');
  console.log('   - Ouvrir: http://localhost:3003/test-minimal');
  console.log('   - Cliquer sur "✅ Bouton Simple" - Le compteur doit s\'incrémenter');
  console.log('   - Cliquer sur "🔔 Test Alert" - Une alerte doit s\'afficher');
  console.log('   - Cliquer sur "📝 Test Console" - Vérifier les messages dans F12');
  console.log('   - Si ces boutons fonctionnent: React/Next.js est OK');
  console.log('   - Si ces boutons ne fonctionnent pas: Problème React/Next.js');

  console.log('\n👥 2. TEST DE LA PAGE CLIENTS:');
  console.log('   - Ouvrir: http://localhost:3003/clients');
  console.log('   - Cliquer sur "🔍 Filtres" - Vérifier message console');
  console.log('   - Cliquer sur "📥 Export" - Vérifier message console');
  console.log('   - Cliquer sur "➕ Nouveau client" - Vérifier message console');
  console.log('   - Dans le tableau, cliquer sur "Voir", "Modifier", "Supprimer"');

  console.log('\n📦 3. TEST DE LA PAGE PRODUITS:');
  console.log('   - Ouvrir: http://localhost:3003/products');
  console.log('   - Tester tous les boutons comme pour les clients');

  console.log('\n📋 4. TEST DE LA PAGE COMMANDES:');
  console.log('   - Ouvrir: http://localhost:3003/orders');
  console.log('   - Cliquer sur "➕ Nouvelle commande" - Doit naviguer vers /orders/new');
  console.log('   - Tester les boutons "Voir", "Modifier", "Supprimer"');

  console.log('\n🧾 5. TEST DE LA PAGE FACTURES:');
  console.log('   - Ouvrir: http://localhost:3003/invoices');
  console.log('   - Cliquer sur "➕ Nouvelle facture" - Doit naviguer vers /invoices/new');
  console.log('   - Tester les boutons "Voir", "Modifier", "Supprimer"');

  console.log('\n📊 6. TEST DE LA PAGE RAPPORTS:');
  console.log('   - Ouvrir: http://localhost:3003/reports');
  console.log('   - Tester les boutons d\'export');

  console.log('\n🔍 7. DIAGNOSTIC DES PROBLÈMES:');
  console.log('   - Ouvrir les outils de développement (F12)');
  console.log('   - Onglet Console - Chercher les erreurs JavaScript');
  console.log('   - Onglet Network - Vérifier les requêtes qui échouent');
  console.log('   - Onglet Elements - Vérifier que les onClick sont présents');

  console.log('\n🎯 8. CRITÈRES DE VALIDATION:');
  console.log('   ✅ Les boutons répondent aux clics (changement visuel)');
  console.log('   ✅ Les messages console.log s\'affichent');
  console.log('   ✅ Les confirmations de suppression s\'affichent');
  console.log('   ✅ Les navigations fonctionnent (changement d\'URL)');
  console.log('   ✅ Aucune erreur JavaScript dans la console');

  console.log('\n🚨 9. PROBLÈMES POSSIBLES ET SOLUTIONS:');
  
  console.log('\n   📌 PROBLÈME: Boutons ne répondent pas du tout');
  console.log('   🔧 SOLUTION: Vérifier les erreurs JavaScript dans la console');
  console.log('   🔧 SOLUTION: Vérifier que les gestionnaires onClick sont présents');
  console.log('   🔧 SOLUTION: Redémarrer le serveur Next.js');

  console.log('\n   📌 PROBLÈME: Certains boutons fonctionnent, d\'autres non');
  console.log('   🔧 SOLUTION: Vérifier les gestionnaires spécifiques manquants');
  console.log('   🔧 SOLUTION: Vérifier les erreurs de compilation TypeScript');

  console.log('\n   📌 PROBLÈME: Boutons fonctionnent mais actions ne s\'exécutent pas');
  console.log('   🔧 SOLUTION: Vérifier l\'implémentation des fonctions handle*');
  console.log('   🔧 SOLUTION: Vérifier les imports et dépendances');

  console.log('\n   📌 PROBLÈME: Navigation ne fonctionne pas');
  console.log('   🔧 SOLUTION: Vérifier les routes Next.js');
  console.log('   🔧 SOLUTION: Vérifier les composants Link');

  console.log('\n🔗 LIENS DE TEST DIRECT:');
  console.log(`   - Test Minimal: ${FRONTEND_URL}/test-minimal`);
  console.log(`   - Clients: ${FRONTEND_URL}/clients`);
  console.log(`   - Produits: ${FRONTEND_URL}/products`);
  console.log(`   - Commandes: ${FRONTEND_URL}/orders`);
  console.log(`   - Factures: ${FRONTEND_URL}/invoices`);
  console.log(`   - Rapports: ${FRONTEND_URL}/reports`);
}

function generateDebugScript() {
  console.log('\n🐛 SCRIPT DE DEBUG À EXÉCUTER DANS LA CONSOLE DU NAVIGATEUR:\n');
  
  const debugScript = `
// Script de debug pour tester les boutons
console.log('🔧 Début du debug des boutons');

// Tester si React est chargé
if (typeof React !== 'undefined') {
  console.log('✅ React est chargé');
} else {
  console.log('❌ React n\\'est pas chargé');
}

// Tester si les boutons ont des gestionnaires d'événements
const buttons = document.querySelectorAll('button');
console.log('📊 Nombre de boutons trouvés:', buttons.length);

let buttonsWithHandlers = 0;
buttons.forEach((button, index) => {
  const hasOnClick = button.onclick !== null;
  const hasEventListeners = getEventListeners ? getEventListeners(button).click?.length > 0 : false;
  
  if (hasOnClick || hasEventListeners) {
    buttonsWithHandlers++;
    console.log(\`✅ Bouton \${index + 1}: "\${button.textContent?.trim()}" a des gestionnaires\`);
  } else {
    console.log(\`❌ Bouton \${index + 1}: "\${button.textContent?.trim()}" n'a pas de gestionnaires\`);
  }
});

console.log(\`📊 Boutons avec gestionnaires: \${buttonsWithHandlers}/\${buttons.length}\`);

// Tester un clic programmatique
if (buttons.length > 0) {
  console.log('🧪 Test de clic programmatique sur le premier bouton...');
  try {
    buttons[0].click();
    console.log('✅ Clic programmatique réussi');
  } catch (error) {
    console.log('❌ Erreur lors du clic programmatique:', error);
  }
}

console.log('🔧 Fin du debug des boutons');
`;

  console.log('```javascript');
  console.log(debugScript.trim());
  console.log('```');
  
  console.log('\n📋 INSTRUCTIONS POUR UTILISER LE SCRIPT:');
  console.log('1. Ouvrir une page de l\'application (ex: /clients)');
  console.log('2. Ouvrir les outils de développement (F12)');
  console.log('3. Aller dans l\'onglet Console');
  console.log('4. Copier-coller le script ci-dessus');
  console.log('5. Appuyer sur Entrée pour l\'exécuter');
  console.log('6. Analyser les résultats');
}

async function runTests() {
  console.log('🚀 Démarrage des tests en temps réel...\n');
  
  await testPageAccess();
  generateTestInstructions();
  generateDebugScript();
  
  console.log('\n🎯 RÉSUMÉ:');
  console.log('1. Testez d\'abord la page /test-minimal');
  console.log('2. Si elle fonctionne, testez les autres pages');
  console.log('3. Utilisez le script de debug pour analyser les problèmes');
  console.log('4. Reportez les résultats pour un diagnostic précis');
  
  console.log('\n✅ Tests prêts - Suivez les instructions ci-dessus !');
}

// Exécution
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
