/**
 * Script pour tester l'authentification et l'export via l'API backend
 */

const https = require('https');
const http = require('http');

const API_BASE_URL = 'http://localhost:3001';

// Fonction utilitaire pour faire des requêtes HTTP
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsedData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsedData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testBackendAuth() {
  try {
    console.log('🧪 Test de l\'authentification et export backend...\n');

    // 1. Test de santé
    console.log('📡 Test de santé du backend...');
    const healthResponse = await makeRequest(`${API_BASE_URL}/health`);
    console.log(`✅ Backend: ${healthResponse.status} - ${healthResponse.data.status}`);

    // 2. Test de connexion
    console.log('\n🔐 Test de connexion...');
    const loginData = {
      email: 'test@example.com',
      password: 'test123'
    };

    const loginResponse = await makeRequest(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      body: JSON.stringify(loginData)
    });

    console.log(`Status: ${loginResponse.status}`);
    console.log(`Response:`, loginResponse.data);

    if (loginResponse.status !== 200 || !loginResponse.data.success) {
      console.log('❌ Échec de la connexion');
      
      // Essayer avec d'autres utilisateurs
      console.log('\n🔄 Essai avec d\'autres utilisateurs...');
      const otherUsers = [
        { email: 'admin@gestion.dz', password: 'admin123' },
        { email: 'admin@example.com', password: 'password' },
        { email: 'user@example.com', password: 'password' }
      ];

      for (const user of otherUsers) {
        console.log(`   Essai: ${user.email} / ${user.password}`);
        const testLogin = await makeRequest(`${API_BASE_URL}/api/v1/auth/login`, {
          method: 'POST',
          body: JSON.stringify(user)
        });
        
        if (testLogin.status === 200 && testLogin.data.success) {
          console.log(`   ✅ Connexion réussie avec ${user.email}`);
          loginResponse.data = testLogin.data;
          break;
        } else {
          console.log(`   ❌ Échec avec ${user.email}: ${testLogin.data.message || 'Erreur'}`);
        }
      }
    }

    if (!loginResponse.data.success) {
      console.log('❌ Impossible de se connecter avec aucun utilisateur');
      return;
    }

    const token = loginResponse.data.data.tokens.accessToken;
    console.log(`✅ Connexion réussie! Token: ${token.substring(0, 20)}...`);

    // 3. Test de récupération des clients
    console.log('\n📊 Test de récupération des clients...');
    const clientsResponse = await makeRequest(`${API_BASE_URL}/api/v1/clients`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Status: ${clientsResponse.status}`);
    if (clientsResponse.status === 200) {
      console.log(`✅ ${clientsResponse.data.data.data.length} clients récupérés`);
      console.log(`Total: ${clientsResponse.data.data.pagination.total}`);
      
      if (clientsResponse.data.data.data.length > 0) {
        const firstClient = clientsResponse.data.data.data[0];
        console.log(`Premier client: ${firstClient.type === 'COMPANY' ? firstClient.companyName : `${firstClient.firstName} ${firstClient.lastName}`}`);
      }
    } else {
      console.log(`❌ Erreur récupération clients: ${clientsResponse.data.message || 'Erreur inconnue'}`);
    }

    // 4. Test d'export Excel
    console.log('\n📊 Test d\'export Excel...');
    const excelResponse = await makeRequest(`${API_BASE_URL}/api/v1/clients/export/excel`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Status: ${excelResponse.status}`);
    if (excelResponse.status === 200) {
      console.log(`✅ Export Excel réussi!`);
      console.log(`Content-Type: ${excelResponse.headers['content-type']}`);
      console.log(`Content-Length: ${excelResponse.headers['content-length'] || 'Non spécifié'}`);
      
      if (excelResponse.headers['content-length']) {
        const size = parseInt(excelResponse.headers['content-length']);
        if (size > 1000) {
          console.log(`✅ Le fichier contient des données (${size} bytes)`);
        } else {
          console.log(`⚠️ Le fichier semble vide ou très petit (${size} bytes)`);
        }
      }
    } else {
      console.log(`❌ Erreur export Excel: ${excelResponse.data.message || 'Erreur inconnue'}`);
      console.log(`Response:`, excelResponse.data);
    }

    // 5. Test d'export PDF
    console.log('\n📄 Test d\'export PDF...');
    const pdfResponse = await makeRequest(`${API_BASE_URL}/api/v1/clients/export/pdf`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Status: ${pdfResponse.status}`);
    if (pdfResponse.status === 200) {
      console.log(`✅ Export PDF réussi!`);
      console.log(`Content-Type: ${pdfResponse.headers['content-type']}`);
      console.log(`Content-Length: ${pdfResponse.headers['content-length'] || 'Non spécifié'}`);
      
      if (pdfResponse.headers['content-length']) {
        const size = parseInt(pdfResponse.headers['content-length']);
        if (size > 1000) {
          console.log(`✅ Le fichier contient des données (${size} bytes)`);
        } else {
          console.log(`⚠️ Le fichier semble vide ou très petit (${size} bytes)`);
        }
      }
    } else {
      console.log(`❌ Erreur export PDF: ${pdfResponse.data.message || 'Erreur inconnue'}`);
      console.log(`Response:`, pdfResponse.data);
    }

    console.log('\n🎉 Tests terminés!');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Exécuter le test
testBackendAuth().catch(console.error);
