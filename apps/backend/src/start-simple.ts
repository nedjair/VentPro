#!/usr/bin/env node

import 'dotenv/config'

async function startSimpleServer() {
  try {
    console.log('🔧 Démarrage du serveur simple...')
    
    // Import dynamique pour éviter les erreurs de compilation
    const { createServer } = await import('./server-simple')
    
    const app = await createServer()
    const port = parseInt(process.env.PORT || '3001')
    const host = process.env.HOST || '0.0.0.0'

    await app.listen({ port, host })
    
    console.log('✅ Serveur démarré avec succès!')
    console.log(`🚀 URL: http://${host}:${port}`)
    console.log(`📊 Health check: http://${host}:${port}/health`)
    console.log(`🔗 API: http://${host}:${port}/api/health`)
    console.log('')
    console.log('Routes disponibles:')
    console.log('  GET  /health')
    console.log('  GET  /api/health')
    console.log('  POST /api/auth/login')
    console.log('  GET  /api/dashboard/stats')
    console.log('  GET  /api/products')
    console.log('  GET  /api/clients')
    console.log('')
    console.log('Test de connexion:')
    console.log('  Email: admin@test.com')
    console.log('  Mot de passe: admin123')
    
  } catch (error) {
    console.error('❌ Erreur lors du démarrage:', error)
    process.exit(1)
  }
}

startSimpleServer()
