'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Save, ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { api, Client, Product, Invoice, InvoiceItem, Order } from '@/lib/api'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface InvoiceFormPageProps {
  invoiceId?: string
}

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

  // Fonction d'authentification automatique
  const ensureAuthentication = async () => {
    const authToken = api.getAuthToken()
    if (authToken) {
      return true
    }

    try {
      console.log('🔐 Tentative de connexion automatique...')
      const loginResponse = await api.login({
        email: 'admin@gctpe.dz',
        password: 'admin123'
      })

      if (loginResponse.success && loginResponse.data?.token) {
        api.setAuthToken(loginResponse.data.token)

        if (typeof window !== 'undefined') {
          localStorage.setItem('auth-tokens', JSON.stringify({
            accessToken: loginResponse.data.token,
            refreshToken: loginResponse.data.refreshToken || null
          }))
          localStorage.setItem('auth-user', JSON.stringify(loginResponse.data.user))
        }

        console.log('✅ Connexion automatique réussie')
        return true
      }
    } catch (error) {
      console.error('❌ Échec de la connexion automatique:', error)
    }

    return false
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

      const [clientsResponse, productsResponse, ordersResponse] = await Promise.all([
        api.getClients({ limit: 100 }),
        api.getProducts({ limit: 100 }),
        // Charger toutes les commandes, puis filtrer côté frontend pour plus de flexibilité
        api.getOrders({ limit: 100 })
      ])

      console.log('📊 INVOICE FORM: Réponses reçues:', {
        clients: { success: clientsResponse.success, dataType: typeof clientsResponse.data, hasData: !!clientsResponse.data },
        products: { success: productsResponse.success, dataType: typeof productsResponse.data, hasData: !!productsResponse.data },
        orders: { success: ordersResponse.success, dataType: typeof ordersResponse.data, hasData: !!ordersResponse.data }
      })

      if (clientsResponse.success && clientsResponse.data) {
        const clientsData = clientsResponse.data.data || clientsResponse.data
        console.log('👥 INVOICE FORM: Clients chargés:', Array.isArray(clientsData) ? clientsData.length : 'Non-array', clientsData)
        setClients(Array.isArray(clientsData) ? clientsData : [])
      } else {
        console.warn('⚠️ INVOICE FORM: Échec du chargement des clients:', clientsResponse)
        setClients([])
      }

      if (productsResponse.success && productsResponse.data) {
        const productsData = productsResponse.data.data || productsResponse.data
        console.log('📦 INVOICE FORM: Produits chargés:', Array.isArray(productsData) ? productsData.length : 'Non-array', productsData)
        setProducts(Array.isArray(productsData) ? productsData : [])
      } else {
        console.warn('⚠️ INVOICE FORM: Échec du chargement des produits:', productsResponse)
        setProducts([])
      }

      if (ordersResponse.success && ordersResponse.data) {
        const ordersData = ordersResponse.data.data || ordersResponse.data

        if (Array.isArray(ordersData)) {

          // Filtrer les commandes appropriées pour la facturation
          // Inclure : DRAFT, QUOTE, ORDER, ACCEPTED (éviter CANCELLED, DELIVERED, EXPIRED)
          const suitableOrders = ordersData.filter(order => {
            if (!order || !order.id) {
              return false
            }

            // Statuts appropriés pour la facturation (inclut DRAFT qui est le statut par défaut)
            const suitableStatuses = ['DRAFT', 'QUOTE', 'ORDER', 'ACCEPTED', 'SENT']
            return suitableStatuses.includes(order.status)
          })



          setOrders(suitableOrders)
        } else {
          setOrders([])
        }
      } else {
        setOrders([])
      }

      console.log('✅ INVOICE FORM: Chargement des données terminé avec succès')
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

    // Validation des champs obligatoires
    const validationErrors: string[] = []

    if (!formData.clientId) {
      validationErrors.push('Veuillez sélectionner un client')
    }

    if (!formData.invoiceDate) {
      validationErrors.push('Veuillez saisir une date de facture')
    }

    if (!formData.dueDate) {
      validationErrors.push('Veuillez saisir une date d\'échéance')
    }

    // Validation des dates
    if (formData.invoiceDate && formData.dueDate) {
      const invoiceDate = new Date(formData.invoiceDate)
      const dueDate = new Date(formData.dueDate)

      if (dueDate < invoiceDate) {
        validationErrors.push('La date d\'échéance ne peut pas être antérieure à la date de facture')
      }
    }

    // Validation des articles
    const validItems = items.filter(item =>
      item.productId && item.quantity > 0 && item.unitPrice > 0
    )

    if (validItems.length === 0) {
      validationErrors.push('Veuillez ajouter au moins un article avec une quantité et un prix valides')
    }

    // Vérifier que tous les articles ont des données valides
    const invalidItems = items.filter((item, index) =>
      item.productId && (item.quantity <= 0 || item.unitPrice <= 0)
    )

    if (invalidItems.length > 0) {
      validationErrors.push('Certains articles ont des quantités ou prix invalides (doivent être supérieurs à 0)')
    }

    // Afficher toutes les erreurs de validation
    if (validationErrors.length > 0) {
      setError(validationErrors.join(' • '))
      return
    }

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

      let errorMessage = 'Erreur de sauvegarde'
      if (err instanceof Error) {
        if (err.message.includes('401') || err.message.includes('Unauthorized')) {
          errorMessage = 'Erreur d\'authentification. Veuillez vous reconnecter.'
        } else if (err.message.includes('400') || err.message.includes('Bad Request')) {
          errorMessage = 'Données invalides. Vérifiez les champs obligatoires et les montants.'
        } else if (err.message.includes('404') || err.message.includes('Not Found')) {
          errorMessage = 'Client ou produit non trouvé. Vérifiez vos sélections.'
        } else if (err.message.includes('500') || err.message.includes('Internal Server Error')) {
          errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.'
        } else if (err.message.includes('Network Error') || err.message.includes('fetch')) {
          errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet.'
        } else {
          errorMessage = err.message || 'Une erreur inattendue s\'est produite'
        }
      }

      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const totals = calculateTotals()

  const actions = (
    <div className="flex space-x-2">
      <Link href="/invoices">
        <Button variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
      </Link>
    </div>
  )

  if (loading) {
    return (
      <MainLayout title={isEditing ? 'Modifier la facture' : 'Nouvelle facture'}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Chargement...</span>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout 
      title={isEditing ? 'Modifier la facture' : 'Nouvelle facture'}
      subtitle={isEditing ? `Modification de la facture ${invoiceId}` : 'Créer une nouvelle facture'}
      actions={actions}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Message d'erreur */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Erreur de validation
                </h3>
                <div className="mt-2 text-sm text-red-700">
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
            </div>
          </div>
        )}

        {/* Informations générales */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium">Informations générales</h3>
          </div>
          <div className="card-content">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'INVOICE' | 'CREDIT_NOTE' | 'PROFORMA' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="INVOICE">Facture</option>
                  <option value="CREDIT_NOTE">Avoir</option>
                  <option value="PROFORMA">Proforma</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commande liée
                </label>
                <select
                  value={formData.orderId}
                  onChange={(e) => {
                    setFormData({ ...formData, orderId: e.target.value })
                    if (e.target.value) {
                      loadOrderItems(e.target.value)
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner une commande (optionnel)</option>
                  {Array.isArray(orders) ? orders.map((order) => {
                    // Programmation défensive : vérifier que l'order existe et a les propriétés nécessaires
                    if (!order || !order.id) {
                      console.warn('⚠️ Commande invalide détectée:', order)
                      return null
                    }

                    // Utiliser les bonnes propriétés du backend : number (pas reference) et total (pas totalTTC)
                    const orderNumber = order.number || order.reference || 'N/A'
                    const orderTotal = order.total || order.totalTTC || 0
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
                  <div className="text-sm text-blue-600 mt-1 p-2 bg-blue-50 rounded border border-blue-200">
                    <p className="font-medium">💡 Aucune commande disponible</p>
                    <p className="text-xs mt-1">
                      Vous pouvez créer une facture sans commande liée, ou <a href="/orders/new" className="text-blue-700 underline">créer une commande</a> d'abord.
                    </p>
                  </div>
                )}
                {Array.isArray(orders) && orders.length > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    <p>💡 Légende: 📝 Brouillon • 💭 Devis • 📤 Envoyée • 📋 Commande • ✅ Acceptée</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client *
                </label>
                <select
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Méthode de paiement
                </label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de facture *
                </label>
                <input
                  type="date"
                  value={formData.invoiceDate}
                  onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date d'échéance *
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Articles */}
        <div className="card">
          <div className="card-header">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Articles</h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un article
              </Button>
            </div>
          </div>
          <div className="card-content">
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-4 items-end p-4 border border-gray-200 rounded-lg">
                  <div className="col-span-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Produit *
                    </label>
                    <select
                      value={item.productId}
                      onChange={(e) => updateItem(index, 'productId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantité *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prix unitaire *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      TVA (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={item.vatRate}
                      onChange={(e) => updateItem(index, 'vatRate', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Remise (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={item.discount}
                      onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Totaux */}
            <div className="mt-6 border-t pt-6">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span>Sous-total HT:</span>
                    <span>{new Intl.NumberFormat('fr-DZ', {
                      style: 'currency',
                      currency: 'DZD',
                      minimumFractionDigits: 2,
                    }).format(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TVA (19%):</span>
                    <span>{new Intl.NumberFormat('fr-DZ', {
                      style: 'currency',
                      currency: 'DZD',
                      minimumFractionDigits: 2,
                    }).format(totals.vatAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total TTC:</span>
                    <span>{new Intl.NumberFormat('fr-DZ', {
                      style: 'currency',
                      currency: 'DZD',
                      minimumFractionDigits: 2,
                    }).format(totals.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium">Notes</h3>
          </div>
          <div className="card-content">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes de facturation
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Notes visibles sur la facture..."
              />
            </div>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <Link href="/invoices">
            <Button type="button" variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Annuler
            </Button>
          </Link>
          <Button
            type="submit"
            size="sm"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Sauvegarde...' : (isEditing ? 'Modifier' : 'Créer')}
          </Button>
        </div>
      </form>
    </MainLayout>
  )
}
