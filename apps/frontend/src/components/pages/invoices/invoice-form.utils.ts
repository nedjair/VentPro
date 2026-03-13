import type { Invoice, InvoiceItem, Order } from '@/lib/api'

interface InvoiceFormValidationInput {
  clientId: string
  invoiceDate: string
  dueDate: string
  items: InvoiceItem[]
}

interface InvoiceFormValidationResult {
  isValid: boolean
  errors: string[]
  validItems: InvoiceItem[]
}

const invoiceEligibleOrderStatuses = ['DRAFT', 'QUOTE', 'ORDER', 'ACCEPTED', 'SENT']

export function getAvailableOrdersForInvoicing(orders: Order[], invoices: Invoice[]): Order[] {
  const usedOrderIds = new Set(invoices.map((invoice) => invoice.orderId).filter(Boolean))

  return orders.filter((order) => {
    if (!order || !order.id) {
      return false
    }

    return invoiceEligibleOrderStatuses.includes(order.status) && !usedOrderIds.has(order.id)
  })
}

export function validateInvoiceFormSubmission(input: InvoiceFormValidationInput): InvoiceFormValidationResult {
  const errors: string[] = []

  if (!input.clientId) {
    errors.push('Veuillez sélectionner un client')
  }

  if (!input.invoiceDate) {
    errors.push('Veuillez saisir une date de facture')
  }

  if (!input.dueDate) {
    errors.push('Veuillez saisir une date d\'échéance')
  }

  if (input.invoiceDate && input.dueDate) {
    const invoiceDate = new Date(input.invoiceDate)
    const dueDate = new Date(input.dueDate)
    if (dueDate < invoiceDate) {
      errors.push('La date d\'échéance ne peut pas être antérieure à la date de facture')
    }
  }

  const validItems = input.items.filter((item) =>
    item.productId && item.quantity > 0 && item.unitPrice > 0
  )

  if (validItems.length === 0) {
    errors.push('Veuillez ajouter au moins un article avec une quantité et un prix valides')
  }

  const invalidItems = input.items.filter((item) =>
    item.productId && (item.quantity <= 0 || item.unitPrice <= 0)
  )

  if (invalidItems.length > 0) {
    errors.push('Certains articles ont des quantités ou prix invalides (doivent être supérieurs à 0)')
  }

  return {
    isValid: errors.length === 0,
    errors,
    validItems,
  }
}

function extractHttpError(rawMessage: string): { statusCode?: number; serverMessage?: string } {
  const httpMatch = rawMessage.match(/^HTTP\s+(\d+)\s*:\s*(.+)$/i)
  if (!httpMatch) {
    return {}
  }

  return {
    statusCode: Number(httpMatch[1]),
    serverMessage: httpMatch[2]?.trim(),
  }
}

export function normalizeInvoiceSubmitError(error: unknown): string {
  const fallback = 'Erreur de sauvegarde'

  if (!(error instanceof Error)) {
    return fallback
  }

  const rawMessage = (error.message || '').trim()
  const { statusCode, serverMessage } = extractHttpError(rawMessage)

  if (statusCode === 401 || /unauthorized/i.test(rawMessage)) {
    return 'Erreur d\'authentification. Veuillez vous reconnecter.'
  }

  if (statusCode === 404 || /not found/i.test(rawMessage)) {
    return 'Client ou produit non trouvé. Vérifiez vos sélections.'
  }

  if (statusCode === 500 || /internal server error/i.test(rawMessage)) {
    return 'Erreur serveur. Veuillez réessayer plus tard.'
  }

  if (/network error|failed to fetch|fetch|timeout|timed out/i.test(rawMessage)) {
    return 'Erreur de connexion. Vérifiez votre connexion internet.'
  }

  if (statusCode === 400) {
    if (serverMessage && !/bad request/i.test(serverMessage)) {
      if (/unique constraint.*orderid|already.*invoic|déjà.*factur/i.test(serverMessage)) {
        return 'Cette commande est déjà facturée. Veuillez sélectionner une autre commande.'
      }
      return serverMessage
    }
    return 'Données invalides. Vérifiez les champs obligatoires et les montants.'
  }

  if (/unique constraint.*orderid|already.*invoic|déjà.*factur/i.test(rawMessage)) {
    return 'Cette commande est déjà facturée. Veuillez sélectionner une autre commande.'
  }

  return rawMessage || fallback
}
