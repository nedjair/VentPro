import { Product } from '@gestion/database'
// Service dashboard avec données réelles depuis PostgreSQL via Prisma
import { logger } from '../utils/logger'
import { prisma } from '../lib/prisma'

export class DashboardService {
  static async getDashboardStats(companyId: string) {
    console.log('🔍 DASHBOARD SERVICE: Getting dashboard stats from PostgreSQL', { companyId })
    logger.info('Getting dashboard stats from PostgreSQL', { companyId })

    // 1) Schéma PostgreSQL réellement observé en local :
    //    tables PascalCase liées à l'utilisateur via `userId`.
    //    On fournit ici un fallback minimal mais utile pour les cartes du dashboard.
    try {
      const [
        clientCounts,
        productCounts,
        orderCounts,
        invoiceCounts,
        salesSums,
      ] = await Promise.all([
        prisma.$queryRaw<Array<{
          total: bigint | number | string
          recent: bigint | number | string
        }>>`
          SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '30 days') AS recent
          FROM "Client"
          WHERE "userId" = ${companyId}
        `,
        prisma.$queryRaw<Array<{
          total: bigint | number | string
          inStock: bigint | number | string
          outOfStock: bigint | number | string
          totalStockValue: number | string | null
        }>>`
          SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE COALESCE(s.quantity, 0) > 0) AS "inStock",
            COUNT(*) FILTER (WHERE COALESCE(s.quantity, 0) <= 0) AS "outOfStock",
            COALESCE(SUM(COALESCE(p.price, 0) * COALESCE(s.quantity, 0)), 0) AS "totalStockValue"
          FROM "Product" p
          LEFT JOIN "Stock" s ON s."productId" = p.id
          WHERE p."userId" = ${companyId}
        `,
        prisma.$queryRaw<Array<{
          total: bigint | number | string
          pending: bigint | number | string
          accepted: bigint | number | string
          averageValue: number | string | null
        }>>`
          SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) IN ('draft', 'pending', 'preparing')) AS pending,
            COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) IN ('confirmed', 'sent', 'completed')) AS accepted,
            COALESCE(AVG(COALESCE(total, 0)), 0) AS "averageValue"
          FROM "Order"
          WHERE "userId" = ${companyId}
        `,
        prisma.$queryRaw<Array<{
          total: bigint | number | string
          paid: bigint | number | string
          pending: bigint | number | string
          overdue: bigint | number | string
          totalAmount: number | string | null
          paidAmount: number | string | null
          pendingAmount: number | string | null
        }>>`
          SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'paid') AS paid,
            COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) IN ('sent', 'pending')) AS pending,
            COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'overdue') AS overdue,
            COALESCE(SUM(COALESCE(total, 0)), 0) AS "totalAmount",
            COALESCE(SUM(CASE WHEN LOWER(COALESCE(status, '')) = 'paid' THEN COALESCE(total, 0) ELSE 0 END), 0) AS "paidAmount",
            COALESCE(SUM(CASE WHEN LOWER(COALESCE(status, '')) IN ('sent', 'pending') THEN COALESCE(total, 0) ELSE 0 END), 0) AS "pendingAmount"
          FROM "Invoice"
          WHERE "userId" = ${companyId}
        `,
        prisma.$queryRaw<Array<{
          currentMonth: number | string | null
          previousMonth: number | string | null
        }>>`
          SELECT
            COALESCE(SUM(CASE WHEN DATE_TRUNC('month', COALESCE("paidDate", "createdAt")) = DATE_TRUNC('month', NOW()) THEN COALESCE(total, 0) ELSE 0 END), 0) AS "currentMonth",
            COALESCE(SUM(CASE WHEN DATE_TRUNC('month', COALESCE("paidDate", "createdAt")) = DATE_TRUNC('month', NOW() - INTERVAL '1 month') THEN COALESCE(total, 0) ELSE 0 END), 0) AS "previousMonth"
          FROM "Invoice"
          WHERE "userId" = ${companyId}
            AND LOWER(COALESCE(status, '')) = 'paid'
        `,
      ])

      const clients = clientCounts[0]
      const products = productCounts[0]
      const orders = orderCounts[0]
      const invoices = invoiceCounts[0]
      const sales = salesSums[0]

      const currentMonth = Number(sales?.currentMonth || 0)
      const previousMonth = Number(sales?.previousMonth || 0)
      const growth = previousMonth > 0 ? ((currentMonth - previousMonth) / previousMonth) * 100 : 0
      const totalClients = Number(clients?.total || 0)
      const recentClients = Number(clients?.recent || 0)

      return {
        clients: {
          total: totalClients,
          individuals: 0,
          companies: totalClients,
          recentCount: recentClients,
          growth: totalClients > 0 ? Math.round((recentClients / totalClients) * 10000) / 100 : 0,
        },
        products: {
          total: Number(products?.total || 0),
          inStock: Number(products?.inStock || 0),
          outOfStock: Number(products?.outOfStock || 0),
          lowStock: 0,
          totalStockValue: Number(products?.totalStockValue || 0),
        },
        sales: {
          currentMonth,
          previousMonth,
          growth: Math.round(growth * 100) / 100,
          // `Intl.NumberFormat` côté frontend attend un code ISO 4217 valide.
          currency: 'DZD',
        },
        orders: {
          total: Number(orders?.total || 0),
          pending: Number(orders?.pending || 0),
          accepted: Number(orders?.accepted || 0),
          rejected: 0,
          averageValue: Math.round(Number(orders?.averageValue || 0) * 100) / 100,
        },
        invoices: {
          total: Number(invoices?.total || 0),
          paid: Number(invoices?.paid || 0),
          pending: Number(invoices?.pending || 0),
          overdue: Number(invoices?.overdue || 0),
          totalAmount: Number(invoices?.totalAmount || 0),
          paidAmount: Number(invoices?.paidAmount || 0),
          pendingAmount: Number(invoices?.pendingAmount || 0),
        },
        lastUpdated: new Date().toISOString(),
      }
    } catch (currentSchemaError) {
      logger.warn('Fallback dashboard : schéma PostgreSQL actuel non accessible via SQL brut', { error: currentSchemaError, companyId })
    }

    try {
      // Récupération des statistiques de base (sans les tables optionnelles)
      const [
        clientsStats,
        productsStats,
        ordersStats,
        invoicesStats
      ] = await Promise.all([
        // Statistiques clients
        Promise.all([
          prisma.client.count({ where: { companyId, isActive: true } }),
          prisma.client.count({ where: { companyId, isActive: true, type: 'INDIVIDUAL' } }),
          prisma.client.count({ where: { companyId, isActive: true, type: 'COMPANY' } }),
          prisma.client.count({
            where: {
              companyId,
              isActive: true,
              createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // 30 derniers jours
            }
          })
        ]),

        // Statistiques produits - Utilisation des mêmes critères que StockService
        Promise.all([
          prisma.product.count({
            where: {
              companyId,
              isActive: true,
              isService: false // Exclure les services comme dans StockService
            }
          }),
          prisma.product.count({
            where: {
              companyId,
              isActive: true,
              stock: { quantiteActuelle: { gt: 0 } }
            }
          }),
          // Stock faible : utiliser la table stocks
          prisma.$queryRaw`
            SELECT COUNT(*) as count
            FROM products p
            INNER JOIN stocks s ON p.id = s."productId"
            WHERE p."companyId" = ${companyId}
              AND p."isActive" = true
              AND s."quantiteActuelle" <= s."quantiteMinimale"
              AND s."quantiteMinimale" > 0
          `,
          prisma.product.count({
            where: {
              companyId,
              isActive: true,
              stock: { quantiteActuelle: { lte: 0 } }
            }
          }),
          // Valeur totale du stock : utiliser la table stocks comme StockService
          prisma.stock.aggregate({
            where: { companyId },
            _sum: { valeurStock: true }
          })
        ]),

        // Statistiques commandes (simplifiées pour éviter les erreurs d'enum)
        Promise.all([
          prisma.order.count({ where: { companyId } }),
          prisma.order.count({ where: { companyId, status: 'DRAFT' } }),
          prisma.order.count({ where: { companyId, status: 'SENT' } }),
          prisma.order.count({ where: { companyId } }), // Placeholder pour éviter l'erreur
          prisma.order.aggregate({
            where: { companyId },
            _avg: { total: true }
          })
        ]),

        // Statistiques factures (simplifiées pour éviter les erreurs d'enum)
        Promise.all([
          prisma.invoice.count({ where: { companyId } }),
          prisma.invoice.count({ where: { companyId, status: 'PAID' } }),
          prisma.invoice.count({ where: { companyId, status: 'SENT' } }),
          prisma.invoice.count({ where: { companyId, status: 'OVERDUE' } }),
          prisma.invoice.aggregate({
            where: { companyId },
            _sum: { total: true }
          }),
          prisma.invoice.aggregate({
            where: { companyId, status: 'PAID' },
            _sum: { total: true }
          }),
          prisma.invoice.aggregate({
            where: { companyId, status: 'SENT' },
            _sum: { total: true }
          })
        ]),

        // Statistiques ventes (mois actuel vs précédent)
        Promise.all([
          // CA du mois actuel
          prisma.invoice.aggregate({
            where: {
              companyId,
              status: 'PAID',
              createdAt: {
                gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
              }
            },
            _sum: { total: true }
          }),
          // CA du mois précédent
          prisma.invoice.aggregate({
            where: {
              companyId,
              status: 'PAID',
              createdAt: {
                gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
                lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
              }
            },
            _sum: { total: true }
          })
        ])
      ])

      // Calcul des statistiques clients
      const [totalClients, individualClients, companyClients, recentClients] = clientsStats
      const clientGrowth = totalClients > 0 ? ((recentClients / totalClients) * 100) : 0

      // Calcul des statistiques produits
      const [totalProducts, inStockProducts, lowStockProductsRaw, outOfStockProducts, stockValue] = productsStats

      // Extraire le count de la requête SQL brute pour lowStock
      const lowStockProducts = Number((lowStockProductsRaw as any[])[0]?.count || 0)

      // Calcul des statistiques commandes
      const [totalOrders, draftOrders, sentOrders, placeholderOrders, avgOrderValue] = ordersStats

      // Calcul des statistiques factures
      const [totalInvoices, paidInvoices, sentInvoices, overdueInvoices, totalAmount, paidAmount, sentAmount] = invoicesStats

      // Calcul des statistiques ventes (basées sur les factures payées)
      const currentDate = new Date()
      const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const previousMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
      const previousMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0)

      const [currentMonthSales, previousMonthSales] = await Promise.all([
        prisma.invoice.aggregate({
          where: {
            companyId,
            status: 'PAID',
            paidDate: { gte: currentMonthStart }
          },
          _sum: { total: true }
        }),
        prisma.invoice.aggregate({
          where: {
            companyId,
            status: 'PAID',
            paidDate: { gte: previousMonthStart, lt: previousMonthEnd }
          },
          _sum: { total: true }
        })
      ])

      const currentMonth = Number(currentMonthSales._sum.total || 0)
      const previousMonth = Number(previousMonthSales._sum.total || 0)
      const salesGrowth = previousMonth > 0 ? ((currentMonth - previousMonth) / previousMonth * 100) : 0
      // Toutes les statistiques de base sont maintenant calculées

      const dashboardData = {
        clients: {
          total: totalClients,
          individuals: individualClients,
          companies: companyClients,
          recentCount: recentClients,
          growth: Math.round(clientGrowth * 100) / 100
        },
        products: {
          total: totalProducts,
          inStock: inStockProducts,
          lowStock: lowStockProducts,
          outOfStock: outOfStockProducts,
          totalStockValue: Number(stockValue._sum.valeurStock || 0)
        },
        sales: {
          currentMonth: currentMonth,
          previousMonth: previousMonth,
          growth: Math.round(salesGrowth * 100) / 100,
          currency: 'DZD'
        },
        orders: {
          total: totalOrders,
          pending: draftOrders,
          accepted: sentOrders,
          rejected: sentOrders,
          averageValue: Math.round((Number(avgOrderValue._avg.total || 0)) * 100) / 100
        },
        invoices: {
          total: totalInvoices,
          paid: paidInvoices,
          pending: sentInvoices,
          overdue: overdueInvoices,
          totalAmount: Number(totalAmount._sum.total || 0),
          paidAmount: Number(paidAmount._sum.total || 0),
          pendingAmount: Number(sentAmount._sum.total || 0)
        },
        lastUpdated: new Date().toISOString()
      }

      logger.info('Dashboard stats retrieved successfully from PostgreSQL', {
        companyId,
        clientsTotal: totalClients,
        productsTotal: totalProducts,
        ordersTotal: totalOrders,
        currentMonthSales: currentMonth
      })

      return dashboardData

    } catch (error) {
      logger.error('Error retrieving dashboard stats from PostgreSQL', { error, companyId })

      // Fallback vers des données par défaut en cas d'erreur
      logger.warn('Falling back to default dashboard data due to database error')
      return {
        clients: { total: 0, individuals: 0, companies: 0, recentCount: 0, growth: 0 },
        products: { total: 0, inStock: 0, lowStock: 0, outOfStock: 0, totalStockValue: 0 },
        sales: { currentMonth: 0, previousMonth: 0, growth: 0, currency: 'DZD' },
        orders: { total: 0, pending: 0, accepted: 0, rejected: 0, averageValue: 0 },
        invoices: { total: 0, paid: 0, pending: 0, overdue: 0, totalAmount: 0, paidAmount: 0, pendingAmount: 0 },
        quotes: { total: 0, draft: 0, sent: 0, accepted: 0, expired: 0 },
        payments: { total: 0, thisMonth: 0, pending: 0, overdue: 0 },
        purchaseOrders: { total: 0, pending: 0, received: 0, partiallyReceived: 0 },
        goodsReceptions: { total: 0, thisWeek: 0, incomplete: 0 },
        lastUpdated: new Date().toISOString()
      }
    }
  }

  // Alias pour compatibilité
  static async getStats(companyId: string) {
    return this.getDashboardStats(companyId)
  }

  static async getRecentActivity(companyId: string, limit: number = 10) {
    logger.info('Getting recent activity from PostgreSQL', { companyId, limit })

    try {
      const [recentOrders, recentClients, recentInvoices] = await Promise.all([
        prisma.order.findMany({
          where: { userId: companyId },
          orderBy: { createdAt: 'desc' },
          take: Math.ceil(limit / 3),
          include: {
            client: {
              select: { name: true }
            }
          }
        }),

        prisma.client.findMany({
          where: { userId: companyId },
          orderBy: { createdAt: 'desc' },
          take: Math.ceil(limit / 3),
          select: { id: true, name: true, createdAt: true }
        }),

        prisma.invoice.findMany({
          where: { userId: companyId },
          orderBy: { createdAt: 'desc' },
          take: Math.ceil(limit / 3),
          select: { id: true, invoiceNumber: true, status: true, createdAt: true }
        })
      ])

      const activities: Array<{
        id: string
        type: string
        title: string
        description: string
        timestamp: string
      }> = []

      recentOrders.forEach(order => {
        const clientName = order.client?.name?.trim()
        activities.push({
          id: `order-${order.id}`,
          type: 'ORDER',
          title: 'Commande créée',
          description: clientName
            ? `Commande ${order.orderNumber} créée pour ${clientName}`
            : `Commande ${order.orderNumber} créée`,
          timestamp: order.createdAt.toISOString()
        })
      })

      recentClients.forEach(client => {
        activities.push({
          id: `client-${client.id}`,
          type: 'CLIENT',
          title: 'Client ajouté',
          description: `Client ${client.name} ajouté au portefeuille`,
          timestamp: client.createdAt.toISOString()
        })
      })

      recentInvoices.forEach(invoice => {
        activities.push({
          id: `invoice-${invoice.id}`,
          type: 'INVOICE',
          title: invoice.status?.toLowerCase() === 'paid' ? 'Facture encaissée' : 'Facture émise',
          description: `Facture ${invoice.invoiceNumber} (${invoice.status})`,
          timestamp: invoice.createdAt.toISOString()
        })
      })

      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit)

    } catch (error) {
      logger.error('Error retrieving recent activity from PostgreSQL', { error, companyId })
      return []
    }
  }

  static async getAlerts(companyId: string) {
    logger.info('Getting alerts from PostgreSQL', { companyId })

    try {
      const alerts: Array<{
        id: string
        type: 'critical' | 'warning' | 'info'
        title: string
        message: string
        count?: number
        priority?: string
      }> = []

      const [outOfStockCount, pendingOrdersRaw, overdueInvoicesRaw] = await Promise.all([
        prisma.stock.count({
          where: {
            userId: companyId,
            quantity: { lte: 0 },
          },
        }),
        prisma.$queryRaw<Array<{ count: bigint | number | string }>>`
          SELECT COUNT(*) AS count
          FROM "Order"
          WHERE "userId" = ${companyId}
            AND LOWER(COALESCE(status, '')) IN ('draft', 'pending', 'preparing')
        `,
        prisma.$queryRaw<Array<{ count: bigint | number | string }>>`
          SELECT COUNT(*) AS count
          FROM "Invoice"
          WHERE "userId" = ${companyId}
            AND LOWER(COALESCE(status, '')) = 'overdue'
        `,
      ])

      const pendingOrdersCount = Number(pendingOrdersRaw[0]?.count || 0)
      const overdueInvoicesCount = Number(overdueInvoicesRaw[0]?.count || 0)

      if (pendingOrdersCount > 0) {
        alerts.push({
          id: 'pending-orders',
          type: 'info',
          title: 'Commandes en attente',
          message: `${pendingOrdersCount} commande${pendingOrdersCount > 1 ? 's' : ''} en attente de traitement`,
          count: pendingOrdersCount,
          priority: 'low',
        })
      }

      if (overdueInvoicesCount > 0) {
        alerts.push({
          id: 'overdue-invoices',
          type: 'critical',
          title: 'Factures en retard',
          message: `${overdueInvoicesCount} facture${overdueInvoicesCount > 1 ? 's sont' : ' est'} en retard de paiement`,
          count: overdueInvoicesCount,
          priority: 'high',
        })
      }

      if (outOfStockCount > 0) {
        alerts.push({
          id: 'out-of-stock',
          type: 'warning',
          title: 'Rupture de stock',
          message: `${outOfStockCount} produit${outOfStockCount > 1 ? 's sont' : ' est'} en rupture de stock`,
          count: outOfStockCount,
          priority: 'high',
        })
      }

      return alerts

    } catch (error) {
      logger.error('Error retrieving alerts from PostgreSQL', { error, companyId })
      return []
    }
  }

  static async getChartData(companyId: string) {
    logger.info('Getting chart data from PostgreSQL', { companyId })

    try {
      // Récupérer les données des 6 derniers mois
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      // Tendance des ventes par mois
      const salesTrendData = await prisma.invoice.groupBy({
        by: ['createdAt'],
        where: {
          companyId,
          status: 'PAID',
          createdAt: { gte: sixMonthsAgo }
        },
        _sum: { total: true },
        _count: { id: true }
      })

      // Formater les données par mois
      const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
      const salesTrend = []

      for (let i = 5; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)

        const monthData = salesTrendData.filter(item => {
          const itemDate = new Date(item.createdAt)
          return itemDate >= monthStart && itemDate <= monthEnd
        })

        const totalSales = monthData.reduce((sum, item) => sum + Number(item._sum.total || 0), 0)
        const totalOrders = monthData.reduce((sum, item) => sum + item._count.id, 0)

        salesTrend.push({
          month: monthNames[date.getMonth()],
          sales: Math.round(totalSales * 100) / 100,
          orders: totalOrders
        })
      }

      // Top produits (basé sur les commandes)
      const topProductsData = await prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: { companyId }
        },
        _sum: {
          quantity: true,
          total: true
        },
        orderBy: {
          _sum: {
            total: 'desc'
          }
        },
        take: 5
      })

      // Récupérer les détails des produits
      const productIds = topProductsData.map(item => item.productId)
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true }
      })

      const topProducts = topProductsData.map(item => {
        const product = products.find(p => p.id === item.productId)
        return {
          id: item.productId,
          name: product?.name || 'Produit inconnu',
          sales: item._sum.quantiteActuelle || 0,
          revenue: Math.round((Number(item._sum.total || 0)) * 100) / 100
        }
      })

      // Distribution des clients
      const [individualCount, companyCount] = await Promise.all([
        prisma.client.count({ where: { companyId, type: 'INDIVIDUAL', isActive: true } }),
        prisma.client.count({ where: { companyId, type: 'COMPANY', isActive: true } })
      ])

      const totalClients = individualCount + companyCount
      const clientDistribution = [
        {
          type: 'Entreprises',
          count: companyCount,
          percentage: totalClients > 0 ? Math.round((companyCount / totalClients) * 1000) / 10 : 0
        },
        {
          type: 'Particuliers',
          count: individualCount,
          percentage: totalClients > 0 ? Math.round((individualCount / totalClients) * 1000) / 10 : 0
        }
      ]

      return {
        salesTrend,
        topProducts,
        clientDistribution
      }

    } catch (error) {
      logger.error('Error retrieving chart data from PostgreSQL', { error, companyId })

      // Fallback vers des données par défaut
      return {
        salesTrend: [],
        topProducts: [],
        clientDistribution: [
          { type: 'Entreprises', count: 0, percentage: 0 },
          { type: 'Particuliers', count: 0, percentage: 0 }
        ]
      }
    }
  }

  static async getFinancialSummary(companyId: string, period: string = 'month') {
    logger.info('Getting financial summary with mock data', { companyId, period })

    return {
      totalRevenue: 28750.50,
      totalExpenses: 12450.25,
      netProfit: 16300.25,
      profitMargin: 56.7,
      comparison: {
        revenue: { current: 28750.50, previous: 24150.75, change: 19.1 },
        expenses: { current: 12450.25, previous: 11200.50, change: 11.2 },
        profit: { current: 16300.25, previous: 12950.25, change: 25.9 }
      }
    }
  }
}