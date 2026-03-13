#!/usr/bin/env node

const bcrypt = require('bcryptjs');

async function createValidHash() {
  console.log('🔧 Création d\'un hash valide pour test123\n');
  
  try {
    const password = 'test123';
    const hash = await bcrypt.hash(password, 12);
    
    console.log('✅ Hash généré:');
    console.log(`   Mot de passe: ${password}`);
    console.log(`   Hash: ${hash}`);
    
    // Vérifier que le hash fonctionne
    const isValid = await bcrypt.compare(password, hash);
    console.log(`   Vérification: ${isValid ? '✅ Valide' : '❌ Invalide'}`);
    
    console.log('\n📋 Hash à utiliser:');
    console.log(hash);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

createValidHash();
