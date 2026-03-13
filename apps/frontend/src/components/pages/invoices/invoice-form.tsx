'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Save, ArrowLeft, Plus, Trash2, AlertTriangle, FileText, Package, Calculator } from 'lucide-react'
import { api, Client, Product, Invoice, InvoiceItem, Order } from '@/lib/api'
import { ensureApiAuthentication } from '@/lib/auth-utils'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getAvailableOrdersForInvoicing, normalizeInvoiceSubmitError, validateInvoiceFormSubmission } from './invoice-form.utils'

interface InvoiceFormPageProps {
  invoiceId?: string
}

const nativeSelectClass =
  'flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
const queryLimit = 100

export function InvoiceFormPage({ invoiceId }: InvoiceFormPageProps) {
  const router = useRouter()
  const isEditing = !!invoiceId
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  
  const [formData, setFormData] = useState({
    type: 'INVOICE' as 'INVOICE' | 'CREDIT_NOTE' | 'PROFORMA',
    clientId: '',
    orderId: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +30 jours
    notes: '',
    paymentMethod: '',
  })
  
  // @ts-ignore - Nous initialisons avec un objet partiel, les valeurs manquantes seront calculées
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: '',
      invoiceId: '',
      productId: '',
      quantity: 1,
      unitPrice: 0,
      vatRate: 20,
      discount: 0,
      totalHT: 0,
      totalVAT: 0,
      totalTTC: 0
    }
  ])

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (isEditing && invoiceId) {
      loadInvoice()
    }
  }, [isEditing, invoiceId])

  const ensureAuthentication = () => ensureApiAuthentication()
  const requestWithRetry = async <T,>(requestFn: () => Promise<T>, retries = 1): Promise<T> => {
    try {
      return await requestFn()
    } catch (error) {
      if (retries <= 0) {
        throw error
      }
      return requestWithRetry(requestFn, retries - 1)
    }
  }

  const loadInitialData = async () => {
    try {
      setLoading(true)
      console.log('🔄 INVOICE FORM: Début du chargement des données initiales')

      // S'assurer que l'utilisateur est authentifié
      const isAuthenticated = await ensureAuthentication()
      if (!isAuthenticated) {
        console.error('❌ INVOICE FORM: Échec de l\'authentification')
        setError('Erreur d\'authentification. Impossible de charger les données.')
        return
      }

      console.log('✅ INVOICE FORM: Authentification réussie, chargement des données...')

      const [clientsResult, productsResult, ordersResult, invoicesResult] = await Promise.allSettled([
        requestWithRetry(() => api.getClients({ limit: queryLimit })),
        requestWithRetry(() => api.getProducts({ limit: queryLimit })),
        requestWithRetry(() => api.getOrders({ limit: queryLimit })),
        requestWithRetry(() => api.getInvoices({ limit: queryLimit })),
      ])

      const clientsResponse = clientsResult.status === 'fulfilled' ? clientsResult.value : null
      const productsResponse = productsResult.status === 'fulfilled' ? productsResult.value : null
      const ordersResponse = ordersResult.status === 'fulfilled' ? ordersResult.value : null
      const invoicesResponse = invoicesResult.status === 'fulfilled' ? invoicesResult.value : null

      console.log('📊 INVOICE FORM: Réponses reçues:', {
        clients: { success: clientsResponse?.success, dataType: typeof clientsResponse?.data, hasData: !!clientsResponse?.data },
        products: { success: productsResponse?.success, dataType: typeof productsResponse?.data, hasData: !!productsResponse?.data },
        orders: { success: ordersResponse?.success, dataType: typeof ordersResponse?.data, hasData: !!ordersResponse?.data },
        invoices: { success: invoicesResponse?.success, dataType: typeof invoicesResponse?.data, hasData: !!invoicesResponse?.data }
      })

      if (clientsResponse?.success && clientsResponse.data) {
        const clientsData = clientsResponse.data.data || clientsResponse.data
        console.log('👥 INVOICE FORM: Clients chargés:', Array.isArray(clientsData) ? clientsData.length : 'Non-array', clientsData)
        setClients(Array.isArray(clientsData) ? clientsData : [])
      } else {
        console.warn('⚠️ INVOICE FORM: Échec du chargement des clients:', clientsResponse)
        setClients([])
      }

      if (productsResponse?.success && productsResponse.data) {
        const productsData = productsResponse.data.data || productsResponse.data
        console.log('📦 INVOICE FORM: Produits chargés:', Array.isArray(productsData) ? productsData.length : 'Non-array', productsData)
        setProducts(Array.isArray(productsData) ? productsData : [])
      } else {
        console.warn('⚠️ INVOICE FORM: Échec du chargement des produits:', productsResponse)
        setProducts([])
      }

      if (ordersResponse?.success && ordersResponse.data) {
        const ordersData = (ordersResponse.data.data || ordersResponse.data) as Order[]
        const invoicesData: Invoice[] = invoicesResponse?.success && invoicesResponse.data
          ? ((invoicesResponse.data.data || []) as Invoice[])
          : []

        if (Array.isArray(ordersData)) {
          setOrders(getAvailableOrdersForInvoicing(ordersData, invoicesData))
        } else {
          setOrders([])
        }
      } else {
        setOrders([])
      }

      if (!invoicesResponse?.success) {
        console.warn('⚠️ INVOICE FORM: Échec du chargement des factures, la page continue sans exclusion avancée', invoicesResult)
      }

      if (!clientsResponse?.success || !productsResponse?.success || !ordersResponse?.success) {
        setError('Certaines données n’ont pas pu être chargées. Veuillez actualiser la page.')
      } else {
        setError(null)
      }

      console.log('✅ INVOICE FORM: Chargement des données terminé')
    } catch (err) {
      console.error('❌ INVOICE FORM: Erreur lors du chargement des données:', err)

      let errorMessage = 'Erreur de chargement'
      if (err instanceof Error) {
        if (err.message.includes('401')) {
          errorMessage = 'Erreur d\'authentification. Veuillez vous reconnecter.'
        } else {
          errorMessage = err.message
        }
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const loadInvoice = async () => {
    if (!invoiceId) return

    try {
      // S'assurer que l'utilisateur est authentifié
      const isAuthenticated = await ensureAuthentication()
      if (!isAuthenticated) {
        setError('Erreur d\'authentification. Impossible de charger la facture.')
        return
      }

      const response = await api.getInvoice(invoiceId)
      if (response.success && response.data) {
        const invoice = response.data
        setFormData({
          type: 'INVOICE',
          clientId: invoice.clientId,
          orderId: invoice.orderId || '',
          invoiceDate: invoice.invoiceDate ? invoice.invoiceDate.split('T')[0] : new Date().toISOString().split('T')[0],
          dueDate: invoice.dueDate ? invoice.dueDate.split('T')[0] : '',
          notes: invoice.notes || '',
          paymentMethod: 'BANK_TRANSFER',
        })
        setItems(invoice.items)
      }
    } catch (err) {
      console.error('Erreur lors du chargement de la facture:', err)

      let errorMessage = 'Erreur de chargement'
      if (err instanceof Error) {
        if (err.message.includes('401')) {
          errorMessage = 'Erreur d\'authentification. Veuillez vous reconnecter.'
        } else {
          errorMessage = err.message
        }
      }

      setError(errorMessage)
    }
  }

  const loadOrderItems = async (orderId: string) => {
    if (!orderId) return
    
    try {
      const response = await api.getOrder(orderId)
      if (response.success && response.data) {
        const order = response.data
        setFormData(prev => ({ ...prev, clientId: order.clientId }))
        // @ts-ignore - Les items de la commande sont compatibles avec les items de la facture
        setItems(order.items.map(item => ({
          id: item.id || '',
          invoiceId: '',
          productId: item.productId,
          product: item.product,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          vatRate: item.vatRate,
          discount: item.discount || 0,
          totalHT: item.totalHT,
          totalVAT: item.totalVAT,
          totalTTC: item.totalTTC
        })))
      }
    } catch (err) {
      console.error('Erreur lors du chargement de la commande:', err)
    }
  }

  const addItem = () => {
    // @ts-ignore - Nous initialisons avec un objet partiel, les valeurs manquantes seront calculées
    setItems([...items, {
      id: '',
      invoiceId: '',
      productId: '',
      quantity: 1,
      unitPrice: 0,
      vatRate: 19, // TVA algérienne
      discount: 0,
      totalHT: 0,
      totalVAT: 0,
      totalTTC: 0
    }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // Si on change le produit, mettre à jour le prix
    if (field === 'productId') {
      const product = products.find(p => p.id === value)
      if (product) {
        newItems[index].unitPrice = product.price
      }
    }
    
    setItems(newItems)
  }

  const calculateTotals = () => {
    let subtotal = 0
    let vatAmount = 0

    items.forEach(item => {
      if (item.productId && item.quantity > 0 && item.unitPrice > 0) {
        const itemSubtotal = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100)
        const itemVat = itemSubtotal * (item.vatRate / 100)
        
        subtotal += itemSubtotal
        vatAmount += itemVat
      }
    })

    return {
      subtotal: Number(subtotal.toFixed(2)),
      vatAmount: Number(vatAmount.toFixed(2)),
      total: Number((subtotal + vatAmount).toFixed(2))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const validation = validateInvoiceFormSubmission({
      clientId: formData.clientId,
      invoiceDate: formData.invoiceDate,
      dueDate: formData.dueDate,
      items,
    })

    if (!validation.isValid) {
      setError(validation.errors.join(' • '))
      return
    }

    const validItems = validation.validItems

    try {
      setSaving(true)
      setError(null)

      // S'assurer que l'utilisateur est authentifié
      const isAuthenticated = await ensureAuthentication()
      if (!isAuthenticated) {
        setError('Erreur d\'authentification. Veuillez vous connecter.')
        return
      }

      // @ts-ignore - Nous utilisons un type partiel pour la création/mise à jour
      const invoiceData = {
        ...formData,
        orderId: formData.orderId || undefined,
        items: validItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          vatRate: item.vatRate || 19, // TVA algérienne 19%
          discount: item.discount || 0,
        }))
      }

      console.log(`💾 ${isEditing ? 'Modification' : 'Création'} de la facture...`)

      let response
      if (isEditing && invoiceId) {
        // @ts-ignore - Nous utilisons un type partiel pour la mise à jour
        response = await api.updateInvoice(invoiceId, invoiceData)
        console.log('✅ Facture modifiée avec succès:', response)
      } else {
        // @ts-ignore - Nous utilisons un type partiel pour la création
        response = await api.createInvoice(invoiceData)
        console.log('✅ Facture créée avec succès:', response)
      }

      // Vérifier que la réponse est valide
      if (!response.success) {
        throw new Error(response.message || 'Erreur lors de la sauvegarde')
      }

      // Redirection avec message de succès
      const successMessage = isEditing ? 'Facture modifiée avec succès' : 'Facture créée avec succès'
      console.log(`✅ ${successMessage}`)

      // Rediriger vers la liste des factures avec un paramètre pour forcer le rechargement
      const timestamp = Date.now()
      router.push(`/invoices?refresh=${timestamp}`)
    } catch (err) {
      console.error('❌ Erreur lors de la sauvegarde:', err)
      setError(normalizeInvoiceSubmitError(err))
    } finally {
      setSaving(false)
    }
  }

  const totals = calculateTotals()

  if (loading) {
    return (
      <MainLayout title={isEditing ? 'Modifier la facture' : 'Nouvelle facture'}>
        <Card className="mx-auto max-w-4xl">
          <CardContent className="flex items-center justify-center gap-3 py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            <span className="text-sm text-muted-foreground">Chargement de la facture...</span>
          </CardContent>
        </Card>
      </MainLayout>
    )
  }

  return (
    <MainLayout 
      title={isEditing ? 'Modifier la facture' : 'Nouvelle facture'}
      subtitle={isEditing ? `Modification de la facture ${invoiceId}` : 'Créer une nouvelle facture'}
    >
      <div className="mx-auto max-w-5xl space-y-6">
        {error && (
          <Card className="border-red-200 bg-red-50/80 shadow-none">
            <CardContent className="flex items-start gap-3 p-5">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-red-500" />
              <div className="space-y-2">
                <p className="text-sm font-semibold text-red-700">Erreur de validation</p>
                <div className="text-sm text-red-600">
                  {error.includes('•') ? (
                    <ul className="list-disc list-inside space-y-1">
                      {error.split(' • ').map((err, index) => (
                        <li key={index}>{err}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>{error}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <CardTitle>Informations générales</CardTitle>
                  </div>
                  <CardDescription>
                    Définissez le type de document, le client, les dates et les informations de paiement.
                  </CardDescription>
                </div>
                <Badge variant="outline">{isEditing ? 'Modification' : 'Création'}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="invoice-type">Type *</Label>
                <select
                  id="invoice-type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'INVOICE' | 'CREDIT_NOTE' | 'PROFORMA' })}
                  className={nativeSelectClass}
                  required
                >
                  <option value="INVOICE">Facture</option>
                  <option value="CREDIT_NOTE">Avoir</option>
                  <option value="PROFORMA">Proforma</option>
                </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linked-order">Commande liée</Label>
                <select
                  id="linked-order"
                  value={formData.orderId}
                  onChange={(e) => {
                    setFormData({ ...formData, orderId: e.target.value })
                    if (e.target.value) {
                      loadOrderItems(e.target.value)
                    }
                  }}
                  className={nativeSelectClass}
                >
                  <option value="">Sélectionner une commande (optionnel)</option>
                  {Array.isArray(orders) ? orders.map((order) => {
                    // Programmation défensive : vérifier que l'order existe et a les propriétés nécessaires
                    if (!order || !order.id) {
                      console.warn('⚠️ Commande invalide détectée:', order)
                      return null
                    }

                    // Utiliser les bonnes propriétés du backend : number (pas reference) et total (pas totalTTC)
                    const orderNumber = (order as any).number || (order as any).reference || 'N/A'
                    const orderTotal = (order as any).total || (order as any).totalTTC || 0
                    const orderStatus = order.status || 'UNKNOWN'

                    // Nom du client avec programmation défensive
                    let clientName = 'Client inconnu'
                    if (order.client) {
                      if (order.client.type === 'COMPANY' && order.client.companyName) {
                        clientName = order.client.companyName
                      } else if (order.client.firstName || order.client.lastName) {
                        clientName = `${order.client.firstName || ''} ${order.client.lastName || ''}`.trim()
                      } else if (order.client.email) {
                        clientName = order.client.email
                      }
                    }

                    // Indicateur de statut pour l'utilisateur
                    const statusLabel = {
                      'DRAFT': '📝',
                      'QUOTE': '💭',
                      'SENT': '📤',
                      'ORDER': '📋',
                      'ACCEPTED': '✅'
                    }[orderStatus] || '❓'

                    return (
                      <option key={order.id} value={order.id}>
                        {statusLabel} {orderNumber} - {clientName} - {new Intl.NumberFormat('fr-DZ', {
                          style: 'currency',
                          currency: 'DZD',
                          minimumFractionDigits: 2,
                        }).format(orderTotal)}
                      </option>
                    )
                  }).filter(Boolean) : []}
                </select>
                {Array.isArray(orders) && orders.length === 0 && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                    <p className="font-medium">💡 Aucune commande disponible</p>
                    <p className="text-xs mt-1">
                      Vous pouvez créer une facture sans commande liée, ou <a href="/orders/new" className="text-blue-700 underline">créer une commande</a> d'abord.
                    </p>
                  </div>
                )}
                {Array.isArray(orders) && orders.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <p>💡 Légende: 📝 Brouillon • 💭 Devis • 📤 Envoyée • 📋 Commande • ✅ Acceptée</p>
                  </div>
                )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice-client">Client *</Label>
                <select
                  id="invoice-client"
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className={nativeSelectClass}
                  required
                >
                  <option value="">Sélectionner un client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.type === 'COMPANY' 
                        ? client.companyName 
                        : `${client.firstName} ${client.lastName}`
                      } - {client.email}
                    </option>
                  ))}
                </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment-method">Méthode de paiement</Label>
                <select
                  id="payment-method"
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className={nativeSelectClass}
                >
                  <option value="">Sélectionner une méthode</option>
                  <option value="BANK_TRANSFER">Virement bancaire</option>
                  <option value="CHECK">Chèque</option>
                  <option value="CASH">Espèces</option>
                  <option value="CARD">Carte bancaire</option>
                  <option value="PAYPAL">PayPal</option>
                  <option value="OTHER">Autre</option>
                </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice-date">Date de facture *</Label>
                <Input
                  id="invoice-date"
                  type="date"
                  value={formData.invoiceDate}
                  onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                  required
                />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice-due-date">Date d'échéance *</Label>
                <Input
                  id="invoice-due-date"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  required
                />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-2xl bg-emerald-500/10 p-2 text-emerald-600">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Articles</CardTitle>
                    <CardDescription>Ajoutez les lignes de facturation et les informations de TVA/remise.</CardDescription>
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un article
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-muted/30 p-4 transition-colors md:grid-cols-2 xl:grid-cols-12 xl:items-end">
                  <div className="space-y-2 xl:col-span-4">
                    <Label htmlFor={`invoice-item-product-${index}`}>Produit *</Label>
                    <select
                      id={`invoice-item-product-${index}`}
                      value={item.productId}
                      onChange={(e) => updateItem(index, 'productId', e.target.value)}
                      className={nativeSelectClass}
                      required
                    >
                      <option value="">Sélectionner un produit</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} - {new Intl.NumberFormat('fr-DZ', {
                            style: 'currency',
                            currency: 'DZD',
                            minimumFractionDigits: 2,
                          }).format(product.price)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 xl:col-span-2">
                    <Label htmlFor={`invoice-item-quantity-${index}`}>Quantité *</Label>
                    <Input
                      id={`invoice-item-quantity-${index}`}
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                      required
                    />
                  </div>

                  <div className="space-y-2 xl:col-span-2">
                    <Label htmlFor={`invoice-item-price-${index}`}>Prix unitaire *</Label>
                    <Input
                      id={`invoice-item-price-${index}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>

                  <div className="space-y-2 xl:col-span-2">
                    <Label htmlFor={`invoice-item-vat-${index}`}>TVA (%)</Label>
                    <Input
                      id={`invoice-item-vat-${index}`}
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={item.vatRate}
                      onChange={(e) => updateItem(index, 'vatRate', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-2 xl:col-span-1">
                    <Label htmlFor={`invoice-item-discount-${index}`}>Remise (%)</Label>
                    <Input
                      id={`invoice-item-discount-${index}`}
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={item.discount}
                      onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="xl:col-span-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={`Supprimer l'article ${index + 1}`}
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                      className="w-full text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <Card className="border border-dashed border-primary/25 bg-primary/5 shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 pb-3">
                    <Calculator className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">Récapitulatif</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sous-total HT</span>
                      <span className="font-medium text-foreground">{new Intl.NumberFormat('fr-DZ', {
                      style: 'currency',
                      currency: 'DZD',
                      minimumFractionDigits: 2,
                    }).format(totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">TVA (19%)</span>
                      <span className="font-medium text-foreground">{new Intl.NumberFormat('fr-DZ', {
                        style: 'currency',
                        currency: 'DZD',
                        minimumFractionDigits: 2,
                      }).format(totals.vatAmount)}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                      <span className="text-foreground">Total TTC</span>
                      <span className="text-foreground">{new Intl.NumberFormat('fr-DZ', {
                      style: 'currency',
                      currency: 'DZD',
                      minimumFractionDigits: 2,
                    }).format(totals.total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>Ces notes apparaîtront sur le document final.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="invoice-notes">Notes de facturation</Label>
                <Textarea
                  id="invoice-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  placeholder="Notes visibles sur la facture..."
                />
              </div>
            </CardContent>
          </Card>
          <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
            <Link href="/invoices">
              <Button type="button" variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Annuler
              </Button>
            </Link>
            <Button type="submit" size="sm" disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Sauvegarde...' : (isEditing ? 'Mettre à jour' : 'Créer')}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  )
}
