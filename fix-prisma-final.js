#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔧 CORRECTION FINALE DU CLIENT PRISMA\n');

try {
  // 1. Aller dans le répertoire packages/database
  const databaseDir = path.join(__dirname, 'packages', 'database');
  console.log(`📁 Changement vers: ${databaseDir}`);
  process.chdir(databaseDir);
  
  // 2. Vérifier que le schéma existe
  if (!fs.existsSync('schema.prisma')) {
    throw new Error('Fichier schema.prisma non trouvé');
  }
  console.log('✅ Schéma Prisma trouvé');
  
  // 3. Supprimer le cache Prisma
  console.log('\n🗑️ Suppression du cache Prisma...');
  try {
    if (fs.existsSync('node_modules/.prisma')) {
      fs.rmSync('node_modules/.prisma', { recursive: true, force: true });
      console.log('   ✅ Cache .prisma supprimé');
    }
    if (fs.existsSync('generated')) {
      fs.rmSync('generated', { recursive: true, force: true });
      console.log('   ✅ Dossier generated supprimé');
    }
  } catch (err) {
    console.log('   ⚠️ Erreur lors de la suppression du cache:', err.message);
  }
  
  // 4. Régénérer le client
  console.log('\n🔄 Génération du client Prisma...');
  execSync('npm run db:generate', { stdio: 'inherit' });
  console.log('✅ Client Prisma généré');
  
  // 5. Synchroniser la base de données
  console.log('\n🔄 Synchronisation de la base de données...');
  execSync('npm run db:push', { stdio: 'inherit' });
  console.log('✅ Base de données synchronisée');
  
  console.log('\n🎉 CORRECTION TERMINÉE AVEC SUCCÈS !');
  console.log('🚀 Vous pouvez maintenant redémarrer le serveur backend.');
  
} catch (error) {
  console.error('\n❌ ERREUR:', error.message);
  console.log('\n💡 Essayez manuellement :');
  console.log('   cd packages/database');
  console.log('   npm run db:generate');
  console.log('   npm run db:push');
  process.exit(1);
}
