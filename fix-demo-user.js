// Script pour créer/corriger l'utilisateur demo
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: 'postgresql://gestion_user:gestion_password_secure_2024@localhost:5432/gestion_commerciale',
  ssl: false
});

async function fixDemoUser() {
  try {
    console.log('🔧 CORRECTION DE L\'UTILISATEUR DEMO');
    console.log('===================================');
    
    const email = 'admin@demo-tpe.fr';
    const password = 'demo123';
    
    // Vérifier si l'utilisateur existe
    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userCheck.rows.length === 0) {
      console.log('👤 Création de l\'utilisateur demo...');
      
      // Créer l'utilisateur
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(`
        INSERT INTO users (email, password, first_name, last_name, role, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [email, hashedPassword, 'Admin', 'Demo', 'ADMIN', true]);
      
      console.log('✅ Utilisateur demo créé avec succès');
    } else {
      console.log('👤 Mise à jour du mot de passe demo...');
      
      // Mettre à jour le mot de passe
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query('UPDATE users SET password = $1 WHERE email = $2', [hashedPassword, email]);
      
      console.log('✅ Mot de passe demo mis à jour');
    }
    
    // Vérifier que ça fonctionne
    console.log('');
    console.log('🔍 VÉRIFICATION');
    console.log('===============');
    
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length > 0) {
      const userData = user.rows[0];
      console.log('✅ Utilisateur trouvé:');
      console.log('   Email:', userData.email);
      console.log('   Nom:', userData.first_name, userData.last_name);
      console.log('   Rôle:', userData.role);
      console.log('   Actif:', userData.is_active);
      
      // Tester le mot de passe
      const isValid = await bcrypt.compare(password, userData.password);
      console.log('   Mot de passe:', isValid ? '✅ VALIDE' : '❌ INVALIDE');
    }
    
    console.log('');
    console.log('🎉 CORRECTION TERMINÉE');
    console.log('Vous pouvez maintenant vous connecter avec:');
    console.log('   Email: admin@demo-tpe.fr');
    console.log('   Mot de passe: demo123');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
  }
}

fixDemoUser();
