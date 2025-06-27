/**
 * Script de test pour vérifier les routes d'export/import
 * Utilise Node.js pour tester directement les endpoints backend
 */

const https = require('https');
const http = require('http');

const API_BASE_URL = 'http://localhost:3001';

// Fonction utilitaire pour faire des requêtes HTTP
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Tests des routes
async function testRoutes() {
  console.log('🧪 Test des routes d\'export/import...\n');

  const routes = [
    // Health check
    { name: 'Health Check', url: `${API_BASE_URL}/health` },
    
    // Templates d'import (sans auth)
    { name: 'Template Clients', url: `${API_BASE_URL}/api/v1/clients/import/template` },
    { name: 'Template Produits', url: `${API_BASE_URL}/api/v1/products/import/template` },
    { name: 'Template Fournisseurs', url: `${API_BASE_URL}/api/v1/suppliers/import/template` },
    { name: 'Template Commandes', url: `${API_BASE_URL}/api/v1/orders/import/template` },
    { name: 'Template Factures', url: `${API_BASE_URL}/api/v1/invoices/import/template` },
  ];

  for (const route of routes) {
    try {
      console.log(`Testing: ${route.name}`);
      const response = await makeRequest(route.url);
      
      if (response.status === 200) {
        console.log(`✅ ${route.name}: OK (${response.status})`);
      } else if (response.status === 401) {
        console.log(`🔐 ${route.name}: Authentification requise (${response.status})`);
      } else if (response.status === 404) {
        console.log(`❌ ${route.name}: Route non trouvée (${response.status})`);
      } else {
        console.log(`⚠️ ${route.name}: Status ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${route.name}: Erreur - ${error.message}`);
    }
  }

  console.log('\n🔍 Test des routes avec authentification...');
  
  // Test des routes qui nécessitent une authentification
  const authRoutes = [
    { name: 'Export Excel Clients', url: `${API_BASE_URL}/api/v1/clients/export/excel` },
    { name: 'Export PDF Clients', url: `${API_BASE_URL}/api/v1/clients/export/pdf` },
    { name: 'Export Excel Produits', url: `${API_BASE_URL}/api/v1/products/export/excel` },
    { name: 'Export PDF Produits', url: `${API_BASE_URL}/api/v1/products/export/pdf` },
    { name: 'Export Excel Fournisseurs', url: `${API_BASE_URL}/api/v1/suppliers/export/excel` },
    { name: 'Export PDF Fournisseurs', url: `${API_BASE_URL}/api/v1/suppliers/export/pdf` },
    { name: 'Export Excel Commandes', url: `${API_BASE_URL}/api/v1/orders/export/excel` },
    { name: 'Export PDF Commandes', url: `${API_BASE_URL}/api/v1/orders/export/pdf` },
    { name: 'Export Excel Factures', url: `${API_BASE_URL}/api/v1/invoices/export/excel` },
    { name: 'Export PDF Factures', url: `${API_BASE_URL}/api/v1/invoices/export/pdf` },
  ];

  for (const route of authRoutes) {
    try {
      console.log(`Testing: ${route.name}`);
      const response = await makeRequest(route.url);
      
      if (response.status === 401) {
        console.log(`✅ ${route.name}: Authentification requise (${response.status}) - Route existe`);
      } else if (response.status === 404) {
        console.log(`❌ ${route.name}: Route non trouvée (${response.status})`);
      } else {
        console.log(`⚠️ ${route.name}: Status inattendu ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${route.name}: Erreur - ${error.message}`);
    }
  }

  console.log('\n✅ Tests terminés!');
}

// Exécuter les tests
testRoutes().catch(console.error);
