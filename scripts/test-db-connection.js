const { testDatabaseConnection } = require('../apps/backend/src/lib/database')

async function main() {
  const success = await testDatabaseConnection()
  if (success) {
    console.log('Connexion à la base de données réussie')
  } else {
    console.error('Échec de la connexion à la base de données')
  }
  process.exit(success ? 0 : 1)
}

main().catch((err) => {
  console.error('Erreur lors du test de connexion à la base de données:', err)
  process.exit(1)
})
