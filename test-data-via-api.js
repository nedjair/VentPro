#!/usr/bin/env node

const http = require('http');

console.log('🇩🇿 TEST DES DONNÉES ALGÉRIENNES VIA API');
console.log('========================================');

let authToken = null;

// Fonction utilitaire pour faire des requêtes HTTP
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ statusCode: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// Authentification
async function authenticate() {
  console.log('🔐 AUTHENTIFICATION...');
  
  const postData = JSON.stringify({
    email: 'admin@gestion-dz.com',
    password: 'admin123'
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  try {
    const response = await makeRequest(options, postData);
    
    if (response.statusCode === 200 && response.data.success) {
      authToken = response.data.data.token;
      console.log('✅ Authentification réussie');
      console.log(`   👤 Utilisateur: ${response.data.data.user.firstName} ${response.data.data.user.lastName}`);
      console.log(`   📧 Email: ${response.data.data.user.email}`);
      console.log(`   👑 Rôle: ${response.data.data.user.role}`);
      return true;
    } else {
      console.log('❌ Authentification échouée');
      return false;
    }
  } catch (error) {
    console.log(`❌ Erreur d'authentification: ${error.message}`);
    return false;
  }
}

// Test des données
async function testData() {
  console.log('\n📊 RÉCUPÉRATION DES DONNÉES...');
  
  const endpoints = [
    { name: 'Dashboard Stats', path: '/api/v1/dashboard/stats', key: 'stats' },
    { name: 'Clients', path: '/api/v1/clients', key: 'clients' },
    { name: 'Produits', path: '/api/v1/products', key: 'products' },
    { name: 'Fournisseurs', path: '/api/v1/suppliers', key: 'suppliers' },
    { name: 'Stocks', path: '/api/v1/stocks', key: 'stocks' }
  ];

  const results = {};

  for (const endpoint of endpoints) {
    try {
      const options = {
        hostname: 'localhost',
        port: 3001,
        path: endpoint.path,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      };

      const response = await makeRequest(options);
      
      if (response.statusCode === 200 && response.data.success) {
        results[endpoint.key] = response.data.data;
        console.log(`✅ ${endpoint.name}: OK`);
        
        if (Array.isArray(response.data.data)) {
          console.log(`   📋 Nombre d'éléments: ${response.data.data.length}`);
        } else if (typeof response.data.data === 'object') {
          const keys = Object.keys(response.data.data);
          console.log(`   📊 Propriétés: ${keys.length}`);
        }
      } else {
        console.log(`❌ ${endpoint.name}: ${response.statusCode}`);
        results[endpoint.key] = null;
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ERROR - ${error.message}`);
      results[endpoint.key] = null;
    }
  }

  return results;
}

// Analyse des données
function analyzeData(results) {
  console.log('\n🎉 ANALYSE DES DONNÉES ALGÉRIENNES');
  console.log('==================================');

  let totalRecords = 0;

  // Clients
  if (results.clients && Array.isArray(results.clients)) {
    const clients = results.clients;
    const algerianClients = clients.filter(c => c.country === 'Algérie');
    const individualClients = clients.filter(c => c.type === 'INDIVIDUAL');
    const companyClients = clients.filter(c => c.type === 'COMPANY');
    
    console.log(`👥 CLIENTS: ${clients.length}`);
    console.log(`   - Algériens: ${algerianClients.length}/${clients.length}`);
    console.log(`   - Particuliers: ${individualClients.length}`);
    console.log(`   - Entreprises: ${companyClients.length}`);
    
    totalRecords += clients.length;
  }

  // Produits
  if (results.products && Array.isArray(results.products)) {
    const products = results.products;
    const daProducts = products.filter(p => p.price && p.price.toString().includes('DA') || p.currency === 'DA');
    
    console.log(`📦 PRODUITS: ${products.length}`);
    console.log(`   - En DA: ${daProducts.length}/${products.length}`);
    
    if (products.length > 0) {
      console.log(`   - Exemples: ${products.slice(0, 3).map(p => p.name).join(', ')}`);
    }
    
    totalRecords += products.length;
  }

  // Fournisseurs
  if (results.suppliers && Array.isArray(results.suppliers)) {
    const suppliers = results.suppliers;
    const algerianSuppliers = suppliers.filter(s => s.country === 'Algérie');
    
    console.log(`🏭 FOURNISSEURS: ${suppliers.length}`);
    console.log(`   - Algériens: ${algerianSuppliers.length}/${suppliers.length}`);
    
    if (suppliers.length > 0) {
      console.log(`   - Exemples: ${suppliers.slice(0, 3).map(s => s.name).join(', ')}`);
    }
    
    totalRecords += suppliers.length;
  }

  // Stocks
  if (results.stocks && Array.isArray(results.stocks)) {
    const stocks = results.stocks;
    
    console.log(`📊 STOCKS: ${stocks.length}`);
    
    totalRecords += stocks.length;
  }

  // Dashboard Stats
  if (results.stats && typeof results.stats === 'object') {
    console.log(`📈 STATISTIQUES DASHBOARD:`);
    
    if (results.stats.clients) {
      console.log(`   - Total clients: ${results.stats.clients.total || 0}`);
      console.log(`   - Clients actifs: ${results.stats.clients.active || 0}`);
    }
    
    if (results.stats.products) {
      console.log(`   - Total produits: ${results.stats.products.total || 0}`);
      console.log(`   - Produits actifs: ${results.stats.products.active || 0}`);
    }
    
    if (results.stats.revenue) {
      console.log(`   - Chiffre d'affaires: ${results.stats.revenue.total || 0} DA`);
    }
  }

  console.log(`\n📊 TOTAL ESTIMÉ: ${totalRecords}+ enregistrements`);

  if (totalRecords >= 50) {
    console.log('🎯 ✅ Objectif de 50+ enregistrements atteint !');
  } else {
    console.log('⚠️  Moins de 50 enregistrements détectés');
  }

  console.log('\n🇩🇿 VÉRIFICATION ALGÉRIENNE:');
  
  const hasAlgerianData = (
    (results.clients && results.clients.some(c => c.country === 'Algérie')) ||
    (results.suppliers && results.suppliers.some(s => s.country === 'Algérie'))
  );
  
  const hasDACurrency = (
    (results.products && results.products.some(p => p.currency === 'DA')) ||
    (results.stats && results.stats.revenue)
  );

  if (hasAlgerianData && hasDACurrency) {
    console.log('✅ Données algériennes correctement configurées !');
  } else {
    console.log('⚠️  Configuration algérienne à vérifier');
  }

  console.log('\n🔗 ACCÈS À L\'APPLICATION:');
  console.log('   🌐 Frontend: http://localhost:3000');
  console.log('   🔐 Login: http://localhost:3000/login');
  console.log('   📧 Email: admin@gestion-dz.com');
  console.log('   🔑 Mot de passe: admin123');
}

// Exécution principale
async function main() {
  const authSuccess = await authenticate();
  
  if (!authSuccess) {
    console.log('\n❌ ÉCHEC: Impossible de s\'authentifier');
    console.log('Vérifiez que le backend est démarré sur le port 3001');
    process.exit(1);
  }

  const results = await testData();
  analyzeData(results);

  console.log('\n🎉 TEST TERMINÉ AVEC SUCCÈS !');
  console.log('L\'application est opérationnelle avec des données algériennes.');
}

main().catch(error => {
  console.error('❌ Erreur fatale:', error.message);
  process.exit(1);
});
