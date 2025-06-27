const { execSync } = require('child_process')
const path = require('path')

console.log('🔧 Correction de la base de données PostgreSQL...\n')

const backendDir = path.join(__dirname, 'apps', 'backend')

try {
  console.log('1️⃣ Génération du client Prisma...')
  execSync('npx prisma generate', { 
    cwd: backendDir, 
    stdio: 'inherit' 
  })
  
  console.log('\n2️⃣ Synchronisation de la base de données avec le schéma...')
  execSync('npx prisma db push --force-reset', { 
    cwd: backendDir, 
    stdio: 'inherit' 
  })
  
  console.log('\n✅ Base de données corrigée avec succès !')
  console.log('🚀 Vous pouvez maintenant redémarrer le serveur backend.')
  
} catch (error) {
  console.error('❌ Erreur lors de la correction:', error.message)
  console.log('\n💡 Essayez de corriger manuellement :')
  console.log('   cd apps/backend')
  console.log('   npx prisma generate')
  console.log('   npx prisma db push --force-reset')
}
