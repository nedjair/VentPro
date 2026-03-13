// @ts-nocheck
import { Prisma, Payment } from '@gestion/database'
import { prisma as prismaClient } from '../lib/prisma'
import { PaginationParams, PaginationResponse } from '@gestion/shared'
import { logger } from '../utils/logger'

type PaymentMethodValue = 'CASH' | 'CHECK' | 'TRANSFER' | 'CARD' | 'OTHER'
type ReminderStatusValue = 'PENDING' | 'SENT' | 'RESOLVED'
type InvoiceStatusValue = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'ISSUED'
type PaymentReminderRecord = Record<string, any>

// Le schéma Prisma actif est plus minimal que le backend historique.
// On cast localement le client pour conserver les garde-fous runtime sans réintroduire
// de faux modèles/enums dans la base PostgreSQL réelle.
const prisma: any = prismaClient

export interface CreatePaymentData {
  invoiceId: string
  amount: number
  paymentDate?: Date
  paymentMethod: PaymentMethodValue
  reference?: string
  notes?: string
}

export interface PaymentFilters {
  search?: string
  clientId?: string
  invoiceId?: string
  paymentMethod?: PaymentMethodValue
  dateFrom?: Date
  dateTo?: Date
}

export interface ReminderFilters {
  search?: string
  clientId?: string
  status?: ReminderStatusValue
  level?: number
  dateFrom?: Date
  dateTo?: Date
}

export class PaymentService {
  private static hasPaymentReminderModel(): boolean {
    return Boolean(prisma.paymentReminder)
  }

  private static normalizePaymentMethod(method?: string): PaymentMethodValue {
    const normalizedMethod = (method || 'OTHER').toUpperCase() as PaymentMethodValue
    return ['CASH', 'CHECK', 'TRANSFER', 'CARD', 'OTHER'].includes(normalizedMethod)
      ? normalizedMethod
      : 'OTHER'
  }

  private static splitFullName(fullName?: string) {
    const parts = (fullName || '').trim().split(/\s+/).filter(Boolean)
    return {
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' '),
    }
  }

  private static mapLegacyPayment(row: any): any {
    const clientName = this.splitFullName(row.clientName)
    const createdByName = this.splitFullName(row.createdByName)

    return {
      id: row.id,
      amount: Number(row.amount || 0),
      paymentDate: row.paymentDate,
      paymentMethod: this.normalizePaymentMethod(row.paymentMethod),
      reference: row.reference || row.paymentNumber || '',
      notes: row.notes || '',
      invoice: {
        id: row.invoiceId || '',
        number: row.invoiceNumber || '',
        total: Number(row.invoiceTotal || 0),
        paidAmount: Number(row.invoicePaidAmount || 0),
        status: row.invoiceStatus || 'DRAFT',
        dueDate: row.invoiceDueDate,
      },
      client: {
        id: row.clientId || '',
        firstName: clientName.firstName,
        lastName: clientName.lastName,
        companyName: row.clientName || '',
        type: 'COMPANY',
      },
      createdBy: {
        firstName: createdByName.firstName,
        lastName: createdByName.lastName,
      },
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  /**
   * Créer un nouveau paiement
   */
  static async createPayment(data: CreatePaymentData, companyId: string, userId: string): Promise<Payment> {
    try {
      logger.info('Création d\'un nouveau paiement', { data, companyId, userId })

      // Vérifier que la facture existe et appartient à l'entreprise
      const invoice = await prisma.invoice.findFirst({
        where: { id: data.invoiceId, companyId },
        include: {
          payments: true,
        },
      })

      if (!invoice) {
        throw new Error('Facture non trouvée')
      }

      // Calculer le montant déjà payé
      const totalPaid = invoice.payments.reduce((sum, payment) => sum + payment.amount.toNumber(), 0)
      const remainingAmount = invoice.total - totalPaid

      // Vérifier que le montant du paiement ne dépasse pas le montant restant
      if (data.amount > remainingAmount) {
        throw new Error(`Le montant du paiement (${data.amount}) dépasse le montant restant à payer (${remainingAmount})`)
      }

      // Créer le paiement
      const payment = await prisma.payment.create({
        data: {
          amount: data.amount,
          paymentDate: data.paymentDate || new Date(),
          paymentMethod: data.paymentMethod,
          reference: data.reference,
          notes: data.notes,
          invoiceId: data.invoiceId,
          clientId: invoice.clientId,
          companyId,
          createdById: userId,
        },
        include: {
          invoice: true,
          client: true,
        },
      })

      // Mettre à jour le statut de la facture
      const newTotalPaid = totalPaid + data.amount
      let newStatus: InvoiceStatusValue = invoice.status

      if (newTotalPaid >= invoice.total) {
        newStatus = 'PAID'
      } else if (newTotalPaid > 0) {
        // Créer un nouveau statut pour "partiellement payé" si nécessaire
        // Pour l'instant, on garde le statut existant
      }

      // Mettre à jour le montant payé et le statut de la facture
      await prisma.invoice.update({
        where: { id: data.invoiceId },
        data: {
          paidAmount: newTotalPaid,
          status: newStatus,
          paidDate: newStatus === 'PAID' ? new Date() : null,
        },
      })

      logger.info('Paiement créé avec succès', { paymentId: payment.id, invoiceId: data.invoiceId })
      return payment
    } catch (error) {
      logger.error('Erreur lors de la création du paiement', { error, data, companyId })
      throw error
    }
  }

  /**
   * Obtenir un paiement par ID
   */
  static async getPaymentById(id: string, companyId: string): Promise<Payment | null> {
    try {
      const payment = await prisma.payment.findFirst({
        where: { id, companyId },
        include: {
          invoice: true,
          client: true,
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

      return payment
    } catch (error) {
      logger.error('Erreur lors de la récupération du paiement', { error, id, companyId })
      throw error
    }
  }

  /**
   * Lister les paiements avec pagination et filtres
   */
  static async getPayments(
    companyId: string,
    pagination: PaginationParams,
    filters: PaymentFilters = {}
  ): Promise<PaginationResponse<Payment>> {
    try {
      const { page = 1, limit = 10 } = pagination
      const skip = (page - 1) * limit

      // Construire les conditions de filtrage
      const where: any = {
        companyId,
        ...(filters.clientId && { clientId: filters.clientId }),
        ...(filters.invoiceId && { invoiceId: filters.invoiceId }),
        ...(filters.paymentMethod && { paymentMethod: filters.paymentMethod }),
        ...(filters.dateFrom && { paymentDate: { gte: filters.dateFrom } }),
        ...(filters.dateTo && { paymentDate: { lte: filters.dateTo } }),
        ...(filters.search && {
          OR: [
            { reference: { contains: filters.search, mode: 'insensitive' } },
            { notes: { contains: filters.search, mode: 'insensitive' } },
            { invoice: { number: { contains: filters.search, mode: 'insensitive' } } },
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

      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where,
          include: {
            invoice: true,
            client: true,
          },
          orderBy: { paymentDate: 'desc' },
          skip,
          take: limit,
        }),
        prisma.payment.count({ where }),
      ])

      return {
        data: payments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }
    } catch (error) {
      logger.warn('Fallback SQL legacy pour la récupération des paiements', {
        error: error instanceof Error ? error.message : error,
        companyId,
        filters,
      })

      const { page = 1, limit = 10 } = pagination
      const skip = (page - 1) * limit
      const conditions: string[] = ['p."userId" = $1']
      const params: any[] = [companyId]

      if (filters.clientId) {
        params.push(filters.clientId)
        conditions.push(`i."clientId" = $${params.length}`)
      }

      if (filters.invoiceId) {
        params.push(filters.invoiceId)
        conditions.push(`p."invoiceId" = $${params.length}`)
      }

      if (filters.paymentMethod) {
        params.push(filters.paymentMethod)
        conditions.push(`UPPER(COALESCE(p."paymentMethod", 'OTHER')) = UPPER($${params.length})`)
      }

      if (filters.dateFrom) {
        params.push(filters.dateFrom)
        conditions.push(`p."paymentDate" >= $${params.length}`)
      }

      if (filters.dateTo) {
        params.push(filters.dateTo)
        conditions.push(`p."paymentDate" <= $${params.length}`)
      }

      if (filters.search) {
        params.push(`%${filters.search}%`)
        const searchIndex = params.length
        conditions.push(`(
          COALESCE(p."paymentNumber", '') ILIKE $${searchIndex}
          OR COALESCE(p.reference, '') ILIKE $${searchIndex}
          OR COALESCE(p.notes, '') ILIKE $${searchIndex}
          OR COALESCE(i."invoiceNumber", '') ILIKE $${searchIndex}
          OR COALESCE(c.name, '') ILIKE $${searchIndex}
        )`)
      }

      params.push(limit)
      const limitIndex = params.length
      params.push(skip)
      const offsetIndex = params.length

      const rows = await prisma.$queryRawUnsafe<any[]>(`
        SELECT
          p.id,
          p.amount,
          p."paymentDate" AS "paymentDate",
          p."paymentMethod" AS "paymentMethod",
          p.reference,
          p.notes,
          p."paymentNumber" AS "paymentNumber",
          p."createdAt" AS "createdAt",
          p."updatedAt" AS "updatedAt",
          p."invoiceId" AS "invoiceId",
          i."invoiceNumber" AS "invoiceNumber",
          COALESCE(i.total, i."totalTTC", 0) AS "invoiceTotal",
          i.status AS "invoiceStatus",
          i."dueDate" AS "invoiceDueDate",
          i."clientId" AS "clientId",
          COALESCE((
            SELECT SUM(p2.amount)
            FROM "Payment" p2
            WHERE p2."invoiceId" = p."invoiceId"
          ), 0) AS "invoicePaidAmount",
          c.name AS "clientName",
          u."fullName" AS "createdByName",
          COUNT(*) OVER()::int AS "__total"
        FROM "Payment" p
        LEFT JOIN "Invoice" i ON i.id = p."invoiceId"
        LEFT JOIN "Client" c ON c.id = i."clientId"
        LEFT JOIN "User" u ON u.id = p."userId"
        WHERE ${conditions.join(' AND ')}
        ORDER BY p."paymentDate" DESC, p."createdAt" DESC
        LIMIT $${limitIndex} OFFSET $${offsetIndex}
      `, ...params)

      const total = rows[0]?.__total || 0

      return {
        data: rows.map((row) => this.mapLegacyPayment(row)) as Payment[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }
    }
  }

  /**
   * Obtenir les paiements d'une facture
   */
  static async getPaymentsByInvoice(invoiceId: string, companyId: string): Promise<Payment[]> {
    try {
      const payments = await prisma.payment.findMany({
        where: { invoiceId, companyId },
        include: {
          client: true,
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
      })

      return payments
    } catch (error) {
      logger.error('Erreur lors de la récupération des paiements de la facture', { error, invoiceId, companyId })
      throw error
    }
  }

  /**
   * Obtenir les paiements d'un client
   */
  static async getPaymentsByClient(clientId: string, companyId: string): Promise<Payment[]> {
    try {
      const payments = await prisma.payment.findMany({
        where: { clientId, companyId },
        include: {
          invoice: true,
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
      })

      return payments
    } catch (error) {
      logger.error('Erreur lors de la récupération des paiements du client', { error, clientId, companyId })
      throw error
    }
  }

  /**
   * Mettre à jour un paiement
   */
  static async updatePayment(id: string, data: Partial<CreatePaymentData>, companyId: string): Promise<Payment> {
    try {
      logger.info('Mise à jour du paiement', { id, data, companyId })

      const existingPayment = await prisma.payment.findFirst({
        where: { id, companyId },
        include: { invoice: { include: { payments: true } } },
      })

      if (!existingPayment) {
        throw new Error('Paiement non trouvé')
      }

      // Si le montant change, vérifier la cohérence
      if (data.amount && data.amount !== existingPayment.amount.toNumber()) {
        const otherPayments = existingPayment.invoice.payments.filter(p => p.id !== id)
        const otherPaymentsTotal = otherPayments.reduce((sum, payment) => sum + payment.amount.toNumber(), 0)
        const remainingAmount = existingPayment.invoice.total - otherPaymentsTotal

        if (data.amount > remainingAmount) {
          throw new Error(`Le nouveau montant du paiement (${data.amount}) dépasse le montant restant à payer (${remainingAmount})`)
        }
      }

      const updatedPayment = await prisma.payment.update({
        where: { id },
        data: {
          ...(data.amount !== undefined && { amount: data.amount }),
          ...(data.paymentDate && { paymentDate: data.paymentDate }),
          ...(data.paymentMethod && { paymentMethod: data.paymentMethod }),
          ...(data.reference !== undefined && { reference: data.reference }),
          ...(data.notes !== undefined && { notes: data.notes }),
        },
        include: {
          invoice: true,
          client: true,
        },
      })

      // Recalculer le statut de la facture si le montant a changé
      if (data.amount !== undefined) {
        await this.updateInvoiceStatus(existingPayment.invoiceId, companyId)
      }

      logger.info('Paiement mis à jour avec succès', { paymentId: id })
      return updatedPayment
    } catch (error) {
      logger.error('Erreur lors de la mise à jour du paiement', { error, id, data })
      throw error
    }
  }

  /**
   * Supprimer un paiement
   */
  static async deletePayment(id: string, companyId: string): Promise<void> {
    try {
      logger.info('Suppression du paiement', { id, companyId })

      const existingPayment = await prisma.payment.findFirst({
        where: { id, companyId },
      })

      if (!existingPayment) {
        throw new Error('Paiement non trouvé')
      }

      await prisma.payment.delete({
        where: { id },
      })

      // Recalculer le statut de la facture
      await this.updateInvoiceStatus(existingPayment.invoiceId, companyId)

      logger.info('Paiement supprimé avec succès', { paymentId: id })
    } catch (error) {
      logger.error('Erreur lors de la suppression du paiement', { error, id })
      throw error
    }
  }

  /**
   * Générer des relances de paiement automatiques
   */
  static async generatePaymentReminders(companyId: string, userId?: string): Promise<PaymentReminderRecord[]> {
    try {
      logger.info('Génération des relances de paiement', { companyId })

      if (!this.hasPaymentReminderModel()) {
        logger.warn('Table PaymentReminder absente du schéma actif : aucune relance générée', { companyId })
        return []
      }

      // Trouver les factures impayées ou partiellement payées
      const overdueInvoices = await prisma.invoice.findMany({
        where: {
          companyId,
          status: { in: ['SENT', 'OVERDUE'] },
          dueDate: { lt: new Date() },
          OR: [
            { paidAmount: 0 },
            { paidAmount: { lt: prisma.invoice.fields.total } },
          ],
        },
        include: {
          client: true,
          payments: true,
          paymentReminders: {
            orderBy: { level: 'desc' },
            take: 1,
          },
        },
      })

      const reminders: PaymentReminderRecord[] = []

      for (const invoice of overdueInvoices) {
        const daysOverdue = Math.floor(
          (new Date().getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)
        )

        // Déterminer le niveau de relance
        let reminderLevel = 1
        if (daysOverdue > 30) reminderLevel = 3
        else if (daysOverdue > 15) reminderLevel = 2

        // Vérifier si une relance de ce niveau existe déjà
        const lastReminder = invoice.paymentReminders[0]
        if (lastReminder && lastReminder.level >= reminderLevel) {
          continue // Pas besoin de nouvelle relance
        }

        const dueAmount = invoice.total - invoice.paidAmount

        const reminder = await prisma.paymentReminder.create({
          data: {
            level: reminderLevel,
            dueAmount,
            status: 'PENDING',
            invoiceId: invoice.id,
            clientId: invoice.clientId,
            companyId,
            createdById: userId,
          },
          include: {
            invoice: true,
            client: true,
          },
        })

        reminders.push(reminder)
      }

      logger.info('Relances de paiement générées', { count: reminders.length, companyId })
      return reminders
    } catch (error) {
      logger.error('Erreur lors de la génération des relances', { error, companyId })
      throw error
    }
  }

  /**
   * Lister les relances de paiement
   */
  static async getPaymentReminders(
    companyId: string,
    pagination: PaginationParams,
    filters: ReminderFilters = {}
  ): Promise<PaginationResponse<PaymentReminderRecord>> {
    try {
      if (!this.hasPaymentReminderModel()) {
        logger.warn('Table PaymentReminder absente du schéma actif : retour d\'une liste vide', { companyId })
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

      const where: any = {
        companyId,
        ...(filters.clientId && { clientId: filters.clientId }),
        ...(filters.status && { status: filters.status }),
        ...(filters.level && { level: filters.level }),
        ...(filters.dateFrom && { createdAt: { gte: filters.dateFrom } }),
        ...(filters.dateTo && { createdAt: { lte: filters.dateTo } }),
        ...(filters.search && {
          OR: [
            { notes: { contains: filters.search, mode: 'insensitive' } },
            { invoice: { number: { contains: filters.search, mode: 'insensitive' } } },
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

      const [reminders, total] = await Promise.all([
        prisma.paymentReminder.findMany({
          where,
          include: {
            invoice: true,
            client: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.paymentReminder.count({ where }),
      ])

      return {
        data: reminders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }
    } catch (error) {
      logger.error('Erreur lors de la récupération des relances', { error, companyId, filters })
      throw error
    }
  }

  /**
   * Marquer une relance comme envoyée
   */
  static async markReminderAsSent(id: string, companyId: string): Promise<PaymentReminderRecord> {
    try {
      logger.info('Marquage de la relance comme envoyée', { id, companyId })

      if (!this.hasPaymentReminderModel()) {
        throw new Error('Le module de relances n\'est pas disponible sur le schéma Prisma actif')
      }

      const reminder = await prisma.paymentReminder.findFirst({
        where: { id, companyId },
      })

      if (!reminder) {
        throw new Error('Relance non trouvée')
      }

      const updatedReminder = await prisma.paymentReminder.update({
        where: { id },
        data: {
          status: 'SENT',
          sentDate: new Date(),
        },
        include: {
          invoice: true,
          client: true,
        },
      })

      logger.info('Relance marquée comme envoyée', { reminderId: id })
      return updatedReminder
    } catch (error) {
      logger.error('Erreur lors du marquage de la relance', { error, id })
      throw error
    }
  }

  /**
   * Mettre à jour le statut d'une facture en fonction des paiements
   */
  private static async updateInvoiceStatus(invoiceId: string, companyId: string): Promise<void> {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
      include: { payments: true },
    })

    if (!invoice) return

    const totalPaid = invoice.payments.reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0)
    let newStatus: InvoiceStatusValue = invoice.status

    if (totalPaid >= invoice.total) {
      newStatus = 'PAID'
    } else if (totalPaid > 0) {
      // Garder le statut existant pour les paiements partiels
      if (invoice.status === 'PAID') {
        newStatus = 'SENT' // Revenir à "envoyée" si plus complètement payée
      }
    } else {
      // Aucun paiement
      if (invoice.status === 'PAID') {
        newStatus = 'SENT'
      }
    }

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: totalPaid,
        status: newStatus,
        paidDate: newStatus === 'PAID' ? new Date() : null,
      },
    })
  }

  /**
   * Obtenir les statistiques des paiements
   */
  static async getPaymentStats(companyId: string) {
    try {
      logger.info('Récupération des statistiques de paiements', { companyId })

      // Statistiques générales
      const totalPayments = await prisma.payment.count({
        where: { invoice: { companyId } }
      })

      const totalAmount = await prisma.payment.aggregate({
        where: { invoice: { companyId } },
        _sum: { amount: true }
      })

      const averageAmount = await prisma.payment.aggregate({
        where: { invoice: { companyId } },
        _avg: { amount: true }
      })

      // Montant mensuel (mois actuel)
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      const monthlyAmount = await prisma.payment.aggregate({
        where: {
          invoice: { companyId },
          paymentDate: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        },
        _sum: { amount: true }
      })

      const monthlyCount = await prisma.payment.count({
        where: {
          invoice: { companyId },
          paymentDate: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      })

      // Paiements en attente (factures non entièrement payées)
      const pendingInvoices = await prisma.invoice.findMany({
        where: {
          companyId,
          status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] }
        },
        include: {
          payments: true
        }
      })

      let pendingAmount = 0
      let overdueCount = 0
      const today = new Date()

      for (const invoice of pendingInvoices) {
        const totalPaid = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0)
        const remaining = invoice.totalAmount - totalPaid
        pendingAmount += remaining

        // Vérifier si en retard (date d'échéance dépassée)
        if (invoice.dueDate && invoice.dueDate < today) {
          overdueCount++
        }
      }

      // Répartition par méthode de paiement
      const paymentsByMethod = await prisma.payment.groupBy({
        by: ['paymentMethod'],
        where: { invoice: { companyId } },
        _sum: { amount: true },
        _count: { id: true }
      })

      const methodDistribution = paymentsByMethod.map(item => ({
        method: item.paymentMethod,
        amount: item._sum.amount || 0,
        count: item._count.id
      }))

      return {
        totalPayments,
        totalAmount: totalAmount._sum.amount || 0,
        averageAmount: averageAmount._avg.amount || 0,
        monthlyAmount: monthlyAmount._sum.amount || 0,
        monthlyCount,
        pendingAmount,
        overdueCount,
        methodDistribution
      }
    } catch (error) {
      logger.warn('Fallback SQL legacy pour les statistiques de paiements', {
        error: error instanceof Error ? error.message : error,
        companyId,
      })

      const [mainStatsRows, pendingRows, methodRows] = await Promise.all([
        prisma.$queryRawUnsafe<any[]>(`
          SELECT
            COUNT(*)::int AS "totalCount",
            COALESCE(SUM(amount), 0)::float AS "totalAmount",
            COALESCE(AVG(amount), 0)::float AS "averageAmount",
            COUNT(*) FILTER (
              WHERE "paymentDate" >= date_trunc('month', CURRENT_DATE)
                AND "paymentDate" < date_trunc('month', CURRENT_DATE) + interval '1 month'
            )::int AS "monthlyCount",
            COALESCE(SUM(amount) FILTER (
              WHERE "paymentDate" >= date_trunc('month', CURRENT_DATE)
                AND "paymentDate" < date_trunc('month', CURRENT_DATE) + interval '1 month'
            ), 0)::float AS "monthlyAmount"
          FROM "Payment"
          WHERE "userId" = $1
        `, companyId),
        prisma.$queryRawUnsafe<any[]>(`
          WITH invoice_totals AS (
            SELECT
              i.id,
              COALESCE(i.total, i."totalTTC", 0)::float AS total,
              i."dueDate" AS "dueDate",
              COALESCE(SUM(p.amount), 0)::float AS paid
            FROM "Invoice" i
            LEFT JOIN "Payment" p ON p."invoiceId" = i.id
            WHERE i."userId" = $1
            GROUP BY i.id, i.total, i."totalTTC", i."dueDate"
          )
          SELECT
            COALESCE(SUM(GREATEST(total - paid, 0)), 0)::float AS "pendingAmount",
            COUNT(*) FILTER (
              WHERE "dueDate" IS NOT NULL
                AND "dueDate" < NOW()
                AND paid < total
            )::int AS "overdueCount"
          FROM invoice_totals
        `, companyId),
        prisma.$queryRawUnsafe<any[]>(`
          SELECT
            UPPER(COALESCE("paymentMethod", 'OTHER')) AS method,
            COUNT(*)::int AS count,
            COALESCE(SUM(amount), 0)::float AS amount
          FROM "Payment"
          WHERE "userId" = $1
          GROUP BY UPPER(COALESCE("paymentMethod", 'OTHER'))
        `, companyId),
      ])

      const mainStats = mainStatsRows[0] || {}
      const pendingStats = pendingRows[0] || {}
      const methodBreakdown = methodRows.reduce((acc, row) => {
        acc[row.method] = row.count
        return acc
      }, {} as Record<string, number>)

      return {
        totalPayments: mainStats.totalCount || 0,
        totalCount: mainStats.totalCount || 0,
        totalAmount: mainStats.totalAmount || 0,
        averageAmount: mainStats.averageAmount || 0,
        monthlyAmount: mainStats.monthlyAmount || 0,
        monthlyCount: mainStats.monthlyCount || 0,
        pendingAmount: pendingStats.pendingAmount || 0,
        overdueCount: pendingStats.overdueCount || 0,
        methodBreakdown,
        methodDistribution: methodRows.map((row) => ({
          method: row.method,
          amount: row.amount || 0,
          count: row.count || 0,
        })),
      }
    }
  }
}
