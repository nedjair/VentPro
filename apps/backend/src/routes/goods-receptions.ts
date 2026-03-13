import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { GoodsReceptionService, GoodsReceptionFilters } from '../services/goods-reception.service'
// AuthenticatedRequest type removed - using FastifyRequest with type assertion
import { logger } from '../utils/logger'

// Types pour la validation des données
interface GoodsReceptionFiltersRequest {
  page?: number
  limit?: number
  search?: string
  purchaseOrderId?: string
  dateFrom?: string
  dateTo?: string
  isComplete?: boolean
}

export default async function goodsReceptionsRoutes(fastify: FastifyInstance) {
  // Middleware d'authentification pour toutes les routes
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.send(err)
    }
  })

  /**
   * GET /api/v1/purchase-orders/receptions - Liste des réceptions de marchandises
   */
  fastify.get<{
    Querystring: GoodsReceptionFiltersRequest
  }>('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId } = (request as any).user
      const {
        page = 1,
        limit = 10,
        search,
        purchaseOrderId,
        dateFrom,
        dateTo,
        isComplete,
      } = request.query

      const filters: GoodsReceptionFilters = {
        search,
        purchaseOrderId,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
        isComplete: isComplete !== undefined ? isComplete : undefined,
      }

      const result = await GoodsReceptionService.getGoodsReceptions(
        companyId,
        { page, limit },
        filters
      )

      reply.send({
        success: true,
        data: result.data,
        pagination: result.pagination,
      })
    } catch (error) {
      logger.error('Erreur lors de la récupération des réceptions de marchandises', { error })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des réceptions de marchandises',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * GET /api/v1/purchase-orders/receptions/:id - Détails d'une réception de marchandises
   */
  fastify.get<{
    Params: { id: string }
  }>('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId } = (request as any).user
      const { id } = request.params

      const reception = await GoodsReceptionService.getGoodsReceptionById(id, companyId)

      if (!reception) {
        return reply.status(404).send({
          success: false,
          message: 'Réception de marchandises non trouvée',
        })
      }

      reply.send({
        success: true,
        data: reception,
      })
    } catch (error) {
      logger.error('Erreur lors de la récupération de la réception de marchandises', { error, id: request.params.id })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération de la réception de marchandises',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * GET /api/v1/purchase-orders/receptions/by-order/:purchaseOrderId - Réceptions d'une commande fournisseur
   */
  fastify.get<{
    Params: { purchaseOrderId: string }
  }>('/by-order/:purchaseOrderId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId } = (request as any).user
      const { purchaseOrderId } = request.params

      const receptions = await GoodsReceptionService.getReceptionsByPurchaseOrder(purchaseOrderId, companyId)

      reply.send({
        success: true,
        data: receptions,
      })
    } catch (error) {
      logger.error('Erreur lors de la récupération des réceptions de la commande', { 
        error, 
        purchaseOrderId: request.params.purchaseOrderId 
      })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des réceptions de la commande',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })
}
