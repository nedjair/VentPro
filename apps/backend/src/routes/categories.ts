import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { CategoryService } from '../services/category.service'
import { AuthenticatedRequest } from '@gestion/shared'
import { logger } from '../utils/logger'

// Schémas de validation
const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Le nom de la catégorie est requis'),
  description: z.string().optional(),
  parentId: z.string().optional(),
})

const UpdateCategorySchema = CreateCategorySchema.partial()



export default async function categoryRoutes(server: FastifyInstance) {
  // Créer une catégorie
  server.post('/', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Créer une nouvelle catégorie',
      tags: ['Catégories'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          parentId: { type: 'string' }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                parentId: { type: 'string' },
                createdAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const data = CreateCategorySchema.parse(request.body)
      const { companyId } = request.user

      const category = await CategoryService.createCategory(data, companyId)

      return reply.status(201).send({
        success: true,
        data: category,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la création de la catégorie', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message || 'Erreur lors de la création de la catégorie',
      })
    }
  })

  // Récupérer toutes les catégories
  server.get('/', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Récupérer toutes les catégories',
      tags: ['Catégories'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.user

      const categories = await CategoryService.getCategories(companyId)

      return reply.send({
        success: true,
        data: categories,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la récupération des catégories', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des catégories',
      })
    }
  })

  // Récupérer l'arbre hiérarchique des catégories
  server.get('/tree', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Récupérer l\'arbre hiérarchique des catégories',
      tags: ['Catégories'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.user

      const categoryTree = await CategoryService.getCategoryTree(companyId)

      return reply.send({
        success: true,
        data: categoryTree,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la récupération de l\'arbre des catégories', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération de l\'arbre des catégories',
      })
    }
  })

  // Récupérer les catégories racines
  server.get('/roots', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Récupérer les catégories racines',
      tags: ['Catégories'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.user

      const rootCategories = await CategoryService.getRootCategories(companyId)

      return reply.send({
        success: true,
        data: rootCategories,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la récupération des catégories racines', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des catégories racines',
      })
    }
  })

  // Récupérer une catégorie par ID
  server.get('/:id', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Récupérer une catégorie par ID',
      tags: ['Catégories'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string }
      const { companyId } = request.user

      const category = await CategoryService.getCategoryById(id, companyId)

      if (!category) {
        return reply.status(404).send({
          success: false,
          message: 'Catégorie non trouvée',
        })
      }

      return reply.send({
        success: true,
        data: category,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la récupération de la catégorie', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération de la catégorie',
      })
    }
  })

  // Mettre à jour une catégorie
  server.put('/:id', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Mettre à jour une catégorie',
      tags: ['Catégories'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          parentId: { type: 'string' }
        }
      },
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string }
      const data = UpdateCategorySchema.parse(request.body)
      const { companyId } = request.user

      const category = await CategoryService.updateCategory(id, data, companyId)

      return reply.send({
        success: true,
        data: category,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la mise à jour de la catégorie', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message || 'Erreur lors de la mise à jour de la catégorie',
      })
    }
  })

  // Supprimer une catégorie
  server.delete('/:id', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Supprimer une catégorie',
      tags: ['Catégories'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string }
      const { companyId } = request.user

      await CategoryService.deleteCategory(id, companyId)

      return reply.send({
        success: true,
        message: 'Catégorie supprimée avec succès',
      })
    } catch (error: any) {
      logger.error('Erreur lors de la suppression de la catégorie', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message || 'Erreur lors de la suppression de la catégorie',
      })
    }
  })

  // Statistiques des catégories
  server.get('/stats/overview', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Statistiques des catégories',
      tags: ['Catégories'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.user

      const stats = await CategoryService.getCategoryStats(companyId)

      return reply.send({
        success: true,
        data: stats,
      })
    } catch (error: any) {
      logger.error('Erreur lors du calcul des statistiques', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors du calcul des statistiques',
      })
    }
  })
}

