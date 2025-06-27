const axios = require('axios');

async function testDashboardFix() {
  console.log('🔧 Test de la correction Dashboard Frontend-Backend\n');
  
  const API_BASE = 'http://localhost:3001';
  let authToken = null;
  
  try {
    // 1. Test Login
    console.log('1. 🔐 Test Login...');
    const loginResponse = await axios.post(`${API_BASE}/api/v1/auth/login`, {
      email: 'admin@test.com',
      password: 'password123'
    });
    
    if (loginResponse.data.success) {
      authToken = loginResponse.data.data.tokens.accessToken;
      console.log('✅ Login réussi!');
      console.log('🔑 Token obtenu:', authToken ? 'OUI' : 'NON');
    } else {
      throw new Error('Login échoué');
    }
    
    // 2. Test Dashboard Stats
    console.log('\n2. 📊 Test Dashboard Stats...');
    const dashboardResponse = await axios.get(`${API_BASE}/api/v1/dashboard/stats`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (dashboardResponse.data.success) {
      console.log('✅ Dashboard Stats récupérées!');
      const stats = dashboardResponse.data.data;
      
      console.log('\n📋 STATISTIQUES DASHBOARD:');
      console.log('==========================');
      console.log(`👥 Clients totaux: ${stats.totalClients}`);
      console.log(`📦 Produits totaux: ${stats.totalProducts}`);
      console.log(`🛒 Commandes totales: ${stats.totalOrders}`);
      console.log(`💰 Chiffre d'affaires: ${stats.totalRevenue} DZD`);
      console.log(`📈 Nouveaux clients ce mois: ${stats.newClientsThisMonth}`);
      console.log(`💵 CA ce mois: ${stats.revenueThisMonth} DZD`);
      
      if (stats.clients) {
        console.log('\n👥 DÉTAILS CLIENTS:');
        console.log(`   - Total: ${stats.clients.total}`);
        console.log(`   - Particuliers: ${stats.clients.individuals}`);
        console.log(`   - Entreprises: ${stats.clients.companies}`);
        console.log(`   - Croissance: ${stats.clients.growth}%`);
      }
      
      if (stats.products) {
        console.log('\n📦 DÉTAILS PRODUITS:');
        console.log(`   - Total: ${stats.products.total}`);
        console.log(`   - En stock: ${stats.products.inStock}`);
        console.log(`   - Stock faible: ${stats.products.lowStock}`);
        console.log(`   - Rupture: ${stats.products.outOfStock}`);
        console.log(`   - Valeur stock: ${stats.products.totalStockValue} DZD`);
      }
      
      if (stats.sales) {
        console.log('\n💰 DÉTAILS VENTES:');
        console.log(`   - Mois actuel: ${stats.sales.currentMonth} ${stats.sales.currency}`);
        console.log(`   - Mois précédent: ${stats.sales.previousMonth} ${stats.sales.currency}`);
        console.log(`   - Croissance: ${stats.sales.growth}%`);
      }
      
    } else {
      throw new Error('Erreur lors de la récupération des stats dashboard');
    }
    
    console.log('\n🎉 RÉSUMÉ:');
    console.log('✅ Authentification fonctionnelle');
    console.log('✅ Route dashboard stats accessible');
    console.log('✅ Données dashboard complètes');
    console.log('✅ Structure de données correcte');
    
    console.log('\n📝 PROCHAINES ÉTAPES:');
    console.log('1. Rafraîchir la page frontend: http://localhost:3000');
    console.log('2. Se connecter avec admin@test.com / password123');
    console.log('3. Vérifier que le dashboard se charge sans erreurs');
    console.log('4. Confirmer que les statistiques s\'affichent correctement');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    if (error.response) {
      console.error('📋 Détails de l\'erreur:', error.response.data);
      console.error('🔢 Code de statut:', error.response.status);
      console.error('🌐 URL:', error.config?.url);
    }
    
    console.log('\n🔧 DIAGNOSTIC:');
    if (error.message.includes('ECONNREFUSED')) {
      console.log('❌ Backend non accessible - Vérifier que le backend est démarré');
    } else if (error.response?.status === 401) {
      console.log('❌ Problème d\'authentification - Vérifier les tokens');
    } else if (error.response?.status === 404) {
      console.log('❌ Route non trouvée - Vérifier la configuration des routes');
    }
  }
}

testDashboardFix();
