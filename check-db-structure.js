// Script pour vérifier la structure de la base de données
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://gestion_user:gestion_password_secure_2024@localhost:5432/gestion_commerciale',
  ssl: false
});

async function checkDatabase() {
  try {
    console.log('🔍 Vérification de la structure de la base de données...');
    
    // Vérifier si la table users existe
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    `);
    
    if (tablesResult.rows.length === 0) {
      console.log('❌ Table users n\'existe pas');
      return;
    }
    
    console.log('✅ Table users existe');
    
    // Vérifier la structure de la table users
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Structure de la table users:');
    columnsResult.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });
    
    // Vérifier s'il y a des utilisateurs
    const usersCount = await pool.query('SELECT COUNT(*) FROM users');
    console.log(`\n👥 Nombre d'utilisateurs: ${usersCount.rows[0].count}`);
    
    if (usersCount.rows[0].count > 0) {
      const users = await pool.query('SELECT id, email, first_name, last_name, role, is_active FROM users LIMIT 5');
      console.log('\n👤 Utilisateurs existants:');
      users.rows.forEach(user => {
        console.log(`  - ${user.email} (${user.first_name} ${user.last_name}) - ${user.role} - ${user.is_active ? 'Actif' : 'Inactif'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
  }
}

checkDatabase();
