import { Quote, PaymentReminder, Product } from '@gestion/database'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { AuditLogService, AuditLogFilters, AuditAction } from '../services/audit-log.service'
// AuthenticatedRequest type removed - using FastifyRequest with type assertion
import { logger } from '../utils/logger'

// Types pour la validation des données
interface AuditLogFiltersRequest {
  page?: number
  limit?: number
  action?: string
  entityType?: string
  entityId?: string
  userId?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

export default async function auditLogsRoutes(fastify: FastifyInstance) {
  // Middleware d'authentification pour toutes les routes
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.send(err)
    }
  })

  /**
   * GET /api/v1/audit-logs - Liste des logs d'audit avec filtrage et pagination
   */
  fastify.get<{
    Querystring: AuditLogFiltersRequest
  }>('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId, role } = (request as any).user
      const {
        page = 1,
        limit = 50,
        action,
        entityType,
        entityId,
        userId,
        dateFrom,
        dateTo,
        search,
      } = request.query

      // Vérifier les permissions (seuls les ADMIN et MANAGER peuvent voir les logs)
      if (role !== 'ADMIN' && role !== 'MANAGER') {
        return reply.status(403).send({
          success: false,
          message: 'Accès non autorisé aux logs d\'audit',
        })
      }

      const filters: AuditLogFilters = {
        companyId,
        action: action as AuditAction,
        entityType,
        entityId,
        userId,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
        search,
      }

      const result = await AuditLogService.getAuditLogs(filters, page, limit)

      reply.send({
        success: true,
        data: result.data,
        pagination: result.pagination,
      })
    } catch (error) {
      logger.error('Erreur lors de la récupération des logs d\'audit', { error })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des logs d\'audit',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * GET /api/v1/audit-logs/stats - Statistiques des logs d'audit
   */
  fastify.get<{
    Querystring: {
      dateFrom?: string
      dateTo?: string
    }
  }>('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId, role } = (request as any).user
      const { dateFrom, dateTo } = request.query

      // Vérifier les permissions
      if (role !== 'ADMIN' && role !== 'MANAGER') {
        return reply.status(403).send({
          success: false,
          message: 'Accès non autorisé aux statistiques d\'audit',
        })
      }

      const stats = await AuditLogService.getAuditStats(
        companyId,
        dateFrom ? new Date(dateFrom) : undefined,
        dateTo ? new Date(dateTo) : undefined
      )

      reply.send({
        success: true,
        data: stats,
      })
    } catch (error) {
      logger.error('Erreur lors de la récupération des statistiques d\'audit', { error })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des statistiques d\'audit',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * GET /api/v1/audit-logs/actions - Liste des actions disponibles
   */
  fastify.get('/actions', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { role } = (request as any).user

      // Vérifier les permissions
      if (role !== 'ADMIN' && role !== 'MANAGER') {
        return reply.status(403).send({
          success: false,
          message: 'Accès non autorisé',
        })
      }

      const actions = Object.values(AuditAction).map(action => ({
        value: action,
        label: action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
      }))

      reply.send({
        success: true,
        data: actions,
      })
    } catch (error) {
      logger.error('Erreur lors de la récupération des actions d\'audit', { error })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des actions d\'audit',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * GET /api/v1/audit-logs/entity-types - Liste des types d'entités
   */
  fastify.get('/entity-types', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { role } = (request as any).user

      // Vérifier les permissions
      if (role !== 'ADMIN' && role !== 'MANAGER') {
        return reply.status(403).send({
          success: false,
          message: 'Accès non autorisé',
        })
      }

      const entityTypes = [
        { value: 'Quote', label: 'Devis' },
        { value: 'Payment', label: 'Paiement' },
        { value: 'PaymentReminder', label: 'Relance de paiement' },
        { value: 'PurchaseOrder', label: 'Commande fournisseur' },
        { value: 'GoodsReception', label: 'Réception de marchandises' },
        { value: 'Stock', label: 'Stock' },
        { value: 'Order', label: 'Commande' },
        { value: 'Invoice', label: 'Facture' },
        { value: 'Product', label: 'Produit' },
        { value: 'Client', label: 'Client' },
        { value: 'Supplier', label: 'Fournisseur' },
      ]

      reply.send({
        success: true,
        data: entityTypes,
      })
    } catch (error) {
      logger.error('Erreur lors de la récupération des types d\'entités', { error })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des types d\'entités',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * GET /api/v1/audit-logs/:id - Détails d'un log d'audit spécifique
   */
  fastify.get<{
    Params: { id: string }
  }>('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId, role } = (request as any).user
      const { id } = request.params

      // Vérifier les permissions
      if (role !== 'ADMIN' && role !== 'MANAGER') {
        return reply.status(403).send({
          success: false,
          message: 'Accès non autorisé aux détails des logs d\'audit',
        })
      }

      const result = await AuditLogService.getAuditLogs(
        { companyId },
        1,
        1
      )

      const auditLog = result.data.find(log => log.id === id)

      if (!auditLog) {
        return reply.status(404).send({
          success: false,
          message: 'Log d\'audit non trouvé',
        })
      }

      reply.send({
        success: true,
        data: auditLog,
      })
    } catch (error) {
      logger.error('Erreur lors de la récupération du détail du log d\'audit', { error, id: request.params.id })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération du détail du log d\'audit',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })
}
