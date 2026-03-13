import { StockAlertService } from '../services/stock-alert.service'
import { Product } from '@gestion/database'
import { FastifyInstance } from 'fastify'
import { StockService } from '../services/stock.service'
import { StockAlertService } from '../services/stock-alert.service'
import { ProductService } from '../services/product.service'

export default async function unifiedStockAlertsRoutes(server: FastifyInstance) {
  // Middleware d'authentification pour toutes les routes
  server.addHook('preHandler', server.authenticate)

  /**
   * GET /api/v1/stock-alerts/unified/counts
   * Compteurs unifiés basés sur les produits (source de vérité)
   */
  server.get('/counts', async (request, reply) => {
    try {
      const companyId = request.user?.companyId
      if (!companyId) {
        return reply.status(400).send({
          success: false,
          message: 'Company ID manquant'
        })
      }

    console.log('📊 Calcul des compteurs unifiés pour company:', companyId)

    // Récupérer tous les produits (source de vérité)
    const products = await ProductService.getProducts(companyId, { limit: 1000 })
    
    let totalProducts = 0
    let outOfStock = 0
    let lowStock = 0
    let overStock = 0
    let critical = 0
    let high = 0
    let medium = 0
    let low = 0

    // Calcul unifié basé sur les produits
    for (const product of products) {
      totalProducts++
      
      const stock = product.stockQuantity ?? 0
      const minStock = product.minStock ?? 0
      const maxStock = product.maxStock ?? null

      // Rupture de stock (critique)
      if (stock === 0) {
        outOfStock++
        critical++
      }
      // Stock faible
      else if (stock > 0 && stock <= minStock && minStock > 0) {
        lowStock++
        if (stock <= minStock * 0.5) {
          high++
        } else {
          medium++
        }
      }
      // Surstock (faible priorité)
      else if (maxStock && stock > maxStock) {
        overStock++
        low++
      }
    }

    const total = outOfStock + lowStock + overStock

    const counts = {
      total,
      outOfStock,
      lowStock,
      overStock,
      totalProducts,
      severity: {
        critical,
        high,
        medium,
        low
      }
    }

      console.log('✅ Compteurs unifiés calculés:', counts)

      return reply.send({
        success: true,
        data: counts,
        meta: {
          source: 'unified-calculation',
          timestamp: new Date().toISOString(),
          companyId
        }
      })

    } catch (error: any) {
      console.error('❌ Erreur lors du calcul des compteurs unifiés:', error)
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors du calcul des compteurs unifiés',
        error: error.message
      })
    }
  })

  /**
   * GET /api/v1/stock-alerts/unified/alerts
   * Alertes unifiées avec compteurs
   */
  server.get('/alerts', async (request, reply) => {
    try {
      const companyId = request.user?.companyId
      if (!companyId) {
        return reply.status(400).send({
          success: false,
          message: 'Company ID manquant'
        })
      }

      const limit = parseInt((request.query as any).limit) || 100

    console.log('🚨 Récupération des alertes unifiées pour company:', companyId)

    // Récupérer les alertes existantes
    const existingAlerts = await StockAlertService.getAlerts(companyId, {
      isActive: true,
      limit
    })

      // Récupérer les compteurs unifiés (appel interne)
      // Pour simplifier, on va calculer directement ici
      const products = await ProductService.getProducts(companyId, { limit: 1000 })

      // Calcul direct des compteurs
      let outOfStock = 0, lowStock = 0, overStock = 0
      let critical = 0, high = 0, medium = 0, low = 0

      for (const product of products) {
        const stock = product.stockQuantity ?? 0
        const minStock = product.minStock ?? 0
        const maxStock = product.maxStock ?? null

        if (stock === 0) {
          outOfStock++
          critical++
        } else if (stock > 0 && stock <= minStock && minStock > 0) {
          lowStock++
          if (stock <= minStock * 0.5) {
            high++
          } else {
            medium++
          }
        } else if (maxStock && stock > maxStock) {
          overStock++
          low++
        }
      }

      const counts = {
        total: outOfStock + lowStock + overStock,
        outOfStock,
        lowStock,
        overStock,
        critical,
        high,
        medium,
        low
      }

      console.log('✅ Alertes unifiées récupérées:', {
        alertsCount: existingAlerts.length,
        counts
      })

      return reply.send({
        success: true,
        data: {
          alerts: existingAlerts,
          counts
        },
        meta: {
          source: 'unified-alerts',
          timestamp: new Date().toISOString(),
          companyId,
          limit
        }
      })

    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération des alertes unifiées:', error)
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des alertes unifiées',
        error: error.message
      })
    }
  })

  /**
   * GET /api/v1/stock-alerts/unified/dashboard
   * Dashboard unifié
   */
  server.get('/dashboard', async (request, reply) => {
    try {
      const companyId = request.user?.companyId
      if (!companyId) {
        return reply.status(400).send({
          success: false,
          message: 'Company ID manquant'
        })
      }

      console.log('📊 Génération du dashboard unifié pour company:', companyId)

      // Récupérer le dashboard existant et les produits
      const [existingDashboard, products] = await Promise.all([
        StockService.getRealTimeDashboard(companyId),
        ProductService.getProducts(companyId, { limit: 1000 })
      ])

      // Calcul direct des compteurs unifiés
      let outOfStock = 0, lowStock = 0, overStock = 0
      let critical = 0, high = 0, medium = 0, low = 0

      for (const product of products) {
        const stock = product.stockQuantity ?? 0
        const minStock = product.minStock ?? 0
        const maxStock = product.maxStock ?? null

        if (stock === 0) {
          outOfStock++
          critical++
        } else if (stock > 0 && stock <= minStock && minStock > 0) {
          lowStock++
          if (stock <= minStock * 0.5) {
            high++
          } else {
            medium++
          }
        } else if (maxStock && stock > maxStock) {
          overStock++
          low++
        }
      }

      // Construire le dashboard unifié
      const unifiedDashboard = {
        overview: {
          totalProducts: products.length,
          productsInStock: products.length - outOfStock,
          outOfStockProducts: outOfStock,
          lowStockProducts: lowStock,
          overStockProducts: overStock,
          totalStockValue: existingDashboard.overview?.totalStockValue ?? 0
        },
        activity: {
          activeAlerts: outOfStock + lowStock + overStock,
          recentMovements: existingDashboard.activity?.recentMovements ?? 0,
          pendingOrders: existingDashboard.activity?.pendingOrders ?? 0
        },
        alerts: {
          critical,
          high,
          medium,
          low
        },
        trends: existingDashboard.trends ?? {}
      }

      console.log('✅ Dashboard unifié généré:', unifiedDashboard)

      return reply.send({
        success: true,
        data: unifiedDashboard,
        meta: {
          source: 'unified-dashboard',
          timestamp: new Date().toISOString(),
          companyId
        }
      })

    } catch (error: any) {
      console.error('❌ Erreur lors de la génération du dashboard unifié:', error)
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la génération du dashboard unifié',
        error: error.message
      })
    }
  })

  /**
   * GET /api/v1/stock-alerts/unified/diagnostic
   * Diagnostic simplifié
   */
  server.get('/diagnostic', async (request, reply) => {
    try {
      const companyId = request.user?.companyId
      if (!companyId) {
        return reply.status(400).send({
          success: false,
          message: 'Company ID manquant'
        })
      }

      return reply.send({
        success: true,
        data: {
          message: 'Diagnostic simplifié - APIs unifiées opérationnelles',
          timestamp: new Date().toISOString(),
          companyId
        }
      })
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors du diagnostic',
        error: error.message
      })
    }
  })
}


