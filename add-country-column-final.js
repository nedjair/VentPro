#!/usr/bin/env node

/**
 * Script pour ajouter définitivement la colonne country à la table companies
 * et réactiver l'initialisation des données de test
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🔧 AJOUT DÉFINITIF DE LA COLONNE COUNTRY\n');

async function addCountryColumn() {
  try {
    // 1. Aller dans le répertoire packages/database
    const databaseDir = path.join(__dirname, 'packages', 'database');
    console.log(`📁 Changement vers: ${databaseDir}`);
    process.chdir(databaseDir);
    
    // 2. Créer une migration Prisma
    console.log('\n🔄 Création d\'une migration Prisma...');
    try {
      execSync('npx prisma migrate dev --name add-country-to-companies', { 
        stdio: 'inherit',
        timeout: 60000 
      });
      console.log('✅ Migration créée et appliquée');
    } catch (error) {
      console.log('⚠️ Erreur de migration, tentative avec db push...');
      
      // Fallback: utiliser db push
      execSync('npx prisma db push', { 
        stdio: 'inherit',
        timeout: 60000 
      });
      console.log('✅ Base de données synchronisée avec db push');
    }
    
    // 3. Régénérer le client Prisma
    console.log('\n🔄 Régénération du client Prisma...');
    execSync('npx prisma generate', { 
      stdio: 'inherit',
      timeout: 60000 
    });
    console.log('✅ Client Prisma régénéré');
    
    console.log('\n🎉 COLONNE COUNTRY AJOUTÉE AVEC SUCCÈS !');
    console.log('📋 Prochaines étapes :');
    console.log('   1. Réactiver l\'initialisation des données dans database.ts');
    console.log('   2. Redémarrer le serveur backend');
    console.log('   3. Tester l\'application complète');
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    console.log('\n💡 Solutions alternatives :');
    console.log('   1. Vérifier que PostgreSQL est démarré');
    console.log('   2. Exécuter manuellement : npx prisma db push');
    console.log('   3. Ou ajouter la colonne via SQL direct');
    process.exit(1);
  }
}

// Exécuter la fonction
addCountryColumn();
