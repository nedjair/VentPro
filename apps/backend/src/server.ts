import Fastify, { FastifyInstance, FastifyError } from 'fastify'
import { ZodError } from 'zod'
import { logger } from './utils/logger'
import { registerPlugins } from './plugins'
import { registerRoutes } from './routes'
import { fastifyCorsOptions } from './config/cors'
import fastifyCors from '@fastify/cors'

export async function createServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: logger,
    trustProxy: true,
    bodyLimit: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB par défaut
  })

  try {
    // Middleware de debugging CORS
    server.addHook('onRequest', async (request, reply) => {
      const origin = request.headers.origin;
      console.log(`🔍 CORS Debug - Origin: ${origin || 'undefined'}`);
      console.log(`🔍 CORS Debug - Method: ${request.method}`);
      console.log(`🔍 CORS Debug - URL: ${request.url}`);
    });

    // Enregistrement du plugin CORS avec la configuration centralisée
    await server.register(fastifyCors, fastifyCorsOptions)

    // Configuration CORS manuelle - Utilise la configuration centralisée
    // server.addHook('onRequest', corsMiddleware)

    // Enregistrement des plugins
    await registerPlugins(server)

    // Enregistrement des routes
    await registerRoutes(server)
    
    // Route de health check
    server.get('/health', async () => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0',
      }
    })

    // Route de métriques basiques
    server.get('/metrics', async () => {
      const memUsage = process.memoryUsage()
      return {
        memory: {
          rss: Math.round(memUsage.rss / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024),
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      }
    })

    // Gestionnaire d'erreurs global
    server.setErrorHandler(async (error: FastifyError, request, reply) => {
      server.log.error(error)
      
      const { validation, code } = error
      
      // Erreurs de validation Zod
      if (validation) {
        return reply.status(400).send({
          success: false,
          message: 'Erreur de validation',
          errors: (validation as unknown as ZodError).issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        })
      }

      // Erreurs JWT
      if (code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER') {
        return reply.status(401).send({
          success: false,
          message: 'Token d\'authentification manquant',
        })
      }

      if (code === 'FST_JWT_AUTHORIZATION_TOKEN_INVALID') {
        return reply.status(401).send({
          success: false,
          message: 'Token d\'authentification invalide',
        })
      }

      // Erreurs de rate limiting
      if (error.statusCode === 429) {
        return reply.status(429).send({
          success: false,
          message: 'Trop de requêtes, veuillez réessayer plus tard',
        })
      }

      // Erreur générique
      const statusCode = error.statusCode || 500
      return reply.status(statusCode).send({
        success: false,
        message: statusCode === 500 ? 'Erreur interne du serveur' : error.message,
      })
    })

    // Gestionnaire pour les routes non trouvées
    server.setNotFoundHandler(async (request, reply) => {
      return reply.status(404).send({
        success: false,
        message: `Route ${request.method} ${request.url} non trouvée`,
      })
    })

    return server
    
  } catch (error) {
    server.log.error('Erreur lors de la création du serveur:', error)
    throw error
  }
}
