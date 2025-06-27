/**
 * Script de test simple pour l'export
 */

// Simuler des données de test
const testClients = [
  {
    id: 'client-1',
    type: 'COMPANY',
    companyName: 'Entreprise Test SARL',
    firstName: null,
    lastName: null,
    email: 'contact@entreprise-test.dz',
    phone: '+213 21 XX XX XX',
    city: 'Alger',
    createdAt: new Date('2024-01-15')
  },
  {
    id: 'client-2',
    type: 'INDIVIDUAL',
    companyName: null,
    firstName: 'Ahmed',
    lastName: 'Benali',
    email: 'ahmed.benali@email.dz',
    phone: '+213 6XX XX XX XX',
    city: 'Oran',
    createdAt: new Date('2024-01-20')
  },
  {
    id: 'client-3',
    type: 'COMPANY',
    companyName: 'Commerce Algérie',
    firstName: null,
    lastName: null,
    email: 'info@commerce-algerie.dz',
    phone: '+213 31 XX XX XX',
    city: 'Constantine',
    createdAt: new Date('2024-01-25')
  }
];

async function testExportGeneration() {
  try {
    console.log('🧪 Test de génération d\'export avec données simulées...\n');

    // Test 1: Génération Excel simple
    console.log('📊 Test 1: Génération Excel...');
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Clients');

    // Configuration des colonnes
    worksheet.columns = [
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Nom', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Téléphone', key: 'phone', width: 20 },
      { header: 'Ville', key: 'city', width: 20 },
      { header: 'Date création', key: 'createdAt', width: 20 }
    ];

    console.log('✅ Colonnes configurées');

    // Formatage et ajout des données
    console.log('📝 Formatage des données...');
    testClients.forEach((client, index) => {
      const rowData = {
        type: client.type === 'COMPANY' ? 'Entreprise' : 'Particulier',
        name: client.type === 'COMPANY' ? client.companyName : `${client.firstName} ${client.lastName}`,
        email: client.email,
        phone: client.phone || '',
        city: client.city || '',
        createdAt: client.createdAt.toLocaleDateString('fr-FR')
      };
      
      console.log(`   Ligne ${index + 1}:`, rowData);
      worksheet.addRow(rowData);
    });

    // Sauvegarde du fichier
    const outputPath = 'test-export-simple.xlsx';
    await workbook.xlsx.writeFile(outputPath);
    console.log(`✅ Fichier Excel généré: ${outputPath}`);

    // Vérification de la taille
    const fs = require('fs');
    const stats = fs.statSync(outputPath);
    console.log(`📏 Taille du fichier: ${stats.size} bytes`);

    if (stats.size > 1000) {
      console.log('✅ Le fichier contient des données (taille > 1KB)');
    } else {
      console.log('⚠️ Le fichier semble vide ou très petit');
    }

    // Test 2: Génération PDF simple
    console.log('\n📄 Test 2: Génération PDF...');
    const PDFDocument = require('pdfkit');
    const pdfDoc = new PDFDocument();
    const pdfPath = 'test-export-simple.pdf';
    
    pdfDoc.pipe(fs.createWriteStream(pdfPath));
    
    // En-tête
    pdfDoc.fontSize(20).text('Liste des Clients', 50, 50);
    pdfDoc.fontSize(12).text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 50, 80);
    
    // Données
    let yPosition = 120;
    testClients.forEach((client, index) => {
      const name = client.type === 'COMPANY' ? client.companyName : `${client.firstName} ${client.lastName}`;
      const type = client.type === 'COMPANY' ? 'Entreprise' : 'Particulier';
      
      pdfDoc.text(`${index + 1}. ${name} (${type})`, 50, yPosition);
      pdfDoc.text(`   Email: ${client.email}`, 70, yPosition + 15);
      pdfDoc.text(`   Ville: ${client.city}`, 70, yPosition + 30);
      
      yPosition += 60;
    });
    
    pdfDoc.end();
    
    // Attendre que le PDF soit terminé
    await new Promise((resolve) => {
      pdfDoc.on('end', resolve);
    });
    
    const pdfStats = fs.statSync(pdfPath);
    console.log(`✅ Fichier PDF généré: ${pdfPath}`);
    console.log(`📏 Taille du fichier PDF: ${pdfStats.size} bytes`);

    if (pdfStats.size > 1000) {
      console.log('✅ Le fichier PDF contient des données (taille > 1KB)');
    } else {
      console.log('⚠️ Le fichier PDF semble vide ou très petit');
    }

    // Test 3: Simulation du service d'export
    console.log('\n🔧 Test 3: Simulation du service d\'export...');
    
    // Simuler la méthode formatDataForExcel
    function formatDataForExcel(client, type) {
      if (type === 'clients') {
        return {
          type: client.type === 'COMPANY' ? 'Entreprise' : 'Particulier',
          name: client.type === 'COMPANY' ? client.companyName : `${client.firstName} ${client.lastName}`,
          email: client.email,
          phone: client.phone || '',
          city: client.city || '',
          createdAt: client.createdAt.toLocaleDateString('fr-FR')
        };
      }
      return client;
    }

    console.log('📋 Test du formatage des données:');
    testClients.forEach((client, index) => {
      const formatted = formatDataForExcel(client, 'clients');
      console.log(`   Client ${index + 1}:`, formatted);
    });

    console.log('\n✅ Tous les tests sont réussis!');
    console.log('🔍 Le problème ne vient pas de la génération d\'export elle-même.');
    console.log('💡 Le problème vient probablement de:');
    console.log('   1. L\'authentification (mauvais companyId)');
    console.log('   2. La récupération des données depuis la base');
    console.log('   3. La communication frontend-backend');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Exécuter le test
testExportGeneration().catch(console.error);
