import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { PaymentService, CreatePaymentData, PaymentFilters, ReminderFilters } from '../services/payment-sales.service'
// AuthenticatedRequest type removed - using FastifyRequest with type assertion
import { logger } from '../utils/logger'

// Types pour la validation des données
interface CreatePaymentRequest {
  invoiceId: string
  amount: number
  paymentDate?: string
  paymentMethod: 'CASH' | 'CHECK' | 'TRANSFER' | 'CARD' | 'OTHER'
  reference?: string
  notes?: string
}

interface UpdatePaymentRequest {
  amount?: number
  paymentDate?: string
  paymentMethod?: 'CASH' | 'CHECK' | 'TRANSFER' | 'CARD' | 'OTHER'
  reference?: string
  notes?: string
}

interface PaymentFiltersRequest {
  page?: number
  limit?: number
  search?: string
  clientId?: string
  invoiceId?: string
  paymentMethod?: 'CASH' | 'CHECK' | 'TRANSFER' | 'CARD' | 'OTHER'
  dateFrom?: string
  dateTo?: string
}

interface ReminderFiltersRequest {
  page?: number
  limit?: number
  search?: string
  clientId?: string
  status?: 'PENDING' | 'SENT' | 'RESOLVED'
  level?: number
  dateFrom?: string
  dateTo?: string
}

function getOwnerScopeId(request: FastifyRequest): string | undefined {
  const user = (request as any).user
  return user?.companyId || user?.id || user?.userId
}

function getActorUserId(request: FastifyRequest): string | undefined {
  const user = (request as any).user
  return user?.id || user?.userId
}

export default async function paymentsRoutes(fastify: FastifyInstance) {
  // Middleware d'authentification pour toutes les routes
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.send(err)
    }
  })

  /**
   * GET /api/v1/payments/stats - Statistiques des paiements
   */
  fastify.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ownerScopeId = getOwnerScopeId(request)

      const stats = await PaymentService.getPaymentStats(ownerScopeId)

      reply.send({
        success: true,
        data: stats,
      })
    } catch (error) {
      logger.error('Erreur lors de la récupération des statistiques de paiements', { error })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des statistiques de paiements',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * GET /api/v1/payments - Liste des paiements avec filtrage et pagination
   */
  fastify.get<{
    Querystring: PaymentFiltersRequest
  }>('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ownerScopeId = getOwnerScopeId(request)
      const {
        page = 1,
        limit = 10,
        search,
        clientId,
        invoiceId,
        paymentMethod,
        dateFrom,
        dateTo,
      } = request.query

      const filters: PaymentFilters = {
        search,
        clientId,
        invoiceId,
        paymentMethod: paymentMethod as any,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
      }

      const result = await PaymentService.getPayments(
        ownerScopeId,
        { page: Number(page), limit: Number(limit) },
        filters
      )

      reply.send({
        success: true,
        data: result.data,
        pagination: result.pagination,
      })
    } catch (error) {
      logger.error('Erreur lors de la récupération des paiements', { error })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des paiements',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * GET /api/v1/payments/:id - Détails d'un paiement
   */
  fastify.get<{
    Params: { id: string }
  }>('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const companyId = getOwnerScopeId(request)
      const { id } = request.params

      const payment = await PaymentService.getPaymentById(id, companyId)

      if (!payment) {
        return reply.status(404).send({
          success: false,
          message: 'Paiement non trouvé',
        })
      }

      reply.send({
        success: true,
        data: payment,
      })
    } catch (error) {
      logger.error('Erreur lors de la récupération du paiement', { error, id: request.params.id })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération du paiement',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * POST /api/v1/payments - Création d'un paiement
   */
  fastify.post<{
    Body: CreatePaymentRequest
  }>('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const companyId = getOwnerScopeId(request)
      const userId = getActorUserId(request)
      const body = request.body

      // Validation des données
      if (!body.invoiceId || !body.amount || !body.paymentMethod) {
        return reply.status(400).send({
          success: false,
          message: 'Données manquantes : invoiceId, amount et paymentMethod sont requis',
        })
      }

      if (body.amount <= 0) {
        return reply.status(400).send({
          success: false,
          message: 'Le montant du paiement doit être positif',
        })
      }

      const createData: CreatePaymentData = {
        invoiceId: body.invoiceId,
        amount: body.amount,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : undefined,
        paymentMethod: body.paymentMethod as any,
        reference: body.reference,
        notes: body.notes,
      }

      const payment = await PaymentService.createPayment(createData, companyId, userId)

      reply.status(201).send({
        success: true,
        data: payment,
        message: 'Paiement créé avec succès',
      })
    } catch (error) {
      logger.error('Erreur lors de la création du paiement', { error, body: request.body })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la création du paiement',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * PUT /api/v1/payments/:id - Mise à jour d'un paiement
   */
  fastify.put<{
    Params: { id: string }
    Body: UpdatePaymentRequest
  }>('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const companyId = getOwnerScopeId(request)
      const { id } = request.params
      const body = request.body

      if (body.amount !== undefined && body.amount <= 0) {
        return reply.status(400).send({
          success: false,
          message: 'Le montant du paiement doit être positif',
        })
      }

      const updateData = {
        ...(body.amount !== undefined && { amount: body.amount }),
        ...(body.paymentDate && { paymentDate: new Date(body.paymentDate) }),
        ...(body.paymentMethod && { paymentMethod: body.paymentMethod as any }),
        ...(body.reference !== undefined && { reference: body.reference }),
        ...(body.notes !== undefined && { notes: body.notes }),
      }

      const payment = await PaymentService.updatePayment(id, updateData, companyId)

      reply.send({
        success: true,
        data: payment,
        message: 'Paiement mis à jour avec succès',
      })
    } catch (error) {
      logger.error('Erreur lors de la mise à jour du paiement', { error, id: request.params.id })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la mise à jour du paiement',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * DELETE /api/v1/payments/:id - Suppression d'un paiement
   */
  fastify.delete<{
    Params: { id: string }
  }>('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const companyId = getOwnerScopeId(request)
      const { id } = request.params

      await PaymentService.deletePayment(id, companyId)

      reply.send({
        success: true,
        message: 'Paiement supprimé avec succès',
      })
    } catch (error) {
      logger.error('Erreur lors de la suppression du paiement', { error, id: request.params.id })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la suppression du paiement',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * GET /api/v1/payments/invoice/:invoiceId - Paiements d'une facture
   */
  fastify.get<{
    Params: { invoiceId: string }
  }>('/invoice/:invoiceId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const companyId = getOwnerScopeId(request)
      const { invoiceId } = request.params

      const payments = await PaymentService.getPaymentsByInvoice(invoiceId, companyId)

      reply.send({
        success: true,
        data: payments,
      })
    } catch (error) {
      logger.error('Erreur lors de la récupération des paiements de la facture', { 
        error, 
        invoiceId: request.params.invoiceId 
      })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des paiements de la facture',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * GET /api/v1/payments/client/:clientId - Paiements d'un client
   */
  fastify.get<{
    Params: { clientId: string }
  }>('/client/:clientId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const companyId = getOwnerScopeId(request)
      const { clientId } = request.params

      const payments = await PaymentService.getPaymentsByClient(clientId, companyId)

      reply.send({
        success: true,
        data: payments,
      })
    } catch (error) {
      logger.error('Erreur lors de la récupération des paiements du client', {
        error,
        clientId: request.params.clientId
      })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des paiements du client',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * POST /api/v1/payments/reminders/generate - Génération des relances de paiement
   */
  fastify.post('/reminders/generate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const companyId = getOwnerScopeId(request)
      const userId = getActorUserId(request)

      const reminders = await PaymentService.generatePaymentReminders(companyId, userId)

      reply.send({
        success: true,
        data: reminders,
        message: `${reminders.length} relance(s) générée(s) avec succès`,
      })
    } catch (error) {
      logger.error('Erreur lors de la génération des relances', { error })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la génération des relances',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * GET /api/v1/payments/reminders - Liste des relances de paiement
   */
  fastify.get<{
    Querystring: ReminderFiltersRequest
  }>('/reminders', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const companyId = getOwnerScopeId(request)
      const {
        page = 1,
        limit = 10,
        search,
        clientId,
        status,
        level,
        dateFrom,
        dateTo,
      } = request.query

      const filters: ReminderFilters = {
        search,
        clientId,
        status: status as any,
        level,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
      }

      const result = await PaymentService.getPaymentReminders(
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
      logger.error('Erreur lors de la récupération des relances', { error })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des relances',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * PATCH /api/v1/payments/reminders/:id/mark-sent - Marquer une relance comme envoyée
   */
  fastify.patch<{
    Params: { id: string }
  }>('/reminders/:id/mark-sent', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const companyId = getOwnerScopeId(request)
      const { id } = request.params

      const reminder = await PaymentService.markReminderAsSent(id, companyId)

      reply.send({
        success: true,
        data: reminder,
        message: 'Relance marquée comme envoyée avec succès',
      })
    } catch (error) {
      logger.error('Erreur lors du marquage de la relance', { error, id: request.params.id })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors du marquage de la relance',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })
}
