#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔧 Régénération du client Prisma dans packages/database...\n');

try {
  console.log('📁 Répertoire courant:', process.cwd());
  
  console.log('1️⃣ Génération du client Prisma...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  console.log('\n2️⃣ Synchronisation de la base de données...');
  execSync('npx prisma db push --force-reset', { stdio: 'inherit' });
  
  console.log('\n✅ Régénération terminée avec succès !');
  console.log('🚀 Vous pouvez maintenant redémarrer le serveur backend.');
  
} catch (error) {
  console.error('❌ Erreur lors de la régénération:', error.message);
  process.exit(1);
}
