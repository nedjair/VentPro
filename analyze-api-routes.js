/**
 * Analyse complète des routes API - Frontend vs Backend
 * Identifie les routes manquantes et les incompatibilités
 */

const fs = require('fs')
const path = require('path')

// Routes attendues par le frontend (extraites de api.ts)
const FRONTEND_API_CALLS = {
  // Health & Metrics
  'GET /health': 'Health check',
  'GET /metrics': 'System metrics',
  
  // Authentication
  'POST /api/v1/auth/login': 'User login',
  'GET /api/v1/auth/logout': 'User logout',
  'GET /api/v1/auth/verify': 'Token verification',
  'POST /api/v1/auth/refresh': 'Token refresh',
  'GET /api/v1/auth/profile': 'User profile',
  
  // Dashboard
  'GET /api/v1/dashboard/stats': 'Dashboard statistics',
  
  // Analytics
  'GET /api/v1/analytics/kpi': 'KPI metrics',
  'GET /api/v1/analytics/sales': 'Sales analytics',
  'GET /api/v1/analytics/products': 'Product analytics',
  'GET /api/v1/analytics/clients': 'Client analytics',
  'GET /api/v1/analytics/evolution': 'Evolution data',
  'GET /api/v1/analytics/stats': 'Analytics stats',
  
  // Clients
  'GET /api/v1/clients': 'List clients',
  'GET /api/v1/clients/:id': 'Get client by ID',
  'POST /api/v1/clients': 'Create client',
  'PUT /api/v1/clients/:id': 'Update client',
  'DELETE /api/v1/clients/:id': 'Delete client',
  
  // Products
  'GET /api/v1/products': 'List products',
  'GET /api/v1/products/:id': 'Get product by ID',
  'POST /api/v1/products': 'Create product',
  'PUT /api/v1/products/:id': 'Update product',
  'DELETE /api/v1/products/:id': 'Delete product',
  
  // Suppliers
  'GET /api/v1/suppliers': 'List suppliers',
  'GET /api/v1/suppliers/:id': 'Get supplier by ID',
  'POST /api/v1/suppliers': 'Create supplier',
  'PUT /api/v1/suppliers/:id': 'Update supplier',
  'DELETE /api/v1/suppliers/:id': 'Delete supplier',
  
  // Orders
  'GET /api/v1/orders': 'List orders',
  'GET /api/v1/orders/:id': 'Get order by ID',
  'POST /api/v1/orders': 'Create order',
  'PUT /api/v1/orders/:id': 'Update order',
  'DELETE /api/v1/orders/:id': 'Delete order',
  'GET /api/v1/orders/stats/overview': 'Order statistics',
  
  // Invoices
  'GET /api/v1/invoices': 'List invoices',
  'GET /api/v1/invoices/:id': 'Get invoice by ID',
  'POST /api/v1/invoices': 'Create invoice',
  'PUT /api/v1/invoices/:id': 'Update invoice',
  'DELETE /api/v1/invoices/:id': 'Delete invoice',
  'POST /api/v1/invoices/from-order': 'Create invoice from order',
  'PATCH /api/v1/invoices/:id/status': 'Update invoice status',
  'GET /api/v1/invoices/stats/overview': 'Invoice statistics'
}

// Fonction pour extraire les routes d'un fichier TypeScript
function extractRoutesFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const routes = []
    
    // Patterns pour détecter les routes Fastify
    const routePatterns = [
      /server\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
      /fastify\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
      /app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g
    ]
    
    routePatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(content)) !== null) {
        const method = match[1].toUpperCase()
        const path = match[2]
        routes.push(`${method} ${path}`)
      }
    })
    
    return routes
  } catch (error) {
    console.error(`Erreur lors de la lecture de ${filePath}:`, error.message)
    return []
  }
}

// Fonction pour analyser tous les fichiers de routes
function analyzeBackendRoutes() {
  const routesDir = path.join(__dirname, 'apps', 'backend', 'src', 'routes')
  const backendRoutes = new Set()
  
  if (!fs.existsSync(routesDir)) {
    console.error('❌ Dossier routes backend non trouvé:', routesDir)
    return backendRoutes
  }
  
  const routeFiles = fs.readdirSync(routesDir).filter(file => file.endsWith('.ts'))
  
  console.log('📁 Analyse des fichiers de routes backend:')
  routeFiles.forEach(file => {
    const filePath = path.join(routesDir, file)
    const routes = extractRoutesFromFile(filePath)
    
    console.log(`   ${file}: ${routes.length} routes trouvées`)
    routes.forEach(route => {
      // Normaliser les routes avec préfixe API
      if (!route.includes('/api/v1/') && !route.includes('/health') && !route.includes('/metrics')) {
        route = route.replace(/^(GET|POST|PUT|DELETE|PATCH) \//, '$1 /api/v1/')
      }
      backendRoutes.add(route)
    })
  })
  
  return backendRoutes
}

// Fonction principale d'analyse
function analyzeApiRoutes() {
  console.log('🔍 ANALYSE COMPLÈTE DES ROUTES API')
  console.log('=' * 40)
  
  // 1. Analyser les routes backend
  console.log('\n📊 ÉTAPE 1: Analyse des routes backend')
  const backendRoutes = analyzeBackendRoutes()
  
  console.log(`\n✅ Total routes backend trouvées: ${backendRoutes.size}`)
  
  // 2. Comparer avec les attentes frontend
  console.log('\n📊 ÉTAPE 2: Comparaison Frontend vs Backend')
  
  const missingRoutes = []
  const existingRoutes = []
  const extraRoutes = []
  
  // Vérifier les routes attendues par le frontend
  Object.keys(FRONTEND_API_CALLS).forEach(route => {
    // Normaliser pour la comparaison (remplacer :id par des patterns)
    const normalizedRoute = route.replace(/:id/g, ':id')
    
    let found = false
    for (const backendRoute of backendRoutes) {
      if (backendRoute === normalizedRoute || 
          backendRoute.replace(/:id/g, ':id') === normalizedRoute) {
        found = true
        break
      }
    }
    
    if (found) {
      existingRoutes.push(route)
    } else {
      missingRoutes.push(route)
    }
  })
  
  // Identifier les routes backend supplémentaires
  backendRoutes.forEach(route => {
    const frontendRoute = Object.keys(FRONTEND_API_CALLS).find(fr => 
      fr === route || fr.replace(/:id/g, ':id') === route.replace(/:id/g, ':id')
    )
    if (!frontendRoute) {
      extraRoutes.push(route)
    }
  })
  
  // 3. Afficher les résultats
  console.log('\n✅ ROUTES EXISTANTES:')
  existingRoutes.forEach(route => {
    console.log(`   ✅ ${route} - ${FRONTEND_API_CALLS[route]}`)
  })
  
  console.log('\n❌ ROUTES MANQUANTES:')
  missingRoutes.forEach(route => {
    console.log(`   ❌ ${route} - ${FRONTEND_API_CALLS[route]}`)
  })
  
  console.log('\n➕ ROUTES BACKEND SUPPLÉMENTAIRES:')
  extraRoutes.forEach(route => {
    console.log(`   ➕ ${route}`)
  })
  
  // 4. Statistiques
  console.log('\n📊 STATISTIQUES:')
  console.log(`   Routes attendues: ${Object.keys(FRONTEND_API_CALLS).length}`)
  console.log(`   Routes existantes: ${existingRoutes.length}`)
  console.log(`   Routes manquantes: ${missingRoutes.length}`)
  console.log(`   Routes supplémentaires: ${extraRoutes.length}`)
  console.log(`   Taux de couverture: ${((existingRoutes.length / Object.keys(FRONTEND_API_CALLS).length) * 100).toFixed(1)}%`)
  
  // 5. Priorités de correction
  console.log('\n🎯 PRIORITÉS DE CORRECTION:')
  
  const criticalRoutes = missingRoutes.filter(route => 
    route.includes('/auth/') || 
    route.includes('/dashboard/') || 
    route.includes('/clients') ||
    route.includes('/products') ||
    route.includes('/orders') ||
    route.includes('/invoices')
  )
  
  const analyticsRoutes = missingRoutes.filter(route => 
    route.includes('/analytics/')
  )
  
  if (criticalRoutes.length > 0) {
    console.log('\n🔴 CRITIQUE (Fonctionnalités de base):')
    criticalRoutes.forEach(route => {
      console.log(`   🔴 ${route}`)
    })
  }
  
  if (analyticsRoutes.length > 0) {
    console.log('\n🟡 IMPORTANT (Analytics):')
    analyticsRoutes.forEach(route => {
      console.log(`   🟡 ${route}`)
    })
  }
  
  return {
    total: Object.keys(FRONTEND_API_CALLS).length,
    existing: existingRoutes.length,
    missing: missingRoutes.length,
    extra: extraRoutes.length,
    missingRoutes,
    existingRoutes,
    extraRoutes,
    coverage: (existingRoutes.length / Object.keys(FRONTEND_API_CALLS).length) * 100
  }
}

// Exécuter l'analyse
if (require.main === module) {
  const results = analyzeApiRoutes()
  
  console.log(`\n${results.coverage >= 90 ? '🎉' : results.coverage >= 70 ? '👍' : '⚠️'} Analyse terminée`)
  console.log(`Couverture: ${results.coverage.toFixed(1)}%`)
  
  process.exit(results.missing === 0 ? 0 : 1)
}

module.exports = { analyzeApiRoutes, FRONTEND_API_CALLS }
