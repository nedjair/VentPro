/**
 * Diagnostic complet des incohérences de stock
 * Analyse les différences entre tables products et stocks
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3003';
const LOGIN_CREDENTIALS = {
  email: 'admin@gestion.dz',
  password: 'admin123'
};

let authToken = null;

async function login() {
  try {
    console.log('🔐 Connexion à l\'API...');
    const response = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, LOGIN_CREDENTIALS);
    
    if (response.data.success && response.data.data.accessToken) {
      authToken = response.data.data.accessToken;
      console.log('✅ Connexion réussie');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.response?.data?.message || error.message);
    return false;
  }
}

async function apiCall(method, endpoint, data = null) {
  const config = {
    method,
    url: `${API_BASE_URL}${endpoint}`,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  };
  if (data) config.data = data;
  
  const response = await axios(config);
  return response.data;
}

async function diagnosticComplet() {
  console.log('\n🔍 DIAGNOSTIC COMPLET DES INCOHÉRENCES DE STOCK');
  console.log('=' .repeat(60));

  try {
    // 1. Récupérer tous les produits
    console.log('\n📦 1. ANALYSE DES PRODUITS');
    console.log('-' .repeat(40));
    
    const productsResponse = await apiCall('GET', '/api/v1/products?limit=1000');
    const products = productsResponse.data?.data || [];
    
    console.log(`Total produits: ${products.length}`);
    
    const physicalProducts = products.filter(p => !p.isService);
    const serviceProducts = products.filter(p => p.isService);
    
    console.log(`Produits physiques: ${physicalProducts.length}`);
    console.log(`Produits services: ${serviceProducts.length}`);

    // 2. Récupérer tous les stocks
    console.log('\n📋 2. ANALYSE DES STOCKS');
    console.log('-' .repeat(40));
    
    const stocksResponse = await apiCall('GET', '/api/v1/stock?limit=1000');
    const stocks = stocksResponse.data || [];
    
    console.log(`Total stocks: ${stocks.length}`);

    // 3. Identifier les produits sans stock
    console.log('\n❌ 3. PRODUITS SANS ENTRÉE STOCK');
    console.log('-' .repeat(40));
    
    const stockProductIds = new Set(stocks.map(s => s.product.id));
    const productsWithoutStock = physicalProducts.filter(p => !stockProductIds.has(p.id));
    
    console.log(`Produits physiques sans stock: ${productsWithoutStock.length}`);
    
    if (productsWithoutStock.length > 0) {
      console.log('Détails:');
      productsWithoutStock.slice(0, 10).forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.name} (Stock: ${product.stockQuantity}, Min: ${product.minStock})`);
      });
      if (productsWithoutStock.length > 10) {
        console.log(`  ... et ${productsWithoutStock.length - 10} autres`);
      }
    }

    // 4. Analyser les incohérences
    console.log('\n⚖️  4. INCOHÉRENCES PRODUCTS ↔ STOCKS');
    console.log('-' .repeat(40));
    
    const incoherences = [];
    
    for (const stock of stocks) {
      const product = products.find(p => p.id === stock.product.id);
      if (product) {
        const issues = [];
        
        if (product.stockQuantity !== stock.quantiteActuelle) {
          issues.push(`Stock: ${product.stockQuantity} ≠ ${stock.quantiteActuelle}`);
        }
        
        if (product.minStock !== stock.quantiteMinimale) {
          issues.push(`MinStock: ${product.minStock} ≠ ${stock.quantiteMinimale}`);
        }
        
        if (issues.length > 0) {
          incoherences.push({
            productId: product.id,
            productName: product.name,
            issues: issues,
            productData: {
              stockQuantity: product.stockQuantity,
              minStock: product.minStock
            },
            stockData: {
              quantiteActuelle: stock.quantiteActuelle,
              quantiteMinimale: stock.quantiteMinimale
            }
          });
        }
      }
    }
    
    console.log(`Incohérences détectées: ${incoherences.length}`);
    
    if (incoherences.length > 0) {
      console.log('Détails:');
      incoherences.slice(0, 10).forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.productName}`);
        item.issues.forEach(issue => {
          console.log(`     - ${issue}`);
        });
      });
      if (incoherences.length > 10) {
        console.log(`  ... et ${incoherences.length - 10} autres`);
      }
    }

    // 5. Analyser les statuts de stock
    console.log('\n🎯 5. ANALYSE DES STATUTS DE STOCK');
    console.log('-' .repeat(40));
    
    const analyseStatuts = (data, source) => {
      const stats = { rupture: 0, faible: 0, normal: 0 };
      
      data.forEach(item => {
        const stockQty = source === 'products' ? item.stockQuantity : item.quantiteActuelle;
        const minStock = source === 'products' ? item.minStock : item.quantiteMinimale;
        
        if (stockQty === 0) {
          stats.rupture++;
        } else if (stockQty <= minStock) {
          stats.faible++;
        } else {
          stats.normal++;
        }
      });
      
      return stats;
    };
    
    const statsProducts = analyseStatuts(physicalProducts, 'products');
    const statsStocks = analyseStatuts(stocks, 'stocks');
    
    console.log('Statuts selon table PRODUCTS:');
    console.log(`  🔴 Rupture: ${statsProducts.rupture}`);
    console.log(`  🟠 Stock faible: ${statsProducts.faible}`);
    console.log(`  🟢 Stock normal: ${statsProducts.normal}`);
    
    console.log('\nStatuts selon table STOCKS:');
    console.log(`  🔴 Rupture: ${statsStocks.rupture}`);
    console.log(`  🟠 Stock faible: ${statsStocks.faible}`);
    console.log(`  🟢 Stock normal: ${statsStocks.normal}`);
    
    const statusDiff = {
      rupture: Math.abs(statsProducts.rupture - statsStocks.rupture),
      faible: Math.abs(statsProducts.faible - statsStocks.faible),
      normal: Math.abs(statsProducts.normal - statsStocks.normal)
    };
    
    console.log('\nDifférences de statuts:');
    console.log(`  🔴 Rupture: ${statusDiff.rupture} différences`);
    console.log(`  🟠 Stock faible: ${statusDiff.faible} différences`);
    console.log(`  🟢 Stock normal: ${statusDiff.normal} différences`);

    // 6. Résumé et recommandations
    console.log('\n📊 6. RÉSUMÉ ET RECOMMANDATIONS');
    console.log('-' .repeat(40));
    
    const totalProblems = productsWithoutStock.length + incoherences.length;
    
    console.log(`Total problèmes détectés: ${totalProblems}`);
    console.log(`- Produits sans stock: ${productsWithoutStock.length}`);
    console.log(`- Incohérences de données: ${incoherences.length}`);
    
    if (totalProblems > 0) {
      console.log('\n🔧 ACTIONS RECOMMANDÉES:');
      console.log('1. Créer les entrées stock manquantes');
      console.log('2. Synchroniser les données incohérentes');
      console.log('3. Unifier la source de données dans le frontend');
      console.log('4. Renforcer la synchronisation automatique');
    } else {
      console.log('\n✅ Aucun problème détecté. Les données sont cohérentes.');
    }

    return {
      totalProducts: products.length,
      physicalProducts: physicalProducts.length,
      totalStocks: stocks.length,
      productsWithoutStock: productsWithoutStock.length,
      incoherences: incoherences.length,
      statusDifferences: statusDiff,
      needsCorrection: totalProblems > 0,
      details: {
        productsWithoutStock,
        incoherences
      }
    };

  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 DIAGNOSTIC DES INCOHÉRENCES DE STOCK');
    console.log('Application: Gestion Commerciale Algérienne');
    console.log('=' .repeat(60));

    // Test de connectivité
    try {
      await axios.get(`${API_BASE_URL}/health`);
      console.log('✅ Backend accessible');
    } catch (error) {
      console.error('❌ Backend non accessible. Vérifiez que le serveur fonctionne sur le port 3003.');
      return;
    }

    // Connexion
    const loginSuccess = await login();
    if (!loginSuccess) {
      console.error('❌ Impossible de se connecter.');
      return;
    }

    // Diagnostic
    const results = await diagnosticComplet();
    
    console.log('\n🎯 DIAGNOSTIC TERMINÉ');
    console.log(`Problèmes détectés: ${results.needsCorrection ? 'OUI' : 'NON'}`);
    
    if (results.needsCorrection) {
      console.log('\n➡️  Prochaine étape: Exécuter la correction des incohérences');
    }

  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
  }
}

main().catch(console.error);
