import { FastifyInstance } from 'fastify'
import authRoutes from './auth'
import dashboardRoutes from './dashboard'
import clientRoutes from './clients'
import productRoutes from './products'
import categoryRoutes from './categories'
import stockRoutes from './stock'
import stockAlertRoutes from './stock-alerts'
// import unifiedStockAlertsRoutes from './unified-stock-alerts-simple'
import orderRoutes from './orders'
import invoiceRoutes from './invoices'
import supplierRoutes from './suppliers'
import analyticsRoutes from './analytics'
import { autoSyncRoutes } from './auto-sync'
import { userRoutes } from './users'
import stockCorrectionRoutes from './stockCorrectionRoutes'
import { reportsRoutes } from './reports'

// Nouvelles routes pour les modules ventes et achats
import quotesRoutes from './quotes'
import paymentsRoutes from './payments'
import purchaseOrdersRoutes from './purchase-orders'
import goodsReceptionsRoutes from './goods-receptions'
import auditLogsRoutes from './audit-logs'
import algeriaConfigRoutes from './algeria-config'
import companyRoutes from './companies'
import settingsRoutes from './settings'

export async function registerRoutes(server: FastifyInstance) {
  // Préfixe API pour toutes les routes avec persistance en base de données
  await server.register(async function (server) {
    // Routes d'authentification
    await server.register(authRoutes, { prefix: '/auth' })

    // Routes du dashboard
    await server.register(dashboardRoutes, { prefix: '/dashboard' })

    // Routes métier avec persistance en base de données
    await server.register(clientRoutes, { prefix: '/clients' })
    await server.register(productRoutes, { prefix: '/products' })
    await server.register(categoryRoutes, { prefix: '/categories' })
    await server.register(stockRoutes, { prefix: '/stock' })
    await server.register(stockAlertRoutes, { prefix: '/stock-alerts' })
    // await server.register(unifiedStockAlertsRoutes, { prefix: '/stock-alerts/unified' })
    await server.register(orderRoutes, { prefix: '/orders' })
    await server.register(invoiceRoutes, { prefix: '/invoices' })
    await server.register(supplierRoutes, { prefix: '/suppliers' })
    await server.register(userRoutes, { prefix: '/users' })

    // Routes des modules ventes et achats
    await server.register(quotesRoutes, { prefix: '/quotes' })
    await server.register(paymentsRoutes, { prefix: '/payments' })
    await server.register(purchaseOrdersRoutes, { prefix: '/purchase-orders' })
    await server.register(goodsReceptionsRoutes, { prefix: '/purchase-orders/receptions' })
    await server.register(auditLogsRoutes, { prefix: '/audit-logs' })
    await server.register(algeriaConfigRoutes, { prefix: '/algeria-config' })
    await server.register(companyRoutes, { prefix: '/companies' })
    await server.register(settingsRoutes, { prefix: '/settings' })

    // Routes d'analytique
    await server.register(analyticsRoutes, { prefix: '/analytics' })

    // Routes de synchronisation automatique
    await server.register(autoSyncRoutes, { prefix: '/auto-sync' })

    // Routes de correction automatique
    await server.register(stockCorrectionRoutes, { prefix: '/stock-correction' })

    await server.register(reportsRoutes, { prefix: '/reports' })

  }, { prefix: '/api/v1' })

  // Routes de test complètement désactivées pour éviter les conflits
  // Les routes de test sont commentées dans l'import et ne sont pas utilisées
}
