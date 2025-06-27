/**
 * Test de connexion PostgreSQL
 * Teste différentes configurations de connexion
 */

const { Client } = require('pg')

// Configurations possibles
const configs = [
  {
    name: 'Configuration par défaut (postgres/postgres)',
    config: {
      host: 'localhost',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: 'postgres'
    }
  },
  {
    name: 'Configuration sans mot de passe',
    config: {
      host: 'localhost',
      port: 5432,
      database: 'postgres',
      user: 'postgres'
    }
  },
  {
    name: 'Configuration avec utilisateur système',
    config: {
      host: 'localhost',
      port: 5432,
      database: 'postgres',
      user: process.env.USERNAME || 'postgres'
    }
  },
  {
    name: 'Configuration existante de l\'application',
    config: {
      host: 'localhost',
      port: 5432,
      database: 'gestion_commerciale',
      user: 'gestion_user',
      password: 'gestion_password_secure_2024'
    }
  }
]

async function testConnection(name, config) {
  console.log(`\n🔍 Test: ${name}`)
  console.log(`   Host: ${config.host}:${config.port}`)
  console.log(`   Database: ${config.database}`)
  console.log(`   User: ${config.user}`)
  console.log(`   Password: ${config.password ? '***' : 'aucun'}`)
  
  const client = new Client(config)
  
  try {
    await client.connect()
    console.log('   ✅ Connexion réussie')
    
    // Test d'une requête simple
    const result = await client.query('SELECT version()')
    console.log(`   📊 PostgreSQL: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`)
    
    // Lister les bases de données
    const dbResult = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false')
    console.log(`   🗄️ Bases de données: ${dbResult.rows.map(row => row.datname).join(', ')}`)
    
    await client.end()
    return true
    
  } catch (error) {
    console.log(`   ❌ Échec: ${error.message}`)
    if (error.code) {
      console.log(`   📋 Code: ${error.code}`)
    }
    try {
      await client.end()
    } catch (e) {
      // Ignorer les erreurs de fermeture
    }
    return false
  }
}

async function main() {
  console.log('🚀 TEST DE CONNEXION POSTGRESQL')
  console.log('=' * 50)
  
  let successfulConfig = null
  
  for (const { name, config } of configs) {
    const success = await testConnection(name, config)
    if (success && !successfulConfig) {
      successfulConfig = { name, config }
    }
  }
  
  console.log('\n📊 RÉSUMÉ')
  console.log('=' * 20)
  
  if (successfulConfig) {
    console.log('✅ Connexion PostgreSQL réussie !')
    console.log(`🔧 Configuration fonctionnelle: ${successfulConfig.name}`)
    console.log('\n💡 Recommandations:')
    console.log('1. Utilisez cette configuration pour setup-database.js')
    console.log('2. Vérifiez que le fichier .env du backend correspond')
    console.log('3. Exécutez les migrations Prisma')
  } else {
    console.log('❌ Aucune connexion PostgreSQL réussie')
    console.log('\n🔧 Actions à effectuer:')
    console.log('1. Vérifiez que PostgreSQL est démarré')
    console.log('2. Vérifiez les identifiants de connexion')
    console.log('3. Consultez les logs PostgreSQL')
    console.log('4. Vérifiez la configuration pg_hba.conf')
  }
  
  console.log('\n🔗 Commandes utiles:')
  console.log('- Vérifier le service: Get-Service -Name "*postgres*"')
  console.log('- Vérifier le port: netstat -an | findstr ":5432"')
  console.log('- Logs PostgreSQL: dans le dossier d\'installation PostgreSQL')
}

// Exécuter le test
if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Erreur fatale:', error.message)
    process.exit(1)
  })
}
