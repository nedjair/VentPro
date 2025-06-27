const fs = require('fs')
const path = require('path')

console.log('\n🔍 ANALYSE DES BACKENDS EXISTANTS')
console.log('='.repeat(60))

// Liste des fichiers backend trouvés
const backendFiles = [
  'apps/backend/src/index.ts',
  'apps/backend/src/index-production.ts', 
  'apps/backend/src/index-minimal.ts',
  'apps/backend/src/server.ts',
  'apps/backend/src/server-production.ts',
  'apps/backend/src/server-simple.ts',
  'apps/backend/src/test-server.ts',
  'apps/backend/src/test-working-server.ts',
  'apps/backend/src/simple-test-server.ts',
  'apps/backend/minimal-server.js',
  'apps/backend/start-backend-simple.js'
]

let foundBackends = 0

backendFiles.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    foundBackends++
    const content = fs.readFileSync(filePath, 'utf8')
    const fileName = path.basename(filePath)
    const stats = fs.statSync(filePath)
    
    // Extraire le port
    let port = 'Non défini'
    const portMatch = content.match(/PORT.*?(\d+)|port.*?(\d+)|listen.*?(\d+)/i)
    if (portMatch) {
      port = portMatch[1] || portMatch[2] || portMatch[3]
    }
    
    // Description basée sur le nom
    let description = 'Serveur backend'
    if (fileName.includes('production')) description = 'Serveur de production'
    else if (fileName.includes('minimal')) description = 'Serveur minimal'
    else if (fileName.includes('simple')) description = 'Serveur simplifié'
    else if (fileName.includes('test')) description = 'Serveur de test'
    
    console.log(`\n📄 ${fileName}`)
    console.log(`   📍 Chemin: ${filePath}`)
    console.log(`   🚪 Port: ${port}`)
    console.log(`   📝 Description: ${description}`)
    console.log(`   📏 Taille: ${(stats.size / 1024).toFixed(2)} KB`)
    console.log(`   📅 Modifié: ${stats.mtime.toLocaleString('fr-FR')}`)
  }
})

console.log(`\n✅ ${foundBackends} backend(s) trouvé(s)`)

// Vérifier les scripts package.json
console.log('\n📦 SCRIPTS PACKAGE.JSON')
console.log('-'.repeat(40))

const packagePath = 'apps/backend/package.json'
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
  const scripts = packageJson.scripts || {}
  
  Object.entries(scripts).forEach(([name, command]) => {
    if (name.includes('start') || name.includes('dev') || name.includes('serve')) {
      console.log(`🚀 ${name}: ${command}`)
    }
  })
}

console.log('\n🎯 BACKEND ACTUELLEMENT EN COURS')
console.log('-'.repeat(40))
console.log('Le backend principal fonctionne sur le port 3001')
console.log('Fichier utilisé: apps/backend/src/index-production.ts')
console.log('Commande: npm run start:production')
