/**
 * Service unifié pour la gestion des alertes de stock
 * Source de vérité unique basée sur la table products
 */

import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

export interface UnifiedStockAlert {
  id: string
  type: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'OVERSTOCK'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  message: string
  currentStock: number
  thresholdValue: number
  productId: string
  product: {
    id: string
    name: string
    sku?: string
    category?: {
      id: string
      name: string
    }
  }
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface UnifiedStockCounts {
  total: number
  outOfStock: number
  lowStock: number
  overStock: number
  critical: number
  high: number
  medium: number
  low: number
}

export class UnifiedStockAlertsService {
  /**
   * Calculer les alertes en temps réel basées sur la table products (source de vérité)
   */
  static async calculateRealTimeAlerts(companyId: string): Promise<UnifiedStockAlert[]> {
    try {
      logger.info('Calcul des alertes temps réel', { companyId })

      // Récupérer tous les produits actifs avec leurs données de stock
      const products = await prisma.product.findMany({
        where: {
          companyId,
          isActive: true,
          isService: false, // Exclure les services
        },
        include: {
          category: true,
        },
        orderBy: {
          name: 'asc',
        },
      })

      const alerts: UnifiedStockAlert[] = []

      for (const product of products) {
        const stock = product.stockQuantity
        const minStock = product.minStock || 0
        const maxStock = product.maxStock

        // Alerte de rupture de stock
        if (stock === 0) {
          alerts.push({
            id: `out-of-stock-${product.id}`,
            type: 'OUT_OF_STOCK',
            severity: 'CRITICAL',
            title: `Rupture de stock - ${product.name}`,
            message: `Le produit "${product.name}" est en rupture de stock`,
            currentStock: stock,
            thresholdValue: 0,
            productId: product.id,
            product: {
              id: product.id,
              name: product.name,
              sku: product.sku || undefined,
              category: product.category ? {
                id: product.category.id,
                name: product.category.name,
              } : undefined,
            },
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        }
        // Alerte de stock faible
        else if (stock > 0 && stock <= minStock && minStock > 0) {
          alerts.push({
            id: `low-stock-${product.id}`,
            type: 'LOW_STOCK',
            severity: stock <= minStock * 0.5 ? 'HIGH' : 'MEDIUM',
            title: `Stock faible - ${product.name}`,
            message: `Le stock du produit "${product.name}" est inférieur au seuil minimum (${stock}/${minStock})`,
            currentStock: stock,
            thresholdValue: minStock,
            productId: product.id,
            product: {
              id: product.id,
              name: product.name,
              sku: product.sku || undefined,
              category: product.category ? {
                id: product.category.id,
                name: product.category.name,
              } : undefined,
            },
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        }
        // Alerte de surstock
        else if (maxStock && stock > maxStock) {
          alerts.push({
            id: `overstock-${product.id}`,
            type: 'OVERSTOCK',
            severity: 'LOW',
            title: `Surstock - ${product.name}`,
            message: `Le stock du produit "${product.name}" dépasse le seuil maximum (${stock}/${maxStock})`,
            currentStock: stock,
            thresholdValue: maxStock,
            productId: product.id,
            product: {
              id: product.id,
              name: product.name,
              sku: product.sku || undefined,
              category: product.category ? {
                id: product.category.id,
                name: product.category.name,
              } : undefined,
            },
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        }
      }

      logger.info('Alertes temps réel calculées', {
        companyId,
        totalProducts: products.length,
        totalAlerts: alerts.length,
        outOfStock: alerts.filter(a => a.type === 'OUT_OF_STOCK').length,
        lowStock: alerts.filter(a => a.type === 'LOW_STOCK').length,
        overStock: alerts.filter(a => a.type === 'OVERSTOCK').length,
      })

      return alerts
    } catch (error) {
      logger.error('Erreur lors du calcul des alertes temps réel', { error, companyId })
      throw error
    }
  }

  /**
   * Obtenir les compteurs d'alertes unifiés
   */
  static async getUnifiedCounts(companyId: string): Promise<UnifiedStockCounts> {
    try {
      const alerts = await this.calculateRealTimeAlerts(companyId)

      const counts = {
        total: alerts.length,
        outOfStock: alerts.filter(a => a.type === 'OUT_OF_STOCK').length,
        lowStock: alerts.filter(a => a.type === 'LOW_STOCK').length,
        overStock: alerts.filter(a => a.type === 'OVERSTOCK').length,
        critical: alerts.filter(a => a.severity === 'CRITICAL').length,
        high: alerts.filter(a => a.severity === 'HIGH').length,
        medium: alerts.filter(a => a.severity === 'MEDIUM').length,
        low: alerts.filter(a => a.severity === 'LOW').length,
      }

      logger.info('Compteurs d\'alertes unifiés', { companyId, counts })

      return counts
    } catch (error) {
      logger.error('Erreur lors du calcul des compteurs unifiés', { error, companyId })
      throw error
    }
  }

  /**
   * Obtenir les alertes avec pagination et filtres
   */
  static async getUnifiedAlerts(
    companyId: string,
    filters: {
      type?: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'OVERSTOCK'
      severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
      productId?: string
      limit?: number
      offset?: number
    } = {}
  ): Promise<{
    alerts: UnifiedStockAlert[]
    total: number
    counts: UnifiedStockCounts
  }> {
    try {
      let alerts = await this.calculateRealTimeAlerts(companyId)

      // Appliquer les filtres
      if (filters.type) {
        alerts = alerts.filter(a => a.type === filters.type)
      }
      if (filters.severity) {
        alerts = alerts.filter(a => a.severity === filters.severity)
      }
      if (filters.productId) {
        alerts = alerts.filter(a => a.productId === filters.productId)
      }

      const total = alerts.length

      // Appliquer la pagination
      if (filters.offset !== undefined) {
        alerts = alerts.slice(filters.offset)
      }
      if (filters.limit !== undefined) {
        alerts = alerts.slice(0, filters.limit)
      }

      // Calculer les compteurs
      const counts = await this.getUnifiedCounts(companyId)

      return {
        alerts,
        total,
        counts,
      }
    } catch (error) {
      logger.error('Erreur lors de la récupération des alertes unifiées', { error, companyId })
      throw error
    }
  }

  /**
   * Synchroniser les alertes de la table stock_alerts avec les données calculées
   */
  static async synchronizeStoredAlerts(companyId: string): Promise<void> {
    try {
      logger.info('Synchronisation des alertes stockées', { companyId })

      // Calculer les alertes actuelles
      const currentAlerts = await this.calculateRealTimeAlerts(companyId)

      // Désactiver toutes les alertes existantes
      await prisma.stockAlert.updateMany({
        where: { companyId },
        data: { isActive: false },
      })

      // Créer les nouvelles alertes
      for (const alert of currentAlerts) {
        await prisma.stockAlert.upsert({
          where: {
            // Utiliser une combinaison unique pour éviter les doublons
            companyId_productId_type: {
              companyId,
              productId: alert.productId,
              type: alert.type,
            },
          },
          update: {
            severity: alert.severity,
            title: alert.title,
            message: alert.message,
            currentStock: alert.currentStock,
            thresholdValue: alert.thresholdValue,
            isActive: true,
            isRead: false,
            updatedAt: new Date(),
          },
          create: {
            type: alert.type,
            severity: alert.severity,
            title: alert.title,
            message: alert.message,
            currentStock: alert.currentStock,
            thresholdValue: alert.thresholdValue,
            productId: alert.productId,
            companyId,
            isActive: true,
            isRead: false,
          },
        })
      }

      logger.info('Synchronisation des alertes terminée', {
        companyId,
        alertsCreated: currentAlerts.length,
      })
    } catch (error) {
      logger.error('Erreur lors de la synchronisation des alertes', { error, companyId })
      throw error
    }
  }

  /**
   * Obtenir le dashboard unifié des stocks
   */
  static async getUnifiedDashboard(companyId: string) {
    try {
      const [counts, totalProducts, productsInStock] = await Promise.all([
        this.getUnifiedCounts(companyId),
        prisma.product.count({
          where: {
            companyId,
            isActive: true,
            isService: false,
          },
        }),
        prisma.product.count({
          where: {
            companyId,
            isActive: true,
            isService: false,
            stockQuantity: { gt: 0 },
          },
        }),
      ])

      return {
        overview: {
          totalProducts,
          productsInStock,
          lowStockProducts: counts.lowStock,
          outOfStockProducts: counts.outOfStock,
          overStockProducts: counts.overStock,
        },
        activity: {
          activeAlerts: counts.total,
        },
        alerts: {
          critical: counts.critical,
          high: counts.high,
          medium: counts.medium,
          low: counts.low,
        },
        counts,
        lastUpdate: new Date(),
      }
    } catch (error) {
      logger.error('Erreur lors de la récupération du dashboard unifié', { error, companyId })
      throw error
    }
  }
}
