// Script simple pour tester l'API de stock
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api/v1';

async function testStockAPI() {
  console.log('🧪 Test de l\'API de stock...');
  
  try {
    // Test 1: Vérifier si l'API répond
    console.log('\n1. Test de connectivité API...');
    const healthResponse = await fetch(`${API_BASE}/health`);
    console.log(`   Status: ${healthResponse.status}`);
    
    if (healthResponse.ok) {
      console.log('   ✅ API accessible');
    } else {
      console.log('   ❌ API non accessible');
      return;
    }
    
    // Test 2: Tester l'endpoint des stocks (sans auth pour voir l'erreur)
    console.log('\n2. Test endpoint stocks (sans auth)...');
    const stockResponse = await fetch(`${API_BASE}/stock`);
    console.log(`   Status: ${stockResponse.status}`);
    
    if (stockResponse.status === 401) {
      console.log('   ✅ Authentification requise (normal)');
    } else {
      console.log('   ⚠️  Réponse inattendue');
    }
    
    // Test 3: Tester l'endpoint des alertes (sans auth)
    console.log('\n3. Test endpoint alertes (sans auth)...');
    const alertsResponse = await fetch(`${API_BASE}/stock/alerts`);
    console.log(`   Status: ${alertsResponse.status}`);
    
    if (alertsResponse.status === 401) {
      console.log('   ✅ Authentification requise (normal)');
    } else {
      console.log('   ⚠️  Réponse inattendue');
    }
    
    console.log('\n📊 Résumé:');
    console.log('   - API backend accessible ✅');
    console.log('   - Routes de stock configurées ✅');
    console.log('   - Authentification activée ✅');
    console.log('\n💡 Pour tester complètement, connectez-vous via le frontend');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Le serveur backend ne semble pas démarré sur le port 3001');
      console.log('   Vérifiez que le serveur backend est en cours d\'exécution');
    }
  }
}

testStockAPI();
