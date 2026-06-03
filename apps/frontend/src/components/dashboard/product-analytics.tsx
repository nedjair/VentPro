'use client'

import { useEffect, useState } from 'react'
import { api, ProductAnalytics } from '@/lib/api'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { Package, TrendingUp, ShoppingCart, Star } from 'lucide-react'

interface ProductAnalyticsProps {
  period?: string
  limit?: number
}

export function ProductAnalyticsComponent({ period = '3m', limit = 10 }: ProductAnalyticsProps) {
  const [productData, setProductData] = useState<ProductAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState(period)

  useEffect(() => {
    loadProductAnalytics()
  }, [selectedPeriod])

  const loadProductAnalytics = async () => {
    try {
      setLoading(true)
      
      // @ts-ignore - L'API accepte le paramètre limit même s'il n'est pas dans l'interface
      const response = await api.getProductAnalytics({ 
        period: selectedPeriod, 
        limit 
      } as any)

      if (response.success && response.data) {
        // Vérifier que les données sont dans le bon format
        const safeProductData = {
          ...response.data,
          topProducts: Array.isArray(response.data.topProducts) ? response.data.topProducts : [],
          categoryDistribution: Array.isArray(response.data.categoryDistribution) ? response.data.categoryDistribution : []
        }
        setProductData(safeProductData)
        setError(null)
      } else {
        throw new Error('Erreur lors du chargement des analytics produits')
      }
    } catch (err) {
      console.error('Erreur product analytics:', err)
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
      // Initialiser avec des données vides en cas d'erreur
      setProductData(null)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-DZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value) + ' DA'
  }

  // Utilisation des couleurs CSS variables pour le thème
  const getThemeColors = () => {
    if (typeof window !== 'undefined') {
      const style = getComputedStyle(document.documentElement)
      return [
        `hsl(${style.getPropertyValue('--color-primary')})`,
        `hsl(${style.getPropertyValue('--color-accent')})`,
        `hsl(${style.getPropertyValue('--color-secondary')})`,
        `hsl(${style.getPropertyValue('--color-destructive')})`,
        `hsl(${style.getPropertyValue('--color-muted')})`,
        `hsl(${style.getPropertyValue('--color-border')})`,
        `hsl(${style.getPropertyValue('--color-primary')} / 0.8)`,
        `hsl(${style.getPropertyValue('--color-accent')} / 0.8)`
      ]
    }
    return ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16']
  }

  const COLORS = getThemeColors()

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-card rounded-lg shadow border border-border p-6 animate-pulse">
          <div className="h-6 bg-secondary rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-secondary rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !productData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Erreur: {error}</p>
        <button
          onClick={loadProductAnalytics}
          className="mt-2 bg-red-100 px-3 py-1 rounded text-sm text-red-800 hover:bg-red-200"
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec contrôles */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-card-foreground">Analytics Produits</h2>
        <div className="flex space-x-2">
          {['1m', '3m', '6m', '12m'].map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={`px-3 py-1 rounded text-sm font-medium ${
                selectedPeriod === p
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-card-foreground hover:bg-secondary/80'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Métriques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg shadow border border-border p-4 border-l-4 border-l-primary">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-primary mr-3" />
            <div>
              <p className="text-sm text-muted-foreground">Produits vendus</p>
              <p className="text-xl font-bold">
                {(productData.topProducts || []).reduce((sum, p) => sum + p.totalQuantity, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow border border-border p-4 border-l-4 border-l-accent">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-accent mr-3" />
            <div>
              <p className="text-sm text-muted-foreground">CA Produits</p>
              <p className="text-xl font-bold">
                {formatCurrency((productData.topProducts || []).reduce((sum, p) => sum + p.totalRevenue, 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow border border-border p-4 border-l-4 border-l-secondary">
          <div className="flex items-center">
            <Star className="h-8 w-8 text-muted-foreground mr-3" />
            <div>
              <p className="text-sm text-muted-foreground">Catégories</p>
              <p className="text-xl font-bold">{(productData.categoryDistribution || []).length}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow border border-border p-4 border-l-4 border-l-destructive">
          <div className="flex items-center">
            <ShoppingCart className="h-8 w-8 text-destructive mr-3" />
            <div>
              <p className="text-sm text-muted-foreground">Prix moyen</p>
              <p className="text-xl font-bold">
                {formatCurrency(
                  (productData.topProducts || []).reduce((sum: number, p: any) => sum + (p.price || 0), 0) /
                  Math.max((productData.topProducts || []).length, 1)
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top produits par CA */}
      <div className="bg-card rounded-lg shadow border border-border p-6">
        <h3 className="text-lg font-semibold text-card-foreground mb-4">
          Top {limit} Produits par Chiffre d'Affaires
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={productData.topProducts || []} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={formatCurrency} />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={200}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              // Recharts passe parfois `undefined` selon la source du point, donc on normalise ici.
              formatter={((value: unknown, name: string) => {
                const numericValue = Number(value || 0)
                if (name === 'totalRevenue') return [formatCurrency(numericValue), 'CA']
                if (name === 'totalQuantity') return [numericValue, 'Quantité']
                return [numericValue, name]
              }) as any}
            />
            <Bar dataKey="totalRevenue" fill="hsl(var(--color-primary))" name="CA" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Répartition par catégorie */}
      <div className="bg-card rounded-lg shadow border border-border p-6">
        <h3 className="text-lg font-semibold text-card-foreground mb-4">
          Répartition par Catégorie
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={productData.categoryDistribution || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ payload, percent }: any) => {
                  const categoryValue = payload?.category
                  const categoryLabel = typeof categoryValue === 'string'
                    ? categoryValue
                    : categoryValue?.name || 'Non catégorisé'
                  return `${categoryLabel} (${((percent ?? 0) * 100).toFixed(0)}%)`
                }}
                outerRadius={100}
                fill="hsl(var(--color-primary))"
                dataKey="totalRevenue"
              >
                {(productData.categoryDistribution || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => formatCurrency(Number(value || 0)) as any} />
            </PieChart>
          </ResponsiveContainer>
          
          <div className="space-y-3">
            <h4 className="font-medium text-card-foreground">Détails par catégorie</h4>
            <div className="max-h-64 overflow-y-auto">
              {(productData.categoryDistribution || []).map((item, index) => (
                <div key={typeof item.category === 'string' ? item.category : item.category?.name || index} className="flex items-center justify-between py-2">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <span className="text-sm font-medium">
                      {typeof item.category === 'string' ? item.category : item.category?.name || 'Non catégorisé'}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{formatCurrency(item.revenue || 0)}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.quantity || 0} unités • {item.count || 0} produits
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tableau détaillé des top produits */}
      <div className="bg-card rounded-lg shadow border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-card-foreground">
            Détail des Performances Produits
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-secondary">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Produit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Catégorie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Quantité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  CA Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Prix Moyen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Factures
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {(productData.topProducts || []).map((product) => (
                <tr key={product.id} className="hover:bg-secondary">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-card-foreground">{product.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {(product as any).category || 'Non catégorisé'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-card-foreground">
                    {product.totalQuantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-card-foreground">
                    {formatCurrency(product.totalRevenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-card-foreground">
                    {formatCurrency((product.totalRevenue / product.totalQuantity) || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-card-foreground">
                    {(product as any).invoiceCount || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
