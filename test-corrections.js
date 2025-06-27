#!/usr/bin/env node

/**
 * Script de test pour vérifier les corrections apportées
 * - Fonctionnalités d'import/export
 * - Création de factures
 * - Nettoyage de l'interface utilisateur
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:3000';

console.log('🧪 TEST DES CORRECTIONS APPORTÉES\n');

// Configuration des en-têtes d'authentification
let authHeaders = {};

async function authenticate() {
  try {
    console.log('🔐 Authentification...');
    const response = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
      email: 'admin@demo-tpe.fr',
      password: 'demo123'
    });

    if (response.data.success && response.data.data?.token) {
      authHeaders = {
        'Authorization': `Bearer ${response.data.data.token}`
      };
      console.log('✅ Authentification réussie');
      return true;
    } else {
      console.log('❌ Échec de l\'authentification');
      return false;
    }
  } catch (error) {
    console.log('❌ Erreur d\'authentification:', error.message);
    return false;
  }
}

async function testHealthCheck() {
  try {
    console.log('\n📋 Test Health Check...');
    const response = await axios.get(`${API_BASE_URL}/health`);
    
    if (response.data.status === 'ok') {
      console.log('✅ Health Check: OK');
      return true;
    } else {
      console.log('❌ Health Check: Échec');
      return false;
    }
  } catch (error) {
    console.log('❌ Health Check: Erreur -', error.message);
    return false;
  }
}

async function testRoutesActivation() {
  console.log('\n🔗 Test d\'activation des routes...');
  
  const routes = [
    '/api/v1/products',
    '/api/v1/orders', 
    '/api/v1/invoices',
    '/api/v1/clients'
  ];

  let allRoutesActive = true;

  for (const route of routes) {
    try {
      const response = await axios.get(`${API_BASE_URL}${route}`, { headers: authHeaders });
      if (response.status === 200) {
        console.log(`✅ Route ${route}: Active`);
      } else {
        console.log(`❌ Route ${route}: Problème (${response.status})`);
        allRoutesActive = false;
      }
    } catch (error) {
      console.log(`❌ Route ${route}: Erreur - ${error.response?.status || error.message}`);
      allRoutesActive = false;
    }
  }

  return allRoutesActive;
}

async function testExportRoutes() {
  console.log('\n📊 Test des routes d\'export...');
  
  const exportRoutes = [
    '/api/v1/products/export/excel',
    '/api/v1/orders/export/excel',
    '/api/v1/invoices/export/excel',
    '/api/v1/clients/export/excel'
  ];

  let allExportsWork = true;

  for (const route of exportRoutes) {
    try {
      const response = await axios.get(`${API_BASE_URL}${route}`, { 
        headers: authHeaders,
        responseType: 'stream',
        timeout: 10000
      });
      
      if (response.status === 200) {
        console.log(`✅ Export ${route}: Disponible`);
      } else {
        console.log(`❌ Export ${route}: Problème (${response.status})`);
        allExportsWork = false;
      }
    } catch (error) {
      console.log(`❌ Export ${route}: Erreur - ${error.response?.status || error.message}`);
      allExportsWork = false;
    }
  }

  return allExportsWork;
}

async function testInvoiceCreation() {
  console.log('\n📄 Test de création de facture...');
  
  try {
    // D'abord, récupérer un client et un produit
    const clientsResponse = await axios.get(`${API_BASE_URL}/api/v1/clients?limit=1`, { headers: authHeaders });
    const productsResponse = await axios.get(`${API_BASE_URL}/api/v1/products?limit=1`, { headers: authHeaders });

    if (!clientsResponse.data.success || !clientsResponse.data.data?.data?.length) {
      console.log('❌ Aucun client trouvé pour le test');
      return false;
    }

    if (!productsResponse.data.success || !productsResponse.data.data?.data?.length) {
      console.log('❌ Aucun produit trouvé pour le test');
      return false;
    }

    const client = clientsResponse.data.data.data[0];
    const product = productsResponse.data.data.data[0];

    // Créer une facture de test
    const invoiceData = {
      type: 'INVOICE',
      clientId: client.id,
      invoiceDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Facture de test automatique',
      items: [{
        productId: product.id,
        quantity: 1,
        unitPrice: 100,
        vatRate: 19,
        discount: 0
      }]
    };

    const response = await axios.post(`${API_BASE_URL}/api/v1/invoices`, invoiceData, { headers: authHeaders });

    if (response.data.success && response.data.data?.id) {
      console.log('✅ Création de facture: Réussie');
      console.log(`   Facture créée: ${response.data.data.number}`);
      
      // Tester l'export PDF de cette facture
      try {
        const pdfResponse = await axios.get(`${API_BASE_URL}/api/v1/invoices/${response.data.data.id}/pdf`, {
          headers: authHeaders,
          responseType: 'stream',
          timeout: 10000
        });
        
        if (pdfResponse.status === 200) {
          console.log('✅ Export PDF facture: Réussi');
        } else {
          console.log('❌ Export PDF facture: Échec');
        }
      } catch (pdfError) {
        console.log('❌ Export PDF facture: Erreur -', pdfError.message);
      }

      return true;
    } else {
      console.log('❌ Création de facture: Échec');
      return false;
    }
  } catch (error) {
    console.log('❌ Création de facture: Erreur -', error.response?.data?.message || error.message);
    return false;
  }
}

async function checkUICleanup() {
  console.log('\n🧹 Vérification du nettoyage de l\'interface utilisateur...');
  
  const filesToCheck = [
    'apps/frontend/src/components/debug',
    'apps/frontend/src/components/dashboard/api-tests.tsx'
  ];

  let cleanupComplete = true;

  for (const file of filesToCheck) {
    if (fs.existsSync(file)) {
      console.log(`❌ Fichier de debug encore présent: ${file}`);
      cleanupComplete = false;
    } else {
      console.log(`✅ Fichier de debug supprimé: ${file}`);
    }
  }

  // Vérifier que les imports de debug ont été supprimés
  const pagesToCheck = [
    'apps/frontend/src/components/pages/dashboard.tsx',
    'apps/frontend/src/components/pages/clients.tsx',
    'apps/frontend/src/components/pages/products.tsx',
    'apps/frontend/src/components/pages/orders/index.tsx',
    'apps/frontend/src/components/pages/invoices/index.tsx'
  ];

  for (const page of pagesToCheck) {
    if (fs.existsSync(page)) {
      const content = fs.readFileSync(page, 'utf8');
      const hasDebugImports = content.includes('debug/') || content.includes('ApiTestComponent') || content.includes('ConnectionTestComponent');
      
      if (hasDebugImports) {
        console.log(`❌ Imports de debug encore présents dans: ${page}`);
        cleanupComplete = false;
      } else {
        console.log(`✅ Imports de debug supprimés de: ${path.basename(page)}`);
      }
    }
  }

  return cleanupComplete;
}

async function runAllTests() {
  console.log('🚀 Démarrage des tests de validation...\n');

  const results = {
    healthCheck: false,
    authentication: false,
    routesActivation: false,
    exportRoutes: false,
    invoiceCreation: false,
    uiCleanup: false
  };

  // Test Health Check
  results.healthCheck = await testHealthCheck();

  // Test d'authentification
  results.authentication = await authenticate();

  if (results.authentication) {
    // Test d'activation des routes
    results.routesActivation = await testRoutesActivation();

    // Test des routes d'export
    results.exportRoutes = await testExportRoutes();

    // Test de création de facture
    results.invoiceCreation = await testInvoiceCreation();
  }

  // Test de nettoyage de l'UI
  results.uiCleanup = await checkUICleanup();

  // Résumé des résultats
  console.log('\n📊 RÉSUMÉ DES TESTS:');
  console.log('==================');
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ RÉUSSI' : '❌ ÉCHEC';
    const testName = test.replace(/([A-Z])/g, ' $1').toLowerCase();
    console.log(`${status.padEnd(10)} ${testName}`);
  });

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  console.log('\n📈 SCORE GLOBAL:');
  console.log(`${passedTests}/${totalTests} tests réussis (${Math.round(passedTests/totalTests*100)}%)`);

  if (passedTests === totalTests) {
    console.log('\n🎉 TOUTES LES CORRECTIONS SONT FONCTIONNELLES !');
  } else {
    console.log('\n⚠️  Certaines corrections nécessitent encore des ajustements.');
  }

  return passedTests === totalTests;
}

// Exécuter les tests
runAllTests().catch(error => {
  console.error('❌ Erreur lors de l\'exécution des tests:', error);
  process.exit(1);
});
