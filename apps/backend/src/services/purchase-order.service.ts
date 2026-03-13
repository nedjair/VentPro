import { prisma as prismaClient } from '../lib/database'
import { PaginationParams, PaginationResponse } from '@gestion/shared'
import { logger } from '../utils/logger'

type PurchaseOrderStatusValue = 'DRAFT' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'
type PurchaseOrder = Record<string, any>
type PurchaseOrderItem = Record<string, any>

// Le schéma réel expose Purchase/PurchaseItem et non PurchaseOrder/PurchaseOrderItem.
// On garde les routes legacy vivantes sans inventer de nouveaux modèles en base.
const prisma: any = prismaClient

export interface CreatePurchaseOrderData {
  supplierId: string
  orderDate?: Date
  expectedDate?: Date
  notes?: string
  status?: PurchaseOrderStatusValue
  items: CreatePurchaseOrderItemData[]
}

export interface CreatePurchaseOrderItemData {
  productId: string
  quantity: number
  unitPrice: number
}

export interface UpdatePurchaseOrderData extends Partial<Omit<CreatePurchaseOrderData, 'items'>> {
  items?: CreatePurchaseOrderItemData[]
}

export interface PurchaseOrderFilters {
  search?: string
  supplierId?: string
  status?: PurchaseOrderStatusValue
  dateFrom?: Date
  dateTo?: Date
}

export class PurchaseOrderService {
  private static hasPurchaseOrderModel(): boolean {
    return Boolean(prisma.purchaseOrder && prisma.purchaseOrderItem)
  }

  private static isMissingPurchaseOrderTable(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error)
    return /purchaseorder|purchase order|table.*does not exist|relation.*does not exist|Cannot read properties of undefined/i.test(message)
  }

  private static ensurePurchaseOrderModelAvailable(): void {
    if (!this.hasPurchaseOrderModel()) {
      throw new Error('Le module commandes fournisseurs n\'est pas disponible sur le schéma Prisma actif')
    }
  }

  /**
   * Créer une nouvelle commande fournisseur
   */
  static async createPurchaseOrder(data: CreatePurchaseOrderData, companyId: string, userId: string): Promise<PurchaseOrder> {
    try {
      this.ensurePurchaseOrderModelAvailable()
      logger.info('Création d\'une nouvelle commande fournisseur', { data, companyId, userId })

      // Vérifier que le fournisseur existe et appartient à l'entreprise
      const supplier = await prisma.supplier.findFirst({
        where: { id: data.supplierId, companyId },
      })

      if (!supplier) {
        throw new Error('Fournisseur non trouvé')
      }

      // Vérifier que tous les produits existent
      const productIds = data.items.map(item => item.productId)
      const products = await prisma.product.findMany({
        where: { id: { in: productIds }, companyId },
      })

      if (products.length !== productIds.length) {
        throw new Error('Un ou plusieurs produits n\'existent pas')
      }

      // Générer le numéro de commande
      const orderNumber = await this.generatePurchaseOrderNumber(companyId)

      // Calculer les montants
      let subtotal = 0
      let taxAmount = 0

      const orderItems = data.items.map(item => {
        const product = products.find(p => p.id === item.productId)!
        const itemTotal = item.unitPrice * item.quantity
        const itemTax = itemTotal * (product.vatRate.toNumber() / 100)
        
        subtotal += itemTotal
        taxAmount += itemTax

        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }
      })

      const total = subtotal + taxAmount

      // Créer la commande fournisseur avec ses articles
      const purchaseOrder = await prisma.purchaseOrder.create({
        data: {
          number: orderNumber,
          status: 'DRAFT',
          orderDate: data.orderDate || new Date(),
          expectedDate: data.expectedDate,
          notes: data.notes,
          subtotal,
          taxAmount,
          total,
          supplier: {
            connect: {
              id: data.supplierId,
            },
          },
          company: {
            connect: {
              id: companyId,
            },
          },
          createdBy: {
            connect: {
              id: userId,
            },
          },
          items: {
            create: orderItems,
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          supplier: true,
          createdBy: true,
        },
      })

      logger.info('Commande fournisseur créée avec succès', { 
        purchaseOrderId: purchaseOrder.id, 
        number: purchaseOrder.number 
      })
      return purchaseOrder
    } catch (error) {
      logger.error('Erreur lors de la création de la commande fournisseur', { error, data, companyId })
      throw error
    }
  }

  /**
   * Obtenir une commande fournisseur par ID
   */
  static async getPurchaseOrderById(id: string, companyId: string): Promise<PurchaseOrder | null> {
    try {
      if (!this.hasPurchaseOrderModel()) {
        logger.warn('Table PurchaseOrder absente sur ce schéma local : détail indisponible', { id, companyId })
        return null
      }

      const purchaseOrder = await prisma.purchaseOrder.findFirst({
        where: { id, companyId },
        include: {
          items: {
            include: {
              product: true,
              receptionItems: {
                include: {
                  reception: true,
                },
              },
            },
          },
          supplier: true,
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          receptions: {
            include: {
              items: true,
            },
          },
        },
      })

      return purchaseOrder
    } catch (error) {
      logger.error('Erreur lors de la récupération de la commande fournisseur', { error, id, companyId })
      throw error
    }
  }

  /**
   * Lister les commandes fournisseurs avec pagination et filtres
   */
  static async getPurchaseOrders(
    companyId: string,
    pagination: PaginationParams,
    filters: PurchaseOrderFilters = {}
  ): Promise<PaginationResponse<PurchaseOrder>> {
    try {
      if (!this.hasPurchaseOrderModel()) {
        logger.warn('Table PurchaseOrder absente sur ce schéma local : retour d\'une liste vide', { companyId })
        return {
          data: [],
          pagination: {
            page: pagination.page || 1,
            limit: pagination.limit || 10,
            total: 0,
            totalPages: 0,
          },
        }
      }

      const { page = 1, limit = 10 } = pagination
      const skip = (page - 1) * limit

      // Construire les conditions de filtrage
      const where: any = {
        companyId,
        ...(filters.supplierId && { supplierId: filters.supplierId }),
        ...(filters.status && { status: filters.status }),
        ...(filters.dateFrom && { orderDate: { gte: filters.dateFrom } }),
        ...(filters.dateTo && { orderDate: { lte: filters.dateTo } }),
        ...(filters.search && {
          OR: [
            { number: { contains: filters.search, mode: 'insensitive' } },
            { notes: { contains: filters.search, mode: 'insensitive' } },
            { supplier: { name: { contains: filters.search, mode: 'insensitive' } } },
          ],
        }),
      }

      const [purchaseOrders, total] = await Promise.all([
        prisma.purchaseOrder.findMany({
          where,
          include: {
            items: {
              include: {
                product: true,
              },
            },
            supplier: true,
            receptions: true,
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { orderDate: 'desc' },
          skip,
          take: limit,
        }),
        prisma.purchaseOrder.count({ where }),
      ])

      return {
        data: purchaseOrders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }
    } catch (error) {
      if (this.isMissingPurchaseOrderTable(error)) {
        logger.warn('Table PurchaseOrder absente sur ce schéma local : retour d\'une liste vide', {
          companyId,
        })

        return {
          data: [],
          pagination: {
            page: pagination.page || 1,
            limit: pagination.limit || 10,
            total: 0,
            totalPages: 0,
          },
        }
      }

      logger.error('Erreur lors de la récupération des commandes fournisseurs', { error, companyId, filters })
      throw error
    }
  }

  static async getPurchaseOrderStats(companyId: string) {
    try {
      if (!this.hasPurchaseOrderModel()) {
        logger.warn('Table PurchaseOrder absente sur ce schéma local : statistiques vides', { companyId })
        return {
          totalOrders: 0,
          totalAmount: 0,
          pendingOrders: 0,
          receivedOrders: 0,
          averageOrderValue: 0,
          topSuppliers: [],
          monthlyTrends: [],
        }
      }

      const [totalOrders, aggregateAmount, pendingOrders, receivedOrders] = await Promise.all([
        prisma.purchaseOrder.count({ where: { companyId } }),
        prisma.purchaseOrder.aggregate({ where: { companyId }, _sum: { total: true }, _avg: { total: true } }),
        prisma.purchaseOrder.count({ where: { companyId, status: { in: ['DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED'] } } }),
        prisma.purchaseOrder.count({ where: { companyId, status: 'RECEIVED' } }),
      ])

      return {
        totalOrders,
        totalAmount: aggregateAmount._sum.total || 0,
        pendingOrders,
        receivedOrders,
        averageOrderValue: aggregateAmount._avg.total || 0,
        topSuppliers: [],
        monthlyTrends: [],
      }
    } catch (error) {
      if (this.isMissingPurchaseOrderTable(error)) {
        logger.warn('Table PurchaseOrder absente sur ce schéma local : statistiques vides', { companyId })
        return {
          totalOrders: 0,
          totalAmount: 0,
          pendingOrders: 0,
          receivedOrders: 0,
          averageOrderValue: 0,
          topSuppliers: [],
          monthlyTrends: [],
        }
      }

      logger.error('Erreur lors de la récupération des statistiques des commandes fournisseurs', { error, companyId })
      throw error
    }
  }

  /**
   * Mettre à jour une commande fournisseur
   */
  static async updatePurchaseOrder(id: string, data: UpdatePurchaseOrderData, companyId: string): Promise<PurchaseOrder> {
    try {
      this.ensurePurchaseOrderModelAvailable()
      logger.info('Mise à jour de la commande fournisseur', { id, data, companyId })

      // Vérifier que la commande existe
      const existingOrder = await prisma.purchaseOrder.findFirst({
        where: { id, companyId },
        include: { items: true },
      })

      if (!existingOrder) {
        throw new Error('Commande fournisseur non trouvée')
      }

      // Vérifier que la commande peut être modifiée
      if (existingOrder.status === 'RECEIVED' || existingOrder.status === 'CANCELLED') {
        throw new Error('Cette commande ne peut plus être modifiée')
      }

      let updateData: any = {
        ...(data.orderDate && { orderDate: data.orderDate }),
        ...(data.expectedDate && { expectedDate: data.expectedDate }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.status && { status: data.status }),
      }

      // Si des articles sont fournis, recalculer les montants
      if (data.items) {
        // Vérifier que tous les produits existent
        const productIds = data.items.map(item => item.productId)
        const products = await prisma.product.findMany({
          where: { id: { in: productIds }, companyId },
        })

        if (products.length !== productIds.length) {
          throw new Error('Un ou plusieurs produits n\'existent pas')
        }

        // Calculer les nouveaux montants
        let subtotal = 0
        let taxAmount = 0

        const orderItems = data.items.map(item => {
          const product = products.find(p => p.id === item.productId)!
          const itemTotal = item.unitPrice * item.quantity
          const itemTax = itemTotal * (product.vatRate.toNumber() / 100)
          
          subtotal += itemTotal
          taxAmount += itemTax

          return {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          }
        })

        const total = subtotal + taxAmount

        updateData = {
          ...updateData,
          subtotal,
          taxAmount,
          total,
        }

        // Supprimer les anciens articles et créer les nouveaux
        await prisma.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId: id },
        })

        updateData.items = {
          create: orderItems,
        }
      }

      const updatedOrder = await prisma.purchaseOrder.update({
        where: { id },
        data: updateData,
        include: {
          items: {
            include: {
              product: true,
            },
          },
          supplier: true,
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      })

      logger.info('Commande fournisseur mise à jour avec succès', { purchaseOrderId: id })
      return updatedOrder
    } catch (error) {
      logger.error('Erreur lors de la mise à jour de la commande fournisseur', { error, id, data })
      throw error
    }
  }

  /**
   * Changer le statut d'une commande fournisseur
   */
  static async updatePurchaseOrderStatus(id: string, status: PurchaseOrderStatusValue, companyId: string): Promise<PurchaseOrder> {
    try {
      this.ensurePurchaseOrderModelAvailable()
      logger.info('Changement de statut de la commande fournisseur', { id, status, companyId })

      const existingOrder = await prisma.purchaseOrder.findFirst({
        where: { id, companyId },
      })

      if (!existingOrder) {
        throw new Error('Commande fournisseur non trouvée')
      }

      // Vérifier les transitions de statut autorisées
      if (existingOrder.status === 'CANCELLED' && status !== 'CANCELLED') {
        throw new Error('Une commande annulée ne peut pas changer de statut')
      }

      if (existingOrder.status === 'RECEIVED' && status !== 'RECEIVED') {
        throw new Error('Une commande reçue ne peut pas changer de statut')
      }

      const updatedOrder = await prisma.purchaseOrder.update({
        where: { id },
        data: { status },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          supplier: true,
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      })

      logger.info('Statut de la commande fournisseur mis à jour', { purchaseOrderId: id, newStatus: status })
      return updatedOrder
    } catch (error) {
      logger.error('Erreur lors du changement de statut de la commande fournisseur', { error, id, status })
      throw error
    }
  }

  /**
   * Supprimer une commande fournisseur
   */
  static async deletePurchaseOrder(id: string, companyId: string): Promise<void> {
    try {
      this.ensurePurchaseOrderModelAvailable()
      logger.info('Suppression de la commande fournisseur', { id, companyId })

      const existingOrder = await prisma.purchaseOrder.findFirst({
        where: { id, companyId },
        include: { receptions: true },
      })

      if (!existingOrder) {
        throw new Error('Commande fournisseur non trouvée')
      }

      if (existingOrder.status === 'RECEIVED') {
        throw new Error('Une commande reçue ne peut pas être supprimée')
      }

      if (existingOrder.receptions.length > 0) {
        throw new Error('Une commande avec des réceptions ne peut pas être supprimée')
      }

      await prisma.purchaseOrder.delete({
        where: { id },
      })

      logger.info('Commande fournisseur supprimée avec succès', { purchaseOrderId: id })
    } catch (error) {
      logger.error('Erreur lors de la suppression de la commande fournisseur', { error, id })
      throw error
    }
  }

  /**
   * Obtenir les commandes fournisseurs d'un fournisseur
   */
  static async getPurchaseOrdersBySupplier(supplierId: string, companyId: string): Promise<PurchaseOrder[]> {
    try {
      if (!this.hasPurchaseOrderModel()) {
        logger.warn('Table PurchaseOrder absente sur ce schéma local : aucune commande fournisseur à retourner', {
          supplierId,
          companyId,
        })
        return []
      }

      const purchaseOrders = await prisma.purchaseOrder.findMany({
        where: { supplierId, companyId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          supplier: true,
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { orderDate: 'desc' },
      })

      return purchaseOrders
    } catch (error) {
      logger.error('Erreur lors de la récupération des commandes du fournisseur', { error, supplierId, companyId })
      throw error
    }
  }

  /**
   * Générer un numéro de commande fournisseur unique
   */
  private static async generatePurchaseOrderNumber(companyId: string): Promise<string> {
    this.ensurePurchaseOrderModelAvailable()
    const year = new Date().getFullYear()
    const prefix = `CF-${year}-`

    const lastOrder = await prisma.purchaseOrder.findFirst({
      where: {
        companyId,
        number: { startsWith: prefix },
      },
      orderBy: { number: 'desc' },
    })

    let nextNumber = 1
    if (lastOrder) {
      const lastNumber = parseInt(lastOrder.number.split('-').pop() || '0')
      nextNumber = lastNumber + 1
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`
  }
}
