import { prisma as prismaClient } from '../lib/prisma'
import { PaginationParams, PaginationResponse } from '@gestion/shared'
import { logger } from '../utils/logger'
import { PaymentService, PaymentMethodValue } from './payment-sales.service'
import { getFallbackInvoiceById, getFallbackInvoiceStats, getFallbackInvoices, isDatabaseUnavailableError } from './dev-fallback-data.service'

const prisma: any = prismaClient
export type InvoiceType = 'INVOICE' | 'CREDIT_NOTE' | 'PROFORMA'
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'CANCELLED'
export interface CreateInvoiceItemData { productId: string; quantity: number; unitPrice: number; vatRate: number; discount?: number }
export interface CreateInvoiceData { type: InvoiceType; clientId: string; orderId?: string; invoiceDate?: Date; dueDate?: Date; notes?: string; paymentMethod?: string; items: CreateInvoiceItemData[] }
export interface UpdateInvoiceData extends Partial<Omit<CreateInvoiceData, 'items'>> { items?: CreateInvoiceItemData[] }
export interface InvoiceFilters { search?: string; clientId?: string; type?: InvoiceType; status?: InvoiceStatus; dateFrom?: Date; dateTo?: Date; dueDateFrom?: Date; dueDateTo?: Date }

const dbStatus = (status: InvoiceStatus) => ({ DRAFT: 'draft', SENT: 'issued', PAID: 'paid', PARTIAL: 'partial', OVERDUE: 'overdue', CANCELLED: 'cancelled' }[status])
const apiStatus = (status?: string): InvoiceStatus => ({ issued: 'SENT', sent: 'SENT', paid: 'PAID', partial: 'PARTIAL', partially_paid: 'PARTIAL', overdue: 'OVERDUE', cancelled: 'CANCELLED' }[String(status || '').toLowerCase()] as InvoiceStatus || 'DRAFT')
const amounts = (items: CreateInvoiceItemData[]) => items.reduce((acc, item) => { const sub = item.quantity * item.unitPrice * (1 - Number(item.discount || 0) / 100); acc.subtotal += sub; acc.vatAmount += sub * (Number(item.vatRate || 0) / 100); return acc }, { subtotal: 0, vatAmount: 0 })
const mapItems = (invoice: any, fallbackItems: CreateInvoiceItemData[] = []) => (invoice.order?.items || fallbackItems).map((item: any) => ({ id: item.id, productId: item.productId, quantity: Number(item.quantity || 0), unitPrice: Number(item.price ?? item.unitPrice ?? 0), vatRate: Number(item.product?.tvaRate ?? item.vatRate ?? 0), discount: Number(item.discount || 0), product: item.product }))
const isPrismaUniqueConstraintError = (error: unknown, fieldName?: string) => {
  if (!error || typeof error !== 'object') return false
  const prismaError = error as { code?: string; meta?: { target?: unknown } }
  if (prismaError.code !== 'P2002') return false
  if (!fieldName) return true
  const targets = Array.isArray(prismaError.meta?.target)
    ? prismaError.meta?.target.map((v) => String(v))
    : typeof prismaError.meta?.target === 'string'
      ? [prismaError.meta.target]
      : []
  return targets.some((target) => target.includes(fieldName))
}
const assertOrderIsNotAlreadyInvoiced = async (orderId: string, ownerScopeId: string, excludeInvoiceId?: string) => {
  const existingInvoice = await prisma.invoice.findFirst({
    where: {
      orderId,
      userId: ownerScopeId,
      ...(excludeInvoiceId ? { id: { not: excludeInvoiceId } } : {}),
    },
    select: { id: true, invoiceNumber: true },
  })
  if (!existingInvoice) return
  throw new Error(`Cette commande est déjà liée à la facture ${existingInvoice.invoiceNumber}. Veuillez sélectionner une autre commande.`)
}
const mapInvoice = (invoice: any, fallbackItems: CreateInvoiceItemData[] = []) => {
  const paidAmount = (invoice.payments || []).reduce((sum: number, entry: any) => sum + Number(entry.amount || 0), 0), lastPayment = invoice.payments?.[0]
  return {
    id: invoice.id,
    number: invoice.invoiceNumber,
    type: 'INVOICE',
    status: apiStatus(invoice.status),
    clientId: invoice.clientId,
    client: invoice.client ? { id: invoice.client.id, companyName: invoice.client.name, email: invoice.client.email, phone: invoice.client.phone, address: invoice.client.address } : undefined,
    salesperson: invoice.user ? {
      id: invoice.user.id,
      name: invoice.user.fullName || invoice.user.email || 'Non attribué',
      email: invoice.user.email,
    } : undefined,
    orderId: invoice.orderId,
    order: invoice.order ? { id: invoice.order.id, number: invoice.order.orderNumber } : undefined,
    invoiceDate: invoice.createdAt,
    dueDate: invoice.dueDate,
    paidDate: invoice.paidDate,
    subtotal: Number(invoice.totalHT ?? invoice.total ?? 0),
    vatAmount: Number(invoice.tvaAmount ?? 0),
    total: Number(invoice.total ?? 0),
    paidAmount,
    discount: 0,
    notes: invoice.notes,
    paymentMethod: lastPayment?.paymentMethod,
    items: mapItems(invoice, fallbackItems),
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
  }
}

async function createPayload(data: CreateInvoiceData, ownerScopeId: string) {
  const items = data.items.length ? data.items : ((await prisma.order.findFirst({ where: { id: data.orderId, userId: ownerScopeId }, include: { items: { include: { product: true } } } }))?.items || []).map((item: any) => ({ productId: item.productId, quantity: Number(item.quantity || 0), unitPrice: Number(item.price || 0), vatRate: Number(item.product?.tvaRate || 0), discount: 0 }))
  if (!items.length) throw new Error('Aucune ligne de facture disponible')
  const value = amounts(items), total = Number((value.subtotal + value.vatAmount).toFixed(2))
  return { items, totals: { totalHT: Number(value.subtotal.toFixed(2)), tvaAmount: Number(value.vatAmount.toFixed(2)), total, totalTTC: total } }
}

export class InvoiceService {
  static async createInvoice(data: CreateInvoiceData, ownerScopeId: string): Promise<any> {
    const client = await prisma.client.findFirst({ where: { id: data.clientId, userId: ownerScopeId } }); if (!client) throw new Error('Client non trouvé')
    if (data.orderId) {
      const order = await prisma.order.findFirst({ where: { id: data.orderId, userId: ownerScopeId } }); if (!order) throw new Error('Commande non trouvée')
      await assertOrderIsNotAlreadyInvoiced(data.orderId, ownerScopeId)
    }
    const payload = await createPayload(data, ownerScopeId)
    try {
      const invoice = await prisma.invoice.create({ data: { invoiceNumber: await this.generateInvoiceNumber(ownerScopeId), status: 'draft', userId: ownerScopeId, clientId: data.clientId, orderId: data.orderId, dueDate: data.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), notes: data.notes, ...payload.totals }, include: { client: true, user: true, order: { include: { items: { include: { product: true } } } }, payments: { orderBy: { paymentDate: 'desc' } } } })
      return mapInvoice(invoice, payload.items)
    } catch (error) {
      if (isPrismaUniqueConstraintError(error, 'orderId')) {
        throw new Error('Cette commande est déjà facturée. Veuillez sélectionner une autre commande.')
      }
      throw error
    }
  }

  static async createInvoiceFromOrder(orderId: string, ownerScopeId: string): Promise<any> {
    const order = await prisma.order.findFirst({ where: { id: orderId, userId: ownerScopeId }, include: { items: { include: { product: true } } } }); if (!order) throw new Error('Commande non trouvée')
    return this.createInvoice({ type: 'INVOICE', clientId: order.clientId, orderId: order.id, notes: order.notes, items: order.items.map((item: any) => ({ productId: item.productId, quantity: Number(item.quantity || 0), unitPrice: Number(item.price || 0), vatRate: Number(item.product?.tvaRate || 0), discount: 0 })) }, ownerScopeId)
  }

  static async getInvoiceById(id: string, ownerScopeId: string): Promise<any | null> {
    try {
      const invoice = await prisma.invoice.findFirst({ where: { id, userId: ownerScopeId }, include: { client: true, user: true, order: { include: { items: { include: { product: true } } } }, payments: { orderBy: { paymentDate: 'desc' } } } })
      return invoice ? mapInvoice(invoice) : null
    } catch (error) {
      if (isDatabaseUnavailableError(error)) {
        return getFallbackInvoiceById(ownerScopeId, id)
      }
      throw error
    }
  }

  static async getInvoices(ownerScopeId: string, filters: InvoiceFilters = {}, pagination?: PaginationParams): Promise<PaginationResponse<any>> {
    try {
      const page = Math.max(1, Number(pagination?.page) || 1), limit = Math.max(1, Number(pagination?.limit) || 10)
      const rows = (await prisma.invoice.findMany({ where: { userId: ownerScopeId, ...(filters.clientId && { clientId: filters.clientId }), ...(filters.status && { status: dbStatus(filters.status) }), ...(filters.dateFrom || filters.dateTo ? { createdAt: { ...(filters.dateFrom && { gte: filters.dateFrom }), ...(filters.dateTo && { lte: filters.dateTo }) } } : {}), ...(filters.dueDateFrom || filters.dueDateTo ? { dueDate: { ...(filters.dueDateFrom && { gte: filters.dueDateFrom }), ...(filters.dueDateTo && { lte: filters.dueDateTo }) } } : {}) }, include: { client: true, user: true, order: { include: { items: { include: { product: true } } } }, payments: { orderBy: { paymentDate: 'desc' } } }, orderBy: { createdAt: 'desc' } })) as any[]
      const search = filters.search?.toLowerCase(); const filtered = !search ? rows : rows.filter((i) => [i.invoiceNumber, i.notes, i.client?.name, i.client?.email, i.order?.orderNumber].filter(Boolean).some((v) => String(v).toLowerCase().includes(search)))
      return { data: filtered.slice((page - 1) * limit, page * limit).map((invoice) => mapInvoice(invoice)), pagination: { page, limit, total: filtered.length, totalPages: Math.ceil(filtered.length / limit) || 1, hasNext: page * limit < filtered.length, hasPrev: page > 1 } }
    } catch (error) {
      if (isDatabaseUnavailableError(error)) {
        return getFallbackInvoices(ownerScopeId, filters, pagination)
      }
      throw error
    }
  }

  static async updateInvoice(id: string, data: UpdateInvoiceData, ownerScopeId: string): Promise<any> {
    const existing = await prisma.invoice.findFirst({ where: { id, userId: ownerScopeId }, include: { order: { include: { items: { include: { product: true } } } }, payments: true } }); if (!existing) throw new Error('Facture non trouvée')
    const updateData: any = { ...(data.clientId && { clientId: data.clientId }), ...(data.orderId !== undefined && { orderId: data.orderId }), ...(data.dueDate && { dueDate: data.dueDate }), ...(data.notes !== undefined && { notes: data.notes }) }
    if (data.orderId) await assertOrderIsNotAlreadyInvoiced(data.orderId, ownerScopeId, id)
    if (data.items || data.orderId) { const payload = await createPayload({ type: data.type || 'INVOICE', clientId: data.clientId || existing.clientId, orderId: data.orderId ?? existing.orderId, dueDate: data.dueDate, notes: data.notes, paymentMethod: data.paymentMethod, items: data.items || [] }, ownerScopeId); Object.assign(updateData, payload.totals) }
    try {
      const invoice = await prisma.invoice.update({ where: { id }, data: updateData, include: { client: true, user: true, order: { include: { items: { include: { product: true } } } }, payments: { orderBy: { paymentDate: 'desc' } } } })
      return mapInvoice(invoice, data.items || [])
    } catch (error) {
      if (isPrismaUniqueConstraintError(error, 'orderId')) {
        throw new Error('Cette commande est déjà facturée. Veuillez sélectionner une autre commande.')
      }
      throw error
    }
  }

  static async recordPayment(id: string, amount: number, paymentDate: Date, paymentMethod: string, ownerScopeId: string): Promise<any> { await PaymentService.createPayment({ invoiceId: id, amount, paymentDate, paymentMethod: paymentMethod as PaymentMethodValue }, ownerScopeId); return this.getInvoiceById(id, ownerScopeId) }
  static async updateInvoiceStatus(id: string, status: InvoiceStatus, ownerScopeId: string): Promise<any> { const existing = await prisma.invoice.findFirst({ where: { id, userId: ownerScopeId } }); if (!existing) throw new Error('Facture non trouvée'); const invoice = await prisma.invoice.update({ where: { id }, data: { status: dbStatus(status), paidDate: status === 'PAID' ? new Date() : status === 'CANCELLED' ? null : existing.paidDate }, include: { client: true, user: true, order: { include: { items: { include: { product: true } } } }, payments: { orderBy: { paymentDate: 'desc' } } } }); return mapInvoice(invoice) }
  static async deleteInvoice(id: string, ownerScopeId: string): Promise<void> { const invoice = await prisma.invoice.findFirst({ where: { id, userId: ownerScopeId }, include: { payments: true } }); if (!invoice) throw new Error('Facture non trouvée'); if ((invoice.payments || []).length > 0) throw new Error('Impossible de supprimer une facture ayant des paiements'); await prisma.invoice.delete({ where: { id } }) }

  static async getInvoiceStats(ownerScopeId: string) {
    try {
      const invoices = await prisma.invoice.findMany({ where: { userId: ownerScopeId }, include: { payments: true } })
      const paid = invoices.filter((i: any) => apiStatus(i.status) === 'PAID'), overdue = invoices.filter((i: any) => apiStatus(i.status) === 'OVERDUE'), draft = invoices.filter((i: any) => apiStatus(i.status) === 'DRAFT')
      const pending = invoices.filter((i: any) => ['SENT', 'PARTIAL', 'OVERDUE'].includes(apiStatus(i.status)))
      return { totalInvoices: invoices.length, paidInvoices: paid.length, overdueInvoices: overdue.length, draftInvoices: draft.length, totalRevenue: paid.reduce((sum: number, i: any) => sum + Number(i.total || 0), 0), pendingRevenue: pending.reduce((sum: number, i: any) => sum + Number(i.total || 0), 0) }
    } catch (error) {
      if (isDatabaseUnavailableError(error)) {
        return getFallbackInvoiceStats(ownerScopeId)
      }
      throw error
    }
  }

  private static async generateInvoiceNumber(ownerScopeId: string) { const year = new Date().getFullYear(), month = String(new Date().getMonth() + 1).padStart(2, '0'), prefix = `FAC-${year}${month}-`, last = await prisma.invoice.findFirst({ where: { userId: ownerScopeId, invoiceNumber: { startsWith: prefix } }, orderBy: { invoiceNumber: 'desc' } }); const next = (last?.invoiceNumber ? parseInt(String(last.invoiceNumber).split('-').pop() || '0', 10) : 0) + 1; return `${prefix}${String(next).padStart(4, '0')}` }
  static async confirmInvoice(invoiceId: string, ownerScopeId: string): Promise<any> { logger.warn('Synchronisation stock désactivée: facture alignée sur le schéma minimal actif', { invoiceId, ownerScopeId }); return this.updateInvoiceStatus(invoiceId, 'SENT', ownerScopeId) }
  static async cancelInvoice(invoiceId: string, ownerScopeId: string): Promise<any> { logger.warn('Restauration stock désactivée: facture alignée sur le schéma minimal actif', { invoiceId, ownerScopeId }); return this.updateInvoiceStatus(invoiceId, 'CANCELLED', ownerScopeId) }
}
