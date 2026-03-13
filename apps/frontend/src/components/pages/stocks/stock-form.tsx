'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Save, Package } from 'lucide-react'
import { api } from '@/lib/api'
import {
  syncStockProductHeaderNotification,
  type AppHeaderNotification,
} from '@/lib/header-notifications'
import { calculateStockStatus, type ProductWithStock } from '@/lib/stock-utils'

interface StockFormProps {
  mode: 'create' | 'edit'
  stockId?: string
}

interface Product {
  id: string
  name: string
  sku?: string
  barcode?: string
  description?: string
  categoryId?: string
  price: number
  costPrice?: number
  cost?: number
  unit: string
  isActive?: boolean
  isService?: boolean
  trackStock?: boolean
  allowBackorder?: boolean
  vatRate?: number
  stock?: number
  stockQuantity?: number
  minStock?: number
  maxStock?: number | null
  unifiedStock?: {
    quantiteActuelle?: number
    quantiteMinimale?: number
    quantiteMaximale?: number | null
  }
}

interface StockRecord {
  id: string
  productId?: string
  quantiteActuelle?: number
  quantiteMinimale?: number
  quantiteMaximale?: number | null
  product?: {
    id: string
  }
}

interface StockFormData {
  productId: string
  quantiteActuelle: number
  quantiteMinimale: number
  quantiteMaximale: number
}

type EditTarget =
  | { type: 'product'; productId: string }
  | { type: 'stock'; stockId: string; productId: string }
  | null

const buildEditableProductStock = (
  product: Pick<Product, 'id' | 'name' | 'unit' | 'isService' | 'isActive'>,
  formData: StockFormData
): ProductWithStock => ({
  id: product.id,
  name: product.name,
  unit: product.unit || 'unité',
  isService: product.isService ?? false,
  isActive: product.isActive ?? true,
  stockQuantity: formData.quantiteActuelle,
  minStock: formData.quantiteMinimale,
  maxStock: formData.quantiteMaximale > 0 ? formData.quantiteMaximale : null,
})

const buildStockHeaderNotification = (
  product: Pick<Product, 'id' | 'name' | 'unit' | 'isService' | 'isActive'>,
  formData: StockFormData
): AppHeaderNotification | null => {
  const stockProduct = buildEditableProductStock(product, formData)
  const status = calculateStockStatus(stockProduct)

  if (status.status === 'rupture') {
    return {
      id: `stock-status-${product.id}`,
      source: 'stock-status',
      title: 'Rupture de stock',
      message: `Rupture de stock : ${product.name} — quantité restante : ${formData.quantiteActuelle}`,
      createdAt: new Date().toISOString(),
      href: '/stocks',
    }
  }

  if (status.status === 'faible') {
    return {
      id: `stock-status-${product.id}`,
      source: 'stock-status',
      title: 'Alerte stock faible',
      message: `Stock faible : ${product.name} — quantité restante : ${formData.quantiteActuelle}`,
      createdAt: new Date().toISOString(),
      href: '/stocks',
    }
  }

  return null
}

const normalizeProducts = (rawProducts: unknown): Product[] => {
  const productsData = Array.isArray((rawProducts as any)?.data)
    ? (rawProducts as any).data
    : Array.isArray(rawProducts)
      ? rawProducts
      : []

  return productsData.map((product: any) => ({
    id: String(product.id),
    name: product.name || product.nom || 'Produit sans nom',
    sku: product.sku || product.reference,
    price: Number(product.price || product.prix || 0),
    unit: product.unit || product.unite || 'unité',
    stock: product.stock,
    stockQuantity: product.stockQuantity,
    minStock: product.minStock,
    maxStock: product.maxStock ?? null,
    unifiedStock: product.unifiedStock,
  }))
}

const mapProductToFormData = (product: Product): StockFormData => ({
  productId: product.id,
  quantiteActuelle: Number(product.unifiedStock?.quantiteActuelle ?? product.stockQuantity ?? product.stock ?? 0),
  quantiteMinimale: Number(product.unifiedStock?.quantiteMinimale ?? product.minStock ?? 0),
  quantiteMaximale: Number(product.unifiedStock?.quantiteMaximale ?? product.maxStock ?? 0),
})

const mapStockToFormData = (stock: StockRecord): StockFormData => ({
  productId: stock.productId || stock.product?.id || '',
  quantiteActuelle: Number(stock.quantiteActuelle ?? 0),
  quantiteMinimale: Number(stock.quantiteMinimale ?? 0),
  quantiteMaximale: Number(stock.quantiteMaximale ?? 0),
})

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
  const [editTarget, setEditTarget] = useState<EditTarget>(null)
  const [loadedProduct, setLoadedProduct] = useState<Product | null>(null)

  // Charger les produits disponibles
  const loadProducts = async () => {
    try {
      const response = await api.get('/api/v1/products')
      if (response.data.success) {
        setProducts(normalizeProducts(response.data.data))
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
        setError(null)

        try {
          const productResponse = await api.getProduct(stockId)

          if (productResponse.success && productResponse.data) {
            const productData = productResponse.data as Product
            setLoadedProduct(productData)
            const nextFormData = mapProductToFormData(productData)
            setFormData(nextFormData)
            setEditTarget({ type: 'product', productId: stockId })
            syncStockProductHeaderNotification(productData.id, buildStockHeaderNotification(productData, nextFormData))
            return
          }
        } catch (productError) {
          console.warn('Chargement produit impossible pour le stock, tentative via endpoint stock:', productError)
        }

        const stockResponse = await api.get(`/api/v1/stock/${stockId}`)
        if (stockResponse.data.success && stockResponse.data.data) {
          const stock = stockResponse.data.data as StockRecord
          setFormData(mapStockToFormData(stock))
          setLoadedProduct(null)
          setEditTarget({
            type: 'stock',
            stockId,
            productId: stock.productId || stock.product?.id || '',
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

      let response
      let isSuccessful = false
      let responseMessage: string | undefined

      if (mode === 'create') {
        response = await api.post('/api/v1/stock', formData)
        isSuccessful = Boolean(response.data?.success)
        responseMessage = response.data?.message
      } else if (editTarget?.type === 'product') {
        if (!loadedProduct) {
          throw new Error('Impossible de retrouver les données produit à mettre à jour')
        }

        response = await api.updateProduct(editTarget.productId, {
          name: loadedProduct.name,
          sku: loadedProduct.sku,
          barcode: loadedProduct.barcode,
          description: loadedProduct.description,
          categoryId: loadedProduct.categoryId,
          price: Number(loadedProduct.price ?? 0),
          costPrice: loadedProduct.costPrice ?? loadedProduct.cost,
          unit: loadedProduct.unit || 'pièce',
          isActive: loadedProduct.isActive ?? true,
          isService: loadedProduct.isService ?? false,
          trackStock: loadedProduct.trackStock ?? true,
          allowBackorder: loadedProduct.allowBackorder ?? false,
          vatRate: loadedProduct.vatRate ?? 20,
          stockQuantity: formData.quantiteActuelle,
          minStock: formData.quantiteMinimale,
          maxStock: formData.quantiteMaximale > 0 ? formData.quantiteMaximale : undefined,
        })
        isSuccessful = Boolean(response.success)
        responseMessage = response.message
      } else if (editTarget?.type === 'stock' && stockId) {
        response = await api.put(`/api/v1/stock/${editTarget.stockId}`, formData)
        isSuccessful = Boolean(response.data?.success)
        responseMessage = response.data?.message
      } else {
        throw new Error('Impossible de déterminer la cible de modification du stock')
      }
      
      if (isSuccessful) {
        const productForNotification = loadedProduct ?? selectedProduct

        if (mode === 'edit' && productForNotification) {
          syncStockProductHeaderNotification(
            formData.productId,
            buildStockHeaderNotification(productForNotification, formData)
          )
        }

        router.push('/stocks')
      } else {
        setError(responseMessage || 'Erreur lors de la sauvegarde')
      }
    } catch (err: any) {
      console.error('Erreur lors de la sauvegarde:', err)
      setError(err.response?.data?.message || err.message || 'Erreur lors de la sauvegarde')
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

  if (loadingData) {
    return (
      <MainLayout title={mode === 'create' ? 'Nouveau Stock' : 'Modifier le Stock'}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout 
      title={mode === 'create' ? 'Nouveau Stock' : 'Modifier le Stock'}
      subtitle={mode === 'create' ? 'Créer un nouveau stock pour un produit' : 'Modifier les paramètres de stock'}
    >
      <div className="max-w-2xl mx-auto">
        <div className="bg-card shadow rounded-lg border border-border">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center">
              <Package className="h-6 w-6 text-primary mr-3" />
              <h3 className="text-lg font-medium text-card-foreground">
                {mode === 'create' ? 'Informations du nouveau stock' : 'Modifier le stock'}
              </h3>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <div className="text-sm text-destructive">{error}</div>
              </div>
            )}

            {/* Sélection du produit */}
            <div>
              <label htmlFor="productId" className="block text-sm font-medium text-muted-foreground mb-2">
                Produit *
              </label>
              <select
                id="productId"
                value={formData.productId}
                onChange={(e) => handleInputChange('productId', e.target.value)}
                disabled={mode === 'edit'} // Ne pas permettre de changer le produit en mode édition
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-secondary bg-card text-card-foreground"
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
                <div className="mt-2 text-sm text-muted-foreground">
                  Prix: {selectedProduct.price.toLocaleString('fr-DZ')} DA • Unité: {selectedProduct.unit}
                </div>
              )}
            </div>

            {/* Quantité actuelle */}
            <div>
              <label htmlFor="quantiteActuelle" className="block text-sm font-medium text-muted-foreground mb-2">
                Quantité actuelle *
              </label>
              <input
                type="number"
                id="quantiteActuelle"
                value={formData.quantiteActuelle}
                onChange={(e) => handleInputChange('quantiteActuelle', parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-card text-card-foreground"
                required
              />
              <div className="mt-1 text-sm text-muted-foreground">
                Quantité actuellement en stock
              </div>
            </div>

            {/* Quantité minimale */}
            <div>
              <label htmlFor="quantiteMinimale" className="block text-sm font-medium text-muted-foreground mb-2">
                Quantité minimale *
              </label>
              <input
                type="number"
                id="quantiteMinimale"
                value={formData.quantiteMinimale}
                onChange={(e) => handleInputChange('quantiteMinimale', parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-card text-card-foreground"
                required
              />
              <div className="mt-1 text-sm text-muted-foreground">
                Seuil d'alerte pour le réapprovisionnement
              </div>
            </div>

            {/* Quantité maximale */}
            <div>
              <label htmlFor="quantiteMaximale" className="block text-sm font-medium text-muted-foreground mb-2">
                Quantité maximale
              </label>
              <input
                type="number"
                id="quantiteMaximale"
                value={formData.quantiteMaximale}
                onChange={(e) => handleInputChange('quantiteMaximale', parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-card text-card-foreground"
              />
              <div className="mt-1 text-sm text-muted-foreground">
                Quantité maximale recommandée (optionnel)
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-border">
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
