/**
 * Script de correction des incohérences de stock via l'API backend
 * Utilise les endpoints de synchronisation existants
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3003';
const LOGIN_CREDENTIALS = {
  email: 'admin@gestion.dz',
  password: 'admin123'
};

let authToken = null;

async function login() {
  try {
    console.log('🔐 Connexion à l\'API...');
    
    const response = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, LOGIN_CREDENTIALS, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success && response.data.data.accessToken) {
      authToken = response.data.data.accessToken;
      console.log('✅ Connexion réussie');
      return true;
    } else {
      console.error('❌ Échec de la connexion:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.response?.data?.message || error.message);
    return false;
  }
}

async function apiCall(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`❌ Erreur API ${method} ${endpoint}:`, error.response?.data?.message || error.message);
    throw error;
  }
}

async function diagnosticIncoherences() {
  console.log('\n🔍 DIAGNOSTIC DES INCOHÉRENCES VIA API');
  console.log('=' .repeat(60));

  try {
    // 1. Vérifier la cohérence des données
    console.log('\n📊 1. VÉRIFICATION DE LA COHÉRENCE');
    console.log('-' .repeat(40));

    const consistencyCheck = await apiCall('GET', '/api/v1/auto-sync/check-consistency');
    
    if (consistencyCheck.success) {
      const data = consistencyCheck.data;
      console.log(`✅ Données cohérentes: ${data.consistent}`);
      console.log(`⚠️  Données incohérentes: ${data.inconsistent}`);
      console.log(`❌ Stocks manquants: ${data.missing}`);
      console.log(`📊 Total vérifié: ${data.consistent + data.inconsistent + data.missing}`);

      if (data.details && data.details.length > 0) {
        console.log('\n🔍 Détails des problèmes:');
        data.details.slice(0, 10).forEach((detail, index) => {
          console.log(`  ${index + 1}. ${detail.productName} - ${detail.issue}`);
          if (detail.productData && detail.stockData) {
            console.log(`     Product: Stock=${detail.productData.stockQuantity}, Min=${detail.productData.minStock}`);
            console.log(`     Stock: Actuel=${detail.stockData.quantiteActuelle}, Min=${detail.stockData.quantiteMinimale}`);
          }
        });
        if (data.details.length > 10) {
          console.log(`     ... et ${data.details.length - 10} autres problèmes`);
        }
      }

      return {
        needsCorrection: data.inconsistent > 0 || data.missing > 0,
        stats: data
      };
    } else {
      console.error('❌ Erreur lors de la vérification de cohérence');
      return { needsCorrection: false, stats: null };
    }
  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error.message);
    return { needsCorrection: false, stats: null };
  }
}

async function corrigerIncoherences() {
  console.log('\n🔧 CORRECTION DES INCOHÉRENCES VIA API');
  console.log('=' .repeat(60));

  try {
    // 1. Synchronisation complète via l'API
    console.log('\n🔄 1. SYNCHRONISATION COMPLÈTE');
    console.log('-' .repeat(40));

    const syncResult = await apiCall('POST', '/api/v1/stock/sync-data');
    
    if (syncResult.success) {
      const data = syncResult.data;
      console.log('✅ Synchronisation terminée avec succès');
      
      if (data.stats) {
        console.log(`📊 Statistiques:`);
        console.log(`   - Total produits: ${data.stats.totalProducts}`);
        console.log(`   - Produits actifs: ${data.stats.activeProducts}`);
        console.log(`   - Total stocks: ${data.stats.totalStocks}`);
        console.log(`   - Produits sans stock: ${data.stats.productsWithoutStock}`);
      }

      if (data.actions) {
        console.log(`🔧 Actions effectuées:`);
        console.log(`   - Stocks créés: ${data.actions.stocksCreated}`);
        console.log(`   - Stocks synchronisés: ${data.actions.stocksSynced}`);
        if (data.actions.testProductsCreated) {
          console.log(`   - Produits de test créés: ${data.actions.testProductsCreated}`);
        }
      }

      if (data.alerts) {
        console.log(`🚨 Alertes après synchronisation:`);
        console.log(`   - Produits en rupture: ${data.alerts.outOfStock}`);
        console.log(`   - Produits en stock faible: ${data.alerts.lowStock}`);
        console.log(`   - Total alertes: ${data.alerts.totalAlerts}`);
      }

      return data;
    } else {
      console.error('❌ Erreur lors de la synchronisation:', syncResult.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error.message);
    return null;
  }
}

async function verifierAlertes() {
  console.log('\n🚨 VÉRIFICATION DES ALERTES DE STOCK');
  console.log('=' .repeat(60));

  try {
    const alertsResult = await apiCall('GET', '/api/v1/stock/alerts');
    
    if (alertsResult.success) {
      const alerts = alertsResult.data;
      
      console.log(`📊 Résumé des alertes:`);
      console.log(`   - Total alertes: ${alerts.totalAlerts}`);
      console.log(`   - Produits en rupture: ${alerts.outOfStock.length}`);
      console.log(`   - Produits en stock faible: ${alerts.lowStock.length}`);

      if (alerts.outOfStock.length > 0) {
        console.log('\n🔴 Produits en rupture de stock:');
        alerts.outOfStock.slice(0, 5).forEach((product, index) => {
          console.log(`  ${index + 1}. ${product.name} (Stock: ${product.stockQuantity})`);
        });
        if (alerts.outOfStock.length > 5) {
          console.log(`     ... et ${alerts.outOfStock.length - 5} autres`);
        }
      }

      if (alerts.lowStock.length > 0) {
        console.log('\n🟠 Produits en stock faible:');
        alerts.lowStock.slice(0, 5).forEach((product, index) => {
          console.log(`  ${index + 1}. ${product.name} (Stock: ${product.stockQuantity}/${product.minStock})`);
        });
        if (alerts.lowStock.length > 5) {
          console.log(`     ... et ${alerts.lowStock.length - 5} autres`);
        }
      }

      return alerts;
    } else {
      console.error('❌ Erreur lors de la récupération des alertes');
      return null;
    }
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des alertes:', error.message);
    return null;
  }
}

async function testerConnectiviteAPI() {
  console.log('\n🔌 TEST DE CONNECTIVITÉ API');
  console.log('=' .repeat(60));

  try {
    // Test health check
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Backend accessible:', healthResponse.data.status);

    // Test endpoints principaux
    const endpoints = [
      '/api/v1/products',
      '/api/v1/stock',
      '/api/v1/stock/alerts',
      '/api/v1/auto-sync/check-consistency'
    ];

    for (const endpoint of endpoints) {
      try {
        await apiCall('GET', endpoint);
        console.log(`✅ ${endpoint} - OK`);
      } catch (error) {
        console.log(`❌ ${endpoint} - Erreur: ${error.response?.status || 'Inconnu'}`);
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Backend non accessible:', error.message);
    return false;
  }
}

async function main() {
  try {
    console.log('🚀 CORRECTION DES INCOHÉRENCES DE STOCK');
    console.log('Application: Gestion Commerciale Algérienne');
    console.log('Backend: ' + API_BASE_URL);
    console.log('=' .repeat(60));

    // 1. Tester la connectivité
    const isConnected = await testerConnectiviteAPI();
    if (!isConnected) {
      console.error('❌ Impossible de se connecter au backend. Vérifiez que le serveur fonctionne sur le port 3003.');
      return;
    }

    // 2. Se connecter
    const loginSuccess = await login();
    if (!loginSuccess) {
      console.error('❌ Impossible de se connecter. Vérifiez les identifiants.');
      return;
    }

    // 3. Diagnostic initial
    const diagnostic = await diagnosticIncoherences();
    
    // 4. Correction si nécessaire
    if (diagnostic.needsCorrection) {
      console.log('\n❓ Des incohérences ont été détectées.');
      console.log('🔧 Correction automatique en cours...');
      
      const correctionResult = await corrigerIncoherences();
      
      if (correctionResult) {
        console.log('\n✅ Correction terminée avec succès');
        
        // 5. Vérification post-correction
        console.log('\n🔍 Vérification post-correction...');
        await diagnosticIncoherences();
      }
    } else {
      console.log('\n✅ Aucune incohérence détectée. Les données sont cohérentes.');
    }

    // 6. Vérifier les alertes finales
    await verifierAlertes();

    console.log('\n🎯 CORRECTION TERMINÉE');
    console.log('Les pages produits et stocks devraient maintenant afficher des données cohérentes.');

  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
  }
}

// Exécuter le script
main().catch(console.error);
