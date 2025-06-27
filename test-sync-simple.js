/**
 * Test simple de synchronisation des stocks
 * Utilise curl pour tester les endpoints
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const API_BASE_URL = 'http://localhost:3003';

async function testHealthCheck() {
  try {
    console.log('🔍 Test Health Check...');
    const { stdout } = await execAsync(`curl -s ${API_BASE_URL}/health`);
    const response = JSON.parse(stdout);
    console.log('✅ Backend accessible:', response.status);
    return true;
  } catch (error) {
    console.error('❌ Backend non accessible:', error.message);
    return false;
  }
}

async function loginAndGetToken() {
  try {
    console.log('🔐 Connexion...');
    const loginData = JSON.stringify({
      email: 'admin@gestion.dz',
      password: 'admin123'
    });

    const { stdout } = await execAsync(`curl -s -X POST ${API_BASE_URL}/api/v1/auth/login -H "Content-Type: application/json" -d '${loginData}'`);
    const response = JSON.parse(stdout);
    
    if (response.success && response.data.accessToken) {
      console.log('✅ Connexion réussie');
      return response.data.accessToken;
    } else {
      console.error('❌ Échec de la connexion:', response.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);
    return null;
  }
}

async function checkConsistency(token) {
  try {
    console.log('\n📊 Vérification de la cohérence...');
    const { stdout } = await execAsync(`curl -s -H "Authorization: Bearer ${token}" ${API_BASE_URL}/api/v1/auto-sync/check-consistency`);
    const response = JSON.parse(stdout);
    
    if (response.success) {
      const data = response.data;
      console.log(`✅ Données cohérentes: ${data.consistent}`);
      console.log(`⚠️  Données incohérentes: ${data.inconsistent}`);
      console.log(`❌ Stocks manquants: ${data.missing}`);
      
      return {
        needsSync: data.inconsistent > 0 || data.missing > 0,
        stats: data
      };
    } else {
      console.error('❌ Erreur lors de la vérification:', response.message);
      return { needsSync: false, stats: null };
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    return { needsSync: false, stats: null };
  }
}

async function syncStocks(token) {
  try {
    console.log('\n🔄 Synchronisation des stocks...');
    const { stdout } = await execAsync(`curl -s -X POST -H "Authorization: Bearer ${token}" ${API_BASE_URL}/api/v1/stock/sync-data`);
    const response = JSON.parse(stdout);
    
    if (response.success) {
      const data = response.data;
      console.log('✅ Synchronisation terminée');
      
      if (data.actions) {
        console.log(`📊 Actions effectuées:`);
        console.log(`   - Stocks créés: ${data.actions.stocksCreated}`);
        console.log(`   - Stocks synchronisés: ${data.actions.stocksSynced}`);
      }
      
      if (data.alerts) {
        console.log(`🚨 Alertes:`);
        console.log(`   - Rupture: ${data.alerts.outOfStock}`);
        console.log(`   - Stock faible: ${data.alerts.lowStock}`);
      }
      
      return true;
    } else {
      console.error('❌ Erreur lors de la synchronisation:', response.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    return false;
  }
}

async function getStockAlerts(token) {
  try {
    console.log('\n🚨 Vérification des alertes...');
    const { stdout } = await execAsync(`curl -s -H "Authorization: Bearer ${token}" ${API_BASE_URL}/api/v1/stock/alerts`);
    const response = JSON.parse(stdout);
    
    if (response.success) {
      const alerts = response.data;
      console.log(`📊 Total alertes: ${alerts.totalAlerts}`);
      console.log(`🔴 Rupture: ${alerts.outOfStock.length} produits`);
      console.log(`🟠 Stock faible: ${alerts.lowStock.length} produits`);
      
      if (alerts.outOfStock.length > 0) {
        console.log('\nProduits en rupture:');
        alerts.outOfStock.slice(0, 3).forEach((product, index) => {
          console.log(`  ${index + 1}. ${product.name}`);
        });
      }
      
      return alerts;
    } else {
      console.error('❌ Erreur lors de la récupération des alertes');
      return null;
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 TEST DE SYNCHRONISATION DES STOCKS');
  console.log('=' .repeat(50));

  // 1. Vérifier la connectivité
  const isHealthy = await testHealthCheck();
  if (!isHealthy) {
    console.error('\n❌ Le backend n\'est pas accessible. Vérifiez qu\'il fonctionne sur le port 3003.');
    return;
  }

  // 2. Se connecter
  const token = await loginAndGetToken();
  if (!token) {
    console.error('\n❌ Impossible de se connecter. Vérifiez les identifiants.');
    return;
  }

  // 3. Vérifier la cohérence
  const consistencyResult = await checkConsistency(token);
  
  // 4. Synchroniser si nécessaire
  if (consistencyResult.needsSync) {
    console.log('\n⚠️  Des incohérences ont été détectées. Synchronisation en cours...');
    const syncSuccess = await syncStocks(token);
    
    if (syncSuccess) {
      console.log('\n🔍 Vérification post-synchronisation...');
      await checkConsistency(token);
    }
  } else {
    console.log('\n✅ Aucune incohérence détectée.');
  }

  // 5. Vérifier les alertes finales
  await getStockAlerts(token);

  console.log('\n🎯 Test terminé. Vérifiez les pages produits et stocks pour confirmer la cohérence.');
}

main().catch(console.error);
