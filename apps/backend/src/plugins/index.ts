import { FastifyInstance } from 'fastify'
import helmet from '@fastify/helmet'
// import cors from '@fastify/cors' // Supprimé car enregistré dans server.ts
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
// import { fastifyCorsOptions, logCorsConfig } from '../config/cors' // Supprimé

export async function registerPlugins(server: FastifyInstance) {
  // Sécurité avec Helmet
  // @ts-ignore - Problème de compatibilité de types avec Fastify
  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })

  // Le plugin CORS est maintenant enregistré directement dans server.ts pour s'assurer
  // qu'il est chargé avant les autres plugins et routes.
  // @ts-ignore - Problème de compatibilité de types avec Fastify
  // await server.register(cors, fastifyCorsOptions)

  // Log de la configuration CORS pour le debugging
  // logCorsConfig()

  // JWT (sans Redis pour le moment)
  // @ts-ignore - Problème de compatibilité de types avec Fastify
  await server.register(jwt, {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    sign: {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    },
    verify: {
      maxAge: process.env.JWT_EXPIRES_IN || '15m',
    },
  })

  // Plugin multipart pour les uploads de fichiers
  // @ts-ignore - Problème de compatibilité de types avec Fastify
  await server.register(multipart, {
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB par défaut
    },
  })

  // Documentation Swagger
  // @ts-ignore - Problème de compatibilité de types avec Fastify
  await server.register(swagger, {
    openapi: {
      info: {
        title: 'API Gestion Commerciale TPE',
        description: 'API REST pour l\'application de gestion commerciale destinée aux TPE',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${process.env.PORT || 3001}`,
          description: 'Serveur de développement',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
    },
  })

  // @ts-ignore - Problème de compatibilité de types avec Fastify
  await server.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  })

  // Plugin personnalisé pour l'authentification
  server.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.send(err)
    }
  })

  // Plugin personnalisé pour vérifier les rôles
  server.decorate('authorize', function (roles: string[]) {
    return async function (request: any, reply: any) {
      try {
        await request.jwtVerify()
        const userRole = request.user.role
        
        if (!roles.includes(userRole)) {
          return reply.status(403).send({
            success: false,
            message: 'Accès refusé - Permissions insuffisantes',
          })
        }
      } catch (err) {
        reply.send(err)
      }
    }
  })
}
