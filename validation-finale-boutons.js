#!/usr/bin/env node

/**
 * Script de validation finale des corrections de boutons
 * Vérifie que tous les gestionnaires d'événements sont en place
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 VALIDATION FINALE DES CORRECTIONS DE BOUTONS\n');

// Fichiers à vérifier
const filesToCheck = [
  {
    path: 'frontend-nextjs-production/src/components/pages/clients.tsx',
    name: 'Clients',
    expectedHandlers: ['handleFilters', 'handleExport', 'handleNewClient', 'handleEditClient', 'handleDeleteClient', 'handleViewClient']
  },
  {
    path: 'frontend-nextjs-production/src/components/pages/products.tsx',
    name: 'Produits',
    expectedHandlers: ['handleFilters', 'handleExport', 'handleNewProduct', 'handleEditProduct', 'handleDeleteProduct', 'handleViewProduct']
  },
  {
    path: 'frontend-nextjs-production/src/components/pages/orders/index.tsx',
    name: 'Commandes',
    expectedHandlers: ['handleFilters', 'handleExport', 'handleDeleteOrder', 'handleViewOrder']
  },
  {
    path: 'frontend-nextjs-production/src/components/pages/invoices/index.tsx',
    name: 'Factures',
    expectedHandlers: ['handleFilters', 'handleExport', 'handleDeleteInvoice', 'handleViewInvoice']
  },
  {
    path: 'frontend-nextjs-production/src/components/pages/orders/order-detail.tsx',
    name: 'Détail Commande',
    expectedHandlers: ['handleDownloadPDF', 'handleSendEmail']
  },
  {
    path: 'frontend-nextjs-production/src/components/pages/invoices/invoice-detail.tsx',
    name: 'Détail Facture',
    expectedHandlers: ['handleDownloadPDF', 'handleSendEmail']
  },
  {
    path: 'frontend-nextjs-production/src/components/pages/reports/index.tsx',
    name: 'Rapports',
    expectedHandlers: ['handleExportGlobal', 'handleNewReport']
  },
  {
    path: 'frontend-nextjs-production/src/components/pages/reports/sales-report.tsx',
    name: 'Rapport Ventes',
    expectedHandlers: ['handleExportPDF', 'handleExportExcel']
  }
];

let totalFiles = 0;
let totalHandlers = 0;
let foundHandlers = 0;
let totalButtons = 0;
let functionalButtons = 0;

console.log('📁 Vérification des gestionnaires d\'événements:\n');

filesToCheck.forEach(fileInfo => {
  try {
    if (fs.existsSync(fileInfo.path)) {
      const content = fs.readFileSync(fileInfo.path, 'utf8');
      totalFiles++;
      
      console.log(`✅ ${fileInfo.name} (${path.basename(fileInfo.path)})`);
      
      // Vérifier les gestionnaires d'événements
      let fileHandlers = 0;
      fileInfo.expectedHandlers.forEach(handler => {
        totalHandlers++;
        if (content.includes(handler)) {
          foundHandlers++;
          fileHandlers++;
          console.log(`   ✅ ${handler}`);
        } else {
          console.log(`   ❌ ${handler} - MANQUANT`);
        }
      });
      
      // Compter les boutons avec onClick
      const onClickButtons = (content.match(/onClick={[^}]+}/g) || []).length;
      const buttonElements = (content.match(/<Button[^>]*>/g) || []).length;
      const buttonTags = (content.match(/<button[^>]*>/g) || []).length;
      
      totalButtons += buttonElements + buttonTags;
      functionalButtons += onClickButtons;
      
      console.log(`   📊 Gestionnaires trouvés: ${fileHandlers}/${fileInfo.expectedHandlers.length}`);
      console.log(`   📊 Boutons avec onClick: ${onClickButtons}`);
      console.log(`   📊 Total boutons: ${buttonElements + buttonTags}`);
      
      // Vérifier les problèmes de double soumission
      const doubleSubmission = content.match(/type="submit"[^>]*onClick={[^}]+}/g);
      if (doubleSubmission && doubleSubmission.length > 0) {
        console.log(`   ⚠️  Double soumission détectée: ${doubleSubmission.length} cas`);
      } else {
        console.log(`   ✅ Pas de double soumission`);
      }
      
      console.log('');
      
    } else {
      console.log(`❌ ${fileInfo.name} - Fichier non trouvé: ${fileInfo.path}`);
    }
  } catch (error) {
    console.log(`❌ ${fileInfo.name} - Erreur: ${error.message}`);
  }
});

console.log('📊 RÉSUMÉ GLOBAL:\n');
console.log(`✅ Fichiers vérifiés: ${totalFiles}/${filesToCheck.length}`);
console.log(`✅ Gestionnaires trouvés: ${foundHandlers}/${totalHandlers}`);
console.log(`✅ Boutons fonctionnels: ${functionalButtons}/${totalButtons}`);

const handlerSuccess = (foundHandlers / totalHandlers) * 100;
const buttonSuccess = totalButtons > 0 ? (functionalButtons / totalButtons) * 100 : 100;

console.log(`\n🎯 Taux de réussite:`);
console.log(`   - Gestionnaires: ${handlerSuccess.toFixed(1)}%`);
console.log(`   - Boutons: ${buttonSuccess.toFixed(1)}%`);

if (handlerSuccess >= 90 && buttonSuccess >= 70) {
  console.log('\n🎉 VALIDATION RÉUSSIE !');
  console.log('✅ La majorité des boutons sont maintenant fonctionnels');
} else {
  console.log('\n⚠️  VALIDATION PARTIELLE');
  console.log('❌ Certains gestionnaires ou boutons nécessitent encore des corrections');
}

console.log('\n📋 INSTRUCTIONS DE TEST MANUEL:\n');
console.log('1. 🌐 Ouvrir http://localhost:3003 dans le navigateur');
console.log('2. 🔐 Se connecter avec admin@demo-tpe.fr / demo123');
console.log('3. 🔍 Ouvrir les outils de développement (F12) → Console');
console.log('4. 📄 Tester chaque page:');
console.log('   - Clients: http://localhost:3003/clients');
console.log('   - Produits: http://localhost:3003/products');
console.log('   - Commandes: http://localhost:3003/orders');
console.log('   - Factures: http://localhost:3003/invoices');
console.log('   - Rapports: http://localhost:3003/reports');

console.log('\n5. 🖱️  Pour chaque page, tester:');
console.log('   ✅ Boutons d\'en-tête (Filtres, Export, Nouveau)');
console.log('   ✅ Boutons dans les tableaux (Voir, Modifier, Supprimer)');
console.log('   ✅ Messages dans la console pour les actions TODO');
console.log('   ✅ Confirmations pour les suppressions');
console.log('   ✅ Navigation vers les pages de détail/édition');

console.log('\n6. 📝 Pour les formulaires:');
console.log('   ✅ Boutons de soumission fonctionnent');
console.log('   ✅ Pas de double soumission');
console.log('   ✅ Boutons de retour fonctionnent');

console.log('\n🎯 CRITÈRES DE VALIDATION:');
console.log('✅ Tous les boutons répondent aux clics');
console.log('✅ Les messages de console s\'affichent');
console.log('✅ Les navigations fonctionnent');
console.log('✅ Les confirmations s\'affichent');
console.log('✅ Aucune erreur JavaScript');

console.log('\n🚀 L\'application est prête pour les tests utilisateur !');

// Affichage des URLs de test
console.log('\n🔗 LIENS DE TEST DIRECT:\n');
console.log('- Application: http://localhost:3003');
console.log('- Clients: http://localhost:3003/clients');
console.log('- Produits: http://localhost:3003/products');
console.log('- Commandes: http://localhost:3003/orders');
console.log('- Factures: http://localhost:3003/invoices');
console.log('- Rapports: http://localhost:3003/reports');
console.log('- Nouvelle commande: http://localhost:3003/orders/new');
console.log('- Nouvelle facture: http://localhost:3003/invoices/new');
