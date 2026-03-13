// @ts-nocheck
import { Prisma, Quote, Order } from '@gestion/database'
import { prisma } from '../lib/prisma'
import { PaginationParams, PaginationResponse } from '@gestion/shared'
import { logger } from '../utils/logger'
import { AuditLogService, AuditAction } from './audit-log.service'
import { AlgeriaConfigService } from './algeria-config.service'

export interface CreateQuoteData {
  clientId: string
  quoteDate?: Date
  validUntil: Date
  notes?: string
  discount?: number
  items: CreateQuoteItemData[]
}

export interface CreateQuoteItemData {
  productId: string
  quantity: number
  unitPrice: number
  discount?: number
}

export interface UpdateQuoteData extends Partial<Omit<CreateQuoteData, 'items'>> {
  items?: CreateQuoteItemData[]
}

export interface QuoteFilters {
  search?: string
  clientId?: string
  status?: QuoteStatusValue
  dateFrom?: Date
  dateTo?: Date
}

export type QuoteStatusValue = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'

export class QuoteService {
  /**
   * Créer un nouveau devis
   */
  static async createQuote(data: CreateQuoteData, companyId: string, userId: string): Promise<Quote> {
    try {
      logger.info('Création d\'un nouveau devis', { data, companyId, userId })

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
        throw new Error('Un ou plusieurs produits n\'existent pas')
      }

      // Générer le numéro de devis
      const quoteNumber = await this.generateQuoteNumber(companyId)

      // Calculer les montants
      let subtotal = 0
      let taxAmount = 0

      const quoteItems = data.items.map(item => {
        const product = products.find(p => p.id === item.productId)!
        const itemDiscount = item.discount || 0
        const discountedPrice = item.unitPrice * (1 - itemDiscount / 100)
        const itemTotal = discountedPrice * item.quantity
        const itemTax = itemTotal * (product.vatRate.toNumber() / 100)
        
        subtotal += itemTotal
        taxAmount += itemTax

        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: itemDiscount,
          total: itemTotal,
        }
      })

      // Appliquer la remise globale
      const globalDiscount = data.discount || 0
      subtotal = subtotal * (1 - globalDiscount / 100)
      taxAmount = taxAmount * (1 - globalDiscount / 100)
      const total = subtotal + taxAmount

      // Créer le devis avec ses articles
      const quote = await prisma.quote.create({
        data: {
          number: quoteNumber,
          status: 'DRAFT',
          quoteDate: data.quoteDate || new Date(),
          validUntil: data.validUntil,
          notes: data.notes,
          subtotal,
          taxAmount,
          total,
          discount: globalDiscount,
          clientId: data.clientId,
          companyId,
          createdById: userId,
          items: {
            create: quoteItems,
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          client: true,
        },
      })

      // Logger l'audit
      await AuditLogService.logQuoteAction(
        AuditAction.QUOTE_CREATED,
        quote.id,
        quote,
        undefined,
        userId,
        undefined,
        companyId,
        { itemsCount: quote.items.length }
      )

      logger.info('Devis créé avec succès', { quoteId: quote.id, number: quote.number })
      return quote
    } catch (error) {
      logger.error('Erreur lors de la création du devis', { error, data, companyId })
      throw error
    }
  }

  /**
   * Obtenir un devis par ID
   */
  static async getQuoteById(id: string, companyId: string): Promise<Quote | null> {
    try {
      const quote = await prisma.quote.findFirst({
        where: { id, companyId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          client: true,
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          order: true,
        },
      })

      return quote
    } catch (error) {
      logger.error('Erreur lors de la récupération du devis', { error, id, companyId })
      throw error
    }
  }

  /**
   * Lister les devis avec pagination et filtres
   */
  static async getQuotes(
    companyId: string,
    pagination: PaginationParams,
    filters: QuoteFilters = {}
  ): Promise<PaginationResponse<Quote>> {
    try {
      const safePage = Math.max(1, Number(pagination.page) || 1)
      const safeLimit = Math.max(1, Number(pagination.limit) || 10)
      const skip = (safePage - 1) * safeLimit

      // Compatibilité schéma PostgreSQL local observé.
      try {
        const normalizedSearch = filters.search?.trim()
        const currentSchemaStatuses = filters.status
          ? ({
              DRAFT: ['draft'],
              SENT: ['sent'],
              ACCEPTED: ['accepted', 'confirmed'],
              REJECTED: ['rejected'],
              EXPIRED: ['expired'],
            } as Record<string, string[]>)[filters.status] || [String(filters.status).toLowerCase()]
          : []
        const searchCondition = normalizedSearch
          ? Prisma.sql`
              AND (
                q."quoteNumber" ILIKE ${`%${normalizedSearch}%`}
                OR COALESCE(q.notes, '') ILIKE ${`%${normalizedSearch}%`}
                OR COALESCE(c.name, '') ILIKE ${`%${normalizedSearch}%`}
                OR COALESCE(c.email, '') ILIKE ${`%${normalizedSearch}%`}
              )
            `
          : Prisma.empty
        const clientCondition = filters.clientId ? Prisma.sql`AND q."clientId" = ${filters.clientId}` : Prisma.empty
        const statusCondition = currentSchemaStatuses.length > 0
          ? Prisma.sql`AND LOWER(COALESCE(q.status, '')) IN (${Prisma.join(currentSchemaStatuses)})`
          : Prisma.empty
        const dateCondition = (filters.dateFrom || filters.dateTo)
          ? Prisma.sql`
              AND q."createdAt" >= ${filters.dateFrom || new Date('1970-01-01T00:00:00.000Z')}
              AND q."createdAt" <= ${filters.dateTo || new Date('2999-12-31T23:59:59.999Z')}
            `
          : Prisma.empty

        const quotes = await prisma.$queryRaw<Array<any>>`
          SELECT
            q.id,
            q."quoteNumber",
            q.status,
            q.total,
            q."totalHT",
            q."tvaAmount",
            q."validUntil",
            q.notes,
            q."createdAt",
            q."updatedAt",
            q."clientId",
            c.id AS "clientRecordId",
            c.name AS "clientName",
            c.email AS "clientEmail",
            c."createdAt" AS "clientCreatedAt",
            c."updatedAt" AS "clientUpdatedAt",
            o.id AS "orderId",
            o."orderNumber" AS "orderNumber"
          FROM "Quote" q
          LEFT JOIN "Client" c ON c.id = q."clientId"
          LEFT JOIN "Order" o ON o."quoteId" = q.id
          WHERE q."userId" = ${companyId}
          ${clientCondition}
          ${statusCondition}
          ${dateCondition}
          ${searchCondition}
          ORDER BY q."createdAt" DESC
          LIMIT ${safeLimit}
          OFFSET ${skip}
        `

        const totalRows = await prisma.$queryRaw<Array<{ count: bigint | number | string }>>`
          SELECT COUNT(*) AS count
          FROM "Quote" q
          LEFT JOIN "Client" c ON c.id = q."clientId"
          WHERE q."userId" = ${companyId}
          ${clientCondition}
          ${statusCondition}
          ${dateCondition}
          ${searchCondition}
        `

        const total = Number(totalRows[0]?.count || 0)
        const normalizeStatus = (value: string | null | undefined): QuoteStatusValue => {
          const raw = String(value || '').toLowerCase()
          if (['accepted', 'confirmed'].includes(raw)) return 'ACCEPTED'
          if (raw === 'sent') return 'SENT'
          if (raw === 'rejected') return 'REJECTED'
          if (raw === 'expired') return 'EXPIRED'
          return 'DRAFT'
        }

        return {
          data: quotes.map((quote) => ({
            id: quote.id,
            number: quote.quoteNumber,
            status: normalizeStatus(quote.status),
            quoteDate: quote.createdAt,
            validUntil: quote.validUntil,
            notes: quote.notes,
            subtotal: Number(quote.totalHT ?? quote.total ?? 0),
            taxAmount: Number(quote.tvaAmount ?? 0),
            total: Number(quote.total ?? 0),
            discount: 0,
            client: quote.clientRecordId ? {
              id: quote.clientRecordId,
              firstName: '',
              lastName: '',
              companyName: quote.clientName,
              email: quote.clientEmail,
            } : undefined,
            items: [],
            createdBy: {
              firstName: 'Système',
              lastName: '',
            },
            order: quote.orderId ? {
              id: quote.orderId,
              number: quote.orderNumber,
            } : undefined,
          })) as Quote[],
          pagination: {
            page: safePage,
            limit: safeLimit,
            total,
            totalPages: Math.ceil(total / safeLimit),
          },
        }
      } catch (currentSchemaError) {
        logger.warn('Fallback devis : schéma PostgreSQL actuel non accessible via SQL brut', { error: currentSchemaError, companyId })
      }

      // Construire les conditions de filtrage
      const where: Prisma.QuoteWhereInput = {
        companyId,
        ...(filters.clientId && { clientId: filters.clientId }),
        ...(filters.status && { status: filters.status }),
        ...(filters.dateFrom && { quoteDate: { gte: filters.dateFrom } }),
        ...(filters.dateTo && { quoteDate: { lte: filters.dateTo } }),
        ...(filters.search && {
          OR: [
            { number: { contains: filters.search, mode: 'insensitive' } },
            { notes: { contains: filters.search, mode: 'insensitive' } },
            { client: { 
              OR: [
                { firstName: { contains: filters.search, mode: 'insensitive' } },
                { lastName: { contains: filters.search, mode: 'insensitive' } },
                { companyName: { contains: filters.search, mode: 'insensitive' } },
              ]
            }},
          ],
        }),
      }

      const [quotes, total] = await Promise.all([
        prisma.quote.findMany({
          where,
          include: {
            items: {
              include: {
                product: true,
              },
            },
            client: true,
          },
          orderBy: { quoteDate: 'desc' },
          skip,
          take: safeLimit,
        }),
        prisma.quote.count({ where }),
      ])

      return {
        data: quotes,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages: Math.ceil(total / safeLimit),
        },
      }
    } catch (error) {
      logger.error('Erreur lors de la récupération des devis', { error, companyId, filters })
      throw error
    }
  }

  /**
   * Mettre à jour un devis
   */
  static async updateQuote(id: string, data: UpdateQuoteData, companyId: string): Promise<Quote> {
    try {
      logger.info('Mise à jour du devis', { id, data, companyId })

      // Vérifier que le devis existe
      const existingQuote = await prisma.quote.findFirst({
        where: { id, companyId },
        include: { items: true },
      })

      if (!existingQuote) {
        throw new Error('Devis non trouvé')
      }

      // Vérifier que le devis peut être modifié
      if (existingQuote.status === 'ACCEPTED' || existingQuote.status === 'EXPIRED') {
        throw new Error('Ce devis ne peut plus être modifié')
      }

      let updateData: any = {
        ...(data.quoteDate && { quoteDate: data.quoteDate }),
        ...(data.validUntil && { validUntil: data.validUntil }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.discount !== undefined && { discount: data.discount }),
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

        const quoteItems = data.items.map(item => {
          const product = products.find(p => p.id === item.productId)!
          const itemDiscount = item.discount || 0
          const discountedPrice = item.unitPrice * (1 - itemDiscount / 100)
          const itemTotal = discountedPrice * item.quantity
          const itemTax = itemTotal * (product.vatRate.toNumber() / 100)
          
          subtotal += itemTotal
          taxAmount += itemTax

          return {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: itemDiscount,
            total: itemTotal,
          }
        })

        // Appliquer la remise globale
        const globalDiscount = data.discount || existingQuote.discount.toNumber()
        subtotal = subtotal * (1 - globalDiscount / 100)
        taxAmount = taxAmount * (1 - globalDiscount / 100)
        const total = subtotal + taxAmount

        updateData = {
          ...updateData,
          subtotal,
          taxAmount,
          total,
        }

        // Supprimer les anciens articles et créer les nouveaux
        await prisma.quoteItem.deleteMany({
          where: { quoteId: id },
        })

        updateData.items = {
          create: quoteItems,
        }
      }

      const updatedQuote = await prisma.quote.update({
        where: { id },
        data: updateData,
        include: {
          items: {
            include: {
              product: true,
            },
          },
          client: true,
        },
      })

      logger.info('Devis mis à jour avec succès', { quoteId: id })
      return updatedQuote
    } catch (error) {
      logger.error('Erreur lors de la mise à jour du devis', { error, id, data })
      throw error
    }
  }

  /**
   * Changer le statut d'un devis
   */
  static async updateQuoteStatus(id: string, status: QuoteStatusValue, companyId: string): Promise<Quote> {
    try {
      logger.info('Changement de statut du devis', { id, status, companyId })

      const existingQuote = await prisma.quote.findFirst({
        where: { id, companyId },
      })

      if (!existingQuote) {
        throw new Error('Devis non trouvé')
      }

      // Vérifier les transitions de statut autorisées
      if (existingQuote.status === 'ACCEPTED' && status !== 'ACCEPTED') {
        throw new Error('Un devis accepté ne peut pas changer de statut')
      }

      if (existingQuote.status === 'EXPIRED' && status !== 'EXPIRED') {
        throw new Error('Un devis expiré ne peut pas changer de statut')
      }

      const updatedQuote = await prisma.quote.update({
        where: { id },
        data: { status },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          client: true,
        },
      })

      // Logger l'audit
      await AuditLogService.logQuoteAction(
        AuditAction.QUOTE_STATUS_CHANGED,
        id,
        updatedQuote,
        existingQuote,
        undefined,
        undefined,
        companyId,
        { previousStatus: existingQuote.status, newStatus: status }
      )

      logger.info('Statut du devis mis à jour', { quoteId: id, newStatus: status })
      return updatedQuote
    } catch (error) {
      logger.error('Erreur lors du changement de statut du devis', { error, id, status })
      throw error
    }
  }

  /**
   * Convertir un devis en commande
   */
  static async convertQuoteToOrder(id: string, companyId: string, userId: string): Promise<Order> {
    try {
      logger.info('Conversion du devis en commande', { id, companyId, userId })

      const quote = await prisma.quote.findFirst({
        where: { id, companyId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          client: true,
        },
      })

      if (!quote) {
        throw new Error('Devis non trouvé')
      }

      if (quote.status !== 'ACCEPTED') {
        throw new Error('Seuls les devis acceptés peuvent être convertis en commande')
      }

      if (quote.order) {
        throw new Error('Ce devis a déjà été converti en commande')
      }

      // Générer le numéro de commande
      const orderNumber = await this.generateOrderNumber(companyId)

      // Créer la commande
      const order = await prisma.order.create({
        data: {
          number: orderNumber,
          type: 'ORDER',
          status: 'CONFIRMED',
          orderDate: new Date(),
          notes: quote.notes,
          subtotal: quote.subtotal.toNumber(),
          taxAmount: quote.taxAmount.toNumber(),
          total: quote.total.toNumber(),
          clientId: quote.clientId,
          companyId,
          createdById: userId,
          quoteId: quote.id,
          items: {
            create: quote.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice.toNumber(),
              total: item.total.toNumber(),
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          client: true,
        },
      })

      logger.info('Devis converti en commande avec succès', {
        quoteId: id,
        orderId: order.id,
        orderNumber: order.number
      })

      return order
    } catch (error) {
      logger.error('Erreur lors de la conversion du devis en commande', { error, id })
      throw error
    }
  }

  /**
   * Supprimer un devis
   */
  static async deleteQuote(id: string, companyId: string): Promise<void> {
    try {
      logger.info('Suppression du devis', { id, companyId })

      const existingQuote = await prisma.quote.findFirst({
        where: { id, companyId },
      })

      if (!existingQuote) {
        throw new Error('Devis non trouvé')
      }

      if (existingQuote.status === 'ACCEPTED') {
        throw new Error('Un devis accepté ne peut pas être supprimé')
      }

      await prisma.quote.delete({
        where: { id },
      })

      logger.info('Devis supprimé avec succès', { quoteId: id })
    } catch (error) {
      logger.error('Erreur lors de la suppression du devis', { error, id })
      throw error
    }
  }

  /**
   * Générer un numéro de devis unique selon les standards algériens
   */
  private static async generateQuoteNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `DEV-${year}-`

    const lastQuote = await prisma.quote.findFirst({
      where: {
        companyId,
        number: { startsWith: prefix },
      },
      orderBy: { number: 'desc' },
    })

    let lastNumber = 0
    if (lastQuote) {
      const numberParts = lastQuote.number.split('-')
      lastNumber = parseInt(numberParts[numberParts.length - 1] || '0')
    }

    return AlgeriaConfigService.generateDocumentNumber('QUOTE', lastNumber, year)
  }

  /**
   * Générer un numéro de commande unique avec protection contre les doublons
   */
  private static async generateOrderNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `CMD-${year}-`

    // Trouver le dernier numéro existant pour ce préfixe
    const lastOrder = await prisma.order.findFirst({
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

    // Générer le numéro avec retry en cas de conflit
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      const candidateNumber = `${prefix}${nextNumber.toString().padStart(4, '0')}`

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
    return `${prefix}${timestamp}`
  }
}
