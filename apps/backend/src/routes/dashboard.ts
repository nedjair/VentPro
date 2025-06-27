import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { DashboardService } from '../services/dashboard.service'
import { AuthenticatedRequest } from '../types/common'
import { logger } from '../utils/logger'

export default async function dashboardRoutes(server: FastifyInstance) {
  // Récupérer les statistiques du dashboard
  server.get('/stats', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Récupérer les statistiques du dashboard',
      tags: ['Dashboard'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                clients: {
                  type: 'object',
                  properties: {
                    total: { type: 'number' },
                    individuals: { type: 'number' },
                    companies: { type: 'number' },
                    recentCount: { type: 'number' },
                  },
                },
                products: {
                  type: 'object',
                  properties: {
                    total: { type: 'number' },
                    active: { type: 'number' },
                    services: { type: 'number' },
                    lowStock: { type: 'number' },
                    totalStockQuantity: { type: 'number' },
                  },
                },
                stock: {
                  type: 'object',
                  properties: {
                    totalProducts: { type: 'number' },
                    productsInStock: { type: 'number' },
                    lowStockProducts: { type: 'number' },
                    outOfStockProducts: { type: 'number' },
                    totalStockQuantity: { type: 'number' },
                    recentMovements: { type: 'number' },
                  },
                },
                sales: {
                  type: 'object',
                  properties: {
                    currentMonth: { type: 'number' },
                    previousMonth: { type: 'number' },
                    growth: { type: 'number' },
                    currency: { type: 'string' },
                  },
                },
                orders: {
                  type: 'object',
                  properties: {
                    total: { type: 'number' },
                    pending: { type: 'number' },
                    accepted: { type: 'number' },
                    rejected: { type: 'number' },
                    averageValue: { type: 'number' },
                  },
                },
                invoices: {
                  type: 'object',
                  properties: {
                    total: { type: 'number' },
                    paid: { type: 'number' },
                    pending: { type: 'number' },
                    overdue: { type: 'number' },
                    totalAmount: { type: 'number' },
                    paidAmount: { type: 'number' },
                    pendingAmount: { type: 'number' },
                  },
                },
                lastUpdated: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.user

      const stats = await DashboardService.getDashboardStats(companyId)

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
        data: stats,
        timestamp: new Date().toISOString(),
        source: 'real-time'
      })
    } catch (error: any) {
      logger.error('Erreur lors de la récupération des statistiques du dashboard', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des statistiques du dashboard',
      })
    }
  })

  // Récupérer les activités récentes
  server.get('/activity', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Récupérer les activités récentes',
      tags: ['Dashboard'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', minimum: 1, maximum: 50, default: 10 },
        },
      },
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { limit = 10 } = request.query as { limit?: number }
      const { companyId } = request.user

      const activities = await DashboardService.getRecentActivity(companyId, limit)

      return reply.send({
        success: true,
        data: activities,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la récupération des activités récentes', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des activités récentes',
      })
    }
  })

  // Récupérer les alertes
  server.get('/alerts', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Récupérer les alertes importantes',
      tags: ['Dashboard'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.user

      const alerts = await DashboardService.getAlerts(companyId)

      return reply.send({
        success: true,
        data: alerts,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la récupération des alertes', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des alertes',
      })
    }
  })

  // Récupérer les données pour les graphiques
  server.get('/charts', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Récupérer les données pour les graphiques du dashboard',
      tags: ['Dashboard'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.user

      const chartData = await DashboardService.getChartData(companyId)

      return reply.send({
        success: true,
        data: chartData,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la récupération des données de graphiques', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des données de graphiques',
      })
    }
  })
}

