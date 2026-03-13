import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '@gestion/database'
import { DashboardService } from '../services/dashboard.service'
import { KpiTargetSettingsService } from '../services/kpi-target-settings.service'

interface QueryParams {
  period?: string
  startDate?: string
  endDate?: string
  limit?: number
  metric?: string
}

interface AnalyticsRequest extends FastifyRequest {
  query: QueryParams
}

const DEFAULT_CURRENCY = 'DZD'

function getOwnerScopeId(request: FastifyRequest): string | undefined {
  const user = (request as any).user
  return user?.companyId || user?.id || user?.userId
}

function normalizeStatus(status?: string | null): string {
  return String(status || '').trim().toLowerCase()
}

function isPaidStatus(status?: string | null): boolean {
  return normalizeStatus(status) === 'paid'
}

function buildDateRange(period?: string, startDate?: string, endDate?: string) {
  if (startDate || endDate) {
    return {
      start: startDate ? new Date(startDate) : undefined,
      end: endDate ? new Date(endDate) : undefined,
    }
  }

  const now = new Date()
  const start = new Date(now)

  switch (period) {
    case 'day':
      start.setDate(now.getDate() - 1)
      break
    case 'week':
      start.setDate(now.getDate() - 7)
      break
    case 'month':
      start.setMonth(now.getMonth() - 1)
      break
    case 'quarter':
    case '3m':
      start.setMonth(now.getMonth() - 3)
      break
    case '6m':
      start.setMonth(now.getMonth() - 6)
      break
    case '12m':
    case 'year':
      start.setMonth(now.getMonth() - 12)
      break
    default:
      start.setMonth(now.getMonth() - 3)
      break
  }

  start.setHours(0, 0, 0, 0)
  return { start, end: undefined as Date | undefined }
}

function getMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function getClientLocationLabel(address?: string | null): string {
  const value = String(address || '').trim()
  if (!value) {
    return 'Non spécifié'
  }

  const segments = value
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean)

  return segments[segments.length - 1] || value
}

function startOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

function calculateTargetVariance(current: number, target: number | null): number | null {
  if (target == null) {
    return null
  }

  if (target === 0) {
    return current > 0 ? 100 : 0
  }

  return Number((((current - target) / target) * 100).toFixed(1))
}

function getAlertCount(alerts: Array<{ id: string; count?: number }>, alertId: string): number {
  return Number(alerts.find((alert) => alert.id === alertId)?.count || 0)
}

export default async function analyticsRoutes(server: FastifyInstance) {
  // GET /stats - Statistiques générales
  server.get('/stats', async (request: AnalyticsRequest, reply: FastifyReply) => {
    try {
      server.log.info('Récupération des statistiques générales')

      // Compter les entités principales
      const [clientsCount, productsCount, ordersCount, invoicesCount] = await Promise.all([
        prisma.client.count({ where: { isActive: true } }),
        prisma.product.count({ where: { isActive: true } }),
        prisma.order.count(),
        prisma.invoice.count()
      ])

      // Calculer le chiffre d'affaires total (factures payées)
      const revenueResult = await prisma.invoice.aggregate({
        where: { status: 'PAID' },
        _sum: { total: true }
      })

      // Calculer le chiffre d'affaires du mois en cours
      const currentMonth = new Date()
      currentMonth.setDate(1)
      currentMonth.setHours(0, 0, 0, 0)

      const monthlyRevenueResult = await prisma.invoice.aggregate({
        where: {
          status: 'PAID',
          createdAt: { gte: currentMonth }
        },
        _sum: { total: true }
      })

      const stats = {
        totalClients: clientsCount,
        totalProducts: productsCount,
        totalOrders: ordersCount,
        totalInvoices: invoicesCount,
        totalRevenue: Number(revenueResult._sum.total || 0),
        monthlyRevenue: Number(monthlyRevenueResult._sum.total || 0),
        currency: 'DZD'
      }

      server.log.info('Statistiques générales récupérées', stats)

      return reply.send({
        success: true,
        data: stats
      })

    } catch (error) {
      server.log.error('Erreur lors de la récupération des statistiques:', error)
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des statistiques'
      })
    }
  })

  // GET /sales - Données de ventes par période
  server.get('/sales', {
    preHandler: [(server as any).authenticate],
  }, async (request: AnalyticsRequest, reply: FastifyReply) => {
    try {
      const { period = 'month', startDate, endDate } = request.query
      const ownerScopeId = getOwnerScopeId(request)

      if (!ownerScopeId) {
        return reply.status(401).send({
          success: false,
          message: 'Contexte d’authentification incomplet'
        })
      }

      server.log.info('Récupération des données de ventes', { period, startDate, endDate })

      const { start, end } = buildDateRange(period, startDate, endDate)
      const invoices = await prisma.invoice.findMany({
        where: {
          userId: ownerScopeId,
          ...(start || end
            ? {
                createdAt: {
                  ...(start ? { gte: start } : {}),
                  ...(end ? { lte: end } : {}),
                },
              }
            : {}),
        },
        select: {
          id: true,
          total: true,
          status: true,
          createdAt: true,
          clientId: true,
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      })

      const paidInvoices = invoices.filter((invoice) => isPaidStatus(invoice.status))
      const monthlyRevenueMap = new Map<string, { month: string; revenue: number; invoiceCount: number }>()
      const topClientsMap = new Map<string, { id: string; name: string; type: string; totalRevenue: number; invoiceCount: number }>()

      for (const invoice of paidInvoices) {
        const monthDate = new Date(invoice.createdAt)
        const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`
        const currentMonth = monthlyRevenueMap.get(monthKey) || {
          month: getMonthLabel(monthDate),
          revenue: 0,
          invoiceCount: 0,
        }

        currentMonth.revenue += Number(invoice.total || 0)
        currentMonth.invoiceCount += 1
        monthlyRevenueMap.set(monthKey, currentMonth)

        const clientId = invoice.clientId
        const currentClient = topClientsMap.get(clientId) || {
          id: clientId,
          name: invoice.client?.name || 'Client inconnu',
          type: 'INDIVIDUAL',
          totalRevenue: 0,
          invoiceCount: 0,
        }

        currentClient.totalRevenue += Number(invoice.total || 0)
        currentClient.invoiceCount += 1
        topClientsMap.set(clientId, currentClient)
      }

      const monthlyRevenue = Array.from(monthlyRevenueMap.values()).map((item) => ({
        month: item.month,
        revenue: Number(item.revenue.toFixed(2)),
        invoiceCount: item.invoiceCount,
        avgInvoice: item.invoiceCount > 0 ? Number((item.revenue / item.invoiceCount).toFixed(2)) : 0,
      }))

      const topClients = Array.from(topClientsMap.values())
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 10)
        .map((client) => ({
          ...client,
          totalRevenue: Number(client.totalRevenue.toFixed(2)),
          avgInvoice: client.invoiceCount > 0 ? Number((client.totalRevenue / client.invoiceCount).toFixed(2)) : 0,
        }))

      const totalRevenue = topClients.reduce((sum, client) => sum + client.totalRevenue, 0)
      const totalInvoiceCount = topClients.reduce((sum, client) => sum + client.invoiceCount, 0)

      return reply.send({
        success: true,
        data: {
          period,
          monthlyRevenue,
          topClients,
          clientTypeDistribution: [
            {
              type: 'INDIVIDUAL',
              revenue: Number(totalRevenue.toFixed(2)),
              invoiceCount: totalInvoiceCount,
            },
          ],
        }
      })

    } catch (error) {
      server.log.error('Erreur lors de la récupération des ventes:', error)
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des données de ventes'
      })
    }
  })

  // GET /top-products - Top 5 des produits les plus vendus
  server.get('/top-products', async (request: AnalyticsRequest, reply: FastifyReply) => {
    try {
      const { limit = 5 } = request.query

      server.log.info('Récupération du top des produits', { limit })

      const topProducts = await prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: {
          quantity: true,
          unitPrice: true
        },
        _count: {
          id: true
        },
        orderBy: {
          _sum: {
            quantity: 'desc'
          }
        },
        take: Number(limit)
      })

      // Récupérer les détails des produits
      const productIds = topProducts.map(item => item.productId)
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          name: true,
          price: true,
          category: {
            select: { name: true }
          }
        }
      })

      const formattedTopProducts = topProducts.map(item => {
        const product = products.find(p => p.id === item.productId)
        return {
          productId: item.productId,
          productName: product?.name || 'Produit inconnu',
          categoryName: product?.category?.name || 'Catégorie inconnue',
          unitPrice: Number(product?.price || 0),
          totalQuantity: Number(item._sum.quantiteActuelle || 0),
          totalRevenue: Number((item._sum.quantiteActuelle || 0) * (item._sum.unitPrice || 0)),
          ordersCount: item._count.id
        }
      })

      return reply.send({
        success: true,
        data: {
          products: formattedTopProducts,
          currency: 'DZD'
        }
      })

    } catch (error) {
      server.log.error('Erreur lors de la récupération du top produits:', error)
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération du top des produits'
      })
    }
  })

  // GET /top-clients - Top 5 des clients par chiffre d'affaires
  server.get('/top-clients', async (request: AnalyticsRequest, reply: FastifyReply) => {
    try {
      const { limit = 5 } = request.query

      server.log.info('Récupération du top des clients', { limit })

      const topClients = await prisma.invoice.groupBy({
        by: ['clientId'],
        where: { status: 'PAID' },
        _sum: {
          total: true
        },
        _count: {
          id: true
        },
        orderBy: {
          _sum: {
            total: 'desc'
          }
        },
        take: Number(limit)
      })

      // Récupérer les détails des clients
      const clientIds = topClients.map(item => item.clientId)
      const clients = await prisma.client.findMany({
        where: { id: { in: clientIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyName: true,
          email: true,
          type: true,
          city: true
        }
      })

      const formattedTopClients = topClients.map(item => {
        const client = clients.find(c => c.id === item.clientId)
        const clientName = client?.type === 'COMPANY'
          ? client?.companyName || 'Entreprise inconnue'
          : `${client?.firstName || ''} ${client?.lastName || ''}`.trim() || 'Client inconnu'

        return {
          clientId: item.clientId,
          clientName,
          clientEmail: client?.email || '',
          clientType: client?.type || 'INDIVIDUAL',
          clientCity: client?.city || '',
          totalRevenue: Number(item._sum.total || 0),
          invoicesCount: item._count.id
        }
      })

      return reply.send({
        success: true,
        data: {
          clients: formattedTopClients,
          currency: 'DZD'
        }
      })

    } catch (error) {
      server.log.error('Erreur lors de la récupération du top clients:', error)
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération du top des clients'
      })
    }
  })

  // GET /revenue-trend - Évolution du chiffre d'affaires sur les 12 derniers mois
  server.get('/revenue-trend', async (request: AnalyticsRequest, reply: FastifyReply) => {
    try {
      server.log.info('Récupération de l\'évolution du chiffre d\'affaires')

      // Calculer la date de début (12 mois en arrière)
      const twelveMonthsAgo = new Date()
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
      twelveMonthsAgo.setDate(1)
      twelveMonthsAgo.setHours(0, 0, 0, 0)

      const revenueData = await prisma.invoice.findMany({
        where: {
          status: 'PAID',
          createdAt: { gte: twelveMonthsAgo }
        },
        select: {
          total: true,
          createdAt: true
        },
        orderBy: { createdAt: 'asc' }
      })

      // Grouper par mois
      const monthlyRevenue = revenueData.reduce((acc: any, invoice) => {
        const date = new Date(invoice.createdAt)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

        if (!acc[monthKey]) {
          acc[monthKey] = {
            month: monthKey,
            revenue: 0,
            invoicesCount: 0
          }
        }

        acc[monthKey].revenue += Number(invoice.total)
        acc[monthKey].invoicesCount += 1

        return acc
      }, {})

      // Générer tous les mois des 12 derniers mois (même ceux sans données)
      const months = []
      for (let i = 11; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

        months.push({
          month: monthKey,
          revenue: Number((monthlyRevenue[monthKey]?.revenue || 0).toFixed(2)),
          invoicesCount: monthlyRevenue[monthKey]?.invoicesCount || 0,
          monthName: date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
        })
      }

      return reply.send({
        success: true,
        data: {
          trend: months,
          currency: 'DZD'
        }
      })

    } catch (error) {
      server.log.error('Erreur lors de la récupération de l\'évolution du CA:', error)
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération de l\'évolution du chiffre d\'affaires'
      })
    }
  })

  // GET /kpi - Métriques KPI temps réel
  server.get('/kpi', {
    preHandler: [(server as any).authenticate],
  }, async (request: AnalyticsRequest, reply: FastifyReply) => {
    try {
      const ownerScopeId = getOwnerScopeId(request)

      if (!ownerScopeId) {
        return reply.status(401).send({
          success: false,
          message: 'Contexte d’authentification incomplet'
        })
      }

      server.log.info('Récupération des KPI temps réel')

      const currentMonthStart = startOfMonth(new Date())
      const nextMonthStart = addMonths(currentMonthStart, 1)

      const [dashboardStats, alerts, kpiTargets, currentMonthOrders, currentMonthClients, currentMonthQuotes, currentMonthConvertedQuotes, currentMonthSoldProducts] = await Promise.all([
        DashboardService.getDashboardStats(ownerScopeId),
        DashboardService.getAlerts(ownerScopeId),
        KpiTargetSettingsService.getSettings(ownerScopeId),
        prisma.order.count({
          where: {
            userId: ownerScopeId,
            createdAt: { gte: currentMonthStart, lt: nextMonthStart },
          },
        }),
        prisma.client.count({
          where: {
            userId: ownerScopeId,
            createdAt: { gte: currentMonthStart, lt: nextMonthStart },
          },
        }),
        prisma.quote.count({
          where: {
            userId: ownerScopeId,
            createdAt: { gte: currentMonthStart, lt: nextMonthStart },
          },
        }),
        prisma.order.count({
          where: {
            userId: ownerScopeId,
            quoteId: { not: null },
            createdAt: { gte: currentMonthStart, lt: nextMonthStart },
          },
        }),
        prisma.orderItem.aggregate({
          where: {
            order: {
              userId: ownerScopeId,
              createdAt: { gte: currentMonthStart, lt: nextMonthStart },
            },
          },
          _sum: {
            quantity: true,
          },
        }),
      ])

      const totalClients = Number(dashboardStats.clients.total || 0)
      const revenueCurrent = Number(dashboardStats.sales.currentMonth || 0)
      const conversionCurrent = currentMonthQuotes > 0 ? Number(((currentMonthConvertedQuotes / currentMonthQuotes) * 100).toFixed(1)) : 0
      const lowStockCount = Number(
        dashboardStats.products.lowStock ||
        getAlertCount(alerts, 'out-of-stock')
      )

      const kpiData = {
        revenue: {
          current: revenueCurrent,
          target: kpiTargets.revenueTarget,
          // Le champ growth est conservé pour compatibilité frontend mais il représente désormais l'écart vs objectif.
          growth: calculateTargetVariance(revenueCurrent, kpiTargets.revenueTarget),
          targetConfigured: kpiTargets.revenueTarget !== null,
          currency: dashboardStats.sales.currency || DEFAULT_CURRENCY,
        },
        orders: {
          current: currentMonthOrders,
          target: kpiTargets.ordersTarget,
          growth: calculateTargetVariance(currentMonthOrders, kpiTargets.ordersTarget),
          targetConfigured: kpiTargets.ordersTarget !== null,
          pending: Number(dashboardStats.orders.pending || 0),
        },
        clients: {
          current: totalClients,
          target: kpiTargets.clientsTarget,
          growth: calculateTargetVariance(totalClients, kpiTargets.clientsTarget),
          targetConfigured: kpiTargets.clientsTarget !== null,
          newThisMonth: currentMonthClients,
        },
        conversion: {
          rate: conversionCurrent,
          target: kpiTargets.conversionRateTarget,
          growth: calculateTargetVariance(conversionCurrent, kpiTargets.conversionRateTarget),
          targetConfigured: kpiTargets.conversionRateTarget !== null,
          quotes: currentMonthQuotes,
          convertedQuotes: currentMonthConvertedQuotes,
        },
        products: {
          total: Number(dashboardStats.products.total || 0),
          lowStock: lowStockCount,
          outOfStock: Number(dashboardStats.products.outOfStock || getAlertCount(alerts, 'out-of-stock')),
          soldThisMonth: Number(currentMonthSoldProducts._sum.quantity || 0),
        },
        invoices: {
          total: Number(dashboardStats.invoices.total || 0),
          overdue: Number(dashboardStats.invoices.overdue || 0),
          paid: Number(dashboardStats.invoices.paid || 0),
        },
        alerts: {
          lowStock: lowStockCount,
          overdueInvoices: getAlertCount(alerts, 'overdue-invoices'),
          pendingOrders: getAlertCount(alerts, 'pending-orders'),
        },
        lastUpdated: dashboardStats.lastUpdated || new Date().toISOString(),
      }

      server.log.info('KPI récupérés avec succès (données réelles)', {
        ownerScopeId,
        revenueCurrent,
        currentMonthOrders,
        totalClients,
        conversionCurrent,
        targetSettingsUpdatedAt: kpiTargets.updatedAt,
      })

      return reply.send({
        success: true,
        data: kpiData
      })

    } catch (error) {
      server.log.error('Erreur lors de la récupération des KPI:', error)
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des KPI'
      })
    }
  })

  // GET /evolution - Données d'évolution pour les graphiques
  server.get('/evolution', async (request: AnalyticsRequest, reply: FastifyReply) => {
    try {
      const { metric = 'revenue', period = '6m' } = request.query
      server.log.info('Récupération des données d\'évolution', { metric, period })

      // Calculer la période en fonction du paramètre
      let monthsBack = 6
      if (period === '3m') monthsBack = 3
      else if (period === '12m') monthsBack = 12
      else if (period === '24m') monthsBack = 24

      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - monthsBack)
      startDate.setDate(1)
      startDate.setHours(0, 0, 0, 0)

      let evolutionData: any[] = []

      if (metric === 'revenue') {
        // Évolution du chiffre d'affaires
        const revenueData = await prisma.invoice.findMany({
          where: {
            status: 'PAID',
            createdAt: { gte: startDate }
          },
          select: {
            total: true,
            createdAt: true
          },
          orderBy: { createdAt: 'asc' }
        })

        // Grouper par mois
        const monthlyRevenue = new Map<string, number>()
        revenueData.forEach(invoice => {
          const monthKey = invoice.createdAt.toISOString().substring(0, 7) // YYYY-MM
          const current = monthlyRevenue.get(monthKey) || 0
          monthlyRevenue.set(monthKey, current + Number(invoice.total))
        })

        // Créer les données pour tous les mois de la période
        for (let i = monthsBack - 1; i >= 0; i--) {
          const date = new Date()
          date.setMonth(date.getMonth() - i)
          const monthKey = date.toISOString().substring(0, 7)
          const monthName = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })

          evolutionData.push({
            period: monthKey,
            label: monthName,
            value: monthlyRevenue.get(monthKey) || 0
          })
        }
      } else if (metric === 'orders') {
        // Évolution des commandes
        const ordersData = await prisma.order.findMany({
          where: {
            createdAt: { gte: startDate }
          },
          select: {
            createdAt: true
          },
          orderBy: { createdAt: 'asc' }
        })

        // Grouper par mois
        const monthlyOrders = new Map<string, number>()
        ordersData.forEach(order => {
          const monthKey = order.createdAt.toISOString().substring(0, 7)
          const current = monthlyOrders.get(monthKey) || 0
          monthlyOrders.set(monthKey, current + 1)
        })

        // Créer les données pour tous les mois
        for (let i = monthsBack - 1; i >= 0; i--) {
          const date = new Date()
          date.setMonth(date.getMonth() - i)
          const monthKey = date.toISOString().substring(0, 7)
          const monthName = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })

          evolutionData.push({
            period: monthKey,
            label: monthName,
            value: monthlyOrders.get(monthKey) || 0
          })
        }
      }

      const result = {
        metric,
        period,
        data: evolutionData,
        summary: {
          total: evolutionData.reduce((sum, item) => sum + item.value, 0),
          average: evolutionData.length > 0 ? evolutionData.reduce((sum, item) => sum + item.value, 0) / evolutionData.length : 0,
          trend: evolutionData.length >= 2 ?
            (evolutionData[evolutionData.length - 1].value > evolutionData[evolutionData.length - 2].value ? 'up' : 'down') : 'stable'
        }
      }

      server.log.info('Données d\'évolution récupérées', { metric, period, dataPoints: evolutionData.length })

      return reply.send({
        success: true,
        data: result
      })

    } catch (error) {
      server.log.error('Erreur lors de la récupération des données d\'évolution:', error)
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des données d\'évolution'
      })
    }
  })

  // GET /orders-status - Répartition des commandes par statut
  server.get('/orders-status', async (request: AnalyticsRequest, reply: FastifyReply) => {
    try {
      server.log.info('Récupération de la répartition des commandes par statut')

      const ordersStatus = await prisma.order.groupBy({
        by: ['status'],
        _count: {
          id: true
        },
        _sum: {
          total: true
        }
      })

      const formattedOrdersStatus = ordersStatus.map(item => ({
        status: item.status,
        count: item._count.id,
        totalAmount: Number(item._sum.total || 0),
        statusLabel: getStatusLabel(item.status)
      }))

      // Calculer les totaux
      const totalOrders = formattedOrdersStatus.reduce((sum, item) => sum + item.count, 0)
      const totalAmount = formattedOrdersStatus.reduce((sum, item) => sum + item.totalAmount, 0)

      // Ajouter les pourcentages
      const ordersWithPercentage = formattedOrdersStatus.map(item => ({
        ...item,
        percentage: totalOrders > 0 ? Number(((item.count / totalOrders) * 100).toFixed(1)) : 0
      }))

      return reply.send({
        success: true,
        data: {
          statusDistribution: ordersWithPercentage,
          summary: {
            totalOrders,
            totalAmount: Number(totalAmount.toFixed(2))
          },
          currency: 'DZD'
        }
      })

    } catch (error) {
      server.log.error('Erreur lors de la récupération du statut des commandes:', error)
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération de la répartition des commandes'
      })
    }
  })

  // GET /products - Analytics des produits (alias pour compatibilité frontend)
  server.get('/products', {
    preHandler: [(server as any).authenticate],
  }, async (request: AnalyticsRequest, reply: FastifyReply) => {
    try {
      const { period = 'month', limit = 10 } = request.query
      const ownerScopeId = getOwnerScopeId(request)

      if (!ownerScopeId) {
        return reply.status(401).send({
          success: false,
          message: 'Contexte d’authentification incomplet'
        })
      }

      server.log.info('Récupération des analytics produits', { period, limit })

      const { start, end } = buildDateRange(period)
      const items = await prisma.orderItem.findMany({
        where: {
          order: {
            userId: ownerScopeId,
            ...(start || end
              ? {
                  createdAt: {
                    ...(start ? { gte: start } : {}),
                    ...(end ? { lte: end } : {}),
                  },
                }
              : {}),
          },
        },
        select: {
          quantity: true,
          price: true,
          orderId: true,
          productId: true,
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              category: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      })

      const productMap = new Map<string, {
        id: string
        name: string
        category: string
        price: number
        totalQuantity: number
        totalRevenue: number
        orderIds: Set<string>
      }>()

      for (const item of items) {
        const current = productMap.get(item.productId) || {
          id: item.productId,
          name: item.product?.name || 'Produit inconnu',
          category: item.product?.category?.name || 'Non catégorisé',
          price: Number(item.product?.price || item.price || 0),
          totalQuantity: 0,
          totalRevenue: 0,
          orderIds: new Set<string>(),
        }

        current.totalQuantity += Number(item.quantity || 0)
        current.totalRevenue += Number(item.quantity || 0) * Number(item.price || current.price || 0)
        current.orderIds.add(item.orderId)
        productMap.set(item.productId, current)
      }

      const allProducts = Array.from(productMap.values())
        .map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          price: Number(item.price.toFixed(2)),
          totalQuantity: item.totalQuantity,
          totalRevenue: Number(item.totalRevenue.toFixed(2)),
          invoiceCount: item.orderIds.size,
          avgPrice: item.totalQuantity > 0 ? Number((item.totalRevenue / item.totalQuantity).toFixed(2)) : 0,
        }))

      const enrichedProducts = allProducts
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, Number(limit))

      const categoryMap = new Map<string, {
        category: string
        totalQuantity: number
        totalRevenue: number
        productCount: number
      }>()

      for (const product of allProducts) {
        const categoryName = product.category || 'Non catégorisé'
        const currentCategory = categoryMap.get(categoryName) || {
          category: categoryName,
          totalQuantity: 0,
          totalRevenue: 0,
          productCount: 0,
        }

        currentCategory.totalQuantity += product.totalQuantity
        currentCategory.totalRevenue += product.totalRevenue
        currentCategory.productCount += 1
        categoryMap.set(categoryName, currentCategory)
      }

      const categoryDistribution = Array.from(categoryMap.values())
        .sort((left, right) => {
          if (right.totalQuantity === left.totalQuantity) {
            return right.totalRevenue - left.totalRevenue
          }

          return right.totalQuantity - left.totalQuantity
        })
        .map((category) => ({
          ...category,
          totalRevenue: Number(category.totalRevenue.toFixed(2)),
        }))

      const result = {
        period,
        topProducts: enrichedProducts,
        categoryDistribution
      }

      return reply.send({
        success: true,
        data: result
      })

    } catch (error) {
      server.log.error('Erreur lors de la récupération des analytics produits:', error)
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des analytics produits'
      })
    }
  })

  // GET /clients - Analytics des clients (alias pour compatibilité frontend)
  server.get('/clients', {
    preHandler: [(server as any).authenticate],
  }, async (request: AnalyticsRequest, reply: FastifyReply) => {
    try {
      const ownerScopeId = getOwnerScopeId(request)

      if (!ownerScopeId) {
        return reply.status(401).send({
          success: false,
          message: 'Contexte d’authentification incomplet'
        })
      }

      server.log.info('Récupération des analytics clients')

      const invoices = await prisma.invoice.findMany({
        where: {
          userId: ownerScopeId,
        },
        select: {
          clientId: true,
          total: true,
          status: true,
          createdAt: true,
          client: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
        },
      })

      const paidInvoices = invoices.filter((invoice) => isPaidStatus(invoice.status))
      const clientsMap = new Map<string, {
        id: string
        name: string
        type: string
        city: string
        invoiceCount: number
        totalRevenue: number
        lastInvoiceDate: Date | null
      }>()

      for (const invoice of paidInvoices) {
        const current = clientsMap.get(invoice.clientId) || {
          id: invoice.clientId,
          name: invoice.client?.name || 'Client inconnu',
          type: 'INDIVIDUAL',
          city: getClientLocationLabel(invoice.client?.address),
          invoiceCount: 0,
          totalRevenue: 0,
          lastInvoiceDate: null,
        }

        current.invoiceCount += 1
        current.totalRevenue += Number(invoice.total || 0)
        current.lastInvoiceDate = !current.lastInvoiceDate || invoice.createdAt > current.lastInvoiceDate
          ? invoice.createdAt
          : current.lastInvoiceDate

        clientsMap.set(invoice.clientId, current)
      }

      const clientSegments = Array.from(clientsMap.values())

      // Créer les segments
      const segmentation = [
        { segment: 'Premium', clientCount: 0, segmentRevenue: 0, avgRevenue: 0 },
        { segment: 'Standard', clientCount: 0, segmentRevenue: 0, avgRevenue: 0 },
        { segment: 'Occasionnel', clientCount: 0, segmentRevenue: 0, avgRevenue: 0 }
      ]

      clientSegments.forEach(client => {
        const revenue = Number(client.totalRevenue || 0)
        if (revenue > 50000) {
          segmentation[0].clientCount++
          segmentation[0].segmentRevenue += revenue
        } else if (revenue > 10000) {
          segmentation[1].clientCount++
          segmentation[1].segmentRevenue += revenue
        } else {
          segmentation[2].clientCount++
          segmentation[2].segmentRevenue += revenue
        }
      })

      // Calculer les moyennes
      segmentation.forEach(segment => {
        segment.avgRevenue = segment.clientCount > 0 ? segment.segmentRevenue / segment.clientCount : 0
      })

      const geographicMap = new Map<string, { city: string; clientCount: number; totalRevenue: number }>()
      clientsMap.forEach((client) => {
        const current = geographicMap.get(client.city) || {
          city: client.city,
          clientCount: 0,
          totalRevenue: 0,
        }

        current.clientCount += 1
        current.totalRevenue += client.totalRevenue
        geographicMap.set(client.city, current)
      })

      const enrichedGeographic = Array.from(geographicMap.values())
        .sort((a, b) => b.clientCount - a.clientCount)
        .slice(0, 10)
        .map((item) => ({
          ...item,
          totalRevenue: Number(item.totalRevenue.toFixed(2)),
        }))

      const enrichedActiveClients = Array.from(clientsMap.values())
        .sort((a, b) => {
          if (b.invoiceCount === a.invoiceCount) {
            return b.totalRevenue - a.totalRevenue
          }
          return b.invoiceCount - a.invoiceCount
        })
        .slice(0, 10)
        .map((client) => ({
          id: client.id,
          name: client.name,
          type: client.type,
          city: client.city,
          invoiceCount: client.invoiceCount,
          totalRevenue: Number(client.totalRevenue.toFixed(2)),
          lastInvoiceDate: client.lastInvoiceDate?.toISOString() || '',
        }))

      const result = {
        segmentation,
        geographicDistribution: enrichedGeographic,
        mostActiveClients: enrichedActiveClients
      }

      return reply.send({
        success: true,
        data: result
      })

    } catch (error) {
      server.log.error('Erreur lors de la récupération des analytics clients:', error)
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des analytics clients'
      })
    }
  })
}

// Fonction utilitaire pour obtenir le libellé du statut
function getStatusLabel(status: string): string {
  const statusLabels: { [key: string]: string } = {
    'PENDING': 'En attente',
    'CONFIRMED': 'Confirmée',
    'PROCESSING': 'En traitement',
    'SHIPPED': 'Expédiée',
    'DELIVERED': 'Livrée',
    'CANCELLED': 'Annulée',
    'QUOTE': 'Devis'
  }

  return statusLabels[status] || status
}
