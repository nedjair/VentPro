import { prisma, Prisma, GoodsReception, GoodsReceptionItem, PurchaseOrderStatus, StockMovementType, StockMovement, StockMovementType, Product } from '@gestion/database'
import { PaginationParams, PaginationResponse } from '@gestion/shared'
import { logger } from '../utils/logger'
import { StockCacheService } from './stock-cache.service'

export interface CreateGoodsReceptionData {
  purchaseOrderId: string
  receptionDate?: Date
  notes?: string
  items: CreateGoodsReceptionItemData[]
}

export interface CreateGoodsReceptionItemData {
  purchaseOrderItemId: string
  productId: string
  quantityReceived: number
  quantityExpected: number
  unitCost?: number
  notes?: string
}

export interface GoodsReceptionFilters {
  search?: string
  purchaseOrderId?: string
  dateFrom?: Date
  dateTo?: Date
}

export class GoodsReceptionService {
  /**
   * Créer une nouvelle réception de marchandises
   */
  static async createGoodsReception(data: CreateGoodsReceptionData, companyId: string, userId: string): Promise<GoodsReception> {
    try {
      logger.info('Création d\'une nouvelle réception de marchandises', { data, companyId, userId })

      // Vérifier que la commande fournisseur existe
      const purchaseOrder = await prisma.purchaseOrder.findFirst({
        where: { id: data.purchaseOrderId, companyId },
        include: {
          items: true,
          supplier: true,
        },
      })

      if (!purchaseOrder) {
        throw new Error('Commande fournisseur non trouvée')
      }

      if (purchaseOrder.status === PurchaseOrderStatus.CANCELLED) {
        throw new Error('Impossible de réceptionner une commande annulée')
      }

      // Vérifier que tous les articles de la réception correspondent à la commande
      const purchaseOrderItemIds = purchaseOrder.items.map(item => item.id)
      const receptionItemIds = data.items.map(item => item.purchaseOrderItemId)
      
      const invalidItems = receptionItemIds.filter(id => !purchaseOrderItemIds.includes(id))
      if (invalidItems.length > 0) {
        throw new Error('Certains articles ne correspondent pas à la commande fournisseur')
      }

      // Générer le numéro de réception
      const receptionNumber = await this.generateReceptionNumber(companyId)

      // Créer la réception avec ses articles
      const reception = await prisma.goodsReception.create({
        data: {
          number: receptionNumber,
          receptionDate: data.receptionDate || new Date(),
          notes: data.notes,
          purchaseOrderId: data.purchaseOrderId,
          companyId,
          createdById: userId,
          items: {
            create: data.items.map(item => ({
              purchaseOrderItemId: item.purchaseOrderItemId,
              productId: item.productId,
              quantityReceived: item.quantityReceived,
              quantityExpected: item.quantityExpected,
              unitCost: item.unitCost || 0,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
              purchaseOrderItem: true,
            },
          },
          purchaseOrder: {
            include: {
              supplier: true,
            },
          },
        },
      })

      // Mettre à jour les quantités reçues dans la commande fournisseur
      for (const item of data.items) {
        await prisma.purchaseOrderItem.update({
          where: { id: item.purchaseOrderItemId },
          data: {
            receivedQty: {
              increment: item.quantityReceived,
            },
          },
        })
      }

      // Mettre à jour le stock des produits
      await this.updateProductStock(data.items, companyId)

      // Mettre à jour le statut de la commande fournisseur
      await this.updatePurchaseOrderStatus(data.purchaseOrderId, companyId)

      logger.info('Réception de marchandises créée avec succès', { 
        receptionId: reception.id, 
        number: reception.number 
      })
      return reception
    } catch (error) {
      logger.error('Erreur lors de la création de la réception de marchandises', { error, data, companyId })
      throw error
    }
  }

  /**
   * Obtenir une réception de marchandises par ID
   */
  static async getGoodsReceptionById(id: string, companyId: string): Promise<GoodsReception | null> {
    try {
      const reception = await prisma.goodsReception.findFirst({
        where: { id, companyId },
        include: {
          items: {
            include: {
              product: true,
              purchaseOrderItem: {
                include: {
                  product: true,
                },
              },
            },
          },
          purchaseOrder: {
            include: {
              supplier: true,
            },
          },
          receivedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      })

      return reception
    } catch (error) {
      logger.error('Erreur lors de la récupération de la réception de marchandises', { error, id, companyId })
      throw error
    }
  }

  /**
   * Lister les réceptions de marchandises avec pagination et filtres
   */
  static async getGoodsReceptions(
    companyId: string,
    pagination: PaginationParams,
    filters: GoodsReceptionFilters = {}
  ): Promise<PaginationResponse<GoodsReception>> {
    try {
      const { page = 1, limit = 10 } = pagination
      const skip = (page - 1) * limit

      // Construire les conditions de filtrage
      const where: Prisma.GoodsReceptionWhereInput = {
        companyId,
        ...(filters.purchaseOrderId && { purchaseOrderId: filters.purchaseOrderId }),
        ...(filters.dateFrom && { receptionDate: { gte: filters.dateFrom } }),
        ...(filters.dateTo && { receptionDate: { lte: filters.dateTo } }),
        ...(filters.search && {
          OR: [
            { number: { contains: filters.search, mode: 'insensitive' } },
            { notes: { contains: filters.search, mode: 'insensitive' } },
            { purchaseOrder: { 
              OR: [
                { number: { contains: filters.search, mode: 'insensitive' } },
                { supplier: { name: { contains: filters.search, mode: 'insensitive' } } },
              ]
            }},
          ],
        }),
      }

      const [receptions, total] = await Promise.all([
        prisma.goodsReception.findMany({
          where,
          include: {
            items: {
              include: {
                product: true,
              },
            },
            purchaseOrder: {
              include: {
                supplier: true,
              },
            },
          },
          orderBy: { receptionDate: 'desc' },
          skip,
          take: limit,
        }),
        prisma.goodsReception.count({ where }),
      ])

      return {
        data: receptions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }
    } catch (error) {
      logger.error('Erreur lors de la récupération des réceptions de marchandises', { error, companyId, filters })
      throw error
    }
  }

  /**
   * Obtenir les réceptions d'une commande fournisseur
   */
  static async getReceptionsByPurchaseOrder(purchaseOrderId: string, companyId: string): Promise<GoodsReception[]> {
    try {
      const receptions = await prisma.goodsReception.findMany({
        where: { purchaseOrderId, companyId },
        include: {
          items: {
            include: {
              product: true,
              purchaseOrderItem: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { receptionDate: 'desc' },
      })

      return receptions
    } catch (error) {
      logger.error('Erreur lors de la récupération des réceptions de la commande', { error, purchaseOrderId, companyId })
      throw error
    }
  }

  /**
   * Mettre à jour le stock des produits après réception
   */
  private static async updateProductStock(items: CreateGoodsReceptionItemData[], companyId: string): Promise<void> {
    for (const item of items) {
      // Mettre à jour le stock du produit
      const existingStock = await prisma.stock.findFirst({
        where: { productId: item.productId, companyId },
      })

      if (existingStock) {
        const updatedStock = await prisma.stock.update({
          where: { id: existingStock.id },
          data: {
            quantiteActuelle: {
              increment: item.quantityReceived,
            },
            dateLastUpdate: new Date(),
          },
        })

        // Mettre à jour le cache
        StockCacheService.updateCache(
          item.productId,
          companyId,
          updatedStock.quantiteActuelle,
          updatedStock.quantiteMinimale,
          updatedStock.quantiteMaximale || undefined
        )
      } else {
        // Créer un nouveau stock si il n'existe pas
        const newStock = await prisma.stock.create({
          data: {
            quantiteActuelle: item.quantityReceived,
            quantiteMinimale: 0,
            productId: item.productId,
            companyId,
          },
        })

        // Mettre à jour le cache
        StockCacheService.updateCache(
          item.productId,
          companyId,
          newStock.quantiteActuelle,
          newStock.quantiteMinimale,
          newStock.quantiteMaximale || undefined
        )
      }

      // Créer un mouvement de stock
      await prisma.stockMovement.create({
        data: {
          type: StockMovementType.IN,
          quantity: item.quantityReceived,
          unitCost: item.unitCost,
          reference: `Réception marchandises`,
          comment: item.notes || 'Réception de marchandises',
          productId: item.productId,
        },
      })
    }
  }

  /**
   * Mettre à jour le statut de la commande fournisseur
   */
  private static async updatePurchaseOrderStatus(purchaseOrderId: string, companyId: string): Promise<void> {
    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, companyId },
      include: { items: true },
    })

    if (!purchaseOrder) return

    // Vérifier si toutes les quantités ont été reçues
    const allItemsReceived = purchaseOrder.items.every(item => item.receivedQty >= item.quantiteActuelle)
    const someItemsReceived = purchaseOrder.items.some(item => item.receivedQty > 0)

    let newStatus = purchaseOrder.status

    if (allItemsReceived) {
      newStatus = PurchaseOrderStatus.RECEIVED
    } else if (someItemsReceived) {
      newStatus = PurchaseOrderStatus.PARTIALLY_RECEIVED
    }

    if (newStatus !== purchaseOrder.status) {
      await prisma.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: { 
          status: newStatus,
          // receivedDate: newStatus === PurchaseOrderStatus.RECEIVED ? new Date() : null,
        },
      })
    }
  }

  /**
   * Générer un numéro de réception unique
   */
  private static async generateReceptionNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `REC-${year}-`
    
    const lastReception = await prisma.goodsReception.findFirst({
      where: {
        companyId,
        number: { startsWith: prefix },
      },
      orderBy: { number: 'desc' },
    })

    let nextNumber = 1
    if (lastReception) {
      const lastNumber = parseInt(lastReception.number.split('-').pop() || '0')
      nextNumber = lastNumber + 1
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`
  }
}
