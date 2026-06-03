import { StockAlertService } from '../services/stock-alert.service'
import { FastifyInstance, FastifyRequest, FastifyReply, FastifyRequest } from 'fastify'
import { StockAlertService } from '../services/stock-alert.service'
// AuthenticatedRequest type removed - using FastifyRequest with type assertion
import { logger } from '../utils/logger'

// Types pour la validation des données
interface CreateStockAlertRequest {
  type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCK' | 'EXPIRY_WARNING' | 'NEGATIVE_STOCK'
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  message: string
  productId: string
  currentStock?: number
  thresholdValue?: number
}

interface StockAlertFiltersRequest {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  type?: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCK' | 'EXPIRY_WARNING' | 'NEGATIVE_STOCK'
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  isRead?: boolean
  isActive?: boolean
  productId?: string
}

export default async function stockAlertRoutes(server: FastifyInstance) {
  // Créer une alerte de stock
  server.post('/alerts', {
    preHandler: [(server as any).authenticate],
    schema: {
      description: 'Créer une alerte de stock',
      tags: ['Stock Alerts'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['type', 'title', 'message', 'productId'],
        properties: {
          type: { 
            type: 'string', 
            enum: ['LOW_STOCK', 'OUT_OF_STOCK', 'OVERSTOCK', 'EXPIRY_WARNING', 'NEGATIVE_STOCK'] 
          },
          severity: { 
            type: 'string', 
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] 
          },
          title: { type: 'string', minLength: 1 },
          message: { type: 'string', minLength: 1 },
          productId: { type: 'string', minLength: 1 },
          currentStock: { type: 'number' },
          thresholdValue: { type: 'number' },
        },
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
                type: { type: 'string' },
                severity: { type: 'string' },
                title: { type: 'string' },
                message: { type: 'string' },
                isRead: { type: 'boolean' },
                isActive: { type: 'boolean' },
                createdAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = request.body as CreateStockAlertRequest
      const { companyId } = (request as any).user

      const alert = await StockAlertService.createAlert(data, companyId)

      return reply.status(201).send({
        success: true,
        data: alert,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la création de l\'alerte de stock', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message,
      })
    }
  })

  // Récupérer les alertes de stock avec pagination et filtres
  server.get('/alerts', {
    preHandler: [(server as any).authenticate],
    schema: {
      description: 'Récupérer les alertes de stock',
      tags: ['Stock Alerts'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1 },
          // Validation souple, plafonnement effectif dans le service.
          limit: { type: 'number', minimum: 1, maximum: 10000 },
          sortBy: { type: 'string' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'] },
          type: { 
            type: 'string', 
            enum: ['LOW_STOCK', 'OUT_OF_STOCK', 'OVERSTOCK', 'EXPIRY_WARNING', 'NEGATIVE_STOCK'] 
          },
          severity: { 
            type: 'string', 
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] 
          },
          isRead: { type: 'boolean' },
          isActive: { type: 'boolean' },
          productId: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as StockAlertFiltersRequest
      const { companyId } = (request as any).user

      const { page, limit, sortBy, sortOrder, ...filters } = query
      const normalizedPagination = {
        page: Math.max(1, Number(page || 1) || 1),
        limit: Math.min(Math.max(1, Number(limit || 20) || 20), 100),
        sortBy,
        sortOrder,
      }

      const result = await StockAlertService.getAlerts(
        companyId,
        filters,
        normalizedPagination
      )

      return reply.send({
        success: true,
        data: result.data,
        pagination: result.pagination,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la récupération des alertes de stock', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: error.message,
      })
    }
  })

  // Marquer une alerte comme lue
  server.patch('/alerts/:id/read', {
    preHandler: [(server as any).authenticate],
    schema: {
      description: 'Marquer une alerte comme lue',
      tags: ['Stock Alerts'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string }
      const { companyId } = (request as any).user

      const alert = await StockAlertService.markAsRead(id, companyId)

      return reply.send({
        success: true,
        data: alert,
      })
    } catch (error: any) {
      logger.error('Erreur lors du marquage de l\'alerte comme lue', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message,
      })
    }
  })

  // Résoudre une alerte
  server.patch('/alerts/:id/resolve', {
    preHandler: [(server as any).authenticate],
    schema: {
      description: 'Résoudre une alerte',
      tags: ['Stock Alerts'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string }
      const { companyId } = (request as any).user

      const alert = await StockAlertService.resolveAlert(id, companyId)

      return reply.send({
        success: true,
        data: alert,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la résolution de l\'alerte', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message,
      })
    }
  })

  // Supprimer une alerte
  server.delete('/alerts/:id', {
    preHandler: [(server as any).authenticate],
    schema: {
      description: 'Supprimer une alerte',
      tags: ['Stock Alerts'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string }
      const { companyId } = (request as any).user

      await StockAlertService.deleteAlert(id, companyId)

      return reply.send({
        success: true,
        message: 'Alerte supprimée avec succès',
      })
    } catch (error: any) {
      logger.error('Erreur lors de la suppression de l\'alerte', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message,
      })
    }
  })

  // Vérifier et créer automatiquement les alertes
  server.post('/alerts/check', {
    preHandler: [(server as any).authenticate],
    schema: {
      description: 'Vérifier et créer automatiquement les alertes de stock',
      tags: ['Stock Alerts'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId } = (request as any).user

      await StockAlertService.checkAndCreateAlerts(companyId)

      return reply.send({
        success: true,
        message: 'Vérification des alertes terminée',
      })
    } catch (error: any) {
      logger.error('Erreur lors de la vérification des alertes', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: error.message,
      })
    }
  })
}
