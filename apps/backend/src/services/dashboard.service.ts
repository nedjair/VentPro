import { Product } from '@gestion/database'
// Service dashboard avec données réelles depuis PostgreSQL via Prisma
import { logger } from '../utils/logger'
import { prisma } from '../lib/prisma'
import { getFallbackChartData, getFallbackDashboardAlerts, getFallbackDashboardStats, getFallbackRecentActivity, isDatabaseUnavailableError } from './dev-fallback-data.service'

const COMPANY_KEYWORDS = [
  'sarl',
  'spa',
  'eurl',
  'entreprise',
  'groupe',
  'société',
  'societe',
  'cabinet',
  'clinique',
  'atelier',
  'magasin',
  'service',
  'distribution',
  'solutions',
  'informatique',
  'tech',
]

function isCompanyLikeName(name?: string | null): boolean {
  if (!name) {
    return false
  }

  const normalized = name.toLowerCase()
  return COMPANY_KEYWORDS.some(keyword => normalized.includes(keyword))
}

export class DashboardService {
  static async getDashboardStats(companyId: string) {
    console.log('🔍 DASHBOARD SERVICE: Getting dashboard stats from PostgreSQL', { companyId })
    logger.info('Getting dashboard stats from PostgreSQL', { companyId })

    // 1) Schéma PostgreSQL réellement observé en local :
    //    tables PascalCase liées à l'utilisateur via `userId`.
    //    On fournit ici un fallback minimal mais utile pour les cartes du dashboard.
    try {
      const [
        clientRows,
        productCounts,
        orderCounts,
        invoiceCounts,
        paymentSums,
      ] = await Promise.all([
        prisma.$queryRaw<Array<{
          name: string | null
          createdAt: Date
        }>>`
          SELECT
            name,
            "createdAt"
          FROM "Client"
          WHERE "userId" = ${companyId}
        `,
        prisma.$queryRaw<Array<{
          total: bigint | number | string
          inStock: bigint | number | string
          lowStock: bigint | number | string
          outOfStock: bigint | number | string
          totalStockValue: number | string | null
        }>>`
          SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE COALESCE(s.quantity, 0) > 0) AS "inStock",
            COUNT(*) FILTER (
              WHERE COALESCE(s.quantity, 0) > 0
                AND COALESCE(s.quantity, 0) <= COALESCE(p."minStock", 0)
            ) AS "lowStock",
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
        }>>`
          SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'paid') AS paid,
            COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) IN ('sent', 'pending', 'issued', 'partial')) AS pending,
            COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'overdue') AS overdue,
            COALESCE(SUM(COALESCE(total, 0)), 0) AS "totalAmount",
            COALESCE((
              SELECT SUM(COALESCE(p.amount, 0))
              FROM "Payment" p
              WHERE p."userId" = ${companyId}
            ), 0) AS "paidAmount"
          FROM "Invoice"
          WHERE "userId" = ${companyId}
        `,
        prisma.$queryRaw<Array<{
          currentMonth: number | string | null
          previousMonth: number | string | null
        }>>`
          SELECT
            COALESCE(SUM(CASE WHEN DATE_TRUNC('month', "paymentDate") = DATE_TRUNC('month', NOW()) THEN COALESCE(amount, 0) ELSE 0 END), 0) AS "currentMonth",
            COALESCE(SUM(CASE WHEN DATE_TRUNC('month', "paymentDate") = DATE_TRUNC('month', NOW() - INTERVAL '1 month') THEN COALESCE(amount, 0) ELSE 0 END), 0) AS "previousMonth"
          FROM "Payment"
          WHERE "userId" = ${companyId}
        `,
      ])

      const clients = clientRows
      const products = productCounts[0]
      const orders = orderCounts[0]
      const invoices = invoiceCounts[0]
      const sales = paymentSums[0]

      const currentMonth = Number(sales?.currentMonth || 0)
      const previousMonth = Number(sales?.previousMonth || 0)
      const growth = previousMonth > 0 ? ((currentMonth - previousMonth) / previousMonth) * 100 : 0
      const totalClients = clients.length
      const companyClients = clients.filter(client => isCompanyLikeName(client.name)).length
      const recentClients = clients.filter(client => {
        const createdAt = new Date(client.createdAt)
        return createdAt >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }).length

      return {
        clients: {
          total: totalClients,
          individuals: Math.max(totalClients - companyClients, 0),
          companies: companyClients,
          recentCount: recentClients,
          growth: totalClients > 0 ? Math.round((recentClients / totalClients) * 10000) / 100 : 0,
        },
        products: {
          total: Number(products?.total || 0),
          inStock: Number(products?.inStock || 0),
          lowStock: Number(products?.lowStock || 0),
          outOfStock: Number(products?.outOfStock || 0),
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
          pendingAmount: Math.max(Number(invoices?.totalAmount || 0) - Number(invoices?.paidAmount || 0), 0),
        },
        lastUpdated: new Date().toISOString(),
      }
    } catch (currentSchemaError) {
      logger.warn('Fallback dashboard : schéma PostgreSQL actuel non accessible via SQL brut', { error: currentSchemaError, companyId })
    }

      try {
        // Récupération des statistiques de base sur le schéma actif.
        const [clientRows, productsStats, ordersStats, invoicesStats, paymentsStats] = await Promise.all([
          prisma.client.findMany({
            where: { userId: companyId },
            select: { name: true, createdAt: true },
          }),
          prisma.$queryRaw<Array<{
            total: bigint | number | string
            inStock: bigint | number | string
            lowStock: bigint | number | string
            outOfStock: bigint | number | string
            totalStockValue: number | string | null
          }>>`
            SELECT
              COUNT(*) AS total,
              COUNT(*) FILTER (WHERE COALESCE(s.quantity, 0) > 0) AS "inStock",
              COUNT(*) FILTER (
                WHERE COALESCE(s.quantity, 0) > 0
                  AND COALESCE(s.quantity, 0) <= COALESCE(p."minStock", 0)
              ) AS "lowStock",
              COUNT(*) FILTER (WHERE COALESCE(s.quantity, 0) <= 0) AS "outOfStock",
              COALESCE(SUM(COALESCE(p.price, 0) * COALESCE(s.quantity, 0)), 0) AS "totalStockValue"
            FROM "Product" p
            LEFT JOIN "Stock" s ON s."productId" = p.id
            WHERE p."userId" = ${companyId}
          `,
          Promise.all([
            prisma.order.count({ where: { userId: companyId } }),
            prisma.order.count({ where: { userId: companyId, status: 'pending' } }),
            prisma.order.count({ where: { userId: companyId, status: { in: ['confirmed', 'sent', 'completed'] } } }),
            prisma.order.aggregate({
              where: { userId: companyId },
              _avg: { total: true },
            }),
          ]),
          Promise.all([
            prisma.invoice.count({ where: { userId: companyId } }),
            prisma.invoice.count({ where: { userId: companyId, status: 'paid' } }),
            prisma.invoice.count({ where: { userId: companyId, status: { in: ['issued', 'sent', 'pending', 'partial'] } } }),
            prisma.invoice.count({ where: { userId: companyId, status: 'overdue' } }),
            prisma.invoice.aggregate({
              where: { userId: companyId },
              _sum: { total: true },
            }),
          ]),
          prisma.$queryRaw<Array<{
            currentMonth: number | string | null
            previousMonth: number | string | null
            totalPaid: number | string | null
          }>>`
            SELECT
              COALESCE(SUM(CASE WHEN DATE_TRUNC('month', "paymentDate") = DATE_TRUNC('month', NOW()) THEN COALESCE(amount, 0) ELSE 0 END), 0) AS "currentMonth",
              COALESCE(SUM(CASE WHEN DATE_TRUNC('month', "paymentDate") = DATE_TRUNC('month', NOW() - INTERVAL '1 month') THEN COALESCE(amount, 0) ELSE 0 END), 0) AS "previousMonth",
              COALESCE(SUM(COALESCE(amount, 0)), 0) AS "totalPaid"
            FROM "Payment"
            WHERE "userId" = ${companyId}
          `,
        ])

        const totalClients = clientRows.length
        const companyClients = clientRows.filter(client => isCompanyLikeName(client.name)).length
        const recentClients = clientRows.filter(client => {
          const createdAt = new Date(client.createdAt)
          return createdAt >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }).length
        const clientGrowth = totalClients > 0 ? (recentClients / totalClients) * 100 : 0

        const [totalOrders, pendingOrders, acceptedOrders, avgOrderValue] = ordersStats
        const [totalInvoices, paidInvoices, pendingInvoices, overdueInvoices, totalAmount] = invoicesStats
        const sales = paymentsStats[0]

        const currentMonth = Number(sales?.currentMonth || 0)
        const previousMonth = Number(sales?.previousMonth || 0)
        const salesGrowth = previousMonth > 0 ? ((currentMonth - previousMonth) / previousMonth) * 100 : 0
        const paidAmount = Number(sales?.totalPaid || 0)
        const totalInvoicesAmount = Number(totalAmount._sum.total || 0)

        const dashboardData = {
          clients: {
            total: totalClients,
            individuals: Math.max(totalClients - companyClients, 0),
            companies: companyClients,
            recentCount: recentClients,
            growth: Math.round(clientGrowth * 100) / 100,
          },
          products: {
            total: Number(productsStats[0]?.total || 0),
            inStock: Number(productsStats[0]?.inStock || 0),
            lowStock: Number(productsStats[0]?.lowStock || 0),
            outOfStock: Number(productsStats[0]?.outOfStock || 0),
            totalStockValue: Number(productsStats[0]?.totalStockValue || 0),
          },
          sales: {
            currentMonth,
            previousMonth,
            growth: Math.round(salesGrowth * 100) / 100,
            currency: 'DZD',
          },
          orders: {
            total: Number(totalOrders || 0),
            pending: Number(pendingOrders || 0),
            accepted: Number(acceptedOrders || 0),
            rejected: 0,
            averageValue: Math.round(Number(avgOrderValue._avg.total || 0) * 100) / 100,
          },
          invoices: {
            total: Number(totalInvoices || 0),
            paid: Number(paidInvoices || 0),
            pending: Number(pendingInvoices || 0),
            overdue: Number(overdueInvoices || 0),
            totalAmount: totalInvoicesAmount,
            paidAmount,
            pendingAmount: Math.max(totalInvoicesAmount - paidAmount, 0),
          },
          lastUpdated: new Date().toISOString(),
        }

        logger.info('Dashboard stats retrieved successfully from PostgreSQL', {
          companyId,
          clientsTotal: totalClients,
          productsTotal: Number(productsStats[0]?.total || 0),
          ordersTotal: Number(totalOrders || 0),
          currentMonthSales: currentMonth,
        })

        return dashboardData

    } catch (error) {
      if (isDatabaseUnavailableError(error)) {
        return getFallbackDashboardStats(companyId)
      }
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
      const sliceSize = Math.max(1, Math.ceil(limit / 6))
      const [recentOrders, recentClients, recentInvoices, recentPayments, recentPurchases, recentDeliveries] = await Promise.all([
        prisma.order.findMany({
          where: { userId: companyId },
          orderBy: { createdAt: 'desc' },
          take: sliceSize,
          include: {
            client: {
              select: { name: true }
            }
          }
        }),

        prisma.client.findMany({
          where: { userId: companyId },
          orderBy: { createdAt: 'desc' },
          take: sliceSize,
          select: { id: true, name: true, createdAt: true }
        }),

        prisma.invoice.findMany({
          where: { userId: companyId },
          orderBy: { createdAt: 'desc' },
          take: sliceSize,
          select: { id: true, invoiceNumber: true, status: true, createdAt: true }
        }),

        prisma.payment.findMany({
          where: { userId: companyId },
          orderBy: { paymentDate: 'desc' },
          take: sliceSize,
          include: {
            invoice: { select: { invoiceNumber: true } },
          },
        }),

        prisma.purchase.findMany({
          where: { userId: companyId },
          orderBy: { createdAt: 'desc' },
          take: sliceSize,
          include: {
            supplier: { select: { name: true } },
          },
        }),

        prisma.delivery.findMany({
          where: { order: { userId: companyId } },
          orderBy: { createdAt: 'desc' },
          take: sliceSize,
          include: {
            order: { select: { orderNumber: true } },
          },
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

      recentPayments.forEach(payment => {
        activities.push({
          id: `payment-${payment.id}`,
          type: 'PAYMENT',
          title: 'Paiement enregistré',
          description: payment.invoice?.invoiceNumber
            ? `Paiement ${payment.paymentNumber} lié à ${payment.invoice.invoiceNumber}`
            : `Paiement ${payment.paymentNumber} enregistré`,
          timestamp: payment.paymentDate.toISOString()
        })
      })

      recentPurchases.forEach(purchase => {
        activities.push({
          id: `purchase-${purchase.id}`,
          type: 'PURCHASE',
          title: purchase.status?.toLowerCase() === 'received' ? 'Achat réceptionné' : 'Achat créé',
          description: purchase.supplier?.name
            ? `Achat ${purchase.purchaseNumber} auprès de ${purchase.supplier.name}`
            : `Achat ${purchase.purchaseNumber} enregistré`,
          timestamp: purchase.createdAt.toISOString()
        })
      })

      recentDeliveries.forEach(delivery => {
        activities.push({
          id: `delivery-${delivery.id}`,
          type: 'DELIVERY',
          title: delivery.status?.toLowerCase() === 'delivered' ? 'Livraison validée' : 'Livraison planifiée',
          description: delivery.order?.orderNumber
            ? `Livraison ${delivery.deliveryNumber} pour la commande ${delivery.order.orderNumber}`
            : `Livraison ${delivery.deliveryNumber} enregistrée`,
          timestamp: delivery.createdAt.toISOString()
        })
      })

      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit)

    } catch (error) {
      if (isDatabaseUnavailableError(error)) {
        return getFallbackRecentActivity(companyId, limit)
      }
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
      if (isDatabaseUnavailableError(error)) {
        return getFallbackDashboardAlerts(companyId)
      }
      logger.error('Error retrieving alerts from PostgreSQL', { error, companyId })
      return []
    }
  }

  static async getChartData(companyId: string) {
    logger.info('Getting chart data from PostgreSQL', { companyId })

    try {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
      const [paymentRows, topProductRows, clientRows] = await Promise.all([
        prisma.$queryRaw<Array<{
          month: Date
          sales: number | string | null
          orders: bigint | number | string
        }>>`
          SELECT
            DATE_TRUNC('month', "paymentDate") AS month,
            COALESCE(SUM(amount), 0) AS sales,
            COUNT(*) AS orders
          FROM "Payment"
          WHERE "userId" = ${companyId}
            AND "paymentDate" >= ${sixMonthsAgo}
          GROUP BY 1
          ORDER BY 1
        `,
        prisma.$queryRaw<Array<{
          productId: string
          name: string
          sales: bigint | number | string
          revenue: number | string | null
        }>>`
          SELECT
            oi."productId" AS "productId",
            p.name AS name,
            COALESCE(SUM(oi.quantity), 0) AS sales,
            COALESCE(SUM(oi.quantity * oi.price), 0) AS revenue
          FROM "OrderItem" oi
          INNER JOIN "Order" o ON o.id = oi."orderId"
          INNER JOIN "Product" p ON p.id = oi."productId"
          WHERE o."userId" = ${companyId}
          GROUP BY oi."productId", p.name
          ORDER BY revenue DESC
          LIMIT 5
        `,
        prisma.$queryRaw<Array<{ name: string | null }>>`
          SELECT name
          FROM "Client"
          WHERE "userId" = ${companyId}
        `,
      ])

      const salesByMonth = new Map<string, { sales: number; orders: number }>()
      for (let i = 5; i >= 0; i -= 1) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        salesByMonth.set(key, { sales: 0, orders: 0 })
      }

      paymentRows.forEach(row => {
        const paymentDate = new Date(row.month)
        const key = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`
        if (salesByMonth.has(key)) {
          const bucket = salesByMonth.get(key)!
          bucket.sales += Number(row.sales || 0)
          bucket.orders += Number(row.orders || 0)
        }
      })

      const salesTrend = Array.from(salesByMonth.entries()).map(([key, value]) => {
        const monthIndex = Number(key.split('-')[1]) - 1
        return {
          month: monthNames[monthIndex],
          sales: Math.round(value.sales * 100) / 100,
          orders: value.orders,
        }
      })

      const productTotals = new Map<string, { id: string; name: string; sales: number; revenue: number }>()
      topProductRows.forEach(item => {
        const current = productTotals.get(item.productId) || { id: item.productId, name: item.name, sales: 0, revenue: 0 }
        current.sales += Number(item.sales || 0)
        current.revenue += Number(item.revenue || 0)
        productTotals.set(productId, current)
      })

      const topProducts = Array.from(productTotals.values())
        .sort((left, right) => right.revenue - left.revenue)
        .slice(0, 5)
        .map(product => ({
          id: product.id,
          name: product.name,
          sales: product.sales,
          revenue: Math.round(product.revenue * 100) / 100,
        }))

      const companyCount = clients.filter(client => isCompanyLikeName(client.name)).length
      const totalClients = clients.length
      const clientDistribution = [
        {
          type: 'Entreprises',
          count: companyCount,
          percentage: totalClients > 0 ? Math.round((companyCount / totalClients) * 1000) / 10 : 0,
        },
        {
          type: 'Particuliers',
          count: Math.max(totalClients - companyCount, 0),
          percentage: totalClients > 0 ? Math.round(((totalClients - companyCount) / totalClients) * 1000) / 10 : 0,
        },
      ]

      return {
        salesTrend,
        topProducts,
        clientDistribution
      }

    } catch (error) {
      if (isDatabaseUnavailableError(error)) {
        return getFallbackChartData(companyId)
      }
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
