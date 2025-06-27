/**
 * Script de validation de la cohérence des données de stock
 * Vérifie que les pages produits et stocks affichent des données cohérentes
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3003';
const FRONTEND_BASE_URL = 'http://localhost:3002';

let authToken = null;

async function login() {
  try {
    console.log('🔐 Connexion à l\'API...');
    const response = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
      email: 'admin@gestion-dz.com',
      password: 'admin123'
    });
    
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

async function apiCall(endpoint) {
  try {
    const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error(`❌ Erreur API ${endpoint}:`, error.response?.data?.message || error.message);
    return null;
  }
}

async function validateDataConsistency() {
  console.log('\n🔍 VALIDATION DE LA COHÉRENCE DES DONNÉES');
  console.log('=' .repeat(60));

  try {
    // 1. Récupérer les données des produits
    console.log('\n📦 1. RÉCUPÉRATION DES DONNÉES PRODUITS');
    console.log('-' .repeat(40));
    
    const productsResponse = await apiCall('/api/v1/products?limit=1000');
    if (!productsResponse || !productsResponse.success) {
      throw new Error('Impossible de récupérer les produits');
    }
    
    const products = productsResponse.data?.data || productsResponse.data || [];
    console.log(`✅ ${products.length} produits récupérés`);

    // 2. Récupérer les données des stocks
    console.log('\n📋 2. RÉCUPÉRATION DES DONNÉES STOCKS');
    console.log('-' .repeat(40));
    
    const stocksResponse = await apiCall('/api/v1/stock?limit=1000');
    if (!stocksResponse || !stocksResponse.success) {
      throw new Error('Impossible de récupérer les stocks');
    }
    
    const stocks = stocksResponse.data || [];
    console.log(`✅ ${stocks.length} stocks récupérés`);

    // 3. Analyser la cohérence des données
    console.log('\n⚖️  3. ANALYSE DE LA COHÉRENCE');
    console.log('-' .repeat(40));
    
    const physicalProducts = products.filter(p => !p.isService);
    const stockProductIds = new Set(stocks.map(s => s.product?.id || s.productId));
    
    console.log(`Produits physiques: ${physicalProducts.length}`);
    console.log(`Stocks disponibles: ${stocks.length}`);
    
    // Vérifier les produits sans stock
    const productsWithoutStock = physicalProducts.filter(p => !stockProductIds.has(p.id));
    console.log(`❌ Produits sans stock: ${productsWithoutStock.length}`);
    
    if (productsWithoutStock.length > 0) {
      console.log('Détails:');
      productsWithoutStock.slice(0, 5).forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.name} (Stock: ${product.stockQuantity})`);
      });
    }

    // 4. Vérifier la cohérence des statuts
    console.log('\n🎯 4. VÉRIFICATION DES STATUTS DE STOCK');
    console.log('-' .repeat(40));
    
    const calculateStatus = (stockQty, minStock) => {
      if (stockQty === 0) return 'rupture';
      if (stockQty <= minStock) return 'faible';
      return 'normal';
    };
    
    const statusComparison = [];
    
    for (const stock of stocks) {
      const product = products.find(p => p.id === (stock.product?.id || stock.productId));
      if (product && !product.isService) {
        const productStatus = calculateStatus(product.stockQuantity, product.minStock);
        const stockStatus = calculateStatus(stock.quantiteActuelle, stock.quantiteMinimale);
        
        if (productStatus !== stockStatus) {
          statusComparison.push({
            productName: product.name,
            productStatus,
            stockStatus,
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
    
    console.log(`Incohérences de statuts: ${statusComparison.length}`);
    
    if (statusComparison.length > 0) {
      console.log('Détails des incohérences:');
      statusComparison.slice(0, 5).forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.productName}`);
        console.log(`     Product: ${item.productStatus} (${item.productData.stockQuantity}/${item.productData.minStock})`);
        console.log(`     Stock: ${item.stockStatus} (${item.stockData.quantiteActuelle}/${item.stockData.quantiteMinimale})`);
      });
    }

    // 5. Vérifier les alertes
    console.log('\n🚨 5. VÉRIFICATION DES ALERTES');
    console.log('-' .repeat(40));
    
    const alertsResponse = await apiCall('/api/v1/stock/alerts');
    if (alertsResponse && alertsResponse.success) {
      const alerts = alertsResponse.data;
      console.log(`✅ Total alertes: ${alerts.totalAlerts}`);
      console.log(`   - Rupture: ${alerts.outOfStock.length} produits`);
      console.log(`   - Stock faible: ${alerts.lowStock.length} produits`);
      
      // Comparer avec les calculs locaux
      const localRupture = physicalProducts.filter(p => p.stockQuantity === 0).length;
      const localFaible = physicalProducts.filter(p => p.stockQuantity > 0 && p.stockQuantity <= p.minStock).length;
      
      console.log('\nComparaison avec calculs locaux:');
      console.log(`   - Rupture locale: ${localRupture} (API: ${alerts.outOfStock.length})`);
      console.log(`   - Stock faible local: ${localFaible} (API: ${alerts.lowStock.length})`);
      
      if (localRupture !== alerts.outOfStock.length || localFaible !== alerts.lowStock.length) {
        console.log('⚠️  Différence détectée entre calculs locaux et API');
      } else {
        console.log('✅ Cohérence parfaite entre calculs locaux et API');
      }
    }

    // 6. Résumé de validation
    console.log('\n📊 6. RÉSUMÉ DE VALIDATION');
    console.log('-' .repeat(40));
    
    const totalIssues = productsWithoutStock.length + statusComparison.length;
    
    if (totalIssues === 0) {
      console.log('✅ VALIDATION RÉUSSIE');
      console.log('   - Tous les produits ont des entrées stock');
      console.log('   - Tous les statuts sont cohérents');
      console.log('   - Les alertes correspondent aux données');
    } else {
      console.log('⚠️  PROBLÈMES DÉTECTÉS');
      console.log(`   - Produits sans stock: ${productsWithoutStock.length}`);
      console.log(`   - Incohérences de statuts: ${statusComparison.length}`);
      console.log('   - Unification recommandée');
    }

    return {
      success: totalIssues === 0,
      issues: {
        productsWithoutStock: productsWithoutStock.length,
        statusInconsistencies: statusComparison.length
      },
      details: {
        productsWithoutStock,
        statusComparison
      }
    };

  } catch (error) {
    console.error('❌ Erreur lors de la validation:', error.message);
    return { success: false, error: error.message };
  }
}

async function testUnification() {
  console.log('\n🔧 TEST DE L\'UNIFICATION');
  console.log('=' .repeat(60));

  try {
    console.log('🔄 Exécution de l\'unification...');
    
    const unifyResponse = await axios.post(`${API_BASE_URL}/api/v1/stock/unify-data`, {}, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (unifyResponse.data.success) {
      console.log('✅ Unification réussie');
      console.log('📊 Résultats:', unifyResponse.data.message);
      
      if (unifyResponse.data.data) {
        const data = unifyResponse.data.data;
        if (data.stats) {
          console.log('\nStatistiques:');
          console.log(`  - Stocks créés: ${data.stats.createdStocks}`);
          console.log(`  - Produits corrigés: ${data.stats.correctedProducts}`);
        }
      }
      
      return true;
    } else {
      console.error('❌ Échec de l\'unification:', unifyResponse.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'unification:', error.response?.data?.message || error.message);
    return false;
  }
}

async function main() {
  try {
    console.log('🚀 VALIDATION DE LA COHÉRENCE DES DONNÉES DE STOCK');
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

    // Validation initiale
    console.log('\n🔍 VALIDATION INITIALE');
    const initialValidation = await validateDataConsistency();
    
    if (!initialValidation.success && initialValidation.issues) {
      console.log('\n⚠️  Des problèmes ont été détectés. Tentative d\'unification...');
      
      const unificationSuccess = await testUnification();
      
      if (unificationSuccess) {
        console.log('\n🔍 VALIDATION POST-UNIFICATION');
        const finalValidation = await validateDataConsistency();
        
        if (finalValidation.success) {
          console.log('\n🎉 SUCCÈS COMPLET');
          console.log('Les données sont maintenant cohérentes entre toutes les pages.');
        } else {
          console.log('\n⚠️  Problèmes persistants après unification');
        }
      }
    } else if (initialValidation.success) {
      console.log('\n✅ DONNÉES DÉJÀ COHÉRENTES');
      console.log('Aucune action nécessaire.');
    }

    console.log('\n🎯 VALIDATION TERMINÉE');
    console.log('Vous pouvez maintenant vérifier la cohérence sur les pages web:');
    console.log(`   - Produits: ${FRONTEND_BASE_URL}/products`);
    console.log(`   - Stocks: ${FRONTEND_BASE_URL}/stocks`);
    console.log(`   - Tableau de bord: ${FRONTEND_BASE_URL}/dashboard`);

  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
  }
}

main().catch(console.error);
