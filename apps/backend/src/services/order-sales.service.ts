import { prisma as prismaClient } from '../lib/prisma'
import { PaginationParams, PaginationResponse } from '@gestion/shared'
import { logger } from '../utils/logger'
import { QuoteService, QuoteFilters } from './quote-sales.service'
import { getFallbackOrderById, getFallbackOrderStats, getFallbackOrders, isDatabaseUnavailableError } from './dev-fallback-data.service'

const prisma: any = prismaClient
export type OrderType = 'QUOTE' | 'ORDER'
export type OrderStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED'
export interface CreateOrderItemData { productId: string; quantity: number; unitPrice: number; vatRate: number; discount?: number }
export interface CreateOrderData { type: OrderType; clientId: string; orderDate?: Date; validUntil?: Date; deliveryDate?: Date; notes?: string; internalNotes?: string; items: CreateOrderItemData[] }
export interface UpdateOrderData extends Partial<Omit<CreateOrderData, 'items'>> { items?: CreateOrderItemData[] }
export interface OrderFilters { search?: string; clientId?: string; type?: OrderType; status?: OrderStatus; dateFrom?: Date; dateTo?: Date }

const dbStatus = (status: OrderStatus) => ({ DRAFT: 'draft', SENT: 'pending', ACCEPTED: 'confirmed', REJECTED: 'rejected', EXPIRED: 'expired', CANCELLED: 'cancelled' }[status])
const apiStatus = (status?: string): OrderStatus => ({ pending: 'SENT', sent: 'SENT', confirmed: 'ACCEPTED', accepted: 'ACCEPTED', completed: 'ACCEPTED', rejected: 'REJECTED', expired: 'EXPIRED', cancelled: 'CANCELLED' }[String(status || '').toLowerCase()] as OrderStatus || 'DRAFT')
const mapOrder = (order: any) => ({
  id: order.id, number: order.orderNumber, type: 'ORDER', status: apiStatus(order.status), clientId: order.clientId,
  client: order.client ? { id: order.client.id, companyName: order.client.name, email: order.client.email, phone: order.client.phone, address: order.client.address } : undefined,
  orderDate: order.createdAt, validUntil: undefined, deliveryDate: order.deliveryDate, subtotal: Number(order.totalHT ?? order.total ?? 0), vatAmount: Number(order.tvaAmount ?? 0), total: Number(order.total ?? 0), discount: 0,
  notes: order.notes, internalNotes: undefined, items: (order.items || []).map((item: any) => ({ id: item.id, productId: item.productId, quantity: Number(item.quantity || 0), unitPrice: Number(item.price || 0), vatRate: Number(item.product?.tvaRate || 0), discount: 0, product: item.product })), createdAt: order.createdAt, updatedAt: order.updatedAt,
})
const mapQuoteAsOrder = (quote: any) => ({ ...quote, type: 'QUOTE', orderDate: quote.quoteDate, vatAmount: quote.taxAmount, internalNotes: undefined })
const totals = (items: CreateOrderItemData[]) => items.reduce((acc, item) => {
  const sub = item.quantity * item.unitPrice * (1 - Number(item.discount || 0) / 100)
  acc.subtotal += sub; acc.vatAmount += sub * (Number(item.vatRate || 0) / 100); return acc
}, { subtotal: 0, vatAmount: 0 })

export class OrderService {
  static async createOrder(data: CreateOrderData, ownerScopeId: string): Promise<any> {
    if (data.type === 'QUOTE') return mapQuoteAsOrder(await QuoteService.createQuote({ clientId: data.clientId, quoteDate: data.orderDate, validUntil: data.validUntil || new Date(), notes: data.notes, items: data.items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice, discount: i.discount })) }, ownerScopeId))
    const client = await prisma.client.findFirst({ where: { id: data.clientId, userId: ownerScopeId } }); if (!client) throw new Error('Client non trouvÃ©')
    const products = await prisma.product.findMany({ where: { id: { in: data.items.map((i) => i.productId) }, userId: ownerScopeId } }); if (products.length !== data.items.length) throw new Error('Un ou plusieurs produits non trouvÃ©s')
    const amount = totals(data.items); const total = Number((amount.subtotal + amount.vatAmount).toFixed(2))
    const orderDate = data.orderDate || new Date()
    const order = await prisma.order.create({ data: { orderNumber: await this.generateOrderNumber(ownerScopeId, orderDate), status: 'draft', userId: ownerScopeId, clientId: data.clientId, deliveryDate: data.deliveryDate, notes: data.notes, total, totalHT: Number(amount.subtotal.toFixed(2)), tvaAmount: Number(amount.vatAmount.toFixed(2)), totalTTC: total, items: { create: data.items.map((item) => ({ productId: item.productId, quantity: item.quantity, price: item.unitPrice })) } }, include: { client: true, items: { include: { product: true } }, invoice: true, Quote: true } })
    return mapOrder(order)
  }

  static async getOrderById(id: string, ownerScopeId: string): Promise<any | null> {
    try {
      const order = await prisma.order.findFirst({ where: { id, userId: ownerScopeId }, include: { client: true, items: { include: { product: true } }, invoice: true, Quote: true } })
      return order ? mapOrder(order) : null
    } catch (error) {
      if (isDatabaseUnavailableError(error)) {
        return getFallbackOrderById(ownerScopeId, id)
      }
      throw error
    }
  }

  static async getOrders(ownerScopeId: string, filters: OrderFilters = {}, pagination?: PaginationParams): Promise<PaginationResponse<any>> {
    try {
      const page = Math.max(1, Number(pagination?.page) || 1), limit = Math.max(1, Number(pagination?.limit) || 10)
      if (filters.type === 'QUOTE') { const quotes = await QuoteService.getQuotes(ownerScopeId, { page, limit }, filters as QuoteFilters); return { ...quotes, data: quotes.data.map(mapQuoteAsOrder) } }
      const rows = (await prisma.order.findMany({ where: { userId: ownerScopeId, ...(filters.clientId && { clientId: filters.clientId }), ...(filters.status && { status: dbStatus(filters.status) }), ...(filters.dateFrom || filters.dateTo ? { createdAt: { ...(filters.dateFrom && { gte: filters.dateFrom }), ...(filters.dateTo && { lte: filters.dateTo }) } } : {}) }, include: { client: true, items: { include: { product: true } }, invoice: true, Quote: true }, orderBy: { createdAt: 'desc' } })) as any[]
      const search = filters.search?.toLowerCase(); const filtered = !search ? rows : rows.filter((o) => [o.orderNumber, o.notes, o.client?.name, o.client?.email].filter(Boolean).some((v) => String(v).toLowerCase().includes(search)))
      return { data: filtered.slice((page - 1) * limit, page * limit).map(mapOrder), pagination: { page, limit, total: filtered.length, totalPages: Math.ceil(filtered.length / limit) || 1, hasNext: page * limit < filtered.length, hasPrev: page > 1 } }
    } catch (error) {
      if (isDatabaseUnavailableError(error)) {
        return getFallbackOrders(ownerScopeId, filters, pagination)
      }
      throw error
    }
  }

  static async updateOrder(id: string, data: UpdateOrderData, ownerScopeId: string): Promise<any> {
    const existing = await prisma.order.findFirst({ where: { id, userId: ownerScopeId } }); if (!existing) throw new Error('Commande non trouvÃ©e')
    const updateData: any = { ...(data.clientId && { clientId: data.clientId }), ...(data.deliveryDate && { deliveryDate: data.deliveryDate }), ...(data.notes !== undefined && { notes: data.notes }) }
    if (data.items) { const amount = totals(data.items); const total = Number((amount.subtotal + amount.vatAmount).toFixed(2)); await prisma.orderItem.deleteMany({ where: { orderId: id } }); Object.assign(updateData, { totalHT: Number(amount.subtotal.toFixed(2)), tvaAmount: Number(amount.vatAmount.toFixed(2)), total, totalTTC: total, items: { create: data.items.map((item) => ({ productId: item.productId, quantity: item.quantity, price: item.unitPrice })) } }) }
    const order = await prisma.order.update({ where: { id }, data: updateData, include: { client: true, items: { include: { product: true } }, invoice: true, Quote: true } })
    return mapOrder(order)
  }

  static async updateOrderStatus(id: string, status: OrderStatus, ownerScopeId: string): Promise<any> { const existing = await prisma.order.findFirst({ where: { id, userId: ownerScopeId } }); if (!existing) throw new Error('Commande non trouvÃ©e'); return mapOrder(await prisma.order.update({ where: { id }, data: { status: dbStatus(status) }, include: { client: true, items: { include: { product: true } }, invoice: true, Quote: true } })) }
  static async convertQuoteToOrder(quoteId: string, ownerScopeId: string): Promise<any> { return QuoteService.convertQuoteToOrder(quoteId, ownerScopeId) }
  static async deleteOrder(id: string, ownerScopeId: string): Promise<void> {
    const existing = await prisma.order.findFirst({ where: { id, userId: ownerScopeId } })
    if (!existing) throw new Error('Commande non trouvée')

    const [invoicesCount, deliveriesCount] = await Promise.all([
      prisma.invoice.count({ where: { orderId: id, userId: ownerScopeId } }),
      prisma.delivery.count({ where: { orderId: id } }),
    ])

    if (invoicesCount > 0) throw new Error('Impossible de supprimer cette commande car elle a des factures associées')
    if (deliveriesCount > 0) throw new Error('Impossible de supprimer cette commande car elle a des livraisons associées')

    try {
      await prisma.$transaction([
        prisma.orderItem.deleteMany({ where: { orderId: id } }),
        prisma.order.delete({ where: { id } }),
      ])
    } catch (error: any) {
      if (error?.code === 'P2003') throw new Error('Impossible de supprimer cette commande car des éléments liés existent encore')
      throw error
    }
  }

  static async getOrderStats(ownerScopeId: string) {
    try {
      const [totalOrders, totalQuotes, recentOrdersCount, pendingQuotes, acceptedQuotes] = await Promise.all([
        prisma.order.count({ where: { userId: ownerScopeId } }), prisma.quote.count({ where: { userId: ownerScopeId } }), prisma.order.count({ where: { userId: ownerScopeId, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }), prisma.quote.count({ where: { userId: ownerScopeId, status: 'sent' } }), prisma.quote.count({ where: { userId: ownerScopeId, status: { in: ['accepted', 'confirmed'] } } }),
      ])
      return { totalOrders, totalQuotes, pendingQuotes, acceptedQuotes, recentOrdersCount }
    } catch (error) {
      if (isDatabaseUnavailableError(error)) {
        return getFallbackOrderStats(ownerScopeId)
      }
      throw error
    }
  }

  private static async generateOrderNumber(ownerScopeId: string, orderDate: Date): Promise<string> {
    const year = orderDate.getFullYear()
    const month = String(orderDate.getMonth() + 1).padStart(2, '0')
    const day = String(orderDate.getDate()).padStart(2, '0')
    const datePart = `${year}${month}${day}`
    const prefix = `CMD-${datePart}-`
    const last = await prisma.order.findFirst({ where: { userId: ownerScopeId, orderNumber: { startsWith: prefix } }, orderBy: { orderNumber: 'desc' } })
    const next = (last?.orderNumber ? parseInt(String(last.orderNumber).split('-').pop() || '0', 10) : 0) + 1
    return `${prefix}${String(next).padStart(4, '0')}`
  }

  static async confirmOrder(orderId: string, ownerScopeId: string): Promise<any> { logger.warn('RÃ©servation de stock dÃ©sactivÃ©e: service alignÃ© sur le schÃ©ma minimal actif', { orderId, ownerScopeId }); return this.updateOrderStatus(orderId, 'ACCEPTED', ownerScopeId) }
  static async cancelOrder(orderId: string, ownerScopeId: string): Promise<any> { logger.warn('LibÃ©ration de stock dÃ©sactivÃ©e: service alignÃ© sur le schÃ©ma minimal actif', { orderId, ownerScopeId }); return this.updateOrderStatus(orderId, 'CANCELLED', ownerScopeId) }
}

