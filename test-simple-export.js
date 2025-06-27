/**
 * Test très simple du service d'export
 */

console.log('🔍 Début du test...');

try {
  const ExcelJS = require('exceljs');
  console.log('✅ ExcelJS chargé');
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Test');
  console.log('✅ Workbook créé');
  
  // Ajouter des données simples
  worksheet.addRow(['Nom', 'Email']);
  worksheet.addRow(['Jean Dupont', 'jean@test.com']);
  console.log('✅ Données ajoutées');
  
  // Sauvegarder
  workbook.xlsx.writeFile('./test-simple.xlsx').then(() => {
    console.log('✅ Fichier sauvegardé: test-simple.xlsx');
  }).catch(error => {
    console.error('❌ Erreur sauvegarde:', error);
  });
  
} catch (error) {
  console.error('❌ Erreur:', error);
}
