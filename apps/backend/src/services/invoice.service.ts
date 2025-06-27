import { prisma, Prisma, Invoice, InvoiceType, InvoiceStatus, InvoiceItem } from '@gestion/database'
import { PaginationParams, PaginationResponse } from '@gestion/shared'
import { logger } from '../utils/logger'
import { StockSyncService } from './stock-sync.service'

export interface CreateInvoiceData {
  type: InvoiceType
  clientId: string
  orderId?: string
  invoiceDate?: Date
  dueDate?: Date
  notes?: string
  paymentMethod?: string
  items: CreateInvoiceItemData[]
}

export interface CreateInvoiceItemData {
  productId: string
  quantity: number
  unitPrice: number
  vatRate: number
  discount?: number
}

export interface UpdateInvoiceData extends Partial<Omit<CreateInvoiceData, 'items'>> {
  items?: CreateInvoiceItemData[]
}

export interface InvoiceFilters {
  search?: string
  clientId?: string
  type?: InvoiceType
  status?: InvoiceStatus
  dateFrom?: Date
  dateTo?: Date
  dueDateFrom?: Date
  dueDateTo?: Date
}

export class InvoiceService {
  /**
   * Créer une nouvelle facture
   */
  static async createInvoice(data: CreateInvoiceData, companyId: string): Promise<Invoice> {
    try {
      logger.info('Création d\'une nouvelle facture', { data, companyId })

      // Vérifier que le client existe et appartient à l'entreprise
      const client = await prisma.client.findFirst({
        where: { id: data.clientId, companyId },
      })

      if (!client) {
        throw new Error('Client non trouvé')
      }

      // Si une commande est spécifiée, vérifier qu'elle existe
      if (data.orderId) {
        const order = await prisma.order.findFirst({
          where: { id: data.orderId, companyId },
        })

        if (!order) {
          throw new Error('Commande non trouvée')
        }
      }

      // Vérifier que tous les produits existent
      const productIds = data.items.map(item => item.productId)
      const products = await prisma.product.findMany({
        where: { id: { in: productIds }, companyId },
      })

      if (products.length !== productIds.length) {
        throw new Error('Un ou plusieurs produits non trouvés')
      }

      // Générer le numéro de facture
      const invoiceNumber = await this.generateInvoiceNumber(data.type, companyId)

      // Calculer les montants
      const { subtotal, vatAmount, total } = this.calculateInvoiceAmounts(data.items)

      // Calculer la date d'échéance si non fournie
      const dueDate = data.dueDate || new Date(Date.now() + (client.paymentTerms || 30) * 24 * 60 * 60 * 1000)

      // Créer la facture avec ses items
      const invoice = await prisma.invoice.create({
        data: {
          number: invoiceNumber,
          type: data.type,
          status: InvoiceStatus.DRAFT,
          clientId: data.clientId,
          orderId: data.orderId,
          companyId,
          invoiceDate: data.invoiceDate || new Date(),
          dueDate,
          subtotal,
          vatAmount,
          total,
          paidAmount: 0,
          discount: 0,
          notes: data.notes,
          paymentMethod: data.paymentMethod,
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
          order: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      })

      logger.info('Facture créée avec succès', { invoiceId: invoice.id, invoiceNumber })

      // Si la facture est de type SALE et confirmée, synchroniser le stock automatiquement
      if (data.type === 'SALE') {
        try {
          await StockSyncService.syncStockOnInvoiceCreation(invoice.id, companyId)
          logger.info('Stock synchronisé pour la facture', { invoiceId: invoice.id })
        } catch (stockError) {
          logger.warn('Erreur lors de la synchronisation stock', { stockError, invoiceId: invoice.id })
          // Ne pas faire échouer la création de facture pour les erreurs de stock
        }
      }

      return invoice
    } catch (error) {
      logger.error('Erreur lors de la création de la facture', { error, data })
      throw error
    }
  }

  /**
   * Créer une facture depuis une commande
   */
  static async createInvoiceFromOrder(orderId: string, companyId: string): Promise<Invoice> {
    try {
      logger.info('Création facture depuis commande', { orderId, companyId })

      // Récupérer la commande avec ses items
      const order = await prisma.order.findFirst({
        where: { id: orderId, companyId },
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

      // Créer les données de facture basées sur la commande
      const invoiceData: CreateInvoiceData = {
        type: InvoiceType.INVOICE,
        clientId: order.clientId,
        orderId: order.id,
        notes: order.notes,
        items: order.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          vatRate: Number(item.vatRate),
          discount: Number(item.discount),
        })),
      }

      const invoice = await this.createInvoice(invoiceData, companyId)

      logger.info('Facture créée depuis commande', { orderId, invoiceId: invoice.id })
      return invoice
    } catch (error) {
      logger.error('Erreur lors de la création facture depuis commande', { error, orderId })
      throw error
    }
  }

  /**
   * Récupérer une facture par ID
   */
  static async getInvoiceById(id: string, companyId: string): Promise<Invoice | null> {
    try {
      const invoice = await prisma.invoice.findFirst({
        where: { id, companyId },
        include: {
          client: true,
          order: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      })

      return invoice
    } catch (error) {
      logger.error('Erreur lors de la récupération de la facture', { error, invoiceId: id })
      throw error
    }
  }

  /**
   * Récupérer la liste des factures avec filtres et pagination
   */
  static async getInvoices(
    companyId: string,
    filters: InvoiceFilters = {},
    pagination?: PaginationParams
  ): Promise<PaginationResponse<Invoice>> {
    try {
      const { page = 1, limit = 10 } = pagination || {};
      const { search, clientId, type, status, dateFrom, dateTo, dueDateFrom, dueDateTo } = filters

      // Construction de la clause WHERE
      const where: Prisma.InvoiceWhereInput = {
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
        where.invoiceDate = {}
        if (dateFrom) {
          where.invoiceDate.gte = dateFrom
        }
        if (dateTo) {
          where.invoiceDate.lte = dateTo
        }
      }

      if (dueDateFrom || dueDateTo) {
        where.dueDate = {}
        if (dueDateFrom) {
          where.dueDate.gte = dueDateFrom
        }
        if (dueDateTo) {
          where.dueDate.lte = dueDateTo
        }
      }

      const skip = pagination ? (page - 1) * limit : undefined;
      const take = pagination ? limit : undefined;

      const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
          include: {
            client: true,
            order: {
              select: {
                id: true,
                number: true,
              },
            },
          },
        }),
        prisma.invoice.count({ where }),
      ])

      const totalPages = pagination ? Math.ceil(total / limit) : 1;

      return {
        data: invoices,
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
      logger.error('Erreur lors de la récupération des factures', { error, filters })
      throw error
    }
  }

  /**
   * Calculer les montants d'une facture
   */
  private static calculateInvoiceAmounts(items: CreateInvoiceItemData[]) {
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
   * Mettre à jour une facture
   */
  static async updateInvoice(id: string, data: UpdateInvoiceData, companyId: string): Promise<Invoice> {
    try {
      logger.info('Mise à jour de la facture', { invoiceId: id, data, companyId })

      const existingInvoice = await this.getInvoiceById(id, companyId)
      if (!existingInvoice) {
        throw new Error('Facture non trouvée')
      }

      const updateData: any = { ...data }

      // Si des items sont fournis, recalculer les montants
      if (data.items) {
        const { subtotal, vatAmount, total } = this.calculateInvoiceAmounts(data.items)
        updateData.subtotal = subtotal
        updateData.vatAmount = vatAmount
        updateData.total = total

        // Supprimer les anciens items et créer les nouveaux
        await prisma.invoiceItem.deleteMany({
          where: { invoiceId: id },
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

      const updatedInvoice = await prisma.invoice.update({
        where: { id },
        data: updateData,
        include: {
          client: true,
          order: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      })

      logger.info('Facture mise à jour avec succès', { invoiceId: id })
      return updatedInvoice
    } catch (error) {
      logger.error('Erreur lors de la mise à jour de la facture', { error, invoiceId: id })
      throw error
    }
  }

  /**
   * Enregistrer un paiement sur une facture
   */
  static async recordPayment(
    id: string,
    amount: number,
    paymentDate: Date,
    paymentMethod: string,
    companyId: string
  ): Promise<Invoice> {
    try {
      logger.info('Enregistrement paiement facture', { invoiceId: id, amount, companyId })

      const invoice = await this.getInvoiceById(id, companyId)
      if (!invoice) {
        throw new Error('Facture non trouvée')
      }

      const newPaidAmount = Number(invoice.paidAmount) + amount
      const total = Number(invoice.total)

      // Déterminer le nouveau statut
      let newStatus: InvoiceStatus
      if (newPaidAmount >= total) {
        newStatus = InvoiceStatus.PAID
      } else if (newPaidAmount > 0) {
        newStatus = InvoiceStatus.PARTIAL
      } else {
        newStatus = invoice.status
      }

      const updatedInvoice = await prisma.invoice.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          paidDate: newPaidAmount >= total ? paymentDate : invoice.paidDate,
          status: newStatus,
          paymentMethod,
        },
        include: {
          client: true,
          order: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      })

      logger.info('Paiement enregistré avec succès', { invoiceId: id, newStatus })
      return updatedInvoice
    } catch (error) {
      logger.error('Erreur lors de l\'enregistrement du paiement', { error, invoiceId: id })
      throw error
    }
  }

  /**
   * Changer le statut d'une facture
   */
  static async updateInvoiceStatus(id: string, status: InvoiceStatus, companyId: string): Promise<Invoice> {
    try {
      logger.info('Changement de statut de facture', { invoiceId: id, status, companyId })

      const invoice = await this.getInvoiceById(id, companyId)
      if (!invoice) {
        throw new Error('Facture non trouvée')
      }

      const updatedInvoice = await prisma.invoice.update({
        where: { id },
        data: { status },
        include: {
          client: true,
          order: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      })

      logger.info('Statut de facture mis à jour', { invoiceId: id, newStatus: status })
      return updatedInvoice
    } catch (error) {
      logger.error('Erreur lors du changement de statut', { error, invoiceId: id })
      throw error
    }
  }

  /**
   * Supprimer une facture
   */
  static async deleteInvoice(id: string, companyId: string): Promise<void> {
    try {
      logger.info('Suppression de la facture', { invoiceId: id, companyId })

      const invoice = await this.getInvoiceById(id, companyId)
      if (!invoice) {
        throw new Error('Facture non trouvée')
      }

      if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.PARTIAL) {
        throw new Error('Impossible de supprimer une facture payée ou partiellement payée')
      }

      await prisma.invoice.delete({
        where: { id },
      })

      logger.info('Facture supprimée avec succès', { invoiceId: id })
    } catch (error) {
      logger.error('Erreur lors de la suppression de la facture', { error, invoiceId: id })
      throw error
    }
  }

  /**
   * Obtenir les statistiques des factures
   */
  static async getInvoiceStats(companyId: string) {
    try {
      const [
        totalInvoices,
        paidInvoices,
        overdueInvoices,
        draftInvoices,
        totalRevenue,
        pendingRevenue,
      ] = await Promise.all([
        prisma.invoice.count({ where: { companyId, type: InvoiceType.INVOICE } }),
        prisma.invoice.count({
          where: {
            companyId,
            type: InvoiceType.INVOICE,
            status: InvoiceStatus.PAID
          }
        }),
        prisma.invoice.count({
          where: {
            companyId,
            type: InvoiceType.INVOICE,
            status: InvoiceStatus.OVERDUE
          }
        }),
        prisma.invoice.count({
          where: {
            companyId,
            type: InvoiceType.INVOICE,
            status: InvoiceStatus.DRAFT
          }
        }),
        prisma.invoice.aggregate({
          where: {
            companyId,
            type: InvoiceType.INVOICE,
            status: InvoiceStatus.PAID
          },
          _sum: { total: true },
        }).then(result => Number(result._sum.total) || 0),
        prisma.invoice.aggregate({
          where: {
            companyId,
            type: InvoiceType.INVOICE,
            status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIAL] }
          },
          _sum: { total: true },
        }).then(result => Number(result._sum.total) || 0),
      ])

      return {
        totalInvoices,
        paidInvoices,
        overdueInvoices,
        draftInvoices,
        totalRevenue,
        pendingRevenue,
      }
    } catch (error) {
      logger.error('Erreur lors du calcul des statistiques factures', { error })
      throw error
    }
  }

  /**
   * Générer un numéro de facture unique
   */
  private static async generateInvoiceNumber(type: InvoiceType, companyId: string): Promise<string> {
    const prefix = type === InvoiceType.INVOICE ? 'FAC' :
                   type === InvoiceType.CREDIT_NOTE ? 'AVO' : 'PRO'
    const year = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, '0')

    // Compter les factures du même type pour ce mois
    const count = await prisma.invoice.count({
      where: {
        companyId,
        type,
        createdAt: {
          gte: new Date(year, new Date().getMonth(), 1),
          lt: new Date(year, new Date().getMonth() + 1, 1),
        },
      },
    })

    const sequence = String(count + 1).padStart(4, '0')
    return `${prefix}-${year}${month}-${sequence}`
  }

  /**
   * Confirmer une facture et synchroniser le stock
   */
  static async confirmInvoice(invoiceId: string, companyId: string, userId?: string): Promise<Invoice> {
    try {
      logger.info('Confirmation de facture', { invoiceId, companyId })

      // Récupérer la facture
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

      if (invoice.status !== 'DRAFT') {
        throw new Error('Seules les factures en brouillon peuvent être confirmées')
      }

      // Mettre à jour le statut de la facture
      const updatedInvoice = await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'SENT',
          confirmedAt: new Date(),
        },
        include: {
          client: true,
          order: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      })

      // Synchroniser le stock si c'est une facture de vente
      if (invoice.type === 'SALE') {
        try {
          await StockSyncService.syncStockOnInvoiceCreation(invoiceId, companyId, userId)
          logger.info('Stock synchronisé pour la facture confirmée', { invoiceId })
        } catch (stockError) {
          logger.error('Erreur lors de la synchronisation stock', { stockError, invoiceId })
          // Optionnel: annuler la confirmation si la synchronisation échoue
          // throw new Error('Erreur lors de la synchronisation du stock')
        }
      }

      logger.info('Facture confirmée avec succès', { invoiceId })
      return updatedInvoice
    } catch (error) {
      logger.error('Erreur lors de la confirmation de la facture', { error, invoiceId })
      throw error
    }
  }

  /**
   * Annuler une facture et restaurer le stock
   */
  static async cancelInvoice(invoiceId: string, companyId: string, userId?: string): Promise<Invoice> {
    try {
      logger.info('Annulation de facture', { invoiceId, companyId })

      // Récupérer la facture
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

      if (invoice.status === 'CANCELLED') {
        throw new Error('La facture est déjà annulée')
      }

      // Mettre à jour le statut de la facture
      const updatedInvoice = await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
        include: {
          client: true,
          order: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      })

      // Restaurer le stock si c'est une facture de vente confirmée
      if (invoice.type === 'SALE' && invoice.status === 'SENT') {
        try {
          // Créer des mouvements de retour pour restaurer le stock
          const returns = invoice.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            reason: `Annulation facture ${invoice.number}`,
          }))

          await StockSyncService.processCustomerReturn(
            invoiceId,
            returns,
            companyId,
            userId
          )

          logger.info('Stock restauré pour la facture annulée', { invoiceId })
        } catch (stockError) {
          logger.error('Erreur lors de la restauration du stock', { stockError, invoiceId })
        }
      }

      logger.info('Facture annulée avec succès', { invoiceId })
      return updatedInvoice
    } catch (error) {
      logger.error('Erreur lors de l\'annulation de la facture', { error, invoiceId })
      throw error
    }
  }
}


