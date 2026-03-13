import { StockAlertService } from '../services/stock-alert.service'
import { prisma, StockAlert, AlertType, AlertSeverity } from '@gestion/database'
import { PaginationParams, PaginationResponse } from '@gestion/shared'
import { logger } from '../utils/logger'

export interface CreateStockAlertData {
  type: AlertType
  severity?: AlertSeverity
  title: string
  message: string
  productId: string
  currentStock?: number
  thresholdValue?: number
}

export interface StockAlertFilters {
  type?: AlertType
  severity?: AlertSeverity
  isRead?: boolean
  isActive?: boolean
  productId?: string
}

export class StockAlertService {
  /**
   * Créer une nouvelle alerte de stock
   */
  static async createAlert(
    data: CreateStockAlertData,
    companyId: string
  ): Promise<StockAlert> {
    try {
      logger.info('Création d\'une alerte de stock', { 
        companyId, 
        productId: data.productId, 
        type: data.type 
      })

      // Vérifier que le produit existe et appartient à l'entreprise
      const product = await prisma.product.findFirst({
        where: {
          id: data.productId,
          companyId,
        },
      })

      if (!product) {
        throw new Error('Produit non trouvé')
      }

      // Vérifier s'il existe déjà une alerte active du même type pour ce produit
      const existingAlert = await prisma.stockAlert.findFirst({
        where: {
          productId: data.productId,
          type: data.type,
          isActive: true,
        },
      })

      if (existingAlert) {
        // Mettre à jour l'alerte existante au lieu d'en créer une nouvelle
        return await this.updateAlert(existingAlert.id, {
          message: data.message,
          currentStock: data.currentStock,
          thresholdValue: data.thresholdValue,
          isRead: false, // Marquer comme non lue
        }, companyId)
      }

      const alert = await prisma.stockAlert.create({
        data: {
          ...data,
          severity: data.severity || 'MEDIUM',
          companyId,
        },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      })

      logger.info('Alerte de stock créée avec succès', { alertId: alert.id })
      return alert
    } catch (error) {
      logger.error('Erreur lors de la création de l\'alerte de stock', { error, data })
      throw error
    }
  }

  /**
   * Récupérer les alertes de stock avec pagination et filtres
   */
  static async getAlerts(
    companyId: string,
    filters: StockAlertFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginationResponse<StockAlert & { product: any }>> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = pagination

      const { type, severity, isRead, isActive, productId } = filters

      // Construction de la clause WHERE
      const where: any = {
        companyId,
        ...(type && { type }),
        ...(severity && { severity }),
        ...(typeof isRead === 'boolean' && { isRead }),
        ...(typeof isActive === 'boolean' && { isActive }),
        ...(productId && { productId }),
      }

      // Calcul de l'offset
      const skip = (page - 1) * limit

      // Requêtes parallèles pour les données et le count
      const [alerts, total] = await Promise.all([
        prisma.stockAlert.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            [sortBy]: sortOrder,
          },
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        }),
        prisma.stockAlert.count({ where }),
      ])

      const totalPages = Math.ceil(total / limit)

      return {
        data: alerts,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      }
    } catch (error) {
      logger.error('Erreur lors de la récupération des alertes de stock', { error, filters })
      throw error
    }
  }

  /**
   * Marquer une alerte comme lue
   */
  static async markAsRead(alertId: string, companyId: string): Promise<StockAlert> {
    try {
      const alert = await prisma.stockAlert.findFirst({
        where: {
          id: alertId,
          companyId,
        },
      })

      if (!alert) {
        throw new Error('Alerte non trouvée')
      }

      return await prisma.stockAlert.update({
        where: { id: alertId },
        data: { isRead: true },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      })
    } catch (error) {
      logger.error('Erreur lors du marquage de l\'alerte comme lue', { error, alertId })
      throw error
    }
  }

  /**
   * Résoudre une alerte (la marquer comme inactive)
   */
  static async resolveAlert(alertId: string, companyId: string): Promise<StockAlert> {
    try {
      const alert = await prisma.stockAlert.findFirst({
        where: {
          id: alertId,
          companyId,
        },
      })

      if (!alert) {
        throw new Error('Alerte non trouvée')
      }

      return await prisma.stockAlert.update({
        where: { id: alertId },
        data: { 
          isActive: false,
          resolvedAt: new Date(),
        },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      })
    } catch (error) {
      logger.error('Erreur lors de la résolution de l\'alerte', { error, alertId })
      throw error
    }
  }

  /**
   * Mettre à jour une alerte
   */
  static async updateAlert(
    alertId: string,
    data: Partial<CreateStockAlertData & { isRead?: boolean; isActive?: boolean }>,
    companyId: string
  ): Promise<StockAlert> {
    try {
      const alert = await prisma.stockAlert.findFirst({
        where: {
          id: alertId,
          companyId,
        },
      })

      if (!alert) {
        throw new Error('Alerte non trouvée')
      }

      return await prisma.stockAlert.update({
        where: { id: alertId },
        data,
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      })
    } catch (error) {
      logger.error('Erreur lors de la mise à jour de l\'alerte', { error, alertId, data })
      throw error
    }
  }

  /**
   * Supprimer une alerte
   */
  static async deleteAlert(alertId: string, companyId: string): Promise<void> {
    try {
      const alert = await prisma.stockAlert.findFirst({
        where: {
          id: alertId,
          companyId,
        },
      })

      if (!alert) {
        throw new Error('Alerte non trouvée')
      }

      await prisma.stockAlert.delete({
        where: { id: alertId },
      })

      logger.info('Alerte supprimée avec succès', { alertId })
    } catch (error) {
      logger.error('Erreur lors de la suppression de l\'alerte', { error, alertId })
      throw error
    }
  }

  /**
   * Nettoyer les alertes orphelines ou obsolètes
   */
  static async cleanupOrphanedAlerts(companyId: string): Promise<number> {
    try {
      logger.info('Nettoyage des alertes orphelines', { companyId })

      // Récupérer toutes les alertes actives
      const alerts = await prisma.stockAlert.findMany({
        where: {
          companyId,
          isActive: true,
        },
        include: {
          product: true,
        },
      })

      let cleanedCount = 0

      for (const alert of alerts) {
        const product = alert.product
        let shouldKeepAlert = true

        // Vérifier si l'alerte est encore valide
        switch (alert.type) {
          case 'OUT_OF_STOCK':
            shouldKeepAlert = product.stockQuantity === 0
            break
          case 'LOW_STOCK':
            shouldKeepAlert = product.stockQuantity > 0 &&
                             product.stockQuantity <= (product.minStock || 0) &&
                             (product.minStock || 0) > 0
            break
          case 'OVERSTOCK':
            shouldKeepAlert = product.maxStock !== null &&
                             product.stockQuantity > product.maxStock
            break
          case 'EXPIRY_WARNING':
            // Pour les alertes d'expiration, on peut les garder ou les supprimer selon la logique métier
            // Pour l'instant, on les supprime si elles ne correspondent pas à un problème de stock réel
            shouldKeepAlert = false
            break
          default:
            // Types d'alertes non reconnus, on les garde par sécurité
            shouldKeepAlert = true
        }

        if (!shouldKeepAlert) {
          await prisma.stockAlert.update({
            where: { id: alert.id },
            data: {
              isActive: false,
              resolvedAt: new Date(),
            },
          })
          cleanedCount++
          logger.info('Alerte orpheline désactivée', {
            alertId: alert.id,
            type: alert.type,
            productName: product.name,
            currentStock: product.stockQuantity,
          })
        }
      }

      logger.info('Nettoyage des alertes terminé', { companyId, cleanedCount })
      return cleanedCount
    } catch (error) {
      logger.error('Erreur lors du nettoyage des alertes', { error, companyId })
      throw error
    }
  }

  /**
   * Vérifier et créer automatiquement les alertes de stock
   */
  static async checkAndCreateAlerts(companyId: string): Promise<void> {
    try {
      logger.info('Vérification automatique des alertes de stock', { companyId })

      // D'abord nettoyer les alertes orphelines
      await this.cleanupOrphanedAlerts(companyId)

      // Récupérer tous les produits physiques actifs avec leur stock
      const products = await prisma.product.findMany({
        where: {
          companyId,
          isActive: true,
          isService: false,
        },
        include: {
          stock: true,
          category: true,
        },
      })

      for (const product of products) {
        const currentStock = product.stockQuantity
        const minStock = product.minStock
        const maxStock = product.maxStock

        // Vérifier rupture de stock
        if (currentStock === 0) {
          await this.createAlert({
            type: 'OUT_OF_STOCK',
            severity: 'HIGH',
            title: 'Rupture de stock',
            message: `Le produit "${product.name}" est en rupture de stock`,
            productId: product.id,
            currentStock,
            thresholdValue: minStock,
          }, companyId)
        }
        // Vérifier stock faible
        else if (currentStock <= minStock && minStock > 0) {
          await this.createAlert({
            type: 'LOW_STOCK',
            severity: 'MEDIUM',
            title: 'Stock faible',
            message: `Le produit "${product.name}" a un stock faible (${currentStock} unités restantes)`,
            productId: product.id,
            currentStock,
            thresholdValue: minStock,
          }, companyId)
        }
        // Vérifier surstock
        else if (maxStock && currentStock > maxStock) {
          await this.createAlert({
            type: 'OVERSTOCK',
            severity: 'LOW',
            title: 'Surstock',
            message: `Le produit "${product.name}" est en surstock (${currentStock} unités)`,
            productId: product.id,
            currentStock,
            thresholdValue: maxStock,
          }, companyId)
        }
        // Vérifier stock négatif (erreur)
        else if (currentStock < 0) {
          await this.createAlert({
            type: 'NEGATIVE_STOCK',
            severity: 'CRITICAL',
            title: 'Stock négatif',
            message: `ERREUR: Le produit "${product.name}" a un stock négatif (${currentStock})`,
            productId: product.id,
            currentStock,
            thresholdValue: 0,
          }, companyId)
        }
      }

      logger.info('Vérification des alertes terminée', { companyId, productsChecked: products.length })
    } catch (error) {
      logger.error('Erreur lors de la vérification automatique des alertes', { error, companyId })
      throw error
    }
  }
}
