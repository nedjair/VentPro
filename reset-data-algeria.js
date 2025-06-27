// Script pour réinitialiser les données avec des données algériennes
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://gestion_user:gestion_password_secure_2024@localhost:5432/gestion_commerciale',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function resetDataWithAlgerianData() {
  try {
    console.log('🔄 Suppression des anciennes données...');
    
    // Supprimer les données dans l'ordre correct (contraintes de clés étrangères)
    await pool.query('DELETE FROM invoice_items');
    await pool.query('DELETE FROM order_items');
    await pool.query('DELETE FROM invoices');
    await pool.query('DELETE FROM orders');
    await pool.query('DELETE FROM products');
    await pool.query('DELETE FROM clients');
    
    console.log('✅ Anciennes données supprimées');
    console.log('✅ Données algériennes prêtes à être insérées');
    console.log('🚀 Redémarrez le backend pour insérer les nouvelles données');
    
  } catch (error) {
    console.error('❌ Erreur lors de la réinitialisation:', error);
  } finally {
    await pool.end();
  }
}

resetDataWithAlgerianData();
