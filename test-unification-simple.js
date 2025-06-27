/**
 * Test simple de l'unification des données de stock
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3003';

async function testUnification() {
  try {
    console.log('🚀 TEST D\'UNIFICATION DES DONNÉES DE STOCK');
    console.log('=' .repeat(50));

    // 1. Test de connectivité
    console.log('\n🔍 1. Test de connectivité...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Backend accessible:', healthResponse.data.status);

    // 2. Connexion
    console.log('\n🔐 2. Connexion...');
    const loginResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
      email: 'admin@gestion-dz.com',
      password: 'admin123'
    });

    if (!loginResponse.data.success) {
      throw new Error('Échec de la connexion');
    }

    const token = loginResponse.data.data.accessToken;
    console.log('✅ Connexion réussie');

    // 3. Test de l'endpoint d'unification
    console.log('\n🔄 3. Test de l\'unification...');
    const unifyResponse = await axios.post(`${API_BASE_URL}/api/v1/stock/unify-data`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (unifyResponse.data.success) {
      console.log('✅ Unification réussie !');
      console.log('📊 Résultats:', unifyResponse.data.message);
      
      if (unifyResponse.data.data) {
        const data = unifyResponse.data.data;
        console.log('\nStatistiques:');
        if (data.stats) {
          console.log(`  - Produits physiques: ${data.stats.totalPhysicalProducts}`);
          console.log(`  - Avec stock: ${data.stats.productsWithStock}`);
          console.log(`  - Sans stock: ${data.stats.productsWithoutStock}`);
          console.log(`  - Incohérences: ${data.stats.inconsistentData}`);
          console.log(`  - Stocks créés: ${data.stats.createdStocks}`);
          console.log(`  - Produits corrigés: ${data.stats.correctedProducts}`);
        }
        
        if (data.alerts) {
          console.log('\nAlertes après unification:');
          console.log(`  - Rupture de stock: ${data.alerts.outOfStock}`);
          console.log(`  - Stock faible: ${data.alerts.lowStock}`);
          console.log(`  - Total alertes: ${data.alerts.totalAlerts}`);
        }
      }
    } else {
      console.error('❌ Échec de l\'unification:', unifyResponse.data.message);
    }

    // 4. Vérifier les données produits après unification
    console.log('\n📦 4. Vérification des produits...');
    const productsResponse = await axios.get(`${API_BASE_URL}/api/v1/products?limit=5`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (productsResponse.data.success) {
      const products = productsResponse.data.data?.data || productsResponse.data.data || [];
      console.log(`✅ ${products.length} produits récupérés`);
      
      // Afficher quelques exemples
      products.slice(0, 3).forEach((product, index) => {
        console.log(`\n  ${index + 1}. ${product.name}`);
        console.log(`     Stock: ${product.stockQuantity} (Min: ${product.minStock})`);
        if (product.unifiedStock) {
          console.log(`     Unifié: ${product.unifiedStock.quantiteActuelle} (Min: ${product.unifiedStock.quantiteMinimale})`);
        }
      });
    }

    // 5. Vérifier les alertes
    console.log('\n🚨 5. Vérification des alertes...');
    const alertsResponse = await axios.get(`${API_BASE_URL}/api/v1/stock/alerts`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (alertsResponse.data.success) {
      const alerts = alertsResponse.data.data;
      console.log(`✅ Total alertes: ${alerts.totalAlerts}`);
      console.log(`   - Rupture: ${alerts.outOfStock.length} produits`);
      console.log(`   - Stock faible: ${alerts.lowStock.length} produits`);
    }

    console.log('\n🎯 TEST TERMINÉ AVEC SUCCÈS');
    console.log('Les données de stock ont été unifiées.');
    console.log('Vous pouvez maintenant vérifier la cohérence sur les pages web.');

  } catch (error) {
    console.error('\n❌ ERREUR LORS DU TEST:', error.response?.data?.message || error.message);
    
    if (error.response?.status === 404) {
      console.log('\n💡 L\'endpoint d\'unification n\'existe peut-être pas encore.');
      console.log('Vérifiez que le backend a été redémarré avec les nouvelles modifications.');
    }
  }
}

testUnification();
