'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, Package } from 'lucide-react'
import { api } from '@/lib/api'

interface StockFormProps {
  mode: 'create' | 'edit'
  stockId?: string
}

interface Product {
  id: string
  name: string
  sku?: string
  price: number
  unit: string
}

interface StockFormData {
  productId: string
  quantiteActuelle: number
  quantiteMinimale: number
  quantiteMaximale: number
}

export function StockFormPage({ mode, stockId }: StockFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<StockFormData>({
    productId: '',
    quantiteActuelle: 0,
    quantiteMinimale: 0,
    quantiteMaximale: 0,
  })
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(mode === 'edit')
  const [error, setError] = useState<string | null>(null)

  // Charger les produits disponibles
  const loadProducts = async () => {
    try {
      const response = await api.get('/api/v1/products')
      if (response.data.success) {
        // Programmation défensive pour les arrays
        const productsData = Array.isArray(response.data.data) ? response.data.data : []
        setProducts(productsData)
      }
    } catch (err) {
      console.error('Erreur lors du chargement des produits:', err)
      // Programmation défensive - initialiser avec un array vide
      setProducts([])
    }
  }

  // Charger les données du stock en mode édition
  const loadStockData = async () => {
    if (mode === 'edit' && stockId) {
      try {
        setLoadingData(true)
        const response = await api.get(`/api/v1/stock/${stockId}`)
        if (response.data.success && response.data.data) {
          const stock = response.data.data
          setFormData({
            productId: stock.productId || '',
            quantiteActuelle: stock.quantiteActuelle || 0,
            quantiteMinimale: stock.quantiteMinimale || 0,
            quantiteMaximale: stock.quantiteMaximale || 0,
          })
        } else {
          setError('Stock non trouvé')
        }
      } catch (err) {
        console.error('Erreur lors du chargement du stock:', err)
        setError('Erreur lors du chargement du stock')
      } finally {
        setLoadingData(false)
      }
    }
  }

  useEffect(() => {
    loadProducts()
    if (mode === 'edit') {
      loadStockData()
    }
  }, [mode, stockId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.productId) {
      setError('Veuillez sélectionner un produit')
      return
    }

    if (formData.quantiteActuelle < 0 || formData.quantiteMinimale < 0) {
      setError('Les quantités ne peuvent pas être négatives')
      return
    }

    if (formData.quantiteMaximale > 0 && formData.quantiteMaximale < formData.quantiteMinimale) {
      setError('La quantité maximale doit être supérieure à la quantité minimale')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const url = mode === 'create' ? '/api/v1/stock' : `/api/v1/stock/${stockId}`
      const method = mode === 'create' ? 'post' : 'put'
      
      const response = await api[method](url, formData)
      
      if (response.data.success) {
        router.push('/stocks')
      } else {
        setError(response.data.message || 'Erreur lors de la sauvegarde')
      }
    } catch (err: any) {
      console.error('Erreur lors de la sauvegarde:', err)
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof StockFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const selectedProduct = Array.isArray(products) ? 
    products.find(p => p.id === formData.productId) : null

  const actions = (
    <Button
      variant="outline"
      onClick={() => router.push('/stocks')}
      className="flex items-center space-x-2"
    >
      <ArrowLeft className="h-4 w-4" />
      <span>Retour</span>
    </Button>
  )

  if (loadingData) {
    return (
      <MainLayout title={mode === 'create' ? 'Nouveau Stock' : 'Modifier le Stock'} actions={actions}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout 
      title={mode === 'create' ? 'Nouveau Stock' : 'Modifier le Stock'}
      subtitle={mode === 'create' ? 'Créer un nouveau stock pour un produit' : 'Modifier les paramètres de stock'}
      actions={actions}
    >
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <Package className="h-6 w-6 text-blue-600 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">
                {mode === 'create' ? 'Informations du nouveau stock' : 'Modifier le stock'}
              </h3>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            {/* Sélection du produit */}
            <div>
              <label htmlFor="productId" className="block text-sm font-medium text-gray-700 mb-2">
                Produit *
              </label>
              <select
                id="productId"
                value={formData.productId}
                onChange={(e) => handleInputChange('productId', e.target.value)}
                disabled={mode === 'edit'} // Ne pas permettre de changer le produit en mode édition
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                required
              >
                <option value="">Sélectionner un produit</option>
                {Array.isArray(products) && products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} {product.sku && `(${product.sku})`}
                  </option>
                ))}
              </select>
              {selectedProduct && (
                <div className="mt-2 text-sm text-gray-600">
                  Prix: {selectedProduct.price.toLocaleString('fr-DZ')} DA • Unité: {selectedProduct.unit}
                </div>
              )}
            </div>

            {/* Quantité actuelle */}
            <div>
              <label htmlFor="quantiteActuelle" className="block text-sm font-medium text-gray-700 mb-2">
                Quantité actuelle *
              </label>
              <input
                type="number"
                id="quantiteActuelle"
                value={formData.quantiteActuelle}
                onChange={(e) => handleInputChange('quantiteActuelle', parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <div className="mt-1 text-sm text-gray-500">
                Quantité actuellement en stock
              </div>
            </div>

            {/* Quantité minimale */}
            <div>
              <label htmlFor="quantiteMinimale" className="block text-sm font-medium text-gray-700 mb-2">
                Quantité minimale *
              </label>
              <input
                type="number"
                id="quantiteMinimale"
                value={formData.quantiteMinimale}
                onChange={(e) => handleInputChange('quantiteMinimale', parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <div className="mt-1 text-sm text-gray-500">
                Seuil d'alerte pour le réapprovisionnement
              </div>
            </div>

            {/* Quantité maximale */}
            <div>
              <label htmlFor="quantiteMaximale" className="block text-sm font-medium text-gray-700 mb-2">
                Quantité maximale
              </label>
              <input
                type="number"
                id="quantiteMaximale"
                value={formData.quantiteMaximale}
                onChange={(e) => handleInputChange('quantiteMaximale', parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="mt-1 text-sm text-gray-500">
                Quantité maximale recommandée (optionnel)
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/stocks')}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{loading ? 'Sauvegarde...' : 'Sauvegarder'}</span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  )
}
