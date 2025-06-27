// Test de l'endpoint dashboard/stats avec la nouvelle structure
const http = require('http');

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'GET',
      timeout: 10000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

async function testDashboardStats() {
  console.log('🔍 Test de l\'endpoint /dashboard/stats...\n');

  try {
    const response = await makeRequest('/dashboard/stats');
    
    if (response.status === 200) {
      console.log('✅ Endpoint /dashboard/stats accessible');
      
      const stats = response.data.data;
      
      console.log('\n📊 STRUCTURE DES DONNÉES:');
      console.log('========================');
      
      // Vérifier la structure clients
      console.log('\n👥 CLIENTS:');
      console.log(`   - total: ${stats.clients?.total}`);
      console.log(`   - individuals: ${stats.clients?.individuals}`);
      console.log(`   - companies: ${stats.clients?.companies}`);
      console.log(`   - recentCount: ${stats.clients?.recentCount}`);
      console.log(`   - growth: ${stats.clients?.growth}`);
      
      // Vérifier la structure produits
      console.log('\n📦 PRODUITS:');
      console.log(`   - total: ${stats.products?.total}`);
      console.log(`   - inStock: ${stats.products?.inStock}`);
      console.log(`   - lowStock: ${stats.products?.lowStock}`);
      console.log(`   - outOfStock: ${stats.products?.outOfStock}`);
      console.log(`   - totalStockValue: ${stats.products?.totalStockValue}`);
      
      // Vérifier la structure ventes (CRITIQUE)
      console.log('\n💰 VENTES (SALES):');
      console.log(`   - currentMonth: ${stats.sales?.currentMonth}`);
      console.log(`   - previousMonth: ${stats.sales?.previousMonth}`);
      console.log(`   - month: ${stats.sales?.month} ← PROPRIÉTÉ ATTENDUE PAR LE FRONTEND`);
      console.log(`   - growth: ${stats.sales?.growth}`);
      console.log(`   - currency: ${stats.sales?.currency}`);
      
      // Vérifier la structure commandes
      console.log('\n📋 COMMANDES (ORDERS):');
      console.log(`   - total: ${stats.orders?.total}`);
      console.log(`   - pending: ${stats.orders?.pending}`);
      console.log(`   - processing: ${stats.orders?.processing} ← PROPRIÉTÉ ATTENDUE PAR LE FRONTEND`);
      console.log(`   - completed: ${stats.orders?.completed} ← PROPRIÉTÉ ATTENDUE PAR LE FRONTEND`);
      console.log(`   - accepted: ${stats.orders?.accepted}`);
      console.log(`   - rejected: ${stats.orders?.rejected}`);
      console.log(`   - averageValue: ${stats.orders?.averageValue}`);
      
      // Vérifier la structure factures
      console.log('\n💳 FACTURES (INVOICES):');
      console.log(`   - total: ${stats.invoices?.total}`);
      console.log(`   - paid: ${stats.invoices?.paid}`);
      console.log(`   - pending: ${stats.invoices?.pending}`);
      console.log(`   - overdue: ${stats.invoices?.overdue}`);
      console.log(`   - totalAmount: ${stats.invoices?.totalAmount}`);
      console.log(`   - paidAmount: ${stats.invoices?.paidAmount}`);
      console.log(`   - pendingAmount: ${stats.invoices?.pendingAmount}`);
      
      console.log('\n🎯 RÉSULTAT:');
      console.log('============');
      
      // Vérifier si toutes les propriétés critiques sont présentes
      const hasSalesMonth = stats.sales && typeof stats.sales.month !== 'undefined';
      const hasOrdersProcessing = stats.orders && typeof stats.orders.processing !== 'undefined';
      const hasOrdersCompleted = stats.orders && typeof stats.orders.completed !== 'undefined';
      
      if (hasSalesMonth && hasOrdersProcessing && hasOrdersCompleted) {
        console.log('✅ TOUTES LES PROPRIÉTÉS CRITIQUES SONT PRÉSENTES !');
        console.log('✅ Le frontend Next.js devrait maintenant fonctionner sans erreur !');
        console.log('');
        console.log('🌐 Testez maintenant: http://localhost:3003');
      } else {
        console.log('❌ PROPRIÉTÉS MANQUANTES:');
        if (!hasSalesMonth) console.log('   - sales.month manquante');
        if (!hasOrdersProcessing) console.log('   - orders.processing manquante');
        if (!hasOrdersCompleted) console.log('   - orders.completed manquante');
      }
      
    } else {
      console.log(`❌ Erreur HTTP: ${response.status}`);
      console.log(`   Réponse: ${JSON.stringify(response.data).substring(0, 200)}...`);
    }
    
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);
    console.log('💡 Vérifiez que le backend est démarré: node production-backend-fixed.js');
  }
}

testDashboardStats();
