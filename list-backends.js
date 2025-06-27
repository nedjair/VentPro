const fs = require('fs')
const path = require('path')

function logSuccess(message) {
  console.log(`\x1b[32m✅ ${message}\x1b[0m`)
}

function logInfo(message) {
  console.log(`\x1b[36mℹ️  ${message}\x1b[0m`)
}

function logWarning(message) {
  console.log(`\x1b[33m⚠️  ${message}\x1b[0m`)
}

function logError(message) {
  console.log(`\x1b[31m❌ ${message}\x1b[0m`)
}

function logHeader(message) {
  console.log(`\x1b[35m\n🔍 ${message}\x1b[0m`)
  console.log('='.repeat(60))
}

function logSubHeader(message) {
  console.log(`\x1b[34m\n📂 ${message}\x1b[0m`)
  console.log('-'.repeat(40))
}

function readFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8')
  } catch (error) {
    return null
  }
}

function extractPortFromFile(content) {
  if (!content) return null
  
  // Rechercher différents patterns de port
  const patterns = [
    /PORT\s*[=:]\s*(\d+)/i,
    /port\s*[=:]\s*(\d+)/i,
    /listen\s*\(\s*\{\s*port\s*:\s*(\d+)/i,
    /listen\s*\(\s*(\d+)/i,
    /\.listen\s*\(\s*\{\s*port\s*:\s*(\d+)/i,
    /process\.env\.PORT\s*\|\|\s*['"]*(\d+)['"]*/ 
  ]
  
  for (const pattern of patterns) {
    const match = content.match(pattern)
    if (match) {
      return parseInt(match[1])
    }
  }
  
  return null
}

function extractDescriptionFromFile(content, fileName) {
  if (!content) return 'Aucune description disponible'
  
  // Rechercher des commentaires descriptifs
  const lines = content.split('\n').slice(0, 10) // Premières lignes
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      const comment = trimmed.replace(/^\/\/\s*|^\*\s*|^\/\*\s*/, '').trim()
      if (comment.length > 10 && !comment.includes('eslint') && !comment.includes('prettier')) {
        return comment
      }
    }
  }
  
  // Fallback basé sur le nom du fichier
  if (fileName.includes('production')) return 'Serveur de production'
  if (fileName.includes('minimal')) return 'Serveur minimal pour tests'
  if (fileName.includes('simple')) return 'Serveur simplifié'
  if (fileName.includes('test')) return 'Serveur de test'
  
  return 'Serveur backend'
}

function analyzeBackendFile(filePath, relativePath) {
  const content = readFileContent(filePath)
  const fileName = path.basename(filePath)
  const port = extractPortFromFile(content)
  const description = extractDescriptionFromFile(content, fileName)
  
  const stats = fs.statSync(filePath)
  const size = (stats.size / 1024).toFixed(2) + ' KB'
  
  return {
    fileName,
    relativePath,
    fullPath: filePath,
    port,
    description,
    size,
    lastModified: stats.mtime.toLocaleString('fr-FR'),
    hasContent: !!content,
    contentLength: content ? content.length : 0
  }
}

function listBackends() {
  logHeader('ANALYSE DES BACKENDS EXISTANTS')
  
  const backends = []
  const backendPaths = [
    // Backend principal
    'apps/backend/src',
    'apps/backend',
    // Autres emplacements possibles
    'backend',
    'server',
    'api'
  ]
  
  // Fichiers de serveur à rechercher
  const serverPatterns = [
    /^index.*\.(js|ts)$/,
    /^server.*\.(js|ts)$/,
    /^app.*\.(js|ts)$/,
    /.*server.*\.(js|ts)$/,
    /.*backend.*\.(js|ts)$/,
    /.*minimal.*\.(js|ts)$/
  ]
  
  for (const backendPath of backendPaths) {
    if (!fs.existsSync(backendPath)) continue
    
    logSubHeader(`Analyse de: ${backendPath}`)
    
    function scanDirectory(dir, baseDir = backendPath) {
      try {
        const items = fs.readdirSync(dir)
        
        for (const item of items) {
          const fullPath = path.join(dir, item)
          const relativePath = path.relative(process.cwd(), fullPath)
          
          if (fs.statSync(fullPath).isDirectory()) {
            // Éviter node_modules et autres dossiers inutiles
            if (!item.includes('node_modules') && !item.includes('.git') && !item.includes('dist')) {
              scanDirectory(fullPath, baseDir)
            }
          } else {
            // Vérifier si c'est un fichier de serveur
            const isServerFile = serverPatterns.some(pattern => pattern.test(item))
            
            if (isServerFile) {
              const backend = analyzeBackendFile(fullPath, relativePath)
              backends.push(backend)
              
              console.log(`   📄 ${backend.fileName}`)
              console.log(`      📍 Chemin: ${backend.relativePath}`)
              console.log(`      🚪 Port: ${backend.port || 'Non défini'}`)
              console.log(`      📝 Description: ${backend.description}`)
              console.log(`      📏 Taille: ${backend.size}`)
              console.log(`      📅 Modifié: ${backend.lastModified}`)
              console.log('')
            }
          }
        }
      } catch (error) {
        logWarning(`Erreur lors de l'analyse de ${dir}: ${error.message}`)
      }
    }
    
    scanDirectory(backendPath)
  }
  
  // Résumé
  logHeader('RÉSUMÉ DES BACKENDS')
  
  if (backends.length === 0) {
    logWarning('Aucun backend trouvé')
    return
  }
  
  logSuccess(`${backends.length} backend(s) trouvé(s)`)
  
  // Grouper par port
  const portGroups = {}
  backends.forEach(backend => {
    const port = backend.port || 'Non défini'
    if (!portGroups[port]) {
      portGroups[port] = []
    }
    portGroups[port].push(backend)
  })
  
  logSubHeader('Répartition par port')
  Object.entries(portGroups).forEach(([port, backendList]) => {
    console.log(`🚪 Port ${port}: ${backendList.length} backend(s)`)
    backendList.forEach(backend => {
      console.log(`   - ${backend.fileName} (${backend.description})`)
    })
  })
  
  // Backends recommandés
  logSubHeader('Backends recommandés pour la production')
  const productionBackends = backends.filter(b => 
    b.fileName.includes('production') || 
    b.fileName.includes('index') ||
    b.description.toLowerCase().includes('production')
  )
  
  if (productionBackends.length > 0) {
    productionBackends.forEach(backend => {
      console.log(`🚀 ${backend.fileName}`)
      console.log(`   📍 ${backend.relativePath}`)
      console.log(`   🚪 Port: ${backend.port || 'Non défini'}`)
      console.log(`   📝 ${backend.description}`)
    })
  } else {
    logWarning('Aucun backend de production identifié')
  }
  
  return backends
}

// Exécuter l'analyse
if (require.main === module) {
  try {
    const backends = listBackends()
    logSuccess('Analyse terminée avec succès')
  } catch (error) {
    logError(`Erreur lors de l'analyse: ${error.message}`)
    process.exit(1)
  }
}

module.exports = { listBackends }
