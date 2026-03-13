import { StockMovement, Product } from '@gestion/database'
import { UnifiedStockService } from './unified-stock.service'
import { StockAuditService } from './stock-audit.service'
import { logger } from '../utils/logger'

/**
 * Service d'intégration pour remplacer les anciens appels de stock
 * par la solution unifiée dans les modules de ventes et achats
 */
export class UnifiedStockIntegrationService {

  /**
   * Traiter une facture - Sortie de stock unifiée
   */
  static async processInvoiceStockMovements(
    invoiceId: string,
    companyId: string,
    userId?: string
  ) {
    try {
      logger.info('Traitement unifié des mouvements de stock pour facture', { invoiceId })

      // Récupérer la facture avec ses articles
      const { prisma } = await import('@gestion/database')
      const invoice = await prisma.invoice.findFirst({
        where: { id: invoiceId, companyId },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      })

      if (!invoice) {
        throw new Error('Facture non trouvée')
      }

      const results = []

      // Traiter chaque article de la facture
      for (const item of invoice.items) {
        if (!item.product.isService) {
          try {
            const result = await UnifiedStockService.processSale(
              item.productId,
              item.quantiteActuelle,
              companyId,
              invoiceId,
              userId
            )
            results.push({
              productId: item.productId,
              productName: item.product.name,
              quantity: item.quantiteActuelle,
              success: true,
              newStock: result.stockQuantity
            })
          } catch (error) {
            logger.error('Erreur lors du traitement du stock pour un article', {
              productId: item.productId,
              error: error instanceof Error ? error.message : 'Erreur inconnue'
            })
            results.push({
              productId: item.productId,
              productName: item.product.name,
              quantity: item.quantiteActuelle,
              success: false,
              error: error instanceof Error ? error.message : 'Erreur inconnue'
            })
          }
        }
      }

      logger.info('Traitement unifié terminé pour facture', {
        invoiceId,
        totalItems: invoice.items.length,
        processedItems: results.length,
        successfulItems: results.filter(r => r.success).length
      })

      return {
        invoiceId,
        results,
        summary: {
          total: invoice.items.length,
          processed: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        }
      }

    } catch (error) {
      logger.error('Erreur lors du traitement unifié de la facture', { error, invoiceId })
      throw error
    }
  }

  /**
   * Traiter une commande - Réservation de stock unifiée
   */
  static async processOrderStockReservations(
    orderId: string,
    companyId: string,
    userId?: string
  ) {
    try {
      logger.info('Traitement unifié des réservations de stock pour commande', { orderId })

      // Récupérer la commande avec ses articles
      const { prisma } = await import('@gestion/database')
      const order = await prisma.order.findFirst({
        where: { id: orderId, companyId },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      })

      if (!order) {
        throw new Error('Commande non trouvée')
      }

      const results = []

      // Réserver le stock pour chaque article
      for (const item of order.items) {
        if (!item.product.isService) {
          try {
            const result = await UnifiedStockService.reserveStock(
              item.productId,
              item.quantiteActuelle,
              companyId,
              orderId,
              userId
            )
            results.push({
              productId: item.productId,
              productName: item.product.name,
              quantity: item.quantiteActuelle,
              success: true,
              currentStock: result.stockQuantity
            })
          } catch (error) {
            logger.error('Erreur lors de la réservation de stock pour un article', {
              productId: item.productId,
              error: error instanceof Error ? error.message : 'Erreur inconnue'
            })
            results.push({
              productId: item.productId,
              productName: item.product.name,
              quantity: item.quantiteActuelle,
              success: false,
              error: error instanceof Error ? error.message : 'Erreur inconnue'
            })
          }
        }
      }

      logger.info('Traitement unifié terminé pour commande', {
        orderId,
        totalItems: order.items.length,
        processedItems: results.length,
        successfulItems: results.filter(r => r.success).length
      })

      return {
        orderId,
        results,
        summary: {
          total: order.items.length,
          processed: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        }
      }

    } catch (error) {
      logger.error('Erreur lors du traitement unifié de la commande', { error, orderId })
      throw error
    }
  }

  /**
   * Traiter une réception de marchandises - Entrée de stock unifiée
   */
  static async processGoodsReceptionStockMovements(
    receptionId: string,
    companyId: string,
    userId?: string
  ) {
    try {
      logger.info('Traitement unifié des entrées de stock pour réception', { receptionId })

      // Récupérer la réception avec ses articles
      const { prisma } = await import('@gestion/database')
      const reception = await prisma.goodsReception.findFirst({
        where: { id: receptionId, companyId },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      })

      if (!reception) {
        throw new Error('Réception non trouvée')
      }

      const results = []

      // Traiter chaque article de la réception
      for (const item of reception.items) {
        if (!item.product.isService && item.quantiteActuelleReceived > 0) {
          try {
            const result = await UnifiedStockService.processPurchase(
              item.productId,
              item.quantiteActuelleReceived,
              item.unitCost,
              companyId,
              reception.purchaseOrderId || undefined,
              userId
            )
            results.push({
              productId: item.productId,
              productName: item.product.name,
              quantity: item.quantiteActuelleReceived,
              unitCost: item.unitCost,
              success: true,
              newStock: result.stockQuantity
            })
          } catch (error) {
            logger.error('Erreur lors du traitement du stock pour un article reçu', {
              productId: item.productId,
              error: error instanceof Error ? error.message : 'Erreur inconnue'
            })
            results.push({
              productId: item.productId,
              productName: item.product.name,
              quantity: item.quantiteActuelleReceived,
              unitCost: item.unitCost,
              success: false,
              error: error instanceof Error ? error.message : 'Erreur inconnue'
            })
          }
        }
      }

      logger.info('Traitement unifié terminé pour réception', {
        receptionId,
        totalItems: reception.items.length,
        processedItems: results.length,
        successfulItems: results.filter(r => r.success).length
      })

      return {
        receptionId,
        results,
        summary: {
          total: reception.items.length,
          processed: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        }
      }

    } catch (error) {
      logger.error('Erreur lors du traitement unifié de la réception', { error, receptionId })
      throw error
    }
  }

  /**
   * Annuler une réservation de stock
   */
  static async cancelStockReservation(
    orderId: string,
    companyId: string,
    userId?: string
  ) {
    try {
      logger.info('Annulation unifié des réservations de stock pour commande', { orderId })

      // Récupérer la commande avec ses articles
      const { prisma } = await import('@gestion/database')
      const order = await prisma.order.findFirst({
        where: { id: orderId, companyId },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      })

      if (!order) {
        throw new Error('Commande non trouvée')
      }

      const results = []

      // Annuler la réservation pour chaque article
      for (const item of order.items) {
        if (!item.product.isService) {
          try {
            // Récupérer le stock actuel
            const currentStock = await UnifiedStockService.getUnifiedProductStock(
              item.productId,
              companyId
            )

            // Mettre à jour la réservation dans la table Stock
            const product = await prisma.product.findFirst({
              where: { id: item.productId, companyId },
              include: { stock: true }
            })

            if (product?.stock) {
              const currentReserved = product.stock.quantiteReservee || 0
              const newReserved = Math.max(0, currentReserved - item.quantiteActuelle)

              await prisma.stock.update({
                where: { id: product.stock.id },
                data: {
                  quantiteReservee: newReserved,
                  quantiteDisponible: product.stock.quantiteActuelle - newReserved,
                  dateLastUpdate: new Date()
                }
              })

              // Enregistrer l'audit
              await StockAuditService.logStockChange({
                productId: item.productId,
                companyId,
                action: 'UPDATE',
                oldValues: { reservedStock: currentReserved },
                newValues: { reservedStock: newReserved },
                source: 'API',
                userId,
                metadata: {
                  operation: 'cancel_reservation',
                  orderId,
                  quantity: item.quantiteActuelle
                }
              })
            }

            results.push({
              productId: item.productId,
              productName: item.product.name,
              quantity: item.quantiteActuelle,
              success: true
            })

          } catch (error) {
            logger.error('Erreur lors de l\'annulation de réservation pour un article', {
              productId: item.productId,
              error: error instanceof Error ? error.message : 'Erreur inconnue'
            })
            results.push({
              productId: item.productId,
              productName: item.product.name,
              quantity: item.quantiteActuelle,
              success: false,
              error: error instanceof Error ? error.message : 'Erreur inconnue'
            })
          }
        }
      }

      logger.info('Annulation unifié terminée pour commande', {
        orderId,
        totalItems: order.items.length,
        processedItems: results.length,
        successfulItems: results.filter(r => r.success).length
      })

      return {
        orderId,
        results,
        summary: {
          total: order.items.length,
          processed: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        }
      }

    } catch (error) {
      logger.error('Erreur lors de l\'annulation unifié de la commande', { error, orderId })
      throw error
    }
  }
}
