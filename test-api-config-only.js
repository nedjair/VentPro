/**
 * Script de vérification de la configuration API
 * Teste la configuration sans nécessiter que les services soient démarrés
 */

const fs = require('fs')
const path = require('path')

// Couleurs pour les logs
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// Résultats de la vérification
const configResults = {
  backend: {
    structure: false,
    corsConfig: false,
    routes: false,
    services: false,
    prisma: false
  },
  frontend: {
    structure: false,
    apiConfig: false,
    components: false,
    defensiveProgramming: false
  },
  issues: [],
  recommendations: []
}

/**
 * Vérification de la structure du backend
 */
function checkBackendStructure() {
  log('\n🔍 Vérification de la structure du backend...', 'blue')
  
  const backendPath = path.join(__dirname, 'apps', 'backend')
  const requiredFiles = [
    'src/index.ts',
    'src/server.ts',
    'src/config/cors.ts',
    'src/routes/index.ts',
    'src/lib/database.ts',
    'package.json'
  ]
  
  let allFilesExist = true
  
  for (const file of requiredFiles) {
    const filePath = path.join(backendPath, file)
    if (fs.existsSync(filePath)) {
      log(`   ✅ ${file}`, 'green')
    } else {
      log(`   ❌ ${file} manquant`, 'red')
      configResults.issues.push(`Backend: ${file} manquant`)
      allFilesExist = false
    }
  }
  
  configResults.backend.structure = allFilesExist
  return allFilesExist
}

/**
 * Vérification de la configuration CORS
 */
function checkCorsConfiguration() {
  log('\n🔍 Vérification de la configuration CORS...', 'blue')
  
  const corsConfigPath = path.join(__dirname, 'apps', 'backend', 'src', 'config', 'cors.ts')
  
  if (!fs.existsSync(corsConfigPath)) {
    log('   ❌ Fichier cors.ts non trouvé', 'red')
    configResults.issues.push('Configuration CORS manquante')
    return false
  }
  
  const corsContent = fs.readFileSync(corsConfigPath, 'utf8')
  
  // Vérifications de la configuration CORS
  const checks = {
    'Port 3000 autorisé': corsContent.includes('localhost:3000'),
    'Credentials activés': corsContent.includes('credentials: true'),
    'Méthodes HTTP': corsContent.includes('GET') && corsContent.includes('POST'),
    'Headers Authorization': corsContent.includes('Authorization'),
    'Content-Type': corsContent.includes('Content-Type')
  }
  
  let allChecksPass = true
  Object.entries(checks).forEach(([check, passed]) => {
    if (passed) {
      log(`   ✅ ${check}`, 'green')
    } else {
      log(`   ❌ ${check}`, 'red')
      configResults.issues.push(`CORS: ${check} manquant`)
      allChecksPass = false
    }
  })
  
  configResults.backend.corsConfig = allChecksPass
  return allChecksPass
}

/**
 * Vérification des routes backend
 */
function checkBackendRoutes() {
  log('\n🔍 Vérification des routes backend...', 'blue')
  
  const routesPath = path.join(__dirname, 'apps', 'backend', 'src', 'routes')
  const requiredRoutes = [
    'index.ts',
    'auth.ts',
    'clients.ts',
    'products.ts',
    'suppliers.ts',
    'orders.ts',
    'invoices.ts',
    'dashboard.ts',
    'analytics.ts'
  ]
  
  let allRoutesExist = true
  
  for (const route of requiredRoutes) {
    const routePath = path.join(routesPath, route)
    if (fs.existsSync(routePath)) {
      log(`   ✅ ${route}`, 'green')
    } else {
      log(`   ❌ ${route} manquant`, 'red')
      configResults.issues.push(`Route: ${route} manquante`)
      allRoutesExist = false
    }
  }
  
  configResults.backend.routes = allRoutesExist
  return allRoutesExist
}

/**
 * Vérification de la structure du frontend
 */
function checkFrontendStructure() {
  log('\n🔍 Vérification de la structure du frontend...', 'blue')
  
  const frontendPath = path.join(__dirname, 'apps', 'frontend')
  const requiredFiles = [
    'src/lib/api.ts',
    'src/lib/defensive-utils.ts',
    'src/app/page.tsx',
    'src/components/pages/dashboard.tsx',
    'package.json'
  ]
  
  let allFilesExist = true
  
  for (const file of requiredFiles) {
    const filePath = path.join(frontendPath, file)
    if (fs.existsSync(filePath)) {
      log(`   ✅ ${file}`, 'green')
    } else {
      log(`   ❌ ${file} manquant`, 'red')
      configResults.issues.push(`Frontend: ${file} manquant`)
      allFilesExist = false
    }
  }
  
  configResults.frontend.structure = allFilesExist
  return allFilesExist
}

/**
 * Vérification de la configuration API frontend
 */
function checkFrontendApiConfig() {
  log('\n🔍 Vérification de la configuration API frontend...', 'blue')
  
  const apiConfigPath = path.join(__dirname, 'apps', 'frontend', 'src', 'lib', 'api.ts')
  
  if (!fs.existsSync(apiConfigPath)) {
    log('   ❌ Fichier api.ts non trouvé', 'red')
    configResults.issues.push('Configuration API frontend manquante')
    return false
  }
  
  const apiContent = fs.readFileSync(apiConfigPath, 'utf8')
  
  // Vérifications de la configuration API
  const checks = {
    'URL Backend (3001)': apiContent.includes('localhost:3001'),
    'Gestion des erreurs': apiContent.includes('catch') && apiContent.includes('error'),
    'Authentification JWT': apiContent.includes('Authorization') && apiContent.includes('Bearer'),
    'Types TypeScript': apiContent.includes('interface') && apiContent.includes('ApiResponse'),
    'Retry automatique': apiContent.includes('withRetry') || apiContent.includes('retry'),
    'CORS credentials': apiContent.includes('withCredentials: true')
  }
  
  let allChecksPass = true
  Object.entries(checks).forEach(([check, passed]) => {
    if (passed) {
      log(`   ✅ ${check}`, 'green')
    } else {
      log(`   ❌ ${check}`, 'red')
      configResults.issues.push(`API Config: ${check} manquant`)
      allChecksPass = false
    }
  })
  
  configResults.frontend.apiConfig = allChecksPass
  return allChecksPass
}

/**
 * Vérification de la programmation défensive
 */
function checkDefensiveProgramming() {
  log('\n🔍 Vérification de la programmation défensive...', 'blue')
  
  const defensiveUtilsPath = path.join(__dirname, 'apps', 'frontend', 'src', 'lib', 'defensive-utils.ts')
  
  if (!fs.existsSync(defensiveUtilsPath)) {
    log('   ❌ Fichier defensive-utils.ts non trouvé', 'red')
    configResults.issues.push('Utilitaires de programmation défensive manquants')
    return false
  }
  
  const defensiveContent = fs.readFileSync(defensiveUtilsPath, 'utf8')
  
  // Vérifications de la programmation défensive
  const checks = {
    'ensureArray': defensiveContent.includes('ensureArray'),
    'safeFilter': defensiveContent.includes('safeFilter'),
    'validateApiResponse': defensiveContent.includes('validateApiResponse'),
    'withRetry': defensiveContent.includes('withRetry'),
    'safeTextRender': defensiveContent.includes('safeTextRender')
  }
  
  let allChecksPass = true
  Object.entries(checks).forEach(([check, passed]) => {
    if (passed) {
      log(`   ✅ ${check}`, 'green')
    } else {
      log(`   ❌ ${check}`, 'red')
      configResults.issues.push(`Programmation défensive: ${check} manquant`)
      allChecksPass = false
    }
  })
  
  configResults.frontend.defensiveProgramming = allChecksPass
  return allChecksPass
}

/**
 * Génération du rapport de configuration
 */
function generateConfigReport() {
  log('\n📊 RAPPORT DE VÉRIFICATION DE CONFIGURATION', 'magenta')
  log('=' * 60, 'magenta')
  
  // Résumé général
  const totalChecks = 6
  const passedChecks = Object.values(configResults.backend).filter(Boolean).length +
                      Object.values(configResults.frontend).filter(Boolean).length
  
  const successRate = Math.round((passedChecks / totalChecks) * 100)
  
  log(`\n🎯 RÉSUMÉ GÉNÉRAL`, 'blue')
  log(`   Vérifications réussies: ${passedChecks}/${totalChecks} (${successRate}%)`, successRate >= 80 ? 'green' : 'red')
  log(`   Problèmes détectés: ${configResults.issues.length}`, configResults.issues.length === 0 ? 'green' : 'red')
  
  // Backend
  log(`\n🔧 BACKEND`, 'blue')
  log(`   ✅ Structure: ${configResults.backend.structure ? 'OK' : 'ÉCHEC'}`, configResults.backend.structure ? 'green' : 'red')
  log(`   ✅ Configuration CORS: ${configResults.backend.corsConfig ? 'OK' : 'ÉCHEC'}`, configResults.backend.corsConfig ? 'green' : 'red')
  log(`   ✅ Routes: ${configResults.backend.routes ? 'OK' : 'ÉCHEC'}`, configResults.backend.routes ? 'green' : 'red')
  
  // Frontend
  log(`\n🌐 FRONTEND`, 'blue')
  log(`   ✅ Structure: ${configResults.frontend.structure ? 'OK' : 'ÉCHEC'}`, configResults.frontend.structure ? 'green' : 'red')
  log(`   ✅ Configuration API: ${configResults.frontend.apiConfig ? 'OK' : 'ÉCHEC'}`, configResults.frontend.apiConfig ? 'green' : 'red')
  log(`   ✅ Programmation défensive: ${configResults.frontend.defensiveProgramming ? 'OK' : 'ÉCHEC'}`, configResults.frontend.defensiveProgramming ? 'green' : 'red')
  
  // Problèmes détectés
  if (configResults.issues.length > 0) {
    log(`\n❌ PROBLÈMES DÉTECTÉS`, 'red')
    configResults.issues.forEach((issue, index) => {
      log(`   ${index + 1}. ${issue}`, 'red')
    })
  }
  
  // Recommandations
  log(`\n💡 RECOMMANDATIONS`, 'yellow')
  
  if (!configResults.backend.structure) {
    log('   • Vérifier la structure des fichiers backend dans apps/backend/src/', 'yellow')
  }
  
  if (!configResults.backend.corsConfig) {
    log('   • Vérifier la configuration CORS dans apps/backend/src/config/cors.ts', 'yellow')
  }
  
  if (!configResults.frontend.apiConfig) {
    log('   • Vérifier la configuration API dans apps/frontend/src/lib/api.ts', 'yellow')
  }
  
  if (!configResults.frontend.defensiveProgramming) {
    log('   • Implémenter les utilitaires de programmation défensive', 'yellow')
  }
  
  log('   • Pour tester les connexions en temps réel, démarrer les applications et exécuter test-api-connections-complete.js', 'yellow')
  
  // Sauvegarde du rapport
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      totalChecks,
      passedChecks,
      successRate,
      issuesCount: configResults.issues.length
    },
    results: configResults
  }
  
  const reportPath = path.join(__dirname, 'api-config-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2))
  log(`\n📄 Rapport sauvegardé: ${reportPath}`, 'cyan')
  
  return successRate >= 80
}

/**
 * Fonction principale
 */
function main() {
  log('🔍 VÉRIFICATION DE LA CONFIGURATION API', 'magenta')
  log('=' * 60, 'magenta')
  
  // Tests de configuration
  checkBackendStructure()
  checkCorsConfiguration()
  checkBackendRoutes()
  checkFrontendStructure()
  checkFrontendApiConfig()
  checkDefensiveProgramming()
  
  // Génération du rapport final
  const success = generateConfigReport()
  
  log(`\n${success ? '🎉' : '⚠️'} VÉRIFICATION TERMINÉE`, success ? 'green' : 'yellow')
  
  return success
}

// Démarrage
if (require.main === module) {
  const success = main()
  process.exit(success ? 0 : 1)
}

module.exports = {
  checkBackendStructure,
  checkCorsConfiguration,
  checkBackendRoutes,
  checkFrontendStructure,
  checkFrontendApiConfig,
  checkDefensiveProgramming,
  generateConfigReport
}
