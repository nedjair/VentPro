#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🔄 SYNCHRONISATION DU SCHÉMA AVEC LA BASE DE DONNÉES\n');

try {
  // 1. Aller dans le répertoire packages/database
  const databaseDir = path.join(__dirname, 'packages', 'database');
  console.log(`📁 Changement vers: ${databaseDir}`);
  process.chdir(databaseDir);
  
  // 2. Vérifier le schéma
  console.log('\n📋 Vérification du schéma Prisma...');
  execSync('npx prisma format', { stdio: 'inherit' });
  console.log('✅ Schéma formaté et validé');
  
  // 3. Générer le client Prisma
  console.log('\n🔄 Génération du client Prisma...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Client Prisma généré');
  
  // 4. Synchroniser la base de données (ajouter les colonnes manquantes)
  console.log('\n🔄 Synchronisation de la base de données...');
  console.log('   ⚠️ Cette opération va ajouter les colonnes manquantes à la base de données');
  execSync('npx prisma db push', { stdio: 'inherit' });
  console.log('✅ Base de données synchronisée');
  
  console.log('\n🎉 SYNCHRONISATION TERMINÉE AVEC SUCCÈS !');
  console.log('✅ Le champ "country" a été ajouté à la table "companies"');
  console.log('🚀 Vous pouvez maintenant redémarrer le serveur backend.');
  
} catch (error) {
  console.error('\n❌ ERREUR:', error.message);
  console.log('\n💡 Essayez manuellement :');
  console.log('   cd packages/database');
  console.log('   npx prisma format');
  console.log('   npx prisma generate');
  console.log('   npx prisma db push');
  process.exit(1);
}
