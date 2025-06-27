import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { UserService } from '../services/user.service'
import { logger } from '../utils/logger'

const userService = new UserService()

// Schémas de validation
const getUsersQuerySchema = {
  type: 'object',
  properties: {
    role: { 
      type: 'string', 
      enum: ['ADMIN', 'MANAGER', 'EMPLOYEE'],
      description: 'Filtrer par rôle utilisateur'
    },
    company: { 
      type: 'string',
      description: 'Filtrer par ID de l\'entreprise'
    }
  }
}

const createUserSchema = {
  type: 'object',
  required: ['email', 'password', 'firstName', 'lastName', 'role', 'companyId'],
  properties: {
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 6 },
    firstName: { type: 'string', minLength: 1 },
    lastName: { type: 'string', minLength: 1 },
    role: { type: 'string', enum: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
    companyId: { type: 'string', minLength: 1 }
  }
}

const updateUserSchema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    firstName: { type: 'string', minLength: 1 },
    lastName: { type: 'string', minLength: 1 },
    role: { type: 'string', enum: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
    isActive: { type: 'boolean' }
  }
}

export default async function usersRoutes(fastify: FastifyInstance) {
  // Préfixe pour toutes les routes de ce module
  await fastify.register(async function (fastify) {
    
    /**
     * GET /api/v1/users/admins
     * Lister tous les utilisateurs admin
     */
    fastify.get('/admins', {
      schema: {
        description: 'Lister tous les utilisateurs administrateurs',
        tags: ['Users'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string' },
                    firstName: { type: 'string' },
                    lastName: { type: 'string' },
                    role: { type: 'string' },
                    isActive: { type: 'boolean' },
                    companyId: { type: 'string' },
                    company: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' }
                      }
                    },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' }
                  }
                }
              },
              count: { type: 'number' }
            }
          }
        }
      }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        logger.info('API: Récupération des utilisateurs admin')
        
        const adminUsers = await userService.getAllAdminUsers()
        
        return reply.code(200).send({
          success: true,
          data: adminUsers,
          count: adminUsers.length
        })
        
      } catch (error) {
        logger.error('Erreur API lors de la récupération des admins:', error)
        return reply.code(500).send({
          success: false,
          error: 'Erreur interne du serveur'
        })
      }
    })

    /**
     * GET /api/v1/users
     * Lister tous les utilisateurs avec filtres optionnels
     */
    fastify.get('/', {
      schema: {
        description: 'Lister tous les utilisateurs avec filtres optionnels',
        tags: ['Users'],
        querystring: getUsersQuerySchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string' },
                    firstName: { type: 'string' },
                    lastName: { type: 'string' },
                    role: { type: 'string' },
                    isActive: { type: 'boolean' },
                    companyId: { type: 'string' },
                    company: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' }
                      }
                    },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' }
                  }
                }
              },
              count: { type: 'number' }
            }
          }
        }
      }
    }, async (request: FastifyRequest<{ Querystring: { role?: string; company?: string } }>, reply: FastifyReply) => {
      try {
        logger.info('API: Récupération des utilisateurs avec filtres')
        
        let users = await userService.getAllUsers()
        
        // Appliquer les filtres
        if (request.query.role) {
          users = users.filter(user => user.role === request.query.role)
        }
        
        if (request.query.company) {
          users = users.filter(user => user.companyId === request.query.company)
        }
        
        return reply.code(200).send({
          success: true,
          data: users,
          count: users.length
        })
        
      } catch (error) {
        logger.error('Erreur API lors de la récupération des utilisateurs:', error)
        return reply.code(500).send({
          success: false,
          error: 'Erreur interne du serveur'
        })
      }
    })

    /**
     * GET /api/v1/users/stats
     * Statistiques des utilisateurs
     */
    fastify.get('/stats', {
      schema: {
        description: 'Statistiques des utilisateurs par rôle',
        tags: ['Users'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
                  admins: { type: 'number' },
                  managers: { type: 'number' },
                  employees: { type: 'number' }
                }
              }
            }
          }
        }
      }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        logger.info('API: Récupération des statistiques utilisateurs')
        
        const stats = await userService.getUserStats()
        
        return reply.code(200).send({
          success: true,
          data: stats
        })
        
      } catch (error) {
        logger.error('Erreur API lors de la récupération des statistiques:', error)
        return reply.code(500).send({
          success: false,
          error: 'Erreur interne du serveur'
        })
      }
    })

    /**
     * GET /api/v1/users/:id
     * Récupérer un utilisateur par ID
     */
    fastify.get('/:id', {
      schema: {
        description: 'Récupérer un utilisateur par son ID',
        tags: ['Users'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' }
          },
          required: ['id']
        }
      }
    }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        logger.info(`API: Récupération de l'utilisateur ${request.params.id}`)
        
        const user = await userService.getUserById(request.params.id)
        
        if (!user) {
          return reply.code(404).send({
            success: false,
            error: 'Utilisateur non trouvé'
          })
        }
        
        return reply.code(200).send({
          success: true,
          data: user
        })
        
      } catch (error) {
        logger.error('Erreur API lors de la récupération de l\'utilisateur:', error)
        return reply.code(500).send({
          success: false,
          error: 'Erreur interne du serveur'
        })
      }
    })

    /**
     * POST /api/v1/users
     * Créer un nouvel utilisateur
     */
    fastify.post('/', {
      preHandler: [fastify.authenticate], // Authentification requise
      schema: {
        description: 'Créer un nouvel utilisateur',
        tags: ['Users'],
        body: createUserSchema
      }
    }, async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
      try {
        logger.info('API: Création d\'un nouvel utilisateur')
        
        const user = await userService.createUser(request.body)
        
        return reply.code(201).send({
          success: true,
          data: user
        })
        
      } catch (error) {
        logger.error('Erreur API lors de la création de l\'utilisateur:', error)
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Erreur interne du serveur'
        })
      }
    })

    /**
     * PUT /api/v1/users/:id
     * Mettre à jour un utilisateur
     */
    fastify.put('/:id', {
      preHandler: [fastify.authenticate], // Authentification requise
      schema: {
        description: 'Mettre à jour un utilisateur',
        tags: ['Users'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' }
          },
          required: ['id']
        },
        body: updateUserSchema
      }
    }, async (request: FastifyRequest<{ Params: { id: string }; Body: any }>, reply: FastifyReply) => {
      try {
        logger.info(`API: Mise à jour de l'utilisateur ${request.params.id}`)
        
        const user = await userService.updateUser(request.params.id, request.body)
        
        return reply.code(200).send({
          success: true,
          data: user
        })
        
      } catch (error) {
        logger.error('Erreur API lors de la mise à jour de l\'utilisateur:', error)
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Erreur interne du serveur'
        })
      }
    })

    /**
     * DELETE /api/v1/users/:id
     * Supprimer un utilisateur (désactivation)
     */
    fastify.delete('/:id', {
      preHandler: [fastify.authenticate], // Authentification requise
      schema: {
        description: 'Supprimer un utilisateur (désactivation)',
        tags: ['Users'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' }
          },
          required: ['id']
        }
      }
    }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        logger.info(`API: Suppression de l'utilisateur ${request.params.id}`)
        
        await userService.deleteUser(request.params.id)
        
        return reply.code(200).send({
          success: true,
          message: 'Utilisateur supprimé avec succès'
        })
        
      } catch (error) {
        logger.error('Erreur API lors de la suppression de l\'utilisateur:', error)
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Erreur interne du serveur'
        })
      }
    })

  }, { prefix: '/users' })
}
