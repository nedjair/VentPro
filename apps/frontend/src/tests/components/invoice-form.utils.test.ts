import { describe, expect, it } from 'vitest'
import type { Invoice, InvoiceItem, Order } from '@/lib/api'
import { getAvailableOrdersForInvoicing, normalizeInvoiceSubmitError, validateInvoiceFormSubmission } from '@/components/pages/invoices/invoice-form.utils'

function makeItem(overrides: Partial<InvoiceItem> = {}): InvoiceItem {
  return {
    id: 'item-1',
    invoiceId: 'inv-1',
    productId: 'prod-1',
    quantity: 2,
    unitPrice: 100,
    vatRate: 19,
    discount: 0,
    totalHT: 200,
    totalVAT: 38,
    totalTTC: 238,
    ...overrides,
  }
}

function makeOrder(overrides: Partial<Order> = {}): Order {
  const base: any = {
    id: 'order-1',
    number: 'CMD-001',
    type: 'ORDER',
    status: 'ACCEPTED',
    clientId: 'client-1',
    orderDate: '2026-03-01T00:00:00.000Z',
    subtotal: 100,
    vatAmount: 19,
    total: 119,
    discount: 0,
    items: [],
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  }
  return { ...base, ...overrides } as Order
}

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  const base: any = {
    id: 'invoice-1',
    number: 'FAC-001',
    type: 'INVOICE',
    status: 'SENT',
    clientId: 'client-1',
    invoiceDate: '2026-03-01T00:00:00.000Z',
    dueDate: '2026-03-15T00:00:00.000Z',
    subtotal: 100,
    vatAmount: 19,
    total: 119,
    paidAmount: 0,
    discount: 0,
    items: [],
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  }
  return { ...base, ...overrides } as Invoice
}

describe('invoice-form validation utils', () => {
  it('valide sans erreur quand tous les champs requis sont correctement renseignés', () => {
    const result = validateInvoiceFormSubmission({
      clientId: 'client-1',
      invoiceDate: '2026-03-12',
      dueDate: '2026-03-20',
      items: [makeItem()],
    })

    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.validItems).toHaveLength(1)
  })

  it('retourne les erreurs légitimes quand les champs obligatoires sont manquants', () => {
    const result = validateInvoiceFormSubmission({
      clientId: '',
      invoiceDate: '',
      dueDate: '',
      items: [],
    })

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Veuillez sélectionner un client')
    expect(result.errors).toContain('Veuillez saisir une date de facture')
    expect(result.errors).toContain('Veuillez saisir une date d\'échéance')
    expect(result.errors).toContain('Veuillez ajouter au moins un article avec une quantité et un prix valides')
  })

  it('détecte les lignes invalides tout en conservant la validation des erreurs réelles', () => {
    const result = validateInvoiceFormSubmission({
      clientId: 'client-1',
      invoiceDate: '2026-03-20',
      dueDate: '2026-03-10',
      items: [makeItem({ quantity: 0 })],
    })

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('La date d\'échéance ne peut pas être antérieure à la date de facture')
    expect(result.errors).toContain('Certains articles ont des quantités ou prix invalides (doivent être supérieurs à 0)')
  })

  it('préserve le message backend explicite sur HTTP 400 au lieu d’un faux message générique', () => {
    const error = new Error('HTTP 400: Client non trouvé')
    const message = normalizeInvoiceSubmitError(error)

    expect(message).toBe('Client non trouvé')
  })

  it('garde un message générique pour un 400 sans détail exploitable', () => {
    const error = new Error('HTTP 400: Bad Request')
    const message = normalizeInvoiceSubmitError(error)

    expect(message).toBe('Données invalides. Vérifiez les champs obligatoires et les montants.')
  })

  it('convertit une erreur de contrainte unique orderId en message métier lisible', () => {
    const error = new Error('HTTP 400: Unique constraint failed on the fields: (`orderId`)')
    const message = normalizeInvoiceSubmitError(error)

    expect(message).toBe('Cette commande est déjà facturée. Veuillez sélectionner une autre commande.')
  })

  it('retire les commandes déjà facturées de la liste disponible', () => {
    const orders: Order[] = [
      makeOrder({ id: 'order-1', status: 'ACCEPTED' }),
      makeOrder({ id: 'order-2', status: 'SENT' }),
      makeOrder({ id: 'order-3', status: 'CANCELLED' }),
    ]
    const invoices: Invoice[] = [makeInvoice({ orderId: 'order-2' })]

    const result = getAvailableOrdersForInvoicing(orders, invoices)

    expect(result.map((order) => order.id)).toEqual(['order-1'])
  })
})
