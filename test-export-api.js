/**
 * Test de l'API d'export avec Node.js
 */

const axios = require('axios');
const fs = require('fs');

async function testExportAPI() {
  try {
    console.log('🔍 Test de l\'API d\'export...');
    
    // 1. Connexion
    console.log('🔐 Connexion...');
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      email: 'admin@test.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.data.tokens.accessToken;
    console.log('✅ Token obtenu:', token.substring(0, 20) + '...');
    
    // 2. Export des clients
    console.log('📊 Export des clients...');
    const exportResponse = await axios.get('http://localhost:3001/api/v1/clients/export/excel', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      responseType: 'stream'
    });
    
    console.log('✅ Réponse reçue, écriture du fichier...');
    
    // 3. Sauvegarder le fichier
    const writer = fs.createWriteStream('clients-export-test.xlsx');
    exportResponse.data.pipe(writer);
    
    writer.on('finish', () => {
      console.log('✅ Fichier sauvegardé: clients-export-test.xlsx');
      
      // Vérifier la taille du fichier
      const stats = fs.statSync('clients-export-test.xlsx');
      console.log(`📊 Taille du fichier: ${stats.size} bytes`);
    });
    
    writer.on('error', (error) => {
      console.error('❌ Erreur écriture fichier:', error);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

testExportAPI();
