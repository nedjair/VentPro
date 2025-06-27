import { prisma } from '@gestion/database'
import { logger } from '../utils/logger'
import { StockService } from './stock.service'
import { StockAlertService } from './stock-alert.service'

export class StockSyncService {
  /**
   * Synchroniser le stock lors de la création d'une facture
   */
  static async syncStockOnInvoiceCreation(invoiceId: string, companyId: string, userId?: string) {
    try {
      logger.info('Synchronisation stock pour nouvelle facture', { invoiceId, companyId })

      // Récupérer la facture avec ses articles
      const invoice = await prisma.invoice.findFirst({
        where: {
          id: invoiceId,
          companyId,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      })

      if (!invoice) {
        throw new Error('Facture non trouvée')
      }

      // Traiter chaque article de la facture
      for (const item of invoice.items) {
        if (!item.product.isService) {
          // Créer un mouvement de sortie de stock pour chaque produit
          await StockService.processSale(
            item.productId,
            item.quantity,
            companyId,
            invoiceId,
            userId
          )

          logger.info('Stock synchronisé pour produit', {
            productId: item.productId,
            quantity: item.quantity,
            invoiceId,
          })
        }
      }

      // Vérifier et créer les alertes automatiquement
      await StockAlertService.checkAndCreateAlerts(companyId)

      logger.info('Synchronisation stock facture terminée', { invoiceId })
    } catch (error) {
      logger.error('Erreur lors de la synchronisation stock facture', { error, invoiceId })
      throw error
    }
  }

  /**
   * Synchroniser le stock lors de la création d'une commande (réservation)
   */
  static async syncStockOnOrderCreation(orderId: string, companyId: string, userId?: string) {
    try {
      logger.info('Synchronisation stock pour nouvelle commande', { orderId, companyId })

      // Récupérer la commande avec ses articles
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          companyId,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      })

      if (!order) {
        throw new Error('Commande non trouvée')
      }

      // Réserver le stock pour chaque article de la commande
      for (const item of order.items) {
        if (!item.product.isService) {
          // Réserver le stock pour ce produit
          await StockService.reserveStock(
            item.productId,
            item.quantity,
            companyId,
            orderId,
            userId
          )

          logger.info('Stock réservé pour produit', {
            productId: item.productId,
            quantity: item.quantity,
            orderId,
          })
        }
      }

      // Vérifier et créer les alertes automatiquement
      await StockAlertService.checkAndCreateAlerts(companyId)

      logger.info('Synchronisation stock commande terminée', { orderId })
    } catch (error) {
      logger.error('Erreur lors de la synchronisation stock commande', { error, orderId })
      throw error
    }
  }

  /**
   * Synchroniser le stock lors de l'annulation d'une commande
   */
  static async syncStockOnOrderCancellation(orderId: string, companyId: string, userId?: string) {
    try {
      logger.info('Libération stock pour commande annulée', { orderId, companyId })

      // Récupérer la commande avec ses articles
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          companyId,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      })

      if (!order) {
        throw new Error('Commande non trouvée')
      }

      // Libérer les réservations pour chaque article
      for (const item of order.items) {
        if (!item.product.isService) {
          // Libérer la réservation pour ce produit
          await StockService.releaseReservation(
            item.productId,
            item.quantity,
            companyId,
            orderId,
            userId
          )

          logger.info('Réservation libérée pour produit', {
            productId: item.productId,
            quantity: item.quantity,
            orderId,
          })
        }
      }

      logger.info('Libération stock commande terminée', { orderId })
    } catch (error) {
      logger.error('Erreur lors de la libération stock commande', { error, orderId })
      throw error
    }
  }

  /**
   * Traiter un retour client
   */
  static async processCustomerReturn(
    invoiceId: string,
    returns: Array<{ productId: string; quantity: number; reason?: string }>,
    companyId: string,
    userId?: string
  ) {
    try {
      logger.info('Traitement retour client', { invoiceId, companyId, returns })

      // Vérifier que la facture existe
      const invoice = await prisma.invoice.findFirst({
        where: {
          id: invoiceId,
          companyId,
        },
      })

      if (!invoice) {
        throw new Error('Facture non trouvée')
      }

      // Traiter chaque retour
      for (const returnItem of returns) {
        await StockService.processReturn(
          returnItem.productId,
          returnItem.quantity,
          companyId,
          invoiceId,
          userId,
          returnItem.reason || 'Retour client'
        )

        logger.info('Retour traité pour produit', {
          productId: returnItem.productId,
          quantity: returnItem.quantity,
          invoiceId,
        })
      }

      // Vérifier et créer les alertes automatiquement
      await StockAlertService.checkAndCreateAlerts(companyId)

      logger.info('Traitement retours client terminé', { invoiceId })
    } catch (error) {
      logger.error('Erreur lors du traitement des retours', { error, invoiceId })
      throw error
    }
  }

  /**
   * Traiter une réception fournisseur
   */
  static async processSupplierDelivery(
    deliveryData: {
      orderId?: string
      items: Array<{
        productId: string
        quantity: number
        unitCost: number
        batchNumber?: string
        expiryDate?: Date
      }>
    },
    companyId: string,
    userId?: string
  ) {
    try {
      logger.info('Traitement réception fournisseur', { companyId, deliveryData })

      // Traiter chaque article reçu
      for (const item of deliveryData.items) {
        await StockService.processSupplierDelivery(
          item.productId,
          item.quantity,
          item.unitCost,
          companyId,
          deliveryData.orderId,
          userId,
          item.batchNumber,
          item.expiryDate
        )

        logger.info('Réception traitée pour produit', {
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
        })
      }

      // Vérifier et créer les alertes automatiquement
      await StockAlertService.checkAndCreateAlerts(companyId)

      logger.info('Traitement réception fournisseur terminé')
    } catch (error) {
      logger.error('Erreur lors du traitement de la réception', { error, deliveryData })
      throw error
    }
  }

  /**
   * Synchronisation périodique des stocks (à exécuter via cron)
   */
  static async periodicStockSync(companyId: string) {
    try {
      logger.info('Début synchronisation périodique des stocks', { companyId })

      // 1. Vérifier la cohérence entre products et stocks
      await StockService.unifyStockData(companyId)

      // 2. Vérifier et créer les alertes
      await StockAlertService.checkAndCreateAlerts(companyId)

      // 3. Calculer les valeurs de stock
      await this.updateStockValues(companyId)

      logger.info('Synchronisation périodique terminée', { companyId })
    } catch (error) {
      logger.error('Erreur lors de la synchronisation périodique', { error, companyId })
      throw error
    }
  }

  /**
   * Mettre à jour les valeurs de stock
   */
  private static async updateStockValues(companyId: string) {
    try {
      const products = await prisma.product.findMany({
        where: {
          companyId,
          isService: false,
          isActive: true,
        },
        include: {
          stock: true,
        },
      })

      for (const product of products) {
        if (product.stock && product.cost) {
          const stockValue = product.cost * product.stockQuantity
          const availableQuantity = product.stockQuantity - (product.stock.quantiteReservee || 0)

          await prisma.stock.update({
            where: { id: product.stock.id },
            data: {
              quantiteDisponible: availableQuantity,
              valeurStock: stockValue,
              coutMoyenPondere: product.cost,
              dateLastUpdate: new Date(),
            },
          })
        }
      }

      logger.info('Valeurs de stock mises à jour', { companyId, productsUpdated: products.length })
    } catch (error) {
      logger.error('Erreur lors de la mise à jour des valeurs de stock', { error, companyId })
      throw error
    }
  }
}
