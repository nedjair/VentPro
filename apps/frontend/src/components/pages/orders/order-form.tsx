'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Save, ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { api, Client, Product, Order, OrderItem } from '@/lib/api'
import { ensureApiAuthentication } from '@/lib/auth-utils'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

interface OrderFormPageProps {
  orderId?: string
}

export function OrderFormPage({ orderId }: OrderFormPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isEditing = !!orderId
  const requestedType = searchParams?.get('type')?.toUpperCase() === 'QUOTE' ? 'QUOTE' : 'ORDER'
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  
  const [formData, setFormData] = useState({
    type: requestedType as 'QUOTE' | 'ORDER',
    clientId: '',
    orderDate: new Date().toISOString().split('T')[0],
    validUntil: '',
    deliveryDate: '',
    notes: '',
    internalNotes: '',
  })
  const formType = isEditing ? formData.type : requestedType
  const isQuoteMode = formType === 'QUOTE'
  
  // @ts-ignore - Nous initialisons avec un objet partiel, les valeurs manquantes seront calculees
  const [items, setItems] = useState<OrderItem[]>([
    {
      id: '',
      orderId: '',
      productId: '',
      quantity: 1,
      unitPrice: 0,
      vatRate: 19, // TVA algerienne
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
    if (isEditing && orderId) {
      loadOrder()
    }
  }, [isEditing, orderId])

  useEffect(() => {
    if (!isEditing) {
      setFormData((prev) => ({
        ...prev,
        type: requestedType,
        validUntil: requestedType === 'QUOTE' ? prev.validUntil : '',
      }))
    }
  }, [isEditing, requestedType])

  const ensureAuthentication = () => ensureApiAuthentication()

  const loadInitialData = async () => {
    try {
      setLoading(true)

      // S'assurer que l'utilisateur est authentifie
      const isAuthenticated = await ensureAuthentication()
      if (!isAuthenticated) {
        setError('Erreur d\'authentification. Impossible de charger les donnees.')
        return
      }

      const [clientsResponse, productsResponse] = await Promise.all([
        api.getClients({ limit: 20 }),
        api.getProducts({ limit: 20 })
      ])

      if (clientsResponse.success && clientsResponse.data) {
        setClients(clientsResponse.data.data || clientsResponse.data)
      }

      if (productsResponse.success && productsResponse.data) {
        setProducts(productsResponse.data.data || productsResponse.data)
      }
    } catch (err) {
      console.error('Erreur lors du chargement des donnees:', err)

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

  const loadOrder = async () => {
    if (!orderId) return

    try {
      // S'assurer que l'utilisateur est authentifie
      const isAuthenticated = await ensureAuthentication()
      if (!isAuthenticated) {
        setError('Erreur d\'authentification. Impossible de charger la commande.')
        return
      }

      const response = await api.getOrder(orderId)
      if (response.success && response.data) {
        const order = response.data
        setFormData({
          type: 'ORDER' as const,
          clientId: order.clientId,
          orderDate: new Date().toISOString().split('T')[0],
          validUntil: '',
          deliveryDate: '',
          notes: order.notes || '',
          internalNotes: '',
        })
        setItems(order.items)
      }
    } catch (err) {
      console.error('Erreur lors du chargement de la commande:', err)

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

  const addItem = () => {
    // @ts-ignore - Nous initialisons avec un objet partiel, les valeurs manquantes seront calculees
    setItems([...items, {
      id: '',
      orderId: '',
      productId: '',
      quantity: 1,
      unitPrice: 0,
      vatRate: 19, // TVA algerienne
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

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // Si on change le produit, mettre a jour le prix
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

    if (!formData.clientId) {
      setError('Veuillez selectionner un client')
      return
    }

    const validItems = items.filter(item =>
      item.productId && item.quantity > 0 && item.unitPrice > 0
    )

    if (validItems.length === 0) {
      setError('Veuillez ajouter au moins un produit')
      return
    }

    try {
      setSaving(true)
      setError(null)

      // S'assurer que l'utilisateur est authentifie
      const isAuthenticated = await ensureAuthentication()
      if (!isAuthenticated) {
        setError('Erreur d\'authentification. Veuillez vous connecter.')
        return
      }

      // @ts-ignore - Nous utilisons un type partiel pour la creation/mise a jour
      const orderData = {
        ...formData,
        type: formType as 'QUOTE' | 'ORDER',
        items: validItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          vatRate: item.vatRate || 19, // TVA algerienne 19%
          discount: item.discount || 0,
        }))
      }

      if (isEditing && orderId) {
        // @ts-ignore - Nous utilisons un type partiel pour la mise a jour
        const response = await api.updateOrder(orderId, orderData)
        if (!response.success) {
          setError(response.message || 'Erreur lors de la mise a jour de la commande')
          return
        }
      } else {
        // @ts-ignore - Nous utilisons un type partiel pour la creation
        const response = await api.createOrder(orderData)
        if (!response.success) {
          setError(response.message || `Erreur lors de la creation du ${isQuoteMode ? 'devis' : 'commande'}`)
          return
        }
      }

      router.push(isQuoteMode ? '/orders?tab=quotes' : '/orders')
    } catch (err) {
      console.error('[orders] Erreur lors de la sauvegarde:', err)

      let errorMessage = 'Erreur de sauvegarde'
      if (err instanceof Error) {
        if (err.message.includes('401')) {
          errorMessage = 'Erreur d\'authentification. Veuillez vous reconnecter.'
        } else if (err.message.includes('400')) {
          errorMessage = 'Donnees invalides. Verifiez les champs obligatoires.'
        } else if (err.message.includes('500')) {
          errorMessage = 'Erreur serveur. Veuillez reessayer plus tard.'
        } else {
          errorMessage = err.message
        }
      }

      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const totals = calculateTotals()

  if (loading) {
    return (
      <MainLayout title={isEditing ? 'Modifier la commande' : 'Nouvelle commande'}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Chargement...</span>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout 
      title={isEditing ? `Modifier le ${isQuoteMode ? 'devis' : 'commande'}` : `Nouveau ${isQuoteMode ? 'devis' : 'commande'}`}
      subtitle={isEditing ? `Modification du ${isQuoteMode ? 'devis' : 'commande'} ${orderId}` : `Creer un nouveau ${isQuoteMode ? 'devis' : 'commande'}`}
    >
      <div className="mx-auto max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-8">
        {/* Message d'erreur */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-wrap justify-end gap-3">
            <Link href="/orders">
              <Button type="button" variant="outline" disabled={saving}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
            </Link>
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Sauvegarde...' : (isEditing ? 'Modifier' : 'Creer')}
            </Button>
          </div>
        </div>

        {/* Informations generales */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium">Informations generales</h3>
          </div>
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type *
                </label>
                <input
                  type="text"
                  value={isQuoteMode ? 'Devis' : 'Commande'}
                  readOnly
                  aria-readonly="true"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                />
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
                      <option value="">Selectionner un client</option>
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
                  Date de commande *
                </label>
                <input
                  type="date"
                  value={formData.orderDate}
                  onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {isQuoteMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valide jusqu'au
                  </label>
                  <input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de livraison
                </label>
                <input
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Articles */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Articles</h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un article
              </Button>
            </div>
          </div>
          <div>
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
                      <option value="">Selectionner un produit</option>
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
                      Quantite *
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
        <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium">Notes</h3>
          </div>
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes client
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Notes visibles par le client..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes internes
                </label>
                <textarea
                  value={formData.internalNotes}
                  onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Notes internes (non visibles par le client)..."
                />
              </div>
            </div>
          </div>
        </div>

        </form>
      </div>
    </MainLayout>
  )
}
