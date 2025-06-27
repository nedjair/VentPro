/**
 * Routes API unifiées pour les alertes de stock
 * Source de vérité unique basée sur la table products
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { UnifiedStockAlertsService } from '../services/unified-stock-alerts.service'
import { logger } from '../utils/logger'

interface AuthenticatedRequest extends FastifyRequest {
  user: {
    userId: string
    companyId: string
    email: string
    role: string
  }
}

export default async function unifiedStockAlertsRoutes(server: FastifyInstance) {
  // Obtenir les compteurs d'alertes unifiés
  server.get('/unified/counts', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Obtenir les compteurs d\'alertes de stock unifiés',
      tags: ['Unified Stock Alerts'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                outOfStock: { type: 'number' },
                lowStock: { type: 'number' },
                overStock: { type: 'number' },
                critical: { type: 'number' },
                high: { type: 'number' },
                medium: { type: 'number' },
                low: { type: 'number' },
              },
            },
            timestamp: { type: 'string' },
            source: { type: 'string' },
          },
        },
      },
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.user

      const counts = await UnifiedStockAlertsService.getUnifiedCounts(companyId)

      // Headers pour éviter le cache
      reply.headers({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Timestamp': new Date().toISOString(),
        'X-Data-Source': 'unified-real-time'
      })

      return reply.send({
        success: true,
        data: counts,
        timestamp: new Date().toISOString(),
        source: 'unified-real-time',
      })
    } catch (error: any) {
      logger.error('Erreur lors de la récupération des compteurs unifiés', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: error.message,
      })
    }
  })

  // Obtenir les alertes unifiées avec filtres et pagination
  server.get('/unified/alerts', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Obtenir les alertes de stock unifiées',
      tags: ['Unified Stock Alerts'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          type: { 
            type: 'string', 
            enum: ['OUT_OF_STOCK', 'LOW_STOCK', 'OVERSTOCK'] 
          },
          severity: { 
            type: 'string', 
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] 
          },
          productId: { type: 'string' },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          offset: { type: 'number', minimum: 0, default: 0 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                alerts: { type: 'array' },
                total: { type: 'number' },
                counts: { type: 'object' },
              },
            },
            timestamp: { type: 'string' },
            source: { type: 'string' },
          },
        },
      },
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.user
      const query = request.query as any

      const result = await UnifiedStockAlertsService.getUnifiedAlerts(companyId, {
        type: query.type,
        severity: query.severity,
        productId: query.productId,
        limit: query.limit || 20,
        offset: query.offset || 0,
      })

      // Headers pour éviter le cache
      reply.headers({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Timestamp': new Date().toISOString(),
        'X-Data-Source': 'unified-real-time'
      })

      return reply.send({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
        source: 'unified-real-time',
      })
    } catch (error: any) {
      logger.error('Erreur lors de la récupération des alertes unifiées', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: error.message,
      })
    }
  })

  // Obtenir le dashboard unifié des stocks
  server.get('/unified/dashboard', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Obtenir le dashboard unifié des stocks',
      tags: ['Unified Stock Alerts'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                overview: { type: 'object' },
                activity: { type: 'object' },
                alerts: { type: 'object' },
                counts: { type: 'object' },
                lastUpdate: { type: 'string' },
              },
            },
            timestamp: { type: 'string' },
            source: { type: 'string' },
          },
        },
      },
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.user

      const dashboard = await UnifiedStockAlertsService.getUnifiedDashboard(companyId)

      // Headers pour éviter le cache
      reply.headers({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Timestamp': new Date().toISOString(),
        'X-Data-Source': 'unified-real-time'
      })

      return reply.send({
        success: true,
        data: dashboard,
        timestamp: new Date().toISOString(),
        source: 'unified-real-time',
      })
    } catch (error: any) {
      logger.error('Erreur lors de la récupération du dashboard unifié', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: error.message,
      })
    }
  })

  // Synchroniser les alertes stockées avec les données calculées
  server.post('/unified/sync', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Synchroniser les alertes stockées avec les données calculées',
      tags: ['Unified Stock Alerts'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.user

      logger.info('Synchronisation des alertes demandée', { companyId })

      await UnifiedStockAlertsService.synchronizeStoredAlerts(companyId)

      return reply.send({
        success: true,
        message: 'Synchronisation des alertes terminée avec succès',
        timestamp: new Date().toISOString(),
      })
    } catch (error: any) {
      logger.error('Erreur lors de la synchronisation des alertes', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: error.message,
      })
    }
  })

  // Forcer le rafraîchissement complet
  server.post('/unified/refresh', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Forcer le rafraîchissement complet des alertes',
      tags: ['Unified Stock Alerts'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            message: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.user

      logger.info('Rafraîchissement forcé des alertes demandé', { companyId })

      // Synchroniser les alertes stockées
      await UnifiedStockAlertsService.synchronizeStoredAlerts(companyId)

      // Récupérer le dashboard mis à jour
      const dashboard = await UnifiedStockAlertsService.getUnifiedDashboard(companyId)

      logger.info('Rafraîchissement forcé terminé', {
        companyId,
        activeAlerts: dashboard.activity.activeAlerts,
      })

      return reply.send({
        success: true,
        data: dashboard,
        message: 'Rafraîchissement forcé terminé avec succès',
        timestamp: new Date().toISOString(),
      })
    } catch (error: any) {
      logger.error('Erreur lors du rafraîchissement forcé', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: error.message,
      })
    }
  })

  // Route de diagnostic pour comparer les sources
  server.get('/unified/diagnostic', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Diagnostic des incohérences entre les sources d\'alertes',
      tags: ['Unified Stock Alerts'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.user

      // Récupérer les données des différentes sources
      const [unifiedCounts, storedAlertsCount, dashboardData] = await Promise.all([
        UnifiedStockAlertsService.getUnifiedCounts(companyId),
        // Compter les alertes stockées
        server.prisma.stockAlert.count({
          where: { companyId, isActive: true },
        }),
        // Récupérer les données du dashboard existant
        UnifiedStockAlertsService.getUnifiedDashboard(companyId),
      ])

      const diagnostic = {
        unified: unifiedCounts,
        stored: { total: storedAlertsCount },
        dashboard: dashboardData,
        inconsistencies: [],
        recommendations: [],
      }

      // Détecter les incohérences
      if (unifiedCounts.total !== storedAlertsCount) {
        diagnostic.inconsistencies.push({
          field: 'Total alertes',
          unified: unifiedCounts.total,
          stored: storedAlertsCount,
          difference: unifiedCounts.total - storedAlertsCount,
        })
        diagnostic.recommendations.push('Exécuter la synchronisation des alertes stockées')
      }

      return reply.send({
        success: true,
        data: diagnostic,
        timestamp: new Date().toISOString(),
        source: 'diagnostic',
      })
    } catch (error: any) {
      logger.error('Erreur lors du diagnostic', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: error.message,
      })
    }
  })
}
