import { StockMovement, Product } from '@gestion/database'
import { prisma } from '../lib/prisma'
import { logger } from '../utils/logger'

export interface StockAuditEntry {
  id: string
  productId: string
  companyId: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'SYNC' | 'MOVEMENT'
  oldValues?: any
  newValues?: any
  source: 'PRODUCT_TABLE' | 'STOCK_TABLE' | 'API' | 'SYNC_SERVICE' | 'MOVEMENT'
  userId?: string
  metadata?: any
  timestamp: Date
}

/**
 * Service de journalisation d'audit pour les stocks
 * Trace toutes les modifications de stock pour faciliter le débogage
 */
export class StockAuditService {
  
  /**
   * Enregistrer une modification de stock
   */
  static async logStockChange(data: {
    productId: string
    companyId: string
    action: StockAuditEntry['action']
    oldValues?: any
    newValues?: any
    source: StockAuditEntry['source']
    userId?: string
    metadata?: any
  }) {
    try {
      const auditEntry = {
        productId: data.productId,
        companyId: data.companyId,
        action: data.action,
        oldValues: data.oldValues ? JSON.stringify(data.oldValues) : null,
        newValues: data.newValues ? JSON.stringify(data.newValues) : null,
        source: data.source,
        userId: data.userId,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        timestamp: new Date()
      }

      // Log dans la base de données (si table d'audit existe)
      // await prisma.stockAudit.create({ data: auditEntry })

      // Log dans les fichiers de log
      logger.info('Stock change audit', {
        ...auditEntry,
        oldValues: data.oldValues,
        newValues: data.newValues,
        metadata: data.metadata
      })

      return auditEntry

    } catch (error) {
      logger.error('Erreur lors de l\'enregistrement de l\'audit de stock', { error, data })
      // Ne pas faire échouer l'opération principale si l'audit échoue
    }
  }

  /**
   * Enregistrer une synchronisation de données
   */
  static async logSyncOperation(data: {
    companyId: string
    syncedCount: number
    createdCount: number
    totalProducts: number
    source: 'MANUAL' | 'AUTOMATIC' | 'API'
    userId?: string
  }) {
    try {
      const auditEntry = {
        productId: 'BULK_SYNC',
        companyId: data.companyId,
        action: 'SYNC' as const,
        newValues: {
          syncedCount: data.syncedCount,
          createdCount: data.createdCount,
          totalProducts: data.totalProducts
        },
        source: 'SYNC_SERVICE' as const,
        userId: data.userId,
        metadata: {
          syncSource: data.source,
          timestamp: new Date()
        }
      }

      await this.logStockChange(auditEntry)

      logger.info('Stock sync operation completed', {
        companyId: data.companyId,
        syncedCount: data.syncedCount,
        createdCount: data.createdCount,
        totalProducts: data.totalProducts,
        source: data.source
      })

    } catch (error) {
      logger.error('Erreur lors de l\'enregistrement de l\'audit de synchronisation', { error, data })
    }
  }

  /**
   * Enregistrer un mouvement de stock
   */
  static async logStockMovement(data: {
    productId: string
    companyId: string
    movementType: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER'
    quantity: number
    oldStock: number
    newStock: number
    reference?: string
    userId?: string
  }) {
    try {
      await this.logStockChange({
        productId: data.productId,
        companyId: data.companyId,
        action: 'MOVEMENT',
        oldValues: { stockQuantity: data.oldStock },
        newValues: { stockQuantity: data.newStock },
        source: 'MOVEMENT',
        userId: data.userId,
        metadata: {
          movementType: data.movementType,
          quantity: data.quantiteActuelle,
          reference: data.reference,
          timestamp: new Date()
        }
      })

    } catch (error) {
      logger.error('Erreur lors de l\'enregistrement de l\'audit de mouvement', { error, data })
    }
  }

  /**
   * Enregistrer une incohérence détectée
   */
  static async logInconsistency(data: {
    productId: string
    companyId: string
    productStock: number
    stockTableStock: number
    source: string
  }) {
    try {
      await this.logStockChange({
        productId: data.productId,
        companyId: data.companyId,
        action: 'UPDATE',
        oldValues: { 
          productTable: data.productStock,
          stockTable: data.stockTableStock
        },
        newValues: { 
          inconsistencyDetected: true,
          difference: Math.abs(data.productStock - data.stockTableStock)
        },
        source: 'SYNC_SERVICE',
        metadata: {
          inconsistencySource: data.source,
          severity: 'HIGH',
          timestamp: new Date()
        }
      })

      logger.warn('Stock inconsistency detected', {
        productId: data.productId,
        companyId: data.companyId,
        productStock: data.productStock,
        stockTableStock: data.stockTableStock,
        difference: Math.abs(data.productStock - data.stockTableStock),
        source: data.source
      })

    } catch (error) {
      logger.error('Erreur lors de l\'enregistrement de l\'incohérence', { error, data })
    }
  }

  /**
   * Obtenir l'historique des modifications pour un produit
   */
  static async getProductAuditHistory(productId: string, companyId: string, limit = 50) {
    try {
      // Si table d'audit existe, récupérer depuis la DB
      // const history = await prisma.stockAudit.findMany({
      //   where: { productId, companyId },
      //   orderBy: { timestamp: 'desc' },
      //   take: limit
      // })

      // Pour l'instant, retourner un placeholder
      logger.info('Audit history requested', { productId, companyId, limit })
      
      return {
        productId,
        companyId,
        entries: [],
        message: 'Audit history available in logs'
      }

    } catch (error) {
      logger.error('Erreur lors de la récupération de l\'historique d\'audit', { error, productId })
      throw error
    }
  }

  /**
   * Obtenir les statistiques d'audit
   */
  static async getAuditStats(companyId: string, days = 7) {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Placeholder pour les statistiques
      logger.info('Audit stats requested', { companyId, days })

      return {
        companyId,
        period: `${days} days`,
        stats: {
          totalChanges: 0,
          syncOperations: 0,
          movements: 0,
          inconsistencies: 0
        },
        message: 'Audit stats available in logs'
      }

    } catch (error) {
      logger.error('Erreur lors de la récupération des statistiques d\'audit', { error, companyId })
      throw error
    }
  }
}
