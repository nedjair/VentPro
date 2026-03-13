import 'dotenv/config'
// import Fastify from 'fastify' // Removed unused import
import { createServer } from './server'
import { logger } from './utils/logger'
import { testDatabaseConnection, seedDatabase } from './lib/database'
import { SchedulerService } from './services/scheduler.service'

const start = async () => {
  try {
    logger.info('🔄 Création du serveur...')
    
    // Test de connexion à la base de données
    const isDbConnected = await testDatabaseConnection()

    if (isDbConnected) {
      logger.info('🗄️ Connexion à la base de données établie')

      // Initialiser la base de données avec des données de test
      try {
        await seedDatabase()
        logger.info('🌱 Base de données initialisée avec succès')
      } catch (seedError) {
        logger.warn('⚠️ Erreur lors de l\'initialisation de la base de données:', seedError)
      }
    } else {
      logger.warn('⚠️ Erreur de connexion à la base de données, utilisation des services mock')
    }
    
    const server = await createServer()
    
    const host = process.env.HOST || '0.0.0.0'
    const port = parseInt(process.env.PORT || '3001', 10)

    logger.info(`🔄 Tentative d'écoute sur ${host}:${port}...`)
    await server.listen({ host, port })
    
    logger.info(`🚀 Serveur démarré sur http://${host}:${port}`)
    logger.info(`📚 Documentation API: http://${host}:${port}/docs`)
    logger.info(`🏥 Health check: http://${host}:${port}/health`)

    // Initialiser le service de planification
    try {
      await SchedulerService.initialize()
      logger.info('⏰ Service de planification initialisé')
    } catch (schedulerError) {
      logger.warn('⚠️ Erreur lors de l\'initialisation du planificateur:', schedulerError)
    }

    logger.info('✅ Serveur prêt à recevoir des requêtes')
    
    // Garder le processus actif
    process.on('beforeExit', () => {
      logger.info('🔄 Processus sur le point de se terminer...')
    })
    
  } catch (error) {
    console.error('❌ Erreur lors du démarrage du serveur:', error)
    logger.error('❌ Erreur lors du démarrage du serveur:', error)
    process.exit(1)
  }
}

// Gestion propre de l'arrêt du serveur
process.on('SIGINT', async () => {
  logger.info('🛑 Arrêt du serveur en cours...')
  SchedulerService.stopAll()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  logger.info('🛑 Arrêt du serveur en cours...')
  SchedulerService.stopAll()
  process.exit(0)
})

start()
