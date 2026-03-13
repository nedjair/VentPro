import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { PurchaseOrderService, CreatePurchaseOrderData, UpdatePurchaseOrderData, PurchaseOrderFilters } from '../services/purchase-order.service'
import { GoodsReceptionService, CreateGoodsReceptionData } from '../services/goods-reception.service'
// AuthenticatedRequest type removed - using FastifyRequest with type assertion
import { logger } from '../utils/logger'

// Types pour la validation des données
interface CreatePurchaseOrderItem {
  productId: string
  quantity: number
  unitPrice: number
}

interface CreatePurchaseOrderRequest {
  supplierId: string
  orderDate?: string
  expectedDate?: string
  notes?: string
  items: CreatePurchaseOrderItem[]
}

interface UpdatePurchaseOrderRequest {
  supplierId?: string
  orderDate?: string
  expectedDate?: string
  notes?: string
  status?: 'DRAFT' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'
  items?: CreatePurchaseOrderItem[]
}

interface PurchaseOrderFiltersRequest {
  page?: number
  limit?: number
  search?: string
  supplierId?: string
  status?: 'DRAFT' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'
  dateFrom?: string
  dateTo?: string
}

interface UpdatePurchaseOrderStatusRequest {
  status: 'DRAFT' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'
}

interface ReceiveGoodsItem {
  purchaseOrderItemId: string
  productId: string
  quantityReceived: number
  quantityExpected: number
  unitCost?: number
  notes?: string
}

interface ReceiveGoodsRequest {
  receptionDate?: string
  notes?: string
  items: ReceiveGoodsItem[]
}

export default async function purchaseOrdersRoutes(fastify: FastifyInstance) {
  // Middleware d'authentification pour toutes les routes
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.send(err)
    }
  })

  /**
   * GET /api/v1/purchase-orders - Liste des commandes fournisseurs avec filtrage et pagination
   */
  fastify.get<{
    Querystring: PurchaseOrderFiltersRequest
  }>('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ownerScopeId = (request as any).user.companyId || (request as any).user.id || (request as any).user.userId
      const {
        page = 1,
        limit = 10,
        search,
        supplierId,
        status,
        dateFrom,
        dateTo,
      } = request.query

      // Convertir page et limit en nombres
      const pageNumber = parseInt(String(page), 10) || 1
      const limitNumber = parseInt(String(limit), 10) || 10

      const filters: PurchaseOrderFilters = {
        search,
        supplierId,
        status: status as any,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
      }

      const result = await PurchaseOrderService.getPurchaseOrders(
        ownerScopeId,
        { page: pageNumber, limit: limitNumber },
        filters
      )

      reply.send({
        success: true,
        data: result.data,
        pagination: result.pagination,
      })
    } catch (error) {
      logger.error('Erreur lors de la récupération des commandes fournisseurs', { error })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des commandes fournisseurs',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * GET /api/v1/purchase-orders/stats - Statistiques commandes fournisseurs
   */
  fastify.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ownerScopeId = (request as any).user.companyId || (request as any).user.id || (request as any).user.userId
      const stats = await PurchaseOrderService.getPurchaseOrderStats(ownerScopeId)

      reply.send({
        success: true,
        data: stats,
      })
    } catch (error) {
      logger.error('Erreur lors de la récupération des statistiques des commandes fournisseurs', { error })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des statistiques des commandes fournisseurs',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * GET /api/v1/purchase-orders/:id - Détails d'une commande fournisseur
   */
  fastify.get<{
    Params: { id: string }
  }>('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId } = (request as any).user
      const { id } = request.params

      const purchaseOrder = await PurchaseOrderService.getPurchaseOrderById(id, companyId)

      if (!purchaseOrder) {
        return reply.status(404).send({
          success: false,
          message: 'Commande fournisseur non trouvée',
        })
      }

      reply.send({
        success: true,
        data: purchaseOrder,
      })
    } catch (error) {
      logger.error('Erreur lors de la récupération de la commande fournisseur', { error, id: request.params.id })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération de la commande fournisseur',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * POST /api/v1/purchase-orders - Création d'une commande fournisseur
   */
  fastify.post<{
    Body: CreatePurchaseOrderRequest
  }>('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId, userId } = (request as any).user
      const body = request.body

      // Validation des données
      if (!body.supplierId || !body.items || body.items.length === 0) {
        return reply.status(400).send({
          success: false,
          message: 'Données manquantes : supplierId et items sont requis',
        })
      }

      const createData: CreatePurchaseOrderData = {
        supplierId: body.supplierId,
        orderDate: body.orderDate ? new Date(body.orderDate) : undefined,
        expectedDate: body.expectedDate ? new Date(body.expectedDate) : undefined,
        notes: body.notes,
        items: body.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      }

      const purchaseOrder = await PurchaseOrderService.createPurchaseOrder(createData, companyId, userId)

      reply.status(201).send({
        success: true,
        data: purchaseOrder,
        message: 'Commande fournisseur créée avec succès',
      })
    } catch (error) {
      logger.error('Erreur lors de la création de la commande fournisseur', { error, body: request.body })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la création de la commande fournisseur',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * PUT /api/v1/purchase-orders/:id - Mise à jour d'une commande fournisseur
   */
  fastify.put<{
    Params: { id: string }
    Body: UpdatePurchaseOrderRequest
  }>('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId } = (request as any).user
      const { id } = request.params
      const body = request.body

      const updateData: UpdatePurchaseOrderData = {
        ...(body.supplierId && { supplierId: body.supplierId }),
        ...(body.orderDate && { orderDate: new Date(body.orderDate) }),
        ...(body.expectedDate && { expectedDate: new Date(body.expectedDate) }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.status && { status: body.status as PurchaseOrderStatus }),
        ...(body.items && {
          items: body.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        }),
      }

      const purchaseOrder = await PurchaseOrderService.updatePurchaseOrder(id, updateData, companyId)

      reply.send({
        success: true,
        data: purchaseOrder,
        message: 'Commande fournisseur mise à jour avec succès',
      })
    } catch (error) {
      logger.error('Erreur lors de la mise à jour de la commande fournisseur', { error, id: request.params.id })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la mise à jour de la commande fournisseur',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * PATCH /api/v1/purchase-orders/:id/status - Changement de statut d'une commande fournisseur
   */
  fastify.patch<{
    Params: { id: string }
    Body: UpdatePurchaseOrderStatusRequest
  }>('/:id/status', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId } = (request as any).user
      const { id } = request.params
      const { status } = request.body

      if (!status) {
        return reply.status(400).send({
          success: false,
          message: 'Le statut est requis',
        })
      }

      const purchaseOrder = await PurchaseOrderService.updatePurchaseOrderStatus(id, status as PurchaseOrderStatus, companyId)

      reply.send({
        success: true,
        data: purchaseOrder,
        message: 'Statut de la commande fournisseur mis à jour avec succès',
      })
    } catch (error) {
      logger.error('Erreur lors du changement de statut de la commande fournisseur', { error, id: request.params.id })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors du changement de statut de la commande fournisseur',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * DELETE /api/v1/purchase-orders/:id - Suppression d'une commande fournisseur
   */
  fastify.delete<{
    Params: { id: string }
  }>('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId } = (request as any).user
      const { id } = request.params

      await PurchaseOrderService.deletePurchaseOrder(id, companyId)

      reply.send({
        success: true,
        message: 'Commande fournisseur supprimée avec succès',
      })
    } catch (error) {
      logger.error('Erreur lors de la suppression de la commande fournisseur', { error, id: request.params.id })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la suppression de la commande fournisseur',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * GET /api/v1/purchase-orders/:id/receptions - Réceptions d'une commande fournisseur
   */
  fastify.get<{
    Params: { id: string }
  }>('/:id/receptions', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId } = (request as any).user
      const { id } = request.params

      const receptions = await GoodsReceptionService.getReceptionsByPurchaseOrder(id, companyId)

      reply.send({
        success: true,
        data: receptions,
      })
    } catch (error) {
      logger.error('Erreur lors de la récupération des réceptions de la commande', {
        error,
        purchaseOrderId: request.params.id
      })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des réceptions',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * POST /api/v1/purchase-orders/:id/receive - Réception d'articles d'une commande fournisseur
   */
  fastify.post<{
    Params: { id: string }
    Body: ReceiveGoodsRequest
  }>('/:id/receive', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId, userId } = (request as any).user
      const { id } = request.params
      const body = request.body

      // Validation des données
      if (!body.items || body.items.length === 0) {
        return reply.status(400).send({
          success: false,
          message: 'Les articles à réceptionner sont requis',
        })
      }

      const createData: CreateGoodsReceptionData = {
        purchaseOrderId: id,
        receptionDate: body.receptionDate ? new Date(body.receptionDate) : undefined,
        notes: body.notes,
        items: body.items.map(item => ({
          purchaseOrderItemId: item.purchaseOrderItemId,
          productId: item.productId,
          quantityReceived: item.quantiteActuelleReceived,
          quantityExpected: item.quantiteActuelleExpected,
          unitCost: item.unitCost,
          notes: item.notes,
        })),
      }

      const reception = await GoodsReceptionService.createGoodsReception(createData, companyId, userId)

      reply.status(201).send({
        success: true,
        data: reception,
        message: 'Réception de marchandises créée avec succès',
      })
    } catch (error) {
      logger.error('Erreur lors de la réception des marchandises', { error, id: request.params.id })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la réception des marchandises',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * GET /api/v1/purchase-orders/:id/export/pdf - Export d'une commande fournisseur en PDF
   */
  fastify.get<{
    Params: { id: string }
  }>('/:id/export/pdf', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId } = (request as any).user
      const { id } = request.params

      const purchaseOrder = await PurchaseOrderService.getPurchaseOrderById(id, companyId)

      if (!purchaseOrder) {
        return reply.status(404).send({
          success: false,
          message: 'Commande fournisseur non trouvée',
        })
      }

      // TODO: Implémenter l'export PDF avec un service dédié
      // Pour l'instant, on retourne les données de la commande
      reply.send({
        success: true,
        data: purchaseOrder,
        message: 'Export PDF de la commande fournisseur (à implémenter)',
      })
    } catch (error) {
      logger.error('Erreur lors de l\'export PDF de la commande fournisseur', { error, id: request.params.id })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de l\'export PDF de la commande fournisseur',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })
}
