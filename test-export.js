/**
 * Test simple du service d'export
 */

const ExportService = require('./export-service.js');

async function testExport() {
  try {
    console.log('🔍 Test du service d\'export...');
    
    const exportService = new ExportService();
    
    // Données de test
    const clients = [
      {
        id: '1',
        type: 'INDIVIDUAL',
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean.dupont@email.com',
        phone: '0123456789',
        city: 'Paris',
        createdAt: new Date()
      },
      {
        id: '2',
        type: 'COMPANY',
        companyName: 'ACME Corp',
        email: 'contact@acme.com',
        phone: '0987654321',
        city: 'Lyon',
        createdAt: new Date()
      }
    ];
    
    console.log('🔍 Données de test:', clients);
    
    const outputPath = './test-clients.xlsx';
    console.log('🔍 Génération du fichier:', outputPath);
    
    await exportService.generateExcelReport(clients, 'clients', outputPath);
    
    console.log('✅ Export réussi!');
    
    // Vérifier que le fichier existe
    const fs = require('fs');
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      console.log(`✅ Fichier créé: ${outputPath} (${stats.size} bytes)`);
    } else {
      console.log('❌ Fichier non créé');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

testExport();
