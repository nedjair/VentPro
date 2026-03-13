/**
 * Hook personnalisé pour gérer les données de stock unifiées
 * Utilise la table stocks comme source de vérité unique
 */

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'

export interface UnifiedProduct {
  id: string
  name: string
  description?: string
  sku?: string
  price: number
  cost?: number
  vatRate: number
  stockQuantity: number
  minStock: number
  maxStock?: number
  isActive: boolean
  isService: boolean
  unit: string
  categoryId?: string
  category?: {
    id: string
    name: string
    color?: string
  }
  // Données de stock unifiées
  unifiedStock?: {
    quantiteActuelle: number
    quantiteMinimale: number
    quantiteMaximale?: number
    dateLastUpdate: string
  }
  createdAt: string
  updatedAt: string
}

export interface UnifiedStockData {
  products: UnifiedProduct[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  unifyData: () => Promise<void>
}

export function useUnifiedStock(): UnifiedStockData {
  const [products, setProducts] = useState<UnifiedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔄 Chargement des produits avec données unifiées...')
      
      const response = await api.get('/api/v1/products?limit=100')
      
      if (response.data.success) {
        const productsData = response.data.data?.data || response.data.data || []
        
        // Transformer les données pour assurer la cohérence
        const unifiedProducts = productsData.map((product: any) => ({
          ...product,
          // Utiliser les données unifiées si disponibles
          stockQuantity: product.unifiedStock?.quantiteActuelle ?? product.stockQuantity,
          minStock: product.unifiedStock?.quantiteMinimale ?? product.minStock,
          maxStock: product.unifiedStock?.quantiteMaximale ?? product.maxStock,
        }))
        
        setProducts(unifiedProducts)
        console.log(`✅ ${unifiedProducts.length} produits chargés avec données unifiées`)
      } else {
        throw new Error(response.data.message || 'Erreur lors du chargement des produits')
      }
    } catch (err: any) {
      console.error('❌ Erreur lors du chargement des produits:', err)
      setError(err.response?.data?.message || err.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  const unifyData = useCallback(async () => {
    try {
      setError(null)
      console.log('🔄 Unification des données de stock...')
      
      const response = await api.post('/api/v1/stock/unify-data')
      
      if (response.data.success) {
        console.log('✅ Unification terminée:', response.data.message)
        // Recharger les données après unification
        await loadProducts()
      } else {
        throw new Error(response.data.message || 'Erreur lors de l\'unification')
      }
    } catch (err: any) {
      console.error('❌ Erreur lors de l\'unification:', err)
      setError(err.response?.data?.message || err.message || 'Erreur d\'unification')
    }
  }, [loadProducts])

  const refresh = useCallback(async () => {
    await loadProducts()
  }, [loadProducts])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  return {
    products,
    loading,
    error,
    refresh,
    unifyData
  }
}

/**
 * Hook pour les statistiques de stock unifiées
 */
export function useUnifiedStockStats() {
  const [stats, setStats] = useState({
    total: 0,
    rupture: 0,
    faible: 0,
    normal: 0,
    nonSuivi: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Charger les alertes de stock pour les statistiques
      const response = await api.get('/api/v1/stock/alerts')
      
      if (response.data.success) {
        const alerts = response.data.data
        
        // Calculer les statistiques basées sur les alertes
        setStats({
          total: alerts.totalAlerts || 0,
          rupture: alerts.outOfStock?.length || 0,
          faible: alerts.lowStock?.length || 0,
          normal: 0, // Sera calculé côté client si nécessaire
          nonSuivi: 0
        })
      }
    } catch (err: any) {
      console.error('❌ Erreur lors du chargement des statistiques:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  return {
    stats,
    loading,
    error,
    refresh: loadStats
  }
}

/**
 * Fonction utilitaire pour calculer le statut de stock unifié
 */
export function calculateUnifiedStockStatus(product: UnifiedProduct) {
  if (product.isService) {
    return {
      status: 'non-suivi' as const,
      label: 'Non suivi',
      color: 'gray',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
      priority: 4
    }
  }

  // Utiliser les données unifiées en priorité
  const stockQuantity = product.unifiedStock?.quantiteActuelle ?? product.stockQuantity
  const minStock = product.unifiedStock?.quantiteMinimale ?? product.minStock

  if (stockQuantity === 0) {
    return {
      status: 'rupture' as const,
      label: 'Rupture',
      color: 'red',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      priority: 1
    }
  }

  if (stockQuantity > 0 && stockQuantity <= minStock) {
    return {
      status: 'faible' as const,
      label: 'Stock faible',
      color: 'orange',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-800',
      priority: 2
    }
  }

  return {
    status: 'normal' as const,
    label: 'Stock normal',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    priority: 3
  }
}
