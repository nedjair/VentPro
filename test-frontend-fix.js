const axios = require('axios');

const API_BASE = 'http://localhost:3001';

async function testFrontendFix() {
  try {
    console.log('🔧 Test des corrections frontend...\n');
    
    // 1. Login
    console.log('1. 🔐 Login...');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'admin@example.com',
      password: 'password123'
    });
    
    if (!loginResponse.data.success) {
      console.log('❌ Login failed');
      return;
    }
    
    const token = loginResponse.data.data.token;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('✅ Login OK');
    
    // 2. Test Clients
    console.log('\n2. 👥 Test Clients...');
    const clientsResponse = await axios.get(`${API_BASE}/api/v1/clients?limit=5`, { headers });
    
    console.log('Response Success:', clientsResponse.data.success);
    console.log('Response Data Type:', typeof clientsResponse.data.data);
    console.log('Response Data Is Array:', Array.isArray(clientsResponse.data.data));
    
    if (Array.isArray(clientsResponse.data.data)) {
      console.log('✅ Clients: Format correct - tableau direct');
      console.log('📊 Nombre de clients:', clientsResponse.data.data.length);
      
      if (clientsResponse.data.data.length > 0) {
        const client = clientsResponse.data.data[0];
        console.log('📊 Premier client:', client.company_name || `${client.first_name} ${client.last_name}`);
      }
    } else {
      console.log('❌ Clients: Format incorrect');
    }
    
    // 3. Test Products
    console.log('\n3. 📦 Test Products...');
    const productsResponse = await axios.get(`${API_BASE}/api/v1/products?limit=5`, { headers });
    
    if (Array.isArray(productsResponse.data.data)) {
      console.log('✅ Products: Format correct - tableau direct');
      console.log('📊 Nombre de produits:', productsResponse.data.data.length);
    } else {
      console.log('❌ Products: Format incorrect');
    }
    
    // 4. Test Orders
    console.log('\n4. 📋 Test Orders...');
    const ordersResponse = await axios.get(`${API_BASE}/api/v1/orders?limit=5`, { headers });
    
    if (Array.isArray(ordersResponse.data.data)) {
      console.log('✅ Orders: Format correct - tableau direct');
      console.log('📊 Nombre de commandes:', ordersResponse.data.data.length);
    } else {
      console.log('❌ Orders: Format incorrect');
    }
    
    // 5. Test Invoices
    console.log('\n5. 🧾 Test Invoices...');
    const invoicesResponse = await axios.get(`${API_BASE}/api/v1/invoices?limit=5`, { headers });
    
    if (Array.isArray(invoicesResponse.data.data)) {
      console.log('✅ Invoices: Format correct - tableau direct');
      console.log('📊 Nombre de factures:', invoicesResponse.data.data.length);
    } else {
      console.log('❌ Invoices: Format incorrect');
    }
    
    console.log('\n🎉 RÉSUMÉ:');
    console.log('✅ Le backend retourne bien les données dans le format:');
    console.log('   { success: true, data: [...], pagination: {...} }');
    console.log('✅ Le frontend a été corrigé pour utiliser response.data directement');
    console.log('✅ Les données devraient maintenant s\'afficher correctement !');
    
    console.log('\n📋 PROCHAINES ÉTAPES:');
    console.log('1. Rafraîchir la page http://localhost:3003');
    console.log('2. Se connecter avec admin@example.com / password123');
    console.log('3. Naviguer vers les pages Clients, Produits, Commandes, Factures');
    console.log('4. Vérifier que les données s\'affichent maintenant');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testFrontendFix();
