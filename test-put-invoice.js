// Test simple de la route PUT pour les factures
const http = require('http');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonBody });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testInvoiceRoutes() {
  try {
    console.log('🧪 Test des routes de factures...');
    
    // 1. Test health check
    console.log('\n1. Test health check...');
    try {
      const healthResponse = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: '/health',
        method: 'GET',
        timeout: 5000
      });
      console.log('✅ Health check:', healthResponse.status, healthResponse.data.status);
    } catch (error) {
      console.log('❌ Health check failed:', error.message);
      return;
    }

    // 2. Login
    console.log('\n2. Login...');
    let token;
    try {
      const loginResponse = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: '/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }, {
        email: 'admin@demo-tpe.fr',
        password: 'demo123'
      });
      
      if (loginResponse.status === 200 && loginResponse.data.success) {
        token = loginResponse.data.token;
        console.log('✅ Login réussi');
      } else {
        console.log('❌ Login failed:', loginResponse.status, loginResponse.data);
        return;
      }
    } catch (error) {
      console.log('❌ Login error:', error.message);
      return;
    }

    // 3. Liste des factures
    console.log('\n3. Liste des factures...');
    try {
      const invoicesResponse = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: '/api/v1/invoices',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 5000
      });
      
      if (invoicesResponse.status === 200 && invoicesResponse.data.success) {
        const invoices = invoicesResponse.data.data;
        console.log(`✅ ${invoices.length} factures trouvées`);
        
        if (invoices.length > 0) {
          const firstInvoice = invoices[0];
          console.log(`📄 Test avec facture ID: ${firstInvoice.id}`);
          
          // 4. Test PUT - Mise à jour de la facture
          console.log('\n4. Test PUT - Mise à jour facture...');
          try {
            const updateResponse = await makeRequest({
              hostname: 'localhost',
              port: 3001,
              path: `/api/v1/invoices/${firstInvoice.id}`,
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              timeout: 5000
            }, {
              notes: `Facture mise à jour via test le ${new Date().toISOString()}`
            });
            
            if (updateResponse.status === 200 && updateResponse.data.success) {
              console.log('✅ PUT /api/v1/invoices/:id - SUCCESS!');
              console.log('📝 Message:', updateResponse.data.message);
              console.log('🎉 La route PUT fonctionne correctement!');
            } else {
              console.log('❌ PUT failed:', updateResponse.status, updateResponse.data);
            }
          } catch (error) {
            console.log('❌ PUT error:', error.message);
          }
          
        } else {
          console.log('⚠️ Aucune facture disponible pour le test');
        }
      } else {
        console.log('❌ Liste factures failed:', invoicesResponse.status, invoicesResponse.data);
      }
    } catch (error) {
      console.log('❌ Liste factures error:', error.message);
    }

    console.log('\n🎉 Tests terminés!');
    
  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

// Attendre un peu que le serveur soit prêt
setTimeout(testInvoiceRoutes, 1000);
