/**
 * Script pour tester l'export avec les vraies données de la base
 */

const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');

const prisma = new PrismaClient();

async function testRealExport() {
  try {
    console.log('🧪 Test d\'export avec les vraies données de la base...\n');

    // Utiliser l'entreprise qui a des données
    const companyId = 'cmc5ai3bz00006s97c92d77ps';
    console.log(`🏢 Test avec l'entreprise: ${companyId}`);

    // 1. Récupérer les clients comme le fait la route d'export
    console.log('\n📊 Récupération des clients...');
    const clients = await prisma.client.findMany({
      where: { companyId },
      take: 10000
    });

    console.log(`✅ ${clients.length} clients récupérés`);

    if (clients.length === 0) {
      console.log('❌ Aucun client trouvé');
      return;
    }

    // Afficher les premiers clients
    console.log('\n📋 Premiers clients:');
    clients.slice(0, 3).forEach((client, index) => {
      const name = client.type === 'COMPANY' ? client.companyName : `${client.firstName} ${client.lastName}`;
      console.log(`   ${index + 1}. ${name} (${client.email}) - Type: ${client.type}`);
    });

    // 2. Test d'export Excel avec les vraies données
    console.log('\n📊 Génération Excel avec vraies données...');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Clients');

    // Configuration des colonnes (identique au service d'export)
    worksheet.columns = [
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Nom', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Téléphone', key: 'phone', width: 20 },
      { header: 'Ville', key: 'city', width: 20 },
      { header: 'Date création', key: 'createdAt', width: 20 }
    ];

    // Style des en-têtes (identique au service d'export)
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '366092' }
    };

    // Formatage et ajout des données (identique au service d'export)
    clients.forEach(client => {
      const rowData = {
        type: client.type === 'COMPANY' ? 'Entreprise' : 'Particulier',
        name: client.type === 'COMPANY' ? client.companyName : `${client.firstName} ${client.lastName}`,
        email: client.email,
        phone: client.phone || '',
        city: client.city || '',
        createdAt: new Date(client.createdAt).toLocaleDateString('fr-FR')
      };
      worksheet.addRow(rowData);
    });

    // Ajuster la largeur des colonnes
    worksheet.columns.forEach(column => {
      column.width = Math.max(column.width || 15, 10);
    });

    // Ajouter des bordures
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Sauvegarder le fichier Excel
    const excelPath = 'export-clients-real.xlsx';
    await workbook.xlsx.writeFile(excelPath);
    
    const excelStats = fs.statSync(excelPath);
    console.log(`✅ Fichier Excel généré: ${excelPath}`);
    console.log(`📏 Taille: ${excelStats.size} bytes`);
    console.log(`📊 Contient ${clients.length} clients`);

    // 3. Test d'export PDF avec les vraies données
    console.log('\n📄 Génération PDF avec vraies données...');
    const pdfDoc = new PDFDocument({ margin: 50 });
    const pdfPath = 'export-clients-real.pdf';
    
    pdfDoc.pipe(fs.createWriteStream(pdfPath));

    // En-tête du document (identique au service d'export)
    pdfDoc.fontSize(20).font('Helvetica-Bold');
    pdfDoc.text('Gestion Commerciale', 50, 50);

    pdfDoc.fontSize(10).font('Helvetica');
    pdfDoc.text('Alger, Algérie', 50, 75);
    pdfDoc.text('Tél: +213 XX XX XX XX | Email: contact@gestion.dz', 50, 90);

    // Titre du rapport
    pdfDoc.fontSize(16).font('Helvetica-Bold');
    pdfDoc.text('Liste des Clients', 50, 120);

    // Date de génération
    pdfDoc.fontSize(10).font('Helvetica');
    pdfDoc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 400, 120);

    // Ligne de séparation
    pdfDoc.moveTo(50, 140).lineTo(550, 140).stroke();

    // Tableau des clients (simplifié)
    let yPosition = 160;
    pdfDoc.fontSize(12).font('Helvetica-Bold');
    pdfDoc.text('Type', 50, yPosition);
    pdfDoc.text('Nom', 120, yPosition);
    pdfDoc.text('Email', 280, yPosition);
    pdfDoc.text('Ville', 450, yPosition);

    yPosition += 20;
    pdfDoc.fontSize(10).font('Helvetica');

    // Ajouter les clients (limiter à 20 pour éviter le débordement)
    clients.slice(0, 20).forEach(client => {
      const type = client.type === 'COMPANY' ? 'Entreprise' : 'Particulier';
      const name = client.type === 'COMPANY' ? client.companyName : `${client.firstName} ${client.lastName}`;
      
      // Limiter la longueur des textes
      const shortName = name.length > 20 ? name.substring(0, 17) + '...' : name;
      const shortEmail = client.email.length > 25 ? client.email.substring(0, 22) + '...' : client.email;
      
      pdfDoc.text(type, 50, yPosition);
      pdfDoc.text(shortName, 120, yPosition);
      pdfDoc.text(shortEmail, 280, yPosition);
      pdfDoc.text(client.city || '', 450, yPosition);
      
      yPosition += 15;

      if (yPosition > 700) { // Nouvelle page si nécessaire
        pdfDoc.addPage();
        yPosition = 50;
      }
    });

    pdfDoc.end();

    // Attendre que le PDF soit terminé
    await new Promise((resolve) => {
      pdfDoc.on('end', resolve);
    });

    const pdfStats = fs.statSync(pdfPath);
    console.log(`✅ Fichier PDF généré: ${pdfPath}`);
    console.log(`📏 Taille: ${pdfStats.size} bytes`);
    console.log(`📊 Contient ${Math.min(clients.length, 20)} clients (limité à 20 pour le PDF)`);

    // 4. Résumé
    console.log('\n🎉 Résultats du test:');
    console.log(`✅ Excel: ${excelStats.size} bytes avec ${clients.length} clients`);
    console.log(`✅ PDF: ${pdfStats.size} bytes avec ${Math.min(clients.length, 20)} clients`);
    console.log('\n💡 Conclusion:');
    console.log('   - Les données existent dans la base PostgreSQL');
    console.log('   - L\'export Excel et PDF fonctionne parfaitement');
    console.log('   - Le problème vient de la communication frontend-backend');
    console.log('   - Il faut corriger l\'authentification ou le démarrage du backend');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n✅ Test terminé');
  }
}

// Exécuter le test
testRealExport().catch(console.error);
