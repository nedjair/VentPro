// @ts-nocheck
import { prisma, Prisma, Order, OrderType, OrderStatus, OrderItem, Quote } from '@gestion/database'
import { PaginationParams, PaginationResponse } from '@gestion/shared'
import { logger } from '../utils/logger'
import { StockSyncService } from './stock-sync.service'

export interface CreateOrderData {
  type: OrderType
  clientId: string
  orderDate?: Date
  validUntil?: Date
  deliveryDate?: Date
  notes?: string
  internalNotes?: string
  items: CreateOrderItemData[]
}

export interface CreateOrderItemData {
  productId: string
  quantity: number
  unitPrice: number
  vatRate: number
  discount?: number
}

export interface UpdateOrderData extends Partial<Omit<CreateOrderData, 'items'>> {
  items?: CreateOrderItemData[]
}

export interface OrderFilters {
  search?: string
  clientId?: string
  type?: OrderType
  status?: OrderStatus
  dateFrom?: Date
  dateTo?: Date
}

export class OrderService {
  /**
   * Créer une nouvelle commande/devis
   */
  static async createOrder(data: CreateOrderData, companyId: string): Promise<Order> {
    try {
      logger.info('Création d\'une nouvelle commande', { data, companyId })

      // Vérifier que le client existe et appartient à l'entreprise
      const client = await prisma.client.findFirst({
        where: { id: data.clientId, companyId },
      })

      if (!client) {
        throw new Error('Client non trouvé')
      }

      // Vérifier que tous les produits existent
      const productIds = data.items.map(item => item.productId)
      const products = await prisma.product.findMany({
        where: { id: { in: productIds }, companyId },
      })

      if (products.length !== productIds.length) {
        throw new Error('Un ou plusieurs produits non trouvés')
      }

      // Calculer les montants
      const { subtotal, vatAmount, total } = this.calculateOrderAmounts(data.items)

      // Créer la commande avec retry en cas de conflit de numéro
      let order = null
      let attempts = 0
      const maxAttempts = 5

      while (attempts < maxAttempts && !order) {
        try {
          // Générer un nouveau numéro à chaque tentative
          const orderNumber = await this.generateOrderNumber(data.type, companyId)

          // Créer la commande avec ses items
          order = await prisma.order.create({
            data: {
              number: orderNumber,
              type: data.type,
              status: OrderStatus.DRAFT,
              clientId: data.clientId,
              companyId,
              orderDate: data.orderDate || new Date(),
              validUntil: data.validUntil,
              deliveryDate: data.deliveryDate,
              subtotal,
              vatAmount,
              total,
              discount: 0,
              notes: data.notes,
              internalNotes: data.internalNotes,
              items: {
                create: data.items.map(item => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  vatRate: item.vatRate,
                  discount: item.discount || 0,
                })),
              },
            },
            include: {
              client: true,
              items: {
                include: {
                  product: true,
                },
              },
            },
          })

          break // Succès, sortir de la boucle

        } catch (error: any) {
          attempts++

          // Si c'est une erreur de contrainte unique sur le numéro, réessayer
          if (error.code === 'P2002' && error.meta?.target?.includes('number')) {
            logger.warn(`Conflit de numéro de commande, tentative ${attempts}/${maxAttempts}`, {
              error: error.message,
              attempt: attempts
            })

            if (attempts < maxAttempts) {
              // Attendre un peu avant de réessayer
              await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10))
              continue
            }
          }

          // Pour toute autre erreur, la relancer immédiatement
          throw error
        }
      }

      if (!order) {
        throw new Error('Impossible de créer la commande après plusieurs tentatives')
      }

      logger.info('Commande créée avec succès', { orderId: order.id, orderNumber: order.number })
      return order
    } catch (error) {
      logger.error('Erreur lors de la création de la commande', { error, data })
      throw error
    }
  }

  /**
   * Récupérer une commande par ID
   */
  static async getOrderById(id: string, companyId: string): Promise<Order | null> {
    try {
      const order = await prisma.order.findFirst({
        where: { id, companyId },
        include: {
          client: true,
          items: {
            include: {
              product: true,
            },
          },
          invoices: true,
        },
      })

      return order
    } catch (error) {
      logger.error('Erreur lors de la récupération de la commande', { error, orderId: id })
      throw error
    }
  }

  /**
   * Récupérer la liste des commandes avec filtres et pagination
   */
  static async getOrders(
    companyId: string,
    filters: OrderFilters = {},
    pagination?: PaginationParams
  ): Promise<PaginationResponse<Order>> {
    try {
      const { page = 1, limit = 10 } = pagination || {};
      const { search, clientId, type, status, dateFrom, dateTo } = filters

      // Compatibilité schéma PostgreSQL local observé :
      // - table `Order` liée à l'utilisateur via `userId`
      // - numéro stocké dans `orderNumber`
      // - pas de colonne `type`, et statuts stockés en minuscules métier
      try {
        const normalizedSearch = search?.trim()
        const offset = Math.max(0, (page - 1) * limit)
        const currentSchemaStatuses = status
          ? ({
              DRAFT: ['draft'],
              SENT: ['sent', 'pending', 'preparing'],
              ACCEPTED: ['accepted', 'confirmed', 'completed'],
              REJECTED: ['rejected'],
              EXPIRED: ['expired'],
              CANCELLED: ['cancelled'],
            } as Record<string, string[]>)[status] || [String(status).toLowerCase()]
          : []

        const typeCondition = type === 'QUOTE' ? Prisma.sql`AND 1 = 0` : Prisma.empty
        const searchCondition = normalizedSearch
          ? Prisma.sql`
              AND (
                o."orderNumber" ILIKE ${`%${normalizedSearch}%`}
                OR COALESCE(o.notes, '') ILIKE ${`%${normalizedSearch}%`}
                OR COALESCE(c.name, '') ILIKE ${`%${normalizedSearch}%`}
                OR COALESCE(c.email, '') ILIKE ${`%${normalizedSearch}%`}
              )
            `
          : Prisma.empty
        const clientCondition = clientId ? Prisma.sql`AND o."clientId" = ${clientId}` : Prisma.empty
        const statusCondition = currentSchemaStatuses.length > 0
          ? Prisma.sql`AND LOWER(COALESCE(o.status, '')) IN (${Prisma.join(currentSchemaStatuses)})`
          : Prisma.empty
        const dateCondition = (dateFrom || dateTo)
          ? Prisma.sql`
              AND o."createdAt" >= ${dateFrom || new Date('1970-01-01T00:00:00.000Z')}
              AND o."createdAt" <= ${dateTo || new Date('2999-12-31T23:59:59.999Z')}
            `
          : Prisma.empty

        const orders = await prisma.$queryRaw<Array<any>>`
          SELECT
            o.id,
            o."orderNumber",
            o.status,
            o.total,
            o."totalHT",
            o."tvaAmount",
            o."deliveryDate",
            o.notes,
            o."createdAt",
            o."updatedAt",
            o."clientId",
            c.id AS "clientRecordId",
            c.name AS "clientName",
            c.email AS "clientEmail",
            c.phone AS "clientPhone",
            c.address AS "clientAddress",
            c."createdAt" AS "clientCreatedAt",
            c."updatedAt" AS "clientUpdatedAt"
          FROM "Order" o
          LEFT JOIN "Client" c ON c.id = o."clientId"
          WHERE o."userId" = ${companyId}
          ${typeCondition}
          ${clientCondition}
          ${statusCondition}
          ${dateCondition}
          ${searchCondition}
          ORDER BY o."createdAt" DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `

        const totalRows = await prisma.$queryRaw<Array<{ count: bigint | number | string }>>`
          SELECT COUNT(*) AS count
          FROM "Order" o
          LEFT JOIN "Client" c ON c.id = o."clientId"
          WHERE o."userId" = ${companyId}
          ${typeCondition}
          ${clientCondition}
          ${statusCondition}
          ${dateCondition}
          ${searchCondition}
        `

        const total = Number(totalRows[0]?.count || 0)
        const totalPages = Math.ceil(total / limit)
        const normalizeStatus = (value: string | null | undefined): OrderStatus => {
          const raw = String(value || '').toLowerCase()
          if (['confirmed', 'accepted', 'completed'].includes(raw)) return 'ACCEPTED' as OrderStatus
          if (['sent', 'pending', 'preparing'].includes(raw)) return 'SENT' as OrderStatus
          if (raw === 'rejected') return 'REJECTED' as OrderStatus
          if (raw === 'expired') return 'EXPIRED' as OrderStatus
          if (raw === 'cancelled') return 'CANCELLED' as OrderStatus
          return 'DRAFT' as OrderStatus
        }

        const normalizedOrders = orders.map((order) => ({
          id: order.id,
          number: order.orderNumber,
          type: 'ORDER',
          status: normalizeStatus(order.status),
          clientId: order.clientId,
          client: order.clientRecordId ? {
            id: order.clientRecordId,
            type: 'COMPANY',
            firstName: null,
            lastName: null,
            companyName: order.clientName,
            email: order.clientEmail,
            phone: order.clientPhone,
            address: order.clientAddress,
            postalCode: null,
            city: null,
            country: null,
            notes: null,
            createdAt: order.clientCreatedAt,
            updatedAt: order.clientUpdatedAt,
          } : undefined,
          orderDate: order.createdAt,
          validUntil: null,
          deliveryDate: order.deliveryDate,
          subtotal: Number(order.totalHT ?? order.total ?? 0),
          vatAmount: Number(order.tvaAmount ?? 0),
          total: Number(order.total ?? 0),
          discount: 0,
          notes: order.notes,
          internalNotes: null,
          items: [],
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        })) as Order[]

        return {
          data: normalizedOrders,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        }
      } catch (currentSchemaError) {
        logger.warn('Fallback commandes : schéma PostgreSQL actuel non accessible via SQL brut', { error: currentSchemaError, companyId })
      }

      // Construction de la clause WHERE
      const where: Prisma.OrderWhereInput = {
        companyId,
      }

      if (search) {
        where.OR = [
          { number: { contains: search, mode: 'insensitive' } },
          { notes: { contains: search, mode: 'insensitive' } },
          { client: { 
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { companyName: { contains: search, mode: 'insensitive' } },
            ]
          }},
        ]
      }

      if (clientId) {
        where.clientId = clientId
      }

      if (type) {
        where.type = type
      }

      if (status) {
        where.status = status
      }

      if (dateFrom || dateTo) {
        where.orderDate = {}
        if (dateFrom) {
          where.orderDate.gte = dateFrom
        }
        if (dateTo) {
          where.orderDate.lte = dateTo
        }
      }

      const skip = pagination ? (page - 1) * limit : undefined;
      const take = pagination ? limit : undefined;

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
          include: {
            client: true,
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                  },
                },
              },
            },
          },
        }),
        prisma.order.count({ where }),
      ])

      const totalPages = pagination ? Math.ceil(total / limit) : 1;

      return {
        data: orders,
        pagination: {
          page,
          limit: pagination ? limit : total,
          total,
          totalPages,
          hasNext: pagination ? page < totalPages : false,
          hasPrev: page > 1,
        },
      }
    } catch (error) {
      logger.error('Erreur lors de la récupération des commandes', { error, filters })
      throw error
    }
  }

  /**
   * Mettre à jour une commande
   */
  static async updateOrder(id: string, data: UpdateOrderData, companyId: string): Promise<Order> {
    try {
      logger.info('Mise à jour de la commande', { orderId: id, data, companyId })

      // Vérifier que la commande existe et appartient à l'entreprise
      const existingOrder = await this.getOrderById(id, companyId)
      if (!existingOrder) {
        throw new Error('Commande non trouvée')
      }

      // Préparer les données de mise à jour
      const updateData: any = { ...data }

      // Si des items sont fournis, recalculer les montants
      if (data.items) {
        const { subtotal, vatAmount, total } = this.calculateOrderAmounts(data.items)
        updateData.subtotal = subtotal
        updateData.vatAmount = vatAmount
        updateData.total = total

        // Supprimer les anciens items et créer les nouveaux
        await prisma.orderItem.deleteMany({
          where: { orderId: id },
        })

        updateData.items = {
          create: data.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            vatRate: item.vatRate,
            discount: item.discount || 0,
          })),
        }
      }

      const updatedOrder = await prisma.order.update({
        where: { id },
        data: updateData,
        include: {
          client: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      })

      logger.info('Commande mise à jour avec succès', { orderId: id })
      return updatedOrder
    } catch (error) {
      logger.error('Erreur lors de la mise à jour de la commande', { error, orderId: id })
      throw error
    }
  }

  /**
   * Calculer les montants d'une commande
   */
  private static calculateOrderAmounts(items: CreateOrderItemData[]) {
    let subtotal = 0
    let vatAmount = 0

    for (const item of items) {
      const itemSubtotal = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100)
      const itemVat = itemSubtotal * (item.vatRate / 100)

      subtotal += itemSubtotal
      vatAmount += itemVat
    }

    const total = subtotal + vatAmount

    return {
      subtotal: Number(subtotal.toFixed(2)),
      vatAmount: Number(vatAmount.toFixed(2)),
      total: Number(total.toFixed(2)),
    }
  }

  /**
   * Changer le statut d'une commande
   */
  static async updateOrderStatus(id: string, status: OrderStatus, companyId: string): Promise<Order> {
    try {
      logger.info('Changement de statut de commande', { orderId: id, status, companyId })

      const order = await this.getOrderById(id, companyId)
      if (!order) {
        throw new Error('Commande non trouvée')
      }

      const updatedOrder = await prisma.order.update({
        where: { id },
        data: { status },
        include: {
          client: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      })

      logger.info('Statut de commande mis à jour', { orderId: id, newStatus: status })
      return updatedOrder
    } catch (error) {
      logger.error('Erreur lors du changement de statut', { error, orderId: id })
      throw error
    }
  }

  /**
   * Convertir un devis en commande
   */
  static async convertQuoteToOrder(quoteId: string, companyId: string): Promise<Order> {
    try {
      logger.info('Conversion devis en commande', { quoteId, companyId })

      const quote = await prisma.order.findFirst({
        where: { id: quoteId, companyId, type: 'QUOTE' },
        include: { items: true }
      })
      
      if (!quote) {
        throw new Error('Devis non trouvé')
      }

      if (quote.type !== OrderType.QUOTE) {
        throw new Error('Cette commande n\'est pas un devis')
      }

      if (quote.status !== OrderStatus.ACCEPTED) {
        throw new Error('Le devis doit être accepté avant conversion')
      }

      // Créer une nouvelle commande basée sur le devis
      const orderData: CreateOrderData = {
        type: OrderType.ORDER,
        clientId: quote.clientId,
        orderDate: new Date(),
        deliveryDate: quote.deliveryDate,
        notes: quote.notes,
        internalNotes: `Converti du devis ${quote.number}`,
        items: quote.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          vatRate: Number(item.vatRate),
          discount: Number(item.discount),
        })),
      }

      const order = await this.createOrder(orderData, companyId)

      logger.info('Devis converti en commande', { quoteId, orderId: order.id })
      return order
    } catch (error) {
      logger.error('Erreur lors de la conversion devis', { error, quoteId })
      throw error
    }
  }

  /**
   * Supprimer une commande
   */
  static async deleteOrder(id: string, companyId: string): Promise<void> {
    try {
      logger.info('Suppression de la commande', { orderId: id, companyId })

      const order = await this.getOrderById(id, companyId)
      if (!order) {
        throw new Error('Commande non trouvée')
      }

      // Vérifier qu'il n'y a pas de factures liées
      const invoicesCount = await prisma.invoice.count({
        where: { orderId: id },
      })

      if (invoicesCount > 0) {
        throw new Error('Impossible de supprimer cette commande car elle a des factures associées')
      }

      // Supprimer la commande (les items seront supprimés en cascade)
      await prisma.order.delete({
        where: { id },
      })

      logger.info('Commande supprimée avec succès', { orderId: id })
    } catch (error) {
      logger.error('Erreur lors de la suppression de la commande', { error, orderId: id })
      throw error
    }
  }

  /**
   * Obtenir les statistiques des commandes
   */
  static async getOrderStats(companyId: string) {
    try {
      const [
        totalOrders,
        totalQuotes,
        pendingQuotes,
        acceptedQuotes,
        recentOrdersCount,
      ] = await Promise.all([
        prisma.order.count({ where: { companyId, type: OrderType.ORDER } }),
        prisma.order.count({ where: { companyId, type: OrderType.QUOTE } }),
        prisma.order.count({
          where: {
            companyId,
            type: OrderType.QUOTE,
            status: OrderStatus.SENT
          }
        }),
        prisma.order.count({
          where: {
            companyId,
            type: OrderType.QUOTE,
            status: OrderStatus.ACCEPTED
          }
        }),
        prisma.order.count({
          where: {
            companyId,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 jours
            },
          },
        }),
      ])

      return {
        totalOrders,
        totalQuotes,
        pendingQuotes,
        acceptedQuotes,
        recentOrdersCount,
      }
    } catch (error) {
      logger.error('Erreur lors du calcul des statistiques commandes', { error })
      throw error
    }
  }

  /**
   * Générer un numéro de commande unique avec protection contre les doublons
   */
  private static async generateOrderNumber(type: OrderType, companyId: string): Promise<string> {
    const prefix = type === OrderType.QUOTE ? 'DEV' : 'CMD'
    const year = new Date().getFullYear()

    // Utiliser une approche basée sur l'année pour éviter les conflits avec QuoteService
    const yearPrefix = `${prefix}-${year}-`

    // Trouver le dernier numéro existant pour ce préfixe
    const lastOrder = await prisma.order.findFirst({
      where: {
        companyId,
        number: { startsWith: yearPrefix },
      },
      orderBy: { number: 'desc' },
    })

    let nextNumber = 1
    if (lastOrder) {
      const lastNumber = parseInt(lastOrder.number.split('-').pop() || '0')
      nextNumber = lastNumber + 1
    }

    // Générer le numéro avec retry en cas de conflit
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      const candidateNumber = `${yearPrefix}${nextNumber.toString().padStart(4, '0')}`

      // Vérifier si le numéro existe déjà
      const existing = await prisma.order.findUnique({
        where: { number: candidateNumber },
      })

      if (!existing) {
        return candidateNumber
      }

      // Si le numéro existe, essayer le suivant avec un petit délai pour éviter les race conditions
      nextNumber++
      attempts++

      // Ajouter un délai aléatoire pour réduire les collisions
      if (attempts > 1) {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10))
      }
    }

    // Si on n'arrive pas à générer un numéro unique, utiliser un timestamp
    const timestamp = Date.now().toString().slice(-6)
    return `${yearPrefix}${timestamp}`
  }

  /**
   * Confirmer une commande et réserver le stock
   */
  static async confirmOrder(orderId: string, companyId: string, userId?: string): Promise<Order> {
    try {
      logger.info('Confirmation de commande', { orderId, companyId })

      // Récupérer la commande
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

      if (order.status !== 'DRAFT') {
        throw new Error('Seules les commandes en brouillon peuvent être confirmées')
      }

      // Mettre à jour le statut de la commande
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
        },
        include: {
          client: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      })

      // Réserver le stock si c'est une commande de vente
      if (order.type === 'SALES') {
        try {
          await StockSyncService.syncStockOnOrderCreation(orderId, companyId, userId)
          logger.info('Stock réservé pour la commande confirmée', { orderId })
        } catch (stockError) {
          logger.error('Erreur lors de la réservation de stock', { stockError, orderId })
          // Optionnel: annuler la confirmation si la réservation échoue
          // throw new Error('Erreur lors de la réservation du stock')
        }
      }

      logger.info('Commande confirmée avec succès', { orderId })
      return updatedOrder
    } catch (error) {
      logger.error('Erreur lors de la confirmation de la commande', { error, orderId })
      throw error
    }
  }

  /**
   * Annuler une commande et libérer le stock réservé
   */
  static async cancelOrder(orderId: string, companyId: string, userId?: string): Promise<Order> {
    try {
      logger.info('Annulation de commande', { orderId, companyId })

      // Récupérer la commande
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

      if (order.status === 'CANCELLED') {
        throw new Error('La commande est déjà annulée')
      }

      // Mettre à jour le statut de la commande
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          // cancelledAt: new Date(),
        },
        include: {
          client: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      })

      // Libérer le stock réservé si c'est une commande de vente confirmée
      if (order.type === 'SALES' && order.status === 'ACCEPTED') {
        try {
          await StockSyncService.syncStockOnOrderCancellation(orderId, companyId, userId)
          logger.info('Stock libéré pour la commande annulée', { orderId })
        } catch (stockError) {
          logger.error('Erreur lors de la libération du stock', { stockError, orderId })
        }
      }

      logger.info('Commande annulée avec succès', { orderId })
      return updatedOrder
    } catch (error) {
      logger.error('Erreur lors de l\'annulation de la commande', { error, orderId })
      throw error
    }
  }
}


