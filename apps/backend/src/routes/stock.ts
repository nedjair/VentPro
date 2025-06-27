import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { StockService } from '../services/stock.service'
import { StockAlertService } from '../services/stock-alert.service'
import { AuthenticatedRequest } from '@gestion/shared'
import { logger } from '../utils/logger'

// Types pour la validation des données
interface CreateStockMovementRequest {
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER'
  quantity: number
  unitCost?: number
  reference?: string
  comment?: string
  productId: string
}

interface StockAdjustmentRequest {
  productId: string
  newQuantity: number
  comment?: string
}

interface StockMovementFiltersRequest {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  productId?: string
  type?: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER'
  startDate?: string
  endDate?: string
  reference?: string
}



export default async function stockRoutes(server: FastifyInstance) {
  // Obtenir le stock en temps réel d'un produit
  server.get('/realtime/:productId', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Obtenir le stock en temps réel d\'un produit',
      tags: ['Stock'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['productId'],
        properties: {
          productId: { type: 'string' },
        },
      },
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { productId } = request.params as { productId: string }
      const { companyId } = request.user

      const stockData = await StockService.getRealTimeStock(productId, companyId)

      return reply.send({
        success: true,
        data: stockData,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la récupération du stock temps réel', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message,
      })
    }
  })

  // Obtenir le tableau de bord temps réel des stocks
  server.get('/dashboard', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Obtenir le tableau de bord temps réel des stocks',
      tags: ['Stock'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.user

      const dashboard = await StockService.getRealTimeDashboard(companyId)

      // Headers pour éviter le cache et forcer le rafraîchissement
      reply.headers({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Timestamp': new Date().toISOString(),
        'X-Data-Source': 'real-time'
      })

      return reply.send({
        success: true,
        data: dashboard,
        timestamp: new Date().toISOString(),
        source: 'real-time'
      })
    } catch (error: any) {
      logger.error('Erreur lors de la récupération du tableau de bord stock', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: error.message,
      })
    }
  })

  // Route pour forcer le rafraîchissement du dashboard
  server.post('/dashboard/refresh', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Forcer le rafraîchissement du tableau de bord des stocks',
      tags: ['Stock'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.user

      logger.info('Rafraîchissement forcé du dashboard stock demandé', { companyId })

      // Forcer la re-vérification des alertes
      await StockAlertService.checkAndCreateAlerts(companyId)

      // Récupérer les données fraîches
      const dashboard = await StockService.getRealTimeDashboard(companyId)

      // Headers pour éviter le cache
      reply.headers({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Timestamp': new Date().toISOString(),
        'X-Data-Source': 'force-refresh'
      })

      logger.info('Rafraîchissement forcé terminé', {
        companyId,
        activeAlerts: dashboard.activity.activeAlerts
      })

      return reply.send({
        success: true,
        data: dashboard,
        timestamp: new Date().toISOString(),
        source: 'force-refresh',
        message: 'Dashboard rafraîchi avec succès'
      })
    } catch (error: any) {
      logger.error('Erreur lors du rafraîchissement forcé', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors du rafraîchissement'
      })
    }
  })

  // Réserver du stock
  server.post('/reserve', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Réserver du stock pour une commande',
      tags: ['Stock'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['productId', 'quantity'],
        properties: {
          productId: { type: 'string' },
          quantity: { type: 'number', minimum: 1 },
          orderId: { type: 'string' },
        },
      },
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { productId, quantity, orderId } = request.body as {
        productId: string
        quantity: number
        orderId?: string
      }
      const { companyId, id: userId } = request.user

      const movement = await StockService.reserveStock(
        productId,
        quantity,
        companyId,
        orderId,
        userId
      )

      return reply.status(201).send({
        success: true,
        data: movement,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la réservation de stock', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message,
      })
    }
  })

  // Libérer une réservation
  server.post('/release', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Libérer une réservation de stock',
      tags: ['Stock'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['productId', 'quantity'],
        properties: {
          productId: { type: 'string' },
          quantity: { type: 'number', minimum: 1 },
          orderId: { type: 'string' },
        },
      },
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { productId, quantity, orderId } = request.body as {
        productId: string
        quantity: number
        orderId?: string
      }
      const { companyId, id: userId } = request.user

      const movement = await StockService.releaseReservation(
        productId,
        quantity,
        companyId,
        orderId,
        userId
      )

      return reply.status(201).send({
        success: true,
        data: movement,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la libération de réservation', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message,
      })
    }
  })
  // Créer un mouvement de stock
  server.post('/movements', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Créer un mouvement de stock',
      tags: ['Stock'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['type', 'quantity', 'productId'],
        properties: {
          type: { type: 'string', enum: ['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER'] },
          quantity: { type: 'number', minimum: 1 },
          unitCost: { type: 'number', minimum: 0 },
          reference: { type: 'string' },
          comment: { type: 'string' },
          productId: { type: 'string', minLength: 1 },
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
                quantity: { type: 'number' },
                unitCost: { type: 'number' },
                reference: { type: 'string' },
                comment: { type: 'string' },
                productId: { type: 'string' },
                createdAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const data = request.body as CreateStockMovementRequest
      const { companyId } = request.user

      // Validation basique
      if (!data.type || !data.quantity || !data.productId) {
        return reply.status(400).send({
          success: false,
          message: 'Données manquantes: type, quantity et productId sont requis',
        })
      }

      const movement = await StockService.createStockMovement(data, companyId)

      return reply.status(201).send({
        success: true,
        data: movement,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la création du mouvement de stock', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message || 'Erreur lors de la création du mouvement de stock',
      })
    }
  })

  // Récupérer les mouvements de stock
  server.get('/movements', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Récupérer les mouvements de stock',
      tags: ['Stock'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          sortBy: { type: 'string', default: 'createdAt' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          productId: { type: 'string' },
          type: { type: 'string', enum: ['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER'] },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          reference: { type: 'string' },
        },
      },
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const query = request.query as StockMovementFiltersRequest
      const { companyId } = request.user

      // Pagination avec valeurs par défaut
      const pagination = {
        page: query.page || 1,
        limit: Math.min(query.limit || 20, 100),
      }

      // Filtres avec conversion des dates
      const processedFilters = {
        productId: query.productId,
        type: query.type,
        reference: query.reference,
        ...(query.startDate && { startDate: new Date(query.startDate) }),
        ...(query.endDate && { endDate: new Date(query.endDate) }),
      }

      const result = await StockService.getStockMovements(companyId, processedFilters, pagination)

      return reply.send({
        success: true,
        data: result.data,
        pagination: result.pagination,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la récupération des mouvements de stock', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des mouvements de stock',
      })
    }
  })

  // Récupérer l'historique des mouvements pour un produit
  server.get('/movements/product/:productId', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Récupérer l\'historique des mouvements pour un produit',
      tags: ['Stock'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          productId: { type: 'string' },
        },
        required: ['productId'],
      },
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          sortBy: { type: 'string', default: 'createdAt' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
        },
      },
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { productId } = request.params as { productId: string }
      const query = request.query as { page?: number; limit?: number }
      const { companyId } = request.user

      // Pagination avec valeurs par défaut
      const pagination = {
        page: query.page || 1,
        limit: Math.min(query.limit || 20, 100),
      }

      const result = await StockService.getProductStockHistory(productId, companyId, pagination)

      return reply.send({
        success: true,
        data: result.data,
        pagination: result.pagination,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la récupération de l\'historique du stock', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération de l\'historique du stock',
      })
    }
  })

  // Effectuer un ajustement de stock
  server.post('/adjust', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Effectuer un ajustement de stock',
      tags: ['Stock'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['productId', 'newQuantity'],
        properties: {
          productId: { type: 'string', minLength: 1 },
          newQuantity: { type: 'number', minimum: 0 },
          comment: { type: 'string' },
        },
      },
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const data = request.body as StockAdjustmentRequest
      const { companyId } = request.user

      // Validation basique
      if (!data.productId || data.newQuantity === undefined) {
        return reply.status(400).send({
          success: false,
          message: 'Données manquantes: productId et newQuantity sont requis',
        })
      }

      const movement = await StockService.adjustStock(data, companyId)

      return reply.send({
        success: true,
        data: movement,
        message: 'Ajustement de stock effectué avec succès',
      })
    } catch (error: any) {
      logger.error('Erreur lors de l\'ajustement de stock', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message || 'Erreur lors de l\'ajustement de stock',
      })
    }
  })

  // Statistiques de stock
  server.get('/stats', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Statistiques de stock',
      tags: ['Stock'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.user

      const stats = await StockService.getStockStats(companyId)

      return reply.send({
        success: true,
        data: stats,
      })
    } catch (error: any) {
      logger.error('Erreur lors du calcul des statistiques de stock', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors du calcul des statistiques de stock',
      })
    }
  })

  // Alertes de stock
  server.get('/alerts', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Alertes de stock (produits en rupture ou stock faible)',
      tags: ['Stock'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.user

      const alerts = await StockService.getStockAlerts(companyId)

      return reply.send({
        success: true,
        data: alerts,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la récupération des alertes de stock', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des alertes de stock',
      })
    }
  })

  // Route temporaire pour synchroniser les données products et stocks
  server.post('/sync-data', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Synchroniser les données entre tables products et stocks',
      tags: ['Stock'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.user

      const result = await StockService.syncProductsStocks(companyId)

      return reply.send({
        success: true,
        data: result,
        message: 'Synchronisation terminée avec succès'
      })
    } catch (error: any) {
      logger.error('Erreur lors de la synchronisation', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la synchronisation'
      })
    }
  })

  // Route pour l'unification complète des données stocks
  server.post('/unify-data', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Unifier les données products et stocks (stocks comme source de vérité)',
      tags: ['Stock'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.user

      const result = await StockService.unifyStockData(companyId)

      return reply.send({
        success: true,
        data: result,
        message: result.message
      })
    } catch (error: any) {
      logger.error('Erreur lors de l\'unification', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de l\'unification des données'
      })
    }
  })

  // ================================
  // ROUTES POUR LA GESTION DES STOCKS (nouveau modèle Stock)
  // ================================

  // Récupérer tous les stocks
  server.get('/', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Récupérer tous les stocks avec pagination et filtres',
      tags: ['Stock'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          search: { type: 'string' },
          productId: { type: 'string' },
          lowStock: { type: 'boolean' },
          outOfStock: { type: 'boolean' },
          categoryId: { type: 'string' },
        },
      },
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const query = request.query as any
      const { companyId } = request.user

      const pagination = {
        page: query.page || 1,
        limit: Math.min(query.limit || 20, 100),
      }

      const filters = {
        search: query.search,
        productId: query.productId,
        lowStock: query.lowStock,
        outOfStock: query.outOfStock,
        categoryId: query.categoryId,
      }

      const result = await StockService.getStocks(companyId, filters, pagination)

      return reply.send({
        success: true,
        data: result.data,
        pagination: result.pagination,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la récupération des stocks', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des stocks',
      })
    }
  })

  // Récupérer un stock par ID
  server.get('/:id', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Récupérer un stock par ID',
      tags: ['Stock'],
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

      const stock = await StockService.getStockById(id, companyId)

      if (!stock) {
        return reply.status(404).send({
          success: false,
          message: 'Stock non trouvé',
        })
      }

      return reply.send({
        success: true,
        data: stock,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la récupération du stock', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération du stock',
      })
    }
  })

  // Créer un nouveau stock
  server.post('/', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Créer un nouveau stock',
      tags: ['Stock'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['productId', 'quantiteActuelle', 'quantiteMinimale'],
        properties: {
          productId: { type: 'string', minLength: 1 },
          quantiteActuelle: { type: 'integer', minimum: 0 },
          quantiteMinimale: { type: 'integer', minimum: 0 },
          quantiteMaximale: { type: 'integer', minimum: 0 },
        },
      },
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const data = request.body as any
      const { companyId } = request.user

      const stock = await StockService.createStock(data, companyId)

      return reply.status(201).send({
        success: true,
        data: stock,
        message: 'Stock créé avec succès',
      })
    } catch (error: any) {
      logger.error('Erreur lors de la création du stock', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message || 'Erreur lors de la création du stock',
      })
    }
  })

  // Mettre à jour un stock
  server.put('/:id', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Mettre à jour un stock',
      tags: ['Stock'],
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
          quantiteActuelle: { type: 'integer', minimum: 0 },
          quantiteMinimale: { type: 'integer', minimum: 0 },
          quantiteMaximale: { type: 'integer', minimum: 0 },
        },
      },
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string }
      const data = request.body as any
      const { companyId } = request.user

      const stock = await StockService.updateStock(id, data, companyId)

      return reply.send({
        success: true,
        data: stock,
        message: 'Stock mis à jour avec succès',
      })
    } catch (error: any) {
      logger.error('Erreur lors de la mise à jour du stock', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message || 'Erreur lors de la mise à jour du stock',
      })
    }
  })

  // Supprimer un stock
  server.delete('/:id', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Supprimer un stock',
      tags: ['Stock'],
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

      await StockService.deleteStock(id, companyId)

      return reply.send({
        success: true,
        message: 'Stock supprimé avec succès',
      })
    } catch (error: any) {
      logger.error('Erreur lors de la suppression du stock', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message || 'Erreur lors de la suppression du stock',
      })
    }
  })

  // Ajustement de stock spécialisé
  server.put('/:id/adjust', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Effectuer un ajustement de stock via le modèle Stock',
      tags: ['Stock'],
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
        required: ['newQuantity'],
        properties: {
          newQuantity: { type: 'integer', minimum: 0 },
          comment: { type: 'string' },
        },
      },
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string }
      const { newQuantity, comment } = request.body as any
      const { companyId } = request.user

      // Récupérer le stock pour obtenir le productId
      const stock = await StockService.getStockById(id, companyId)
      if (!stock) {
        return reply.status(404).send({
          success: false,
          message: 'Stock non trouvé',
        })
      }

      // Effectuer l'ajustement via le service existant
      const movement = await StockService.adjustStock({
        productId: stock.productId,
        newQuantity,
        comment,
      }, companyId)

      // Mettre à jour le modèle Stock
      const updatedStock = await StockService.updateStock(id, {
        quantiteActuelle: newQuantity,
      }, companyId)

      return reply.send({
        success: true,
        data: {
          stock: updatedStock,
          movement,
        },
        message: 'Ajustement de stock effectué avec succès',
      })
    } catch (error: any) {
      logger.error('Erreur lors de l\'ajustement de stock', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message || 'Erreur lors de l\'ajustement de stock',
      })
    }
  })

  // Force synchronization endpoint
  server.post('/sync', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Forcer la synchronisation des stocks et alertes',
      tags: ['Stock'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.user

      logger.info('Synchronisation forcée demandée', { companyId })

      // Force stock synchronization
      await StockService.unifyStockData(companyId)

      // Force alerts check
      await StockAlertService.checkAndCreateAlerts(companyId)

      // Get updated dashboard
      const dashboard = await StockService.getRealTimeDashboard(companyId)

      logger.info('Synchronisation forcée terminée', {
        companyId,
        activeAlerts: dashboard.activity.activeAlerts
      })

      return reply.send({
        success: true,
        message: 'Synchronisation forcée terminée',
        data: dashboard,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la synchronisation forcée', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: error.message,
      })
    }
  })
}

