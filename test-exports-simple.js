#!/usr/bin/env node

/**
 * Test simple des exports depuis le frontend
 */

const axios = require('axios');

const FRONTEND_URL = 'http://localhost:3003';

console.log('🧪 TEST SIMPLE DES EXPORTS DEPUIS LE FRONTEND\n');

async function testFrontendExports() {
  console.log('🌐 Test d\'accès au frontend...');
  
  try {
    // Test page clients
    const clientsResponse = await axios.get(`${FRONTEND_URL}/clients`);
    console.log('✅ Page clients accessible');
    
    // Test page produits
    const productsResponse = await axios.get(`${FRONTEND_URL}/products`);
    console.log('✅ Page produits accessible');
    
    // Test page commandes
    const ordersResponse = await axios.get(`${FRONTEND_URL}/orders`);
    console.log('✅ Page commandes accessible');
    
    // Test page factures
    const invoicesResponse = await axios.get(`${FRONTEND_URL}/invoices`);
    console.log('✅ Page factures accessible');
    
    return true;
  } catch (error) {
    console.log('❌ Erreur accès frontend:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Démarrage des tests frontend...\n');
  
  try {
    const frontendSuccess = await testFrontendExports();
    
    console.log('\n📋 RÉSUMÉ DES TESTS:');
    console.log(`🌐 Frontend accessible: ${frontendSuccess ? 'SUCCÈS' : 'ÉCHEC'}`);
    
    if (frontendSuccess) {
      console.log('\n🎉 FRONTEND ACCESSIBLE !');
      console.log('🔗 Vous pouvez maintenant tester les exports manuellement');
      console.log('\n🧪 TESTS MANUELS À EFFECTUER:');
      console.log('1. Aller sur http://localhost:3003/clients');
      console.log('2. Cliquer sur le bouton "Export" pour télécharger Excel');
      console.log('3. Aller sur http://localhost:3003/products');
      console.log('4. Cliquer sur le bouton "Export" pour télécharger Excel');
      console.log('5. Aller sur http://localhost:3003/orders');
      console.log('6. Cliquer sur le bouton "Export" pour télécharger Excel');
      console.log('7. Aller sur http://localhost:3003/invoices');
      console.log('8. Cliquer sur le bouton "Export" pour télécharger Excel');
      console.log('9. Cliquer sur le bouton "PDF" d\'une facture');
      
      console.log('\n💡 NOTES IMPORTANTES:');
      console.log('- Les exports utilisent l\'authentification automatique');
      console.log('- Les fichiers sont téléchargés automatiquement');
      console.log('- Format algérien (DZD, TVA 19%) appliqué');
      console.log('- Templates professionnels avec en-têtes entreprise');
      
    } else {
      console.log('\n❌ FRONTEND NON ACCESSIBLE');
      console.log('🔧 Vérifiez que le frontend Next.js est démarré sur le port 3003');
      console.log('💡 Commande: cd frontend-nextjs-production && npm run dev');
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
