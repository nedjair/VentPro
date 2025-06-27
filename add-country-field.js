#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

console.log('🔧 AJOUT DU CHAMP COUNTRY À LA TABLE COMPANIES\n');

async function addCountryField() {
  const client = new Client({
    connectionString: 'postgresql://gestion_user:gestion_password_secure_2024@localhost:5432/gestion_commerciale'
  });

  try {
    console.log('📡 Connexion à la base de données...');
    await client.connect();
    console.log('✅ Connexion établie');

    // Lire le script SQL
    const sqlScript = fs.readFileSync('add-country-field.sql', 'utf8');
    
    console.log('\n🔄 Exécution du script SQL...');
    const result = await client.query(sqlScript);
    
    console.log('✅ Script SQL exécuté avec succès');
    
    // Vérifier que la colonne a été ajoutée
    console.log('\n🔍 Vérification de la colonne country...');
    const checkResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'companies' 
      AND column_name = 'country'
    `);
    
    if (checkResult.rows.length > 0) {
      const column = checkResult.rows[0];
      console.log('✅ Colonne country trouvée:');
      console.log(`   - Type: ${column.data_type}`);
      console.log(`   - Nullable: ${column.is_nullable}`);
      console.log(`   - Défaut: ${column.column_default}`);
    } else {
      console.log('❌ Colonne country non trouvée');
    }
    
    // Vérifier les données existantes
    console.log('\n📊 Vérification des données existantes...');
    const dataResult = await client.query('SELECT id, name, country FROM companies LIMIT 5');
    
    if (dataResult.rows.length > 0) {
      console.log('✅ Données trouvées:');
      dataResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.name} - ${row.country}`);
      });
    } else {
      console.log('ℹ️ Aucune donnée trouvée dans la table companies');
    }
    
    console.log('\n🎉 AJOUT DU CHAMP COUNTRY TERMINÉ AVEC SUCCÈS !');
    console.log('🚀 Vous pouvez maintenant redémarrer le serveur backend.');
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    console.log('\n💡 Vérifiez que :');
    console.log('   - PostgreSQL est démarré');
    console.log('   - La base de données "gestion_commerciale" existe');
    console.log('   - L\'utilisateur "gestion_user" a les permissions nécessaires');
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Exécuter la fonction
addCountryField();
