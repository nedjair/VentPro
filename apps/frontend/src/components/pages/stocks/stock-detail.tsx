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
  DollarSign,
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
        setError('Stock non trouve')
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

  const getStockStatus = (currentStock: Stock) => {
    if (currentStock.quantiteActuelle === 0) {
      return {
        status: 'Rupture de stock',
        color: 'text-destructive bg-destructive/10 border-destructive/20',
        icon: AlertTriangle,
      }
    }
    if (currentStock.quantiteActuelle <= currentStock.quantiteMinimale) {
      return {
        status: 'Stock faible',
        color: 'text-accent-foreground bg-accent border-border',
        icon: TrendingDown,
      }
    }
    return {
      status: 'Stock normal',
      color: 'text-green-600 bg-green-100 border-green-200',
      icon: Package,
    }
  }

  const actions = (
    <div className="flex flex-wrap items-center gap-3">
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
      <MainLayout title="Details du stock">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    )
  }

  if (error || !stock) {
    return (
      <MainLayout title="Details du stock">
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-destructive">Erreur</h3>
              <div className="mt-2 text-sm text-destructive">
                <p>{error || 'Stock non trouve'}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={loadStock}
                  className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/20"
                >
                  Reessayer
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
      title="Details du stock"
      subtitle={stock.product?.name || 'Stock'}
    >
      <div className="space-y-6">
        <div className={`rounded-lg border p-4 ${stockStatus.color}`}>
          <div className="flex items-center">
            <StatusIcon className="mr-3 h-6 w-6" />
            <div>
              <h3 className="text-lg font-medium">{stockStatus.status}</h3>
              <p className="text-sm opacity-75">
                {stock.quantiteActuelle} {stock.product?.unit || 'unite'} en stock
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card shadow">
            <div className="border-b border-border px-6 py-4">
              <h3 className="flex items-center text-lg font-medium text-card-foreground">
                <Package className="mr-2 h-5 w-5 text-primary" />
                Informations du produit
              </h3>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nom</label>
                <p className="text-lg font-medium text-card-foreground">{stock.product?.name}</p>
              </div>

              {stock.product?.sku && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">SKU</label>
                  <p className="text-card-foreground">{stock.product.sku}</p>
                </div>
              )}

              {stock.product?.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="text-card-foreground">{stock.product.description}</p>
                </div>
              )}

              {stock.product?.category && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Categorie</label>
                  <p className="flex items-center text-card-foreground">
                    <Tag className="mr-1 h-4 w-4" />
                    {stock.product.category.name}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground">Prix unitaire</label>
                <p className="flex items-center text-card-foreground">
                  <DollarSign className="mr-1 h-4 w-4" />
                  {formatCurrency(stock.product?.price || 0, 'DA')}
                </p>
              </div>

              {stock.product?.cost && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Cout unitaire</label>
                  <p className="text-card-foreground">
                    {formatCurrency(stock.product.cost, 'DA')}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground">Unite</label>
                <p className="text-card-foreground">{stock.product?.unit || 'unite'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card shadow">
            <div className="border-b border-border px-6 py-4">
              <h3 className="flex items-center text-lg font-medium text-card-foreground">
                <Package className="mr-2 h-5 w-5 text-primary" />
                Informations du stock
              </h3>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Quantite actuelle</label>
                <p className="text-2xl font-bold text-card-foreground">
                  {stock.quantiteActuelle} {stock.product?.unit || 'unite'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Quantite minimale</label>
                <p className="text-lg text-card-foreground">
                  {stock.quantiteMinimale} {stock.product?.unit || 'unite'}
                </p>
              </div>

              {stock.quantiteMaximale && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Quantite maximale</label>
                  <p className="text-lg text-card-foreground">
                    {stock.quantiteMaximale} {stock.product?.unit || 'unite'}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground">Valeur du stock (prix de vente)</label>
                <p className="text-lg font-medium text-primary">
                  {formatCurrency(stockValue, 'DA')}
                </p>
              </div>

              {stock.product?.cost && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Valeur du stock (cout)</label>
                  <p className="text-lg text-muted-foreground">
                    {formatCurrency(stockCostValue, 'DA')}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground">Derniere mise a jour</label>
                <p className="flex items-center text-card-foreground">
                  <Calendar className="mr-1 h-4 w-4" />
                  {new Date(stock.dateLastUpdate).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Date de creation</label>
                <p className="text-card-foreground">
                  {new Date(stock.createdAt).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card shadow">
          <div className="p-6">
            <div className="flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                Vous pouvez revenir a la liste des stocks ou modifier cette fiche si necessaire.
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                {actions}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
