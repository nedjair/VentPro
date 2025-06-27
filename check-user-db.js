// Script pour vérifier l'utilisateur dans la base de données
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: 'postgresql://gestion_user:gestion_password_secure_2024@localhost:5432/gestion_commerciale',
  ssl: false
});

async function checkUser() {
  try {
    console.log('🔍 VÉRIFICATION DE L\'UTILISATEUR DANS LA BASE DE DONNÉES');
    console.log('=====================================================');
    
    // Rechercher l'utilisateur
    const userQuery = 'SELECT * FROM users WHERE email = $1';
    const userResult = await pool.query(userQuery, ['admin@demo-tpe.fr']);
    
    if (userResult.rows.length === 0) {
      console.log('❌ Utilisateur non trouvé dans la base de données');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('✅ Utilisateur trouvé:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Prénom:', user.first_name);
    console.log('   Nom:', user.last_name);
    console.log('   Rôle:', user.role);
    console.log('   Créé le:', user.created_at);
    console.log('   Hash du mot de passe:', user.password_hash.substring(0, 20) + '...');
    
    // Tester le mot de passe
    console.log('');
    console.log('🔐 TEST DU MOT DE PASSE');
    console.log('======================');
    
    const testPassword = 'demo123';
    console.log('Mot de passe testé:', testPassword);
    
    const isValid = await bcrypt.compare(testPassword, user.password_hash);
    
    if (isValid) {
      console.log('✅ Mot de passe VALIDE');
    } else {
      console.log('❌ Mot de passe INVALIDE');
      
      // Tester d'autres mots de passe possibles
      const otherPasswords = ['password123', 'admin123', 'demo', 'admin'];
      console.log('');
      console.log('🔍 Test d\'autres mots de passe possibles:');
      
      for (const pwd of otherPasswords) {
        const testResult = await bcrypt.compare(pwd, user.password_hash);
        console.log(`   ${pwd}: ${testResult ? '✅ VALIDE' : '❌ Invalide'}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
  }
}

checkUser();
