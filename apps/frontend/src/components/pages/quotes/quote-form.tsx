import React, { useState, useEffect } from 'react'
import { Button } from '../../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Plus, Trash2, Search } from 'lucide-react'
import { buildApiUrl } from '@/lib/api-config'

interface Client {
  id: string
  firstName: string
  lastName: string
  companyName?: string
  email: string
}

interface Product {
  id: string
  name: string
  sku: string
  price: number
  vatRate: number
}

interface QuoteItem {
  productId: string
  product?: Product
  quantity: number
  unitPrice: number
  discount: number
  total: number
}

interface QuoteFormData {
  clientId: string
  quoteDate: string
  validUntil: string
  notes: string
  discount: number
  items: QuoteItem[]
}

interface QuoteFormProps {
  quote?: any // Quote existant pour modification
  onSubmit: (data: QuoteFormData) => Promise<void>
  onCancel: () => void
}

const QuoteForm: React.FC<QuoteFormProps> = ({ quote, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<QuoteFormData>({
    clientId: quote?.clientId || '',
    quoteDate: quote?.quoteDate ? new Date(quote.quoteDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    validUntil: quote?.validUntil ? new Date(quote.validUntil).toISOString().split('T')[0] : '',
    notes: quote?.notes || '',
    discount: quote?.discount || 0,
    items: quote?.items?.map((item: any) => ({
      productId: item.productId,
      product: item.product,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      total: item.total
    })) || []
  })

  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchClients()
    fetchProducts()
  }, [])

  const fetchClients = async () => {
    try {
      // On borne explicitement la pagination pour rester sous la limite backend.
      const response = await fetch(buildApiUrl('/api/v1/clients?page=1&limit=100'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        // CORRECTION : Structure paginée
        const clients = data.data?.data || data.data || []
        setClients(clients)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des clients:', error)
    }
  }

  const fetchProducts = async () => {
    try {
      // Même logique côté produits : page 1 et maximum 100 éléments chargés.
      const response = await fetch(buildApiUrl('/api/v1/products?page=1&limit=100'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        // CORRECTION : Structure paginée
        const products = data.data?.data || data.data || []
        setProducts(products)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error)
    }
  }

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          productId: '',
          quantity: 1,
          unitPrice: 0,
          discount: 0,
          total: 0
        }
      ]
    })
  }

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index)
    setFormData({ ...formData, items: newItems })
  }

  const updateItem = (index: number, field: keyof QuoteItem, value: any) => {
    const newItems = [...formData.items]
    newItems[index] = { ...newItems[index], [field]: value }

    // Si on change le produit, mettre à jour le prix unitaire
    if (field === 'productId') {
      const product = products.find(p => p.id === value)
      if (product) {
        newItems[index].product = product
        newItems[index].unitPrice = product.price
      }
    }

    // Recalculer le total de l'article
    const item = newItems[index]
    const discountedPrice = item.unitPrice * (1 - item.discount / 100)
    newItems[index].total = discountedPrice * item.quantity

    setFormData({ ...formData, items: newItems })
  }

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + item.total, 0)
  }

  const calculateTaxAmount = () => {
    return formData.items.reduce((sum, item) => {
      const product = item.product || products.find(p => p.id === item.productId)
      const vatRate = product?.vatRate || 0
      return sum + (item.total * vatRate / 100)
    }, 0)
  }

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const taxAmount = calculateTaxAmount()
    const discountedSubtotal = subtotal * (1 - formData.discount / 100)
    const discountedTax = taxAmount * (1 - formData.discount / 100)
    return discountedSubtotal + discountedTax
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.clientId) {
      newErrors.clientId = 'Le client est requis'
    }

    if (!formData.validUntil) {
      newErrors.validUntil = 'La date de validité est requise'
    }

    if (formData.items.length === 0) {
      newErrors.items = 'Au moins un article est requis'
    }

    formData.items.forEach((item, index) => {
      if (!item.productId) {
        newErrors[`item_${index}_product`] = 'Le produit est requis'
      }
      if (item.quantity <= 0) {
        newErrors[`item_${index}_quantity`] = 'La quantité doit être positive'
      }
      if (item.unitPrice <= 0) {
        newErrors[`item_${index}_price`] = 'Le prix doit être positif'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Erreur lors de la soumission:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-DZ', {
      style: 'currency',
      currency: 'DZD'
    }).format(amount)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informations générales */}
      <Card>
        <CardHeader>
          <CardTitle>Informations générales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Client *
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              >
                <option value="">Sélectionner un client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.companyName || `${client.firstName} ${client.lastName}`}
                  </option>
                ))}
              </select>
              {errors.clientId && <p className="text-red-500 text-sm mt-1">{errors.clientId}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Date du devis
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.quoteDate}
                onChange={(e) => setFormData({ ...formData, quoteDate: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Valide jusqu'au *
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
              />
              {errors.validUntil && <p className="text-red-500 text-sm mt-1">{errors.validUntil}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Remise globale (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.discount}
                onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Notes
            </label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notes ou conditions particulières..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Articles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            Articles
            <Button type="button" onClick={addItem} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un article
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {errors.items && <p className="text-red-500 text-sm mb-4">{errors.items}</p>}
          
          {formData.items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucun article ajouté. Cliquez sur "Ajouter un article" pour commencer.
            </div>
          ) : (
            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">
                        Produit *
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={item.productId}
                        onChange={(e) => updateItem(index, 'productId', e.target.value)}
                      >
                        <option value="">Sélectionner un produit</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} ({product.sku})
                          </option>
                        ))}
                      </select>
                      {errors[`item_${index}_product`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`item_${index}_product`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Quantité *
                      </label>
                      <input
                        type="number"
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      />
                      {errors[`item_${index}_quantity`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`item_${index}_quantity`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Prix unitaire *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      />
                      {errors[`item_${index}_price`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`item_${index}_price`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Remise (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={item.discount}
                        onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Total
                        </label>
                        <div className="font-semibold">
                          {formatCurrency(item.total)}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Récapitulatif */}
      {formData.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Récapitulatif</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Sous-total:</span>
                <span>{formatCurrency(calculateSubtotal())}</span>
              </div>
              {formData.discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Remise ({formData.discount}%):</span>
                  <span>-{formatCurrency(calculateSubtotal() * formData.discount / 100)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>TVA:</span>
                <span>{formatCurrency(calculateTaxAmount() * (1 - formData.discount / 100))}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>{formatCurrency(calculateTotal())}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Enregistrement...' : (quote ? 'Modifier' : 'Créer')}
        </Button>
      </div>
    </form>
  )
}

export default QuoteForm
