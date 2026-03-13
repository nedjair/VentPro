import { prisma as prismaClient } from '../lib/prisma'
import { PaginationParams, PaginationResponse } from '@gestion/shared'
import { logger } from '../utils/logger'
import { AlgeriaConfigService } from './algeria-config.service'

const prisma: any = prismaClient
export type QuoteStatusValue = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
export interface CreateQuoteItemData { productId: string; quantity: number; unitPrice: number; discount?: number }
export interface CreateQuoteData { clientId: string; quoteDate?: Date; validUntil: Date; notes?: string; discount?: number; items: CreateQuoteItemData[] }
export interface UpdateQuoteData extends Partial<Omit<CreateQuoteData, 'items'>> { items?: CreateQuoteItemData[] }
export interface QuoteFilters { search?: string; clientId?: string; status?: QuoteStatusValue; dateFrom?: Date; dateTo?: Date }

const splitName = (fullName?: string) => {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean)
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') }
}
const dbStatus = (status: QuoteStatusValue) => ({ DRAFT: 'draft', SENT: 'sent', ACCEPTED: 'accepted', REJECTED: 'rejected', EXPIRED: 'expired' }[status])
const apiStatus = (status?: string): QuoteStatusValue => ({ sent: 'SENT', accepted: 'ACCEPTED', confirmed: 'ACCEPTED', rejected: 'REJECTED', expired: 'EXPIRED' }[String(status || '').toLowerCase()] as QuoteStatusValue || 'DRAFT')
const mapQuote = (quote: any) => {
  const user = splitName(quote.user?.fullName)
  return {
    id: quote.id, number: quote.quoteNumber, status: apiStatus(quote.status), quoteDate: quote.createdAt, validUntil: quote.validUntil,
    notes: quote.notes, subtotal: Number(quote.totalHT ?? quote.total ?? 0), taxAmount: Number(quote.tvaAmount ?? 0), total: Number(quote.total ?? 0), discount: 0,
    clientId: quote.clientId,
    client: quote.client ? { id: quote.client.id, firstName: '', lastName: '', companyName: quote.client.name, email: quote.client.email, phone: quote.client.phone, address: quote.client.address } : undefined,
    items: (quote.items || []).map((item: any) => ({ id: item.id, productId: item.productId, quantity: Number(item.quantity || 0), unitPrice: Number(item.price || 0), discount: Number(item.discount || 0), total: Number((Number(item.price || 0) * Number(item.quantity || 0) * (1 - Number(item.discount || 0) / 100)).toFixed(2)), product: item.product })),
    createdBy: { firstName: user.firstName, lastName: user.lastName, email: quote.user?.email }, order: quote.Order ? { id: quote.Order.id, number: quote.Order.orderNumber } : undefined,
    createdAt: quote.createdAt, updatedAt: quote.updatedAt,
  }
}

async function buildPayload(data: CreateQuoteData, ownerScopeId: string) {
  const products = await prisma.product.findMany({ where: { id: { in: data.items.map((i) => i.productId) }, userId: ownerScopeId } })
  if (products.length !== data.items.length) throw new Error('Un ou plusieurs produits n\'existent pas')
  let totalHT = 0; let tvaAmount = 0
  const items = data.items.map((item) => {
    const product = products.find((entry: any) => entry.id === item.productId)
    const discount = Number(item.discount || 0); const lineHT = item.unitPrice * item.quantity * (1 - discount / 100)
    totalHT += lineHT; tvaAmount += lineHT * (Number(product?.tvaRate || 0) / 100)
    return { productId: item.productId, quantity: item.quantity, price: item.unitPrice, discount }
  })
  const globalDiscount = Number(data.discount || 0); totalHT *= 1 - globalDiscount / 100; tvaAmount *= 1 - globalDiscount / 100
  const total = Number((totalHT + tvaAmount).toFixed(2))
  return { items, totals: { totalHT: Number(totalHT.toFixed(2)), tvaAmount: Number(tvaAmount.toFixed(2)), total, totalTTC: total } }
}

export class QuoteService {
  static async createQuote(data: CreateQuoteData, ownerScopeId: string, _actorUserId?: string): Promise<any> {
    const client = await prisma.client.findFirst({ where: { id: data.clientId, userId: ownerScopeId } })
    if (!client) throw new Error('Client non trouvé')
    const payload = await buildPayload(data, ownerScopeId)
    const quote = await prisma.quote.create({
      data: { quoteNumber: await this.generateQuoteNumber(ownerScopeId), status: 'draft', validUntil: data.validUntil, notes: data.notes, userId: ownerScopeId, clientId: data.clientId, ...payload.totals, items: { create: payload.items } },
      include: { items: { include: { product: true } }, client: true, user: true, Order: true },
    })
    return mapQuote(quote)
  }

  static async getQuoteById(id: string, ownerScopeId: string) { const quote = await prisma.quote.findFirst({ where: { id, userId: ownerScopeId }, include: { items: { include: { product: true } }, client: true, user: true, Order: true } }); return quote ? mapQuote(quote) : null }

  static async getQuotes(ownerScopeId: string, pagination: PaginationParams, filters: QuoteFilters = {}): Promise<PaginationResponse<any>> {
    const page = Math.max(1, Number(pagination.page) || 1), limit = Math.max(1, Number(pagination.limit) || 10)
    const rows = (await prisma.quote.findMany({ where: { userId: ownerScopeId, ...(filters.clientId && { clientId: filters.clientId }), ...(filters.status && { status: dbStatus(filters.status) }), ...(filters.dateFrom || filters.dateTo ? { createdAt: { ...(filters.dateFrom && { gte: filters.dateFrom }), ...(filters.dateTo && { lte: filters.dateTo }) } } : {}) }, include: { client: true, user: true, Order: true, items: { include: { product: true } } }, orderBy: { createdAt: 'desc' } })) as any[]
    const search = filters.search?.toLowerCase(); const filtered = !search ? rows : rows.filter((q) => [q.quoteNumber, q.notes, q.client?.name, q.client?.email].filter(Boolean).some((v) => String(v).toLowerCase().includes(search)))
    const data = filtered.slice((page - 1) * limit, page * limit).map(mapQuote)
    return { data, pagination: { page, limit, total: filtered.length, totalPages: Math.ceil(filtered.length / limit) || 1 } }
  }

  static async updateQuote(id: string, data: UpdateQuoteData, ownerScopeId: string): Promise<any> {
    const existing = await prisma.quote.findFirst({ where: { id, userId: ownerScopeId }, include: { items: true } })
    if (!existing) throw new Error('Devis non trouvé'); if (['ACCEPTED', 'EXPIRED'].includes(apiStatus(existing.status))) throw new Error('Ce devis ne peut plus être modifié')
    const updateData: any = { ...(data.validUntil && { validUntil: data.validUntil }), ...(data.notes !== undefined && { notes: data.notes }), ...(data.clientId && { clientId: data.clientId }) }
    if (data.items) { const payload = await buildPayload({ clientId: data.clientId || existing.clientId, validUntil: data.validUntil || existing.validUntil, notes: data.notes, discount: data.discount, items: data.items }, ownerScopeId); await prisma.quoteItem.deleteMany({ where: { quoteId: id } }); Object.assign(updateData, payload.totals, { items: { create: payload.items } }) }
    const quote = await prisma.quote.update({ where: { id }, data: updateData, include: { items: { include: { product: true } }, client: true, user: true, Order: true } })
    return mapQuote(quote)
  }

  static async updateQuoteStatus(id: string, status: QuoteStatusValue, ownerScopeId: string): Promise<any> {
    const existing = await prisma.quote.findFirst({ where: { id, userId: ownerScopeId } })
    if (!existing) throw new Error('Devis non trouvé'); if (apiStatus(existing.status) === 'ACCEPTED' && status !== 'ACCEPTED') throw new Error('Un devis accepté ne peut pas changer de statut')
    const quote = await prisma.quote.update({ where: { id }, data: { status: dbStatus(status) }, include: { items: { include: { product: true } }, client: true, user: true, Order: true } })
    return mapQuote(quote)
  }

  static async convertQuoteToOrder(id: string, ownerScopeId: string, _actorUserId?: string): Promise<any> {
    const quote = await prisma.quote.findFirst({ where: { id, userId: ownerScopeId }, include: { items: { include: { product: true } }, client: true } })
    if (!quote) throw new Error('Devis non trouvé'); if (apiStatus(quote.status) !== 'ACCEPTED') throw new Error('Seuls les devis acceptés peuvent être convertis en commande')
    const existing = await prisma.order.findFirst({ where: { quoteId: id, userId: ownerScopeId } }); if (existing) throw new Error('Ce devis a déjà été converti en commande')
    const order = await prisma.order.create({ data: { orderNumber: await this.generateOrderNumber(ownerScopeId), status: 'confirmed', total: Number(quote.total || 0), totalHT: Number(quote.totalHT || quote.total || 0), totalTTC: Number(quote.totalTTC || quote.total || 0), tvaAmount: Number(quote.tvaAmount || 0), notes: quote.notes, userId: ownerScopeId, clientId: quote.clientId, quoteId: quote.id, items: { create: (quote.items || []).map((item: any) => ({ productId: item.productId, quantity: Number(item.quantity || 0), price: Number(item.price || 0) })) } }, include: { client: true, items: { include: { product: true } }, invoice: true, Quote: true } })
    return { id: order.id, number: order.orderNumber, type: 'ORDER', status: 'ACCEPTED', clientId: order.clientId, client: order.client ? { id: order.client.id, companyName: order.client.name, email: order.client.email, phone: order.client.phone, address: order.client.address } : undefined, orderDate: order.createdAt, deliveryDate: order.deliveryDate, subtotal: Number(order.totalHT ?? order.total ?? 0), vatAmount: Number(order.tvaAmount ?? 0), total: Number(order.total ?? 0), discount: 0, notes: order.notes, items: (order.items || []).map((item: any) => ({ id: item.id, productId: item.productId, quantity: Number(item.quantity || 0), unitPrice: Number(item.price || 0), vatRate: Number(item.product?.tvaRate || 0), discount: 0, product: item.product })), createdAt: order.createdAt, updatedAt: order.updatedAt }
  }

  static async deleteQuote(id: string, ownerScopeId: string): Promise<void> {
    const existing = await prisma.quote.findFirst({
      where: { id, userId: ownerScopeId },
      include: { Order: true },
    })
    if (!existing) throw new Error('Devis non trouvé')
    if (apiStatus(existing.status) === 'ACCEPTED') throw new Error('Un devis accepté ne peut pas être supprimé')
    if (existing.Order) throw new Error('Impossible de supprimer ce devis car il est deja converti en commande')
    try {
      await prisma.$transaction([
        prisma.quoteItem.deleteMany({ where: { quoteId: id } }),
        prisma.quote.delete({ where: { id } }),
      ])
    } catch (error: any) {
      if (error?.code === 'P2003') throw new Error('Impossible de supprimer ce devis car des éléments liés existent encore')
      throw error
    }
  }

  private static async generateQuoteNumber(ownerScopeId: string): Promise<string> {
    const year = new Date().getFullYear(), prefix = `DEV-${year}-`, last = await prisma.quote.findFirst({ where: { userId: ownerScopeId, quoteNumber: { startsWith: prefix } }, orderBy: { quoteNumber: 'desc' } })
    const lastNumber = last?.quoteNumber ? parseInt(String(last.quoteNumber).split('-').pop() || '0', 10) : 0
    return AlgeriaConfigService.generateDocumentNumber('QUOTE', lastNumber, year)
  }
  private static async generateOrderNumber(ownerScopeId: string): Promise<string> {
    const year = new Date().getFullYear(), prefix = `CMD-${year}-`, last = await prisma.order.findFirst({ where: { userId: ownerScopeId, orderNumber: { startsWith: prefix } }, orderBy: { orderNumber: 'desc' } })
    const next = (last?.orderNumber ? parseInt(String(last.orderNumber).split('-').pop() || '0', 10) : 0) + 1
    return `${prefix}${String(next).padStart(4, '0')}`
  }
}
