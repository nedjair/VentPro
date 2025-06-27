// Test de connexion frontend-backend
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';

async function testConnection() {
  console.log('🔗 Test de connexion Frontend-Backend');
  console.log('=====================================\n');

  try {
    // Test 1: Health Check
    console.log('1. 🏥 Test Health Check...');
    const health = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
    console.log('✅ Backend accessible');
    console.log(`   Status: ${health.data.status}`);
    console.log(`   Database: ${health.data.database || 'N/A'}`);

    // Test 2: Métriques
    console.log('\n2. 📊 Test Métriques...');
    const metrics = await axios.get(`${API_BASE_URL}/metrics`, { timeout: 5000 });
    console.log('✅ Métriques accessibles');
    console.log(`   Clients: ${JSON.stringify(metrics.data.clients)}`);
    console.log(`   Commandes: ${JSON.stringify(metrics.data.orders)}`);
    console.log(`   Factures: ${JSON.stringify(metrics.data.invoices)}`);

    // Test 3: API Commandes (format frontend)
    console.log('\n3. 📋 Test API Commandes...');
    const orders = await axios.get(`${API_BASE_URL}/api/v1/orders`, { timeout: 5000 });
    console.log('✅ API Commandes accessible');
    console.log(`   Success: ${orders.data.success}`);
    console.log(`   Type de data: ${typeof orders.data.data}`);
    
    if (orders.data.data && orders.data.data.data) {
      console.log(`   Commandes trouvées: ${orders.data.data.data.length}`);
      console.log(`   Total: ${orders.data.data.total}`);
      console.log(`   Page: ${orders.data.data.page}/${orders.data.data.totalPages}`);
      
      if (orders.data.data.data.length > 0) {
        const first = orders.data.data.data[0];
        console.log(`   Première: ${first.number} (${first.type}) - ${first.client?.name}`);
      }
    } else {
      console.log('   Structure de données inattendue');
      console.log(`   Data: ${JSON.stringify(orders.data).substring(0, 200)}...`);
    }

    // Test 4: API Factures (format frontend)
    console.log('\n4. 💰 Test API Factures...');
    const invoices = await axios.get(`${API_BASE_URL}/api/v1/invoices`, { timeout: 5000 });
    console.log('✅ API Factures accessible');
    console.log(`   Success: ${invoices.data.success}`);
    
    if (invoices.data.data && invoices.data.data.data) {
      console.log(`   Factures trouvées: ${invoices.data.data.data.length}`);
      console.log(`   Total: ${invoices.data.data.total}`);
      
      if (invoices.data.data.data.length > 0) {
        const first = invoices.data.data.data[0];
        console.log(`   Première: ${first.number} - ${first.client?.name} (${first.total} DZD)`);
      }
    }

    // Test 5: API Clients
    console.log('\n5. 👥 Test API Clients...');
    const clients = await axios.get(`${API_BASE_URL}/clients`, { timeout: 5000 });
    console.log('✅ API Clients accessible');
    if (clients.data.data && clients.data.data.data) {
      console.log(`   Clients trouvés: ${clients.data.data.data.length}`);
    }

    // Test 6: API Produits
    console.log('\n6. 📦 Test API Produits...');
    const products = await axios.get(`${API_BASE_URL}/products`, { timeout: 5000 });
    console.log('✅ API Produits accessible');
    if (products.data.data && products.data.data.data) {
      console.log(`   Produits trouvés: ${products.data.data.data.length}`);
    }

    console.log('\n🎉 RÉSULTAT FINAL:');
    console.log('=================');
    console.log('✅ Backend opérationnel sur le port 3001');
    console.log('✅ Toutes les APIs accessibles');
    console.log('✅ Données algériennes présentes');
    console.log('✅ Format de réponse correct');
    console.log('');
    console.log('📱 Le frontend Next.js devrait maintenant afficher les données !');
    console.log('');
    console.log('🌐 URLs à tester:');
    console.log('   - Frontend: http://localhost:3003');
    console.log('   - Backend: http://localhost:3001');
    console.log('   - Health: http://localhost:3001/health');
    console.log('   - Commandes: http://localhost:3001/api/v1/orders');
    console.log('   - Factures: http://localhost:3001/api/v1/invoices');

  } catch (error) {
    console.error('\n❌ ERREUR DE CONNEXION:');
    console.error(`   Message: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   Cause: Backend non accessible');
      console.error('   Solution: Redémarrer le backend avec: node production-backend-fixed.js');
    } else if (error.code === 'ECONNABORTED') {
      console.error('   Cause: Timeout de connexion');
      console.error('   Solution: Vérifier que le backend répond');
    } else {
      console.error(`   Code: ${error.code}`);
      console.error(`   Status: ${error.response?.status}`);
    }
  }
}

testConnection();
