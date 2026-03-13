import { FastifyInstance, FastifyRequest, FastifyReply, FastifyRequest } from 'fastify'
import { logger } from '../utils/logger'
import { AuthService } from '../services/auth.service'

// Instance du service d'authentification
const authService = new AuthService()

// Schémas pour la validation
const loginSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 1 }
    }
  }
}

export default async function authRoutes(server: FastifyInstance) {
  // Connexion avec PostgreSQL
  server.post('/login', {
    schema: loginSchema
  }, async (request: FastifyRequest<{
    Body: { email: string; password: string }
  }>, reply: FastifyReply) => {
    try {
      const { email, password } = request.body

      if (!email || !password) {
        return reply.status(400).send({
          success: false,
          message: 'Email et mot de passe requis',
        })
      }

      logger.info('Tentative de connexion', { email })

      // Authentification via PostgreSQL avec Prisma
      const user = await authService.login({ email, password })

      if (!user) {
        logger.warn('Échec de connexion', { email })
        return reply.status(401).send({
          success: false,
          message: 'Email ou mot de passe incorrect',
        })
      }

      // Génération des tokens JWT
      const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      }

      // @ts-ignore - Propriété jwt ajoutée par le plugin fastify-jwt
      const accessToken = /* @ts-ignore */ server.jwt.sign(payload, { expiresIn: '15m' })
      // @ts-ignore - Propriété jwt ajoutée par le plugin fastify-jwt
      const refreshToken = /* @ts-ignore */ server.jwt.sign(payload, { expiresIn: '7d' })

      logger.info('User logged in successfully', { userId: user.id, email: user.email })

      return reply.send({
        success: true,
        message: 'Connexion réussie',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            companyId: user.companyId,
          },
          tokens: {
            accessToken,
            refreshToken,
          },
        },
      })
    } catch (error: any) {
      logger.error('Login error', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la connexion',
      })
    }
  })

  // Inscription avec PostgreSQL
  server.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as any

      if (!body.email || !body.password || !body.firstName || !body.lastName || !body.companyId) {
        return reply.status(400).send({
          success: false,
          message: 'Tous les champs requis doivent être remplis (email, password, firstName, lastName, companyId)',
        })
      }

      logger.info('Tentative d\'inscription', { email: body.email })

      // Créer l'utilisateur via PostgreSQL avec Prisma
      const newUser = await authService.createUser({
        email: body.email,
        password: body.password,
        firstName: body.firstName,
        lastName: body.lastName,
        role: body.role || 'EMPLOYEE',
        companyId: body.companyId,
      })

      logger.info('User registered successfully', { userId: newUser.id, email: newUser.email })

      return reply.status(201).send({
        success: true,
        message: 'Inscription réussie',
        data: {
          user: {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            role: newUser.role,
            companyId: newUser.companyId,
          },
        },
      })
    } catch (error: any) {
      logger.error('Registration error', { error: error.message })

      // Gestion des erreurs spécifiques
      if (error.message.includes('email existe déjà')) {
        return reply.status(409).send({
          success: false,
          message: error.message,
        })
      }

      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de l\'inscription',
      })
    }
  })

  // Rafraîchir le token avec PostgreSQL
  server.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as any

      if (!body.refreshToken) {
        return reply.status(400).send({
          success: false,
          message: 'Token de rafraîchissement requis',
        })
      }

      // Vérifier le refresh token
      const decoded = server.jwt.verify(body.refreshToken) as any

      // Vérifier que l'utilisateur existe toujours dans PostgreSQL
      const user = await authService.getUserById(decoded.userId)
      if (!user) {
        return reply.status(401).send({
          success: false,
          message: 'Token invalide - utilisateur non trouvé',
        })
      }

      // Générer un nouveau token d'accès
      const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      }

      const accessToken = /* @ts-ignore */ server.jwt.sign(payload, { expiresIn: '15m' })

      logger.info('Token refreshed successfully', { userId: user.id })

      return reply.send({
        success: true,
        data: {
          accessToken,
        },
      })
    } catch (error: any) {
      logger.error('Token refresh error', { error: error.message })
      return reply.status(401).send({
        success: false,
        message: 'Token invalide',
      })
    }
  })

  // Profil utilisateur avec PostgreSQL
  server.get('/profile', {
    preHandler: [(server as any).authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = (request as any).user

      // Récupérer l'utilisateur depuis PostgreSQL
      const user = await authService.getUserById(userId)
      if (!user) {
        return reply.status(404).send({
          success: false,
          message: 'Utilisateur non trouvé',
        })
      }

      return reply.send({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          companyId: user.companyId,
        },
      })
    } catch (error: any) {
      logger.error('Profile error', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération du profil',
      })
    }
  })

  // Déconnexion
  server.post('/logout', {
    preHandler: [(server as any).authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Dans une vraie application, on invaliderait le token
      logger.info('User logged out', { userId: (request as any).user.userId })

      return reply.send({
        success: true,
        message: 'Déconnexion réussie',
      })
    } catch (error: any) {
      logger.error('Logout error', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la déconnexion',
      })
    }
  })
}
