import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { QuoteService, CreateQuoteData, UpdateQuoteData, QuoteFilters } from '../services/quote-sales.service'
// AuthenticatedRequest type removed - using FastifyRequest with type assertion
import { logger } from '../utils/logger'
import { ExportService } from '../services/export.service'


// Types pour la validation des donnÃ©es
interface CreateQuoteItem {
  productId: string
  quantity: number
  unitPrice: number
  discount?: number
}

interface CreateQuoteRequest {
  clientId: string
  quoteDate?: string
  validUntil: string
  notes?: string
  discount?: number
  items: CreateQuoteItem[]
}

interface UpdateQuoteRequest {
  clientId?: string
  quoteDate?: string
  validUntil?: string
  notes?: string
  discount?: number
  items?: CreateQuoteItem[]
}

interface QuoteFiltersRequest {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
  clientId?: string
  status?: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
  dateFrom?: string
  dateTo?: string
}

interface UpdateQuoteStatusRequest {
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
}

function getOwnerScopeId(request: FastifyRequest): string | undefined {
  const user = (request as any).user
  return user?.companyId || user?.id || user?.userId
}

function getActorUserId(request: FastifyRequest): string | undefined {
  const user = (request as any).user
  return user?.id || user?.userId
}

export default async function quotesRoutes(fastify: FastifyInstance) {
  // Middleware d'authentification pour toutes les routes
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.send(err)
    }
  })

  /**
   * GET /api/v1/quotes - Liste des devis avec filtrage et pagination
   */
  fastify.get<{
    Querystring: QuoteFiltersRequest
  }>('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ownerScopeId = (request as any).user?.companyId || (request as any).user?.id || (request as any).user?.userId

      if (!ownerScopeId) {
        return reply.status(401).send({
          success: false,
          message: 'Contexte dâ€™authentification incomplet',
        })
      }
      const {
        page = 1,
        limit = 10,
        search,
        clientId,
        status,
        dateFrom,
        dateTo,
      } = request.query

      const filters: QuoteFilters = {
        search,
        clientId,
        status,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
      }

      const result = await QuoteService.getQuotes(
        ownerScopeId,
        { page, limit },
        filters
      )

      reply.send({
        success: true,
        data: result.data,
        pagination: {
          ...result.pagination,
          pages: result.pagination.totalPages,
        },
      })
    } catch (error) {
      logger.error('Erreur lors de la rÃ©cupÃ©ration des devis', { error })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la rÃ©cupÃ©ration des devis',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * GET /api/v1/quotes/:id - DÃ©tails d'un devis
   */
  fastify.get<{
    Params: { id: string }
  }>('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ownerScopeId = getOwnerScopeId(request)
      const { id } = request.params

      const quote = await QuoteService.getQuoteById(id, ownerScopeId || '')

      if (!quote) {
        return reply.status(404).send({
          success: false,
          message: 'Devis non trouvÃ©',
        })
      }

      reply.send({
        success: true,
        data: quote,
      })
    } catch (error) {
      logger.error('Erreur lors de la rÃ©cupÃ©ration du devis', { error, id: request.params.id })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la rÃ©cupÃ©ration du devis',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * POST /api/v1/quotes - CrÃ©ation d'un devis
   */
  fastify.post<{
    Body: CreateQuoteRequest
  }>('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ownerScopeId = getOwnerScopeId(request)
      const userId = getActorUserId(request)
      const body = request.body

      // Validation des donnÃ©es
      if (!body.clientId || !body.validUntil || !body.items || body.items.length === 0) {
        return reply.status(400).send({
          success: false,
          message: 'DonnÃ©es manquantes : clientId, validUntil et items sont requis',
        })
      }

      const createData: CreateQuoteData = {
        clientId: body.clientId,
        quoteDate: body.quoteDate ? new Date(body.quoteDate) : undefined,
        validUntil: new Date(body.validUntil),
        notes: body.notes,
        discount: body.discount,
        items: body.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
        })),
      }

      const quote = await QuoteService.createQuote(createData, ownerScopeId || '', userId || '')

      reply.status(201).send({
        success: true,
        data: quote,
        message: 'Devis crÃ©Ã© avec succÃ¨s',
      })
    } catch (error) {
      logger.error('Erreur lors de la crÃ©ation du devis', { error, body: request.body })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la crÃ©ation du devis',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * PUT /api/v1/quotes/:id - Mise Ã  jour d'un devis
   */
  fastify.put<{
    Params: { id: string }
    Body: UpdateQuoteRequest
  }>('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ownerScopeId = getOwnerScopeId(request)
      const { id } = request.params
      const body = request.body

      const updateData: UpdateQuoteData = {
        ...(body.clientId && { clientId: body.clientId }),
        ...(body.quoteDate && { quoteDate: new Date(body.quoteDate) }),
        ...(body.validUntil && { validUntil: new Date(body.validUntil) }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.discount !== undefined && { discount: body.discount }),
        ...(body.items && {
          items: body.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
          })),
        }),
      }

      const quote = await QuoteService.updateQuote(id, updateData, ownerScopeId || '')

      reply.send({
        success: true,
        data: quote,
        message: 'Devis mis Ã  jour avec succÃ¨s',
      })
    } catch (error) {
      logger.error('Erreur lors de la mise Ã  jour du devis', { error, id: request.params.id })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la mise Ã  jour du devis',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * PATCH /api/v1/quotes/:id/status - Changement de statut d'un devis
   */
  fastify.patch<{
    Params: { id: string }
    Body: UpdateQuoteStatusRequest
  }>('/:id/status', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ownerScopeId = getOwnerScopeId(request)
      const { id } = request.params
      const { status } = request.body

      if (!status) {
        return reply.status(400).send({
          success: false,
          message: 'Le statut est requis',
        })
      }

      const quote = await QuoteService.updateQuoteStatus(id, status, ownerScopeId || '')

      reply.send({
        success: true,
        data: quote,
        message: 'Statut du devis mis Ã  jour avec succÃ¨s',
      })
    } catch (error) {
      logger.error('Erreur lors du changement de statut du devis', { error, id: request.params.id })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors du changement de statut du devis',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * POST /api/v1/quotes/:id/convert-to-order - Conversion d'un devis en commande
   */
  fastify.post<{
    Params: { id: string }
  }>('/:id/convert-to-order', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ownerScopeId = getOwnerScopeId(request)
      const userId = getActorUserId(request)
      const { id } = request.params

      const order = await QuoteService.convertQuoteToOrder(id, ownerScopeId || '', userId || '')

      reply.send({
        success: true,
        data: order,
        message: 'Devis converti en commande avec succÃ¨s',
      })
    } catch (error) {
      logger.error('Erreur lors de la conversion du devis en commande', { error, id: request.params.id })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la conversion du devis en commande',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * DELETE /api/v1/quotes/:id - Suppression d'un devis
   */
  fastify.delete<{
    Params: { id: string }
  }>('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ownerScopeId = getOwnerScopeId(request)
      const { id } = request.params

      await QuoteService.deleteQuote(id, ownerScopeId || '')

      reply.send({
        success: true,
        message: 'Devis supprime avec succes',
      })
    } catch (error) {
      logger.error('Erreur lors de la suppression du devis', { error, id: request.params.id })
      const err = error instanceof Error ? error.message : 'Erreur inconnue'
      const isNotFound = /non trouve/i.test(err)
      const isConflict = /deja converti|ne peut pas etre supprime|ne peut pas être supprimé/i.test(err)
      reply.status(isNotFound ? 404 : isConflict ? 409 : 500).send({
        success: false,
        message: err || 'Erreur lors de la suppression du devis',
        error: err,
      })
    }
  })

  /**
   * GET /api/v1/quotes/:id/export/pdf - Export d'un devis en PDF
   */
  fastify.get<{
    Params: { id: string }
  }>('/:id/export/pdf', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ownerScopeId = getOwnerScopeId(request)
      const { id } = request.params

      const quote = await QuoteService.getQuoteById(id, ownerScopeId || '')

      if (!quote) {
        return reply.status(404).send({
          success: false,
          message: 'Devis non trouvé',
        })
      }

      const buffer = await ExportService.generateQuotePdfBuffer(quote)

      if (!buffer || buffer.length === 0) {
        return reply.status(500).send({
          success: false,
          message: 'Le fichier généré est vide - erreur lors de la génération du PDF',
        })
      }

      const filename = `devis_${quote.number}_${Date.now()}.pdf`
      reply.type('application/pdf')
      reply.header('Content-Disposition', `attachment; filename="${filename}"`)
      reply.header('Content-Length', String(buffer.length))
      return reply.send(buffer)
    } catch (error) {
      logger.error('Erreur lors de l\'export PDF du devis', { error, id: request.params.id })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de l\'export PDF du devis',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })
}


