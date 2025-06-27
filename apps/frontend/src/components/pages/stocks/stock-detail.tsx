'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { 
  ArrowLeft, 
  Edit, 
  Package, 
  AlertTriangle, 
  TrendingDown,
  Calendar,
  Tag,
  DollarSign
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

interface StockDetailProps {
  stockId: string
}

interface Stock {
  id: string
  quantiteActuelle: number
  quantiteMinimale: number
  quantiteMaximale?: number
  dateLastUpdate: string
  createdAt: string
  product: {
    id: string
    name: string
    sku?: string
    price: number
    cost?: number
    unit: string
    description?: string
    category?: {
      id: string
      name: string
    }
  }
}

export function StockDetailPage({ stockId }: StockDetailProps) {
  const router = useRouter()
  const [stock, setStock] = useState<Stock | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStock = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await api.get(`/api/v1/stock/${stockId}`)
      
      if (response.data.success && response.data.data) {
        setStock(response.data.data)
      } else {
        setError('Stock non trouvé')
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement du stock:', err)
      setError('Erreur lors du chargement du stock')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (stockId) {
      loadStock()
    }
  }, [stockId])

  const getStockStatus = (stock: Stock) => {
    if (stock.quantiteActuelle === 0) {
      return { 
        status: 'Rupture de stock', 
        color: 'text-red-600 bg-red-100 border-red-200', 
        icon: AlertTriangle 
      }
    }
    if (stock.quantiteActuelle <= stock.quantiteMinimale) {
      return { 
        status: 'Stock faible', 
        color: 'text-orange-600 bg-orange-100 border-orange-200', 
        icon: TrendingDown 
      }
    }
    return { 
      status: 'Stock normal', 
      color: 'text-green-600 bg-green-100 border-green-200', 
      icon: Package 
    }
  }

  const actions = (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        onClick={() => router.push('/stocks')}
        className="flex items-center space-x-2"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Retour</span>
      </Button>
      {stock && (
        <Button
          onClick={() => router.push(`/stocks/${stock.id}/edit`)}
          className="flex items-center space-x-2"
        >
          <Edit className="h-4 w-4" />
          <span>Modifier</span>
        </Button>
      )}
    </div>
  )

  if (loading) {
    return (
      <MainLayout title="Détails du Stock" actions={actions}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    )
  }

  if (error || !stock) {
    return (
      <MainLayout title="Détails du Stock" actions={actions}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Erreur</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error || 'Stock non trouvé'}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={loadStock}
                  className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                >
                  Réessayer
                </button>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  const stockStatus = getStockStatus(stock)
  const StatusIcon = stockStatus.icon
  const stockValue = stock.quantiteActuelle * (stock.product?.price || 0)
  const stockCostValue = stock.quantiteActuelle * (stock.product?.cost || 0)

  return (
    <MainLayout 
      title="Détails du Stock"
      subtitle={stock.product?.name || 'Stock'}
      actions={actions}
    >
      <div className="space-y-6">
        {/* Statut du stock */}
        <div className={`border rounded-lg p-4 ${stockStatus.color}`}>
          <div className="flex items-center">
            <StatusIcon className="h-6 w-6 mr-3" />
            <div>
              <h3 className="text-lg font-medium">{stockStatus.status}</h3>
              <p className="text-sm opacity-75">
                {stock.quantiteActuelle} {stock.product?.unit || 'unité'} en stock
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Informations du produit */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Package className="h-5 w-5 mr-2 text-blue-600" />
                Informations du produit
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Nom</label>
                <p className="text-lg font-medium text-gray-900">{stock.product?.name}</p>
              </div>
              
              {stock.product?.sku && (
                <div>
                  <label className="text-sm font-medium text-gray-500">SKU</label>
                  <p className="text-gray-900">{stock.product.sku}</p>
                </div>
              )}
              
              {stock.product?.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-gray-900">{stock.product.description}</p>
                </div>
              )}
              
              {stock.product?.category && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Catégorie</label>
                  <p className="text-gray-900 flex items-center">
                    <Tag className="h-4 w-4 mr-1" />
                    {stock.product.category.name}
                  </p>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-gray-500">Prix unitaire</label>
                <p className="text-gray-900 flex items-center">
                  <DollarSign className="h-4 w-4 mr-1" />
                  {formatCurrency(stock.product?.price || 0, 'DA')}
                </p>
              </div>
              
              {stock.product?.cost && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Coût unitaire</label>
                  <p className="text-gray-900">
                    {formatCurrency(stock.product.cost, 'DA')}
                  </p>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-gray-500">Unité</label>
                <p className="text-gray-900">{stock.product?.unit || 'unité'}</p>
              </div>
            </div>
          </div>

          {/* Informations du stock */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Package className="h-5 w-5 mr-2 text-green-600" />
                Informations du stock
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Quantité actuelle</label>
                <p className="text-2xl font-bold text-gray-900">
                  {stock.quantiteActuelle} {stock.product?.unit || 'unité'}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Quantité minimale</label>
                <p className="text-lg text-gray-900">
                  {stock.quantiteMinimale} {stock.product?.unit || 'unité'}
                </p>
              </div>
              
              {stock.quantiteMaximale && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Quantité maximale</label>
                  <p className="text-lg text-gray-900">
                    {stock.quantiteMaximale} {stock.product?.unit || 'unité'}
                  </p>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-gray-500">Valeur du stock (prix de vente)</label>
                <p className="text-lg font-medium text-green-600">
                  {formatCurrency(stockValue, 'DA')}
                </p>
              </div>
              
              {stock.product?.cost && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Valeur du stock (coût)</label>
                  <p className="text-lg text-gray-600">
                    {formatCurrency(stockCostValue, 'DA')}
                  </p>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-gray-500">Dernière mise à jour</label>
                <p className="text-gray-900 flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {new Date(stock.dateLastUpdate).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Date de création</label>
                <p className="text-gray-900">
                  {new Date(stock.createdAt).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
