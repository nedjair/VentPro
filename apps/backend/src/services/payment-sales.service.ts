import { prisma as prismaClient } from '../lib/prisma'
import { PaginationParams, PaginationResponse } from '@gestion/shared'
import { logger } from '../utils/logger'

const prisma: any = prismaClient
export type PaymentMethodValue = 'CASH' | 'CHECK' | 'TRANSFER' | 'CARD' | 'OTHER'
export interface CreatePaymentData { invoiceId: string; amount: number; paymentDate?: Date; paymentMethod: PaymentMethodValue; reference?: string; notes?: string }
export interface PaymentFilters { search?: string; clientId?: string; invoiceId?: string; paymentMethod?: PaymentMethodValue; dateFrom?: Date; dateTo?: Date }
export interface ReminderFilters { search?: string; clientId?: string; status?: 'PENDING' | 'SENT' | 'RESOLVED'; level?: number; dateFrom?: Date; dateTo?: Date }

const splitName = (fullName?: string) => { const parts = (fullName || '').trim().split(/\s+/).filter(Boolean); return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') } }
const paymentMethod = (value?: string): PaymentMethodValue => (['CASH', 'CHECK', 'TRANSFER', 'CARD', 'OTHER'].includes(String(value || '').toUpperCase()) ? String(value).toUpperCase() : 'OTHER') as PaymentMethodValue
const mapPayment = (payment: any) => {
  const creator = splitName(payment.user?.fullName)
  return { id: payment.id, number: payment.paymentNumber, amount: Number(payment.amount || 0), paymentDate: payment.paymentDate, paymentMethod: paymentMethod(payment.paymentMethod), reference: payment.reference, notes: payment.notes, invoiceId: payment.invoiceId, invoice: payment.invoice ? { id: payment.invoice.id, number: payment.invoice.invoiceNumber, total: Number(payment.invoice.total || 0), status: payment.invoice.status, dueDate: payment.invoice.dueDate } : undefined, client: payment.invoice?.client ? { id: payment.invoice.client.id, companyName: payment.invoice.client.name, email: payment.invoice.client.email, phone: payment.invoice.client.phone, address: payment.invoice.client.address } : undefined, createdBy: { firstName: creator.firstName, lastName: creator.lastName, email: payment.user?.email }, createdAt: payment.createdAt, updatedAt: payment.updatedAt }
}

export class PaymentService {
  static async createPayment(data: CreatePaymentData, ownerScopeId: string, _actorUserId?: string): Promise<any> {
    const invoice = await prisma.invoice.findFirst({ where: { id: data.invoiceId, userId: ownerScopeId }, include: { payments: true, client: true } })
    if (!invoice) throw new Error('Facture non trouvée')
    const paid = (invoice.payments || []).reduce((sum: number, entry: any) => sum + Number(entry.amount || 0), 0)
    const remaining = Number(invoice.total || 0) - paid; if (data.amount > remaining) throw new Error(`Le montant du paiement (${data.amount}) dépasse le montant restant à payer (${remaining})`)
    const payment = await prisma.payment.create({ data: { paymentNumber: await this.generatePaymentNumber(ownerScopeId), amount: data.amount, paymentDate: data.paymentDate || new Date(), paymentMethod: paymentMethod(data.paymentMethod), reference: data.reference, notes: data.notes, invoiceId: data.invoiceId, userId: ownerScopeId }, include: { invoice: { include: { client: true } }, user: true } })
    await this.refreshInvoicePaymentState(data.invoiceId, ownerScopeId)
    return mapPayment(payment)
  }

  static async getPaymentById(id: string, ownerScopeId: string): Promise<any | null> { const payment = await prisma.payment.findFirst({ where: { id, userId: ownerScopeId }, include: { invoice: { include: { client: true } }, user: true } }); return payment ? mapPayment(payment) : null }
  static async getPayments(ownerScopeId: string, pagination: PaginationParams, filters: PaymentFilters = {}): Promise<PaginationResponse<any>> {
    const page = Math.max(1, Number(pagination.page) || 1), limit = Math.max(1, Number(pagination.limit) || 10)
    const rows = (await prisma.payment.findMany({ where: { userId: ownerScopeId, ...(filters.invoiceId && { invoiceId: filters.invoiceId }), ...(filters.paymentMethod && { paymentMethod: paymentMethod(filters.paymentMethod) }), ...(filters.dateFrom || filters.dateTo ? { paymentDate: { ...(filters.dateFrom && { gte: filters.dateFrom }), ...(filters.dateTo && { lte: filters.dateTo }) } } : {}), ...(filters.clientId && { invoice: { clientId: filters.clientId } }) }, include: { invoice: { include: { client: true } }, user: true }, orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }] })) as any[]
    const search = filters.search?.toLowerCase(); const filtered = !search ? rows : rows.filter((p) => [p.paymentNumber, p.reference, p.notes, p.invoice?.invoiceNumber, p.invoice?.client?.name].filter(Boolean).some((v) => String(v).toLowerCase().includes(search)))
    return { data: filtered.slice((page - 1) * limit, page * limit).map(mapPayment), pagination: { page, limit, total: filtered.length, totalPages: Math.ceil(filtered.length / limit) || 1 } }
  }
  static async getPaymentsByInvoice(invoiceId: string, ownerScopeId: string): Promise<any[]> { const rows = await prisma.payment.findMany({ where: { invoiceId, userId: ownerScopeId }, include: { invoice: { include: { client: true } }, user: true }, orderBy: { paymentDate: 'desc' } }); return rows.map(mapPayment) }
  static async getPaymentsByClient(clientId: string, ownerScopeId: string): Promise<any[]> { const rows = await prisma.payment.findMany({ where: { userId: ownerScopeId, invoice: { clientId } }, include: { invoice: { include: { client: true } }, user: true }, orderBy: { paymentDate: 'desc' } }); return rows.map(mapPayment) }

  static async updatePayment(id: string, data: Partial<CreatePaymentData>, ownerScopeId: string): Promise<any> {
    const existing = await prisma.payment.findFirst({ where: { id, userId: ownerScopeId }, include: { invoice: { include: { payments: true, client: true } }, user: true } })
    if (!existing) throw new Error('Paiement non trouvé')
    if (data.amount !== undefined) { const otherTotal = (existing.invoice.payments || []).filter((item: any) => item.id !== id).reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0); if (data.amount + otherTotal > Number(existing.invoice.total || 0)) throw new Error('Le nouveau montant dépasse le total restant') }
    const payment = await prisma.payment.update({ where: { id }, data: { ...(data.amount !== undefined && { amount: data.amount }), ...(data.paymentDate && { paymentDate: data.paymentDate }), ...(data.paymentMethod && { paymentMethod: paymentMethod(data.paymentMethod) }), ...(data.reference !== undefined && { reference: data.reference }), ...(data.notes !== undefined && { notes: data.notes }) }, include: { invoice: { include: { client: true } }, user: true } })
    await this.refreshInvoicePaymentState(existing.invoiceId, ownerScopeId)
    return mapPayment(payment)
  }

  static async deletePayment(id: string, ownerScopeId: string): Promise<void> { const payment = await prisma.payment.findFirst({ where: { id, userId: ownerScopeId } }); if (!payment) throw new Error('Paiement non trouvé'); await prisma.payment.delete({ where: { id } }); await this.refreshInvoicePaymentState(payment.invoiceId, ownerScopeId) }
  static async generatePaymentReminders(_ownerScopeId?: string, _actorUserId?: string): Promise<any[]> { logger.warn('Relances indisponibles: modèle PaymentReminder absent du schéma actif'); return [] }
  static async getPaymentReminders(_ownerScopeId: string, pagination: PaginationParams, _filters?: ReminderFilters): Promise<PaginationResponse<any>> { return { data: [], pagination: { page: pagination.page || 1, limit: pagination.limit || 10, total: 0, totalPages: 0 } } }
  static async markReminderAsSent(_id?: string, _ownerScopeId?: string): Promise<any> { throw new Error('Le module de relances n\'est pas disponible sur le schéma Prisma actif') }

  static async getPaymentStats(ownerScopeId: string) {
    const [payments, invoices] = await Promise.all([prisma.payment.findMany({ where: { userId: ownerScopeId } }), prisma.invoice.findMany({ where: { userId: ownerScopeId }, include: { payments: true } })])
    const now = new Date(), start = new Date(now.getFullYear(), now.getMonth(), 1), end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const totalAmount = payments.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0), monthly = payments.filter((item: any) => item.paymentDate >= start && item.paymentDate <= end)
    const pending = invoices.reduce((sum: number, inv: any) => sum + Math.max(Number(inv.total || 0) - (inv.payments || []).reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0), 0), 0)
    const overdueCount = invoices.filter((inv: any) => inv.dueDate && inv.dueDate < now && (inv.payments || []).reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0) < Number(inv.total || 0)).length
    const methods = Object.entries(payments.reduce((acc: Record<string, { amount: number; count: number }>, item: any) => { const key = paymentMethod(item.paymentMethod); acc[key] = acc[key] || { amount: 0, count: 0 }; acc[key].amount += Number(item.amount || 0); acc[key].count += 1; return acc }, {})).map(([method, value]) => ({ method, amount: value.amount, count: value.count }))
    return { totalPayments: payments.length, totalCount: payments.length, totalAmount, averageAmount: payments.length ? totalAmount / payments.length : 0, monthlyAmount: monthly.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0), monthlyCount: monthly.length, pendingAmount: pending, overdueCount, methodDistribution: methods, methodBreakdown: Object.fromEntries(methods.map((item) => [item.method, item.count])) }
  }

  private static async refreshInvoicePaymentState(invoiceId: string, ownerScopeId: string) {
    const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, userId: ownerScopeId }, include: { payments: true } }); if (!invoice) return
    const paid = (invoice.payments || []).reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0)
    const status = paid >= Number(invoice.total || 0) ? 'paid' : paid > 0 ? 'partial' : invoice.dueDate && invoice.dueDate < new Date() ? 'overdue' : 'issued'
    await prisma.invoice.update({ where: { id: invoiceId }, data: { status, paidDate: paid >= Number(invoice.total || 0) ? new Date() : null } })
  }
  private static async generatePaymentNumber(ownerScopeId: string) { const year = new Date().getFullYear(), prefix = `PAY-${year}-`, last = await prisma.payment.findFirst({ where: { userId: ownerScopeId, paymentNumber: { startsWith: prefix } }, orderBy: { paymentNumber: 'desc' } }); const next = (last?.paymentNumber ? parseInt(String(last.paymentNumber).split('-').pop() || '0', 10) : 0) + 1; return `${prefix}${String(next).padStart(4, '0')}` }
}

