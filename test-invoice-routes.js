// Script pour tester les routes de factures
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testInvoiceRoutes() {
  try {
    console.log('🧪 Test des routes de factures...');
    
    // 1. Test de la route health
    console.log('\n1. Test de la route health...');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/health`);
      console.log('✅ Health check:', healthResponse.data);
    } catch (error) {
      console.log('❌ Health check failed:', error.message);
      return;
    }
    
    // 2. Login pour obtenir un token
    console.log('\n2. Login pour obtenir un token...');
    let token;
    try {
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'admin@demo-tpe.fr',
        password: 'demo123'
      });
      token = loginResponse.data.token;
      console.log('✅ Login réussi, token obtenu');
    } catch (error) {
      console.log('❌ Login failed:', error.response?.data || error.message);
      return;
    }
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 3. Test GET /api/v1/invoices (liste des factures)
    console.log('\n3. Test GET /api/v1/invoices...');
    try {
      const invoicesResponse = await axios.get(`${BASE_URL}/api/v1/invoices`, { headers });
      console.log('✅ Liste des factures:', invoicesResponse.data.data?.length || 0, 'factures trouvées');
      
      if (invoicesResponse.data.data && invoicesResponse.data.data.length > 0) {
        const firstInvoice = invoicesResponse.data.data[0];
        console.log('📄 Première facture ID:', firstInvoice.id);
        
        // 4. Test GET /api/v1/invoices/:id (détail d'une facture)
        console.log('\n4. Test GET /api/v1/invoices/:id...');
        try {
          const invoiceDetailResponse = await axios.get(`${BASE_URL}/api/v1/invoices/${firstInvoice.id}`, { headers });
          console.log('✅ Détail de la facture:', invoiceDetailResponse.data.data.number);
          
          // 5. Test PUT /api/v1/invoices/:id (mise à jour d'une facture)
          console.log('\n5. Test PUT /api/v1/invoices/:id...');
          try {
            const updateData = {
              notes: `Facture mise à jour le ${new Date().toISOString()}`
            };
            
            const updateResponse = await axios.put(`${BASE_URL}/api/v1/invoices/${firstInvoice.id}`, updateData, { headers });
            console.log('✅ Mise à jour de la facture réussie:', updateResponse.data.message);
            
            // 6. Test PATCH /api/v1/invoices/:id/status (changement de statut)
            console.log('\n6. Test PATCH /api/v1/invoices/:id/status...');
            try {
              const statusData = { status: 'SENT' };
              const statusResponse = await axios.patch(`${BASE_URL}/api/v1/invoices/${firstInvoice.id}/status`, statusData, { headers });
              console.log('✅ Changement de statut réussi:', statusResponse.data.message);
            } catch (error) {
              console.log('❌ Changement de statut failed:', error.response?.data || error.message);
            }
            
          } catch (error) {
            console.log('❌ Mise à jour failed:', error.response?.data || error.message);
          }
          
        } catch (error) {
          console.log('❌ Détail facture failed:', error.response?.data || error.message);
        }
      } else {
        console.log('⚠️ Aucune facture trouvée pour tester les routes individuelles');
      }
      
    } catch (error) {
      console.log('❌ Liste factures failed:', error.response?.data || error.message);
    }
    
    console.log('\n🎉 Tests terminés !');
    
  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

// Attendre un peu que le serveur soit prêt
setTimeout(testInvoiceRoutes, 2000);
