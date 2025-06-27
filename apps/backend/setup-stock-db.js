const { execSync } = require('child_process')
const path = require('path')

async function setupStockDatabase() {
  console.log('🚀 Configuration de la base de données pour le module Stock...')
  
  try {
    // Changer vers le répertoire packages/database
    const databasePath = path.join(__dirname, '..', '..', 'packages', 'database')
    console.log(`📁 Répertoire database: ${databasePath}`)
    
    // 1. Générer le client Prisma
    console.log('\n1️⃣ Génération du client Prisma...')
    try {
      execSync('npx prisma generate', { 
        cwd: databasePath, 
        stdio: 'inherit' 
      })
      console.log('✅ Client Prisma généré avec succès')
    } catch (error) {
      console.log('⚠️ Erreur lors de la génération du client:', error.message)
    }
    
    // 2. Appliquer les migrations
    console.log('\n2️⃣ Application des migrations...')
    try {
      execSync('npx prisma migrate deploy', { 
        cwd: databasePath, 
        stdio: 'inherit' 
      })
      console.log('✅ Migrations appliquées avec succès')
    } catch (error) {
      console.log('⚠️ Erreur lors de l\'application des migrations:', error.message)
    }
    
    // 3. Vérifier le statut
    console.log('\n3️⃣ Vérification du statut...')
    try {
      execSync('npx prisma migrate status', { 
        cwd: databasePath, 
        stdio: 'inherit' 
      })
    } catch (error) {
      console.log('⚠️ Erreur lors de la vérification:', error.message)
    }
    
    console.log('\n🎉 Configuration terminée!')
    console.log('💡 Vous pouvez maintenant redémarrer le serveur backend')
    
  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error.message)
  }
}

setupStockDatabase().catch(console.error)
