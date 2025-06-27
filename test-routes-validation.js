#!/usr/bin/env node

const axios = require('axios');

const FRONTEND_URL = 'http://localhost:3000';

// Liste de toutes les routes principales à tester
const routes = [
  // Pages publiques
  { path: '/', name: 'Page d\'accueil', public: true },
  { path: '/login', name: 'Connexion', public: true },
  
  // Pages protégées principales
  { path: '/dashboard', name: 'Dashboard', public: false },
  { path: '/analytics', name: 'Analytics', public: false },
  
  // Gestion des clients
  { path: '/clients', name: 'Liste des clients', public: false },
  { path: '/clients/new', name: 'Nouveau client', public: false },
  
  // Gestion des produits
  { path: '/products', name: 'Liste des produits', public: false },
  { path: '/products/new', name: 'Nouveau produit', public: false },
  
  // Gestion des stocks
  { path: '/stocks', name: 'Gestion des stocks', public: false },
  { path: '/stocks/new', name: 'Nouveau stock', public: false },
  { path: '/stocks-simple', name: 'Stocks simple', public: false },
  
  // Gestion des fournisseurs
  { path: '/suppliers', name: 'Liste des fournisseurs', public: false },
  { path: '/suppliers/new', name: 'Nouveau fournisseur', public: false },
  
  // Gestion des commandes
  { path: '/orders', name: 'Liste des commandes', public: false },
  { path: '/orders/new', name: 'Nouvelle commande', public: false },
  
  // Gestion des factures
  { path: '/invoices', name: 'Liste des factures', public: false },
  { path: '/invoices/new', name: 'Nouvelle facture', public: false },
  
  // Rapports
  { path: '/reports', name: 'Rapports', public: false },
  
  // Pages de test (à nettoyer plus tard)
  { path: '/test-stock', name: 'Test Stock', public: false, test: true }
];

async function testRoute(route) {
  try {
    const response = await axios.get(`${FRONTEND_URL}${route.path}`, {
      timeout: 5000,
      maxRedirects: 0,
      validateStatus: (status) => status < 500
    });
    
    const status = response.status;
    let result = 'UNKNOWN';
    
    if (route.public) {
      // Pages publiques : 200 = OK
      result = status === 200 ? 'OK' : `ERROR (${status})`;
    } else {
      // Pages protégées : 200 = OK (si connecté), 302/401 = OK (redirection auth)
      result = (status === 200 || status === 302 || status === 401) ? 'OK' : `ERROR (${status})`;
    }
    
    return {
      path: route.path,
      name: route.name,
      status: status,
      result: result,
      public: route.public,
      test: route.test || false
    };
  } catch (error) {
    return {
      path: route.path,
      name: route.name,
      status: 'ERROR',
      result: `FAILED (${error.message})`,
      public: route.public,
      test: route.test || false
    };
  }
}

async function validateAllRoutes() {
  console.log('🔍 VALIDATION DES ROUTES DE L\'APPLICATION');
  console.log('==========================================\n');
  
  const results = [];
  
  for (const route of routes) {
    const result = await testRoute(route);
    results.push(result);
    
    const icon = result.result === 'OK' ? '✅' : '❌';
    const type = result.public ? '[PUBLIC]' : '[PROTÉGÉ]';
    const testFlag = result.test ? '[TEST]' : '';
    
    console.log(`${icon} ${type}${testFlag} ${result.name}`);
    console.log(`   URL: ${result.path}`);
    console.log(`   Status: ${result.status} - ${result.result}\n`);
  }
  
  // Résumé
  const totalRoutes = results.length;
  const okRoutes = results.filter(r => r.result === 'OK').length;
  const errorRoutes = results.filter(r => r.result !== 'OK').length;
  const testRoutes = results.filter(r => r.test).length;
  
  console.log('📊 RÉSUMÉ');
  console.log('=========');
  console.log(`Total des routes testées: ${totalRoutes}`);
  console.log(`✅ Routes fonctionnelles: ${okRoutes}`);
  console.log(`❌ Routes avec erreurs: ${errorRoutes}`);
  console.log(`🧪 Routes de test: ${testRoutes}`);
  
  if (errorRoutes > 0) {
    console.log('\n❌ ROUTES AVEC ERREURS:');
    results.filter(r => r.result !== 'OK').forEach(r => {
      console.log(`   - ${r.path} (${r.name}): ${r.result}`);
    });
  }
  
  if (testRoutes > 0) {
    console.log('\n🧪 ROUTES DE TEST À NETTOYER:');
    results.filter(r => r.test).forEach(r => {
      console.log(`   - ${r.path} (${r.name})`);
    });
  }
  
  return results;
}

// Exécution
if (require.main === module) {
  validateAllRoutes().catch(console.error);
}

module.exports = { validateAllRoutes, testRoute };
