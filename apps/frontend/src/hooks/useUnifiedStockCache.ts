'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '@/lib/api'

export interface UnifiedProduct {
  id: string
  name: string
  sku?: string
  categoryId?: string | null
  category?: {
    id: string
    name: string
    description?: string
  } | string | null
  stockQuantity: number
  minStock: number
  maxStock?: number
  status: 'out' | 'low' | 'normal' | 'over'
  statusLabel: string
  lastUpdate: string
  value: number
  unit: string
  price: number
}

export interface UnifiedStockCache {
  products: UnifiedProduct[]
  loading: boolean
  error: string | null
  lastUpdate: Date | null
  refresh: () => Promise<void>
  forceRefresh: () => Promise<void>
  getProduct: (productId: string) => UnifiedProduct | null
  updateProduct: (productId: string, data: Partial<UnifiedProduct>) => Promise<void>
  syncData: () => Promise<void>
}

// Cache global partagé entre tous les composants
let globalCache: {
  data: UnifiedProduct[]
  timestamp: number
  subscribers: Set<(data: UnifiedProduct[]) => void>
  loading: boolean
  error: string | null
} = {
  data: [],
  timestamp: 0,
  subscribers: new Set(),
  loading: false,
  error: null
}

const CACHE_DURATION = 30000 // 30 secondes
const REFRESH_INTERVAL = 60000 // 1 minute

export function useUnifiedStockCache(): UnifiedStockCache {
  const [data, setData] = useState<UnifiedProduct[]>(globalCache.data)
  const [loading, setLoading] = useState(globalCache.loading)
  const [error, setError] = useState<string | null>(globalCache.error)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(
    globalCache.timestamp > 0 ? new Date(globalCache.timestamp) : null
  )
  
  const intervalRef = useRef<NodeJS.Timeout>()

  // S'abonner aux mises à jour du cache global
  useEffect(() => {
    const updateLocalState = (newData: UnifiedProduct[]) => {
      setData(newData)
      setLastUpdate(new Date())
    }

    globalCache.subscribers.add(updateLocalState)

    return () => {
      globalCache.subscribers.delete(updateLocalState)
    }
  }, [])

  // Auto-refresh périodique
  useEffect(() => {
    const startAutoRefresh = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      
      intervalRef.current = setInterval(() => {
        if (globalCache.timestamp > 0 && Date.now() - globalCache.timestamp > REFRESH_INTERVAL) {
          refresh()
        }
      }, REFRESH_INTERVAL)
    }

    startAutoRefresh()

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const fetchData = useCallback(async (force = false) => {
    // Éviter les appels multiples simultanés
    if (globalCache.loading && !force) {
      return
    }

    // Utiliser le cache si récent et pas de force
    if (!force && globalCache.timestamp > 0 && Date.now() - globalCache.timestamp < CACHE_DURATION) {
      setData(globalCache.data)
      setLoading(false)
      setError(null)
      return
    }

    try {
      globalCache.loading = true
      setLoading(true)
      setError(null)
      
      const response = await api.get('/api/v1/stock/unified/products')
      
      if (response.data?.success && response.data?.data) {
        const products = response.data.data as UnifiedProduct[]
        
        // Mettre à jour le cache global
        globalCache.data = products
        globalCache.timestamp = Date.now()
        globalCache.error = null
        
        // Notifier tous les abonnés
        globalCache.subscribers.forEach(callback => callback(products))
      } else {
        throw new Error('Format de réponse invalide')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue'
      console.error('❌ Erreur lors du chargement des stocks unifiés:', errorMessage)
      
      globalCache.error = errorMessage
      setError(errorMessage)
      
      // Notifier les abonnés de l'erreur
      globalCache.subscribers.forEach(callback => callback([]))
    } finally {
      globalCache.loading = false
      setLoading(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    await fetchData(false)
  }, [fetchData])

  const forceRefresh = useCallback(async () => {
    await fetchData(true)
  }, [fetchData])

  const getProduct = useCallback((productId: string): UnifiedProduct | null => {
    return globalCache.data.find(p => p.id === productId) || null
  }, [])

  const updateProduct = useCallback(async (productId: string, updateData: Partial<UnifiedProduct>) => {
    try {
      
      const response = await api.put(`/api/v1/stock/unified/products/${productId}`, updateData)
      
      if (response.data?.success && response.data?.data) {
        const updatedProduct = response.data.data as UnifiedProduct
        
        // Mettre à jour le cache local
        const updatedProducts = globalCache.data.map(p => 
          p.id === productId ? updatedProduct : p
        )
        
        globalCache.data = updatedProducts
        globalCache.timestamp = Date.now()
        
        // Notifier tous les abonnés
        globalCache.subscribers.forEach(callback => callback(updatedProducts))
      } else {
        throw new Error('Erreur lors de la mise à jour')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de mise à jour'
      console.error('❌ Erreur lors de la mise à jour du produit:', errorMessage)
      throw new Error(errorMessage)
    }
  }, [])

  const syncData = useCallback(async () => {
    try {
      
      const response = await api.post('/api/v1/stock/unified/sync')
      
      if (response.data?.success) {
        // Recharger les données après synchronisation
        await forceRefresh()
      } else {
        throw new Error('Erreur lors de la synchronisation')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de synchronisation'
      console.error('❌ Erreur lors de la synchronisation:', errorMessage)
      throw new Error(errorMessage)
    }
  }, [forceRefresh])

  // Charger les données au premier rendu si le cache est vide
  useEffect(() => {
    if (globalCache.data.length === 0 && !globalCache.loading) {
      fetchData()
    }
  }, [fetchData])

  return {
    products: data,
    loading,
    error,
    lastUpdate,
    refresh,
    forceRefresh,
    getProduct,
    updateProduct,
    syncData
  }
}

// Hook simplifié pour les composants qui n'ont besoin que des données de base
export function useUnifiedProducts() {
  const { products, loading, error, refresh, forceRefresh } = useUnifiedStockCache()

  return {
    products,
    loading,
    error,
    refresh,
    forceRefresh,
    lowStockProducts: products.filter(p => p.status === 'low'),
    outOfStockProducts: products.filter(p => p.status === 'out'),
    overStockProducts: products.filter(p => p.status === 'over'),
    normalStockProducts: products.filter(p => p.status === 'normal'),
    totalProducts: products.length,
    totalValue: products.reduce((sum, p) => sum + p.value, 0)
  }
}

// Hook pour un produit spécifique
export function useUnifiedProduct(productId: string) {
  const { getProduct, updateProduct, loading, error, refresh } = useUnifiedStockCache()
  const [product, setProduct] = useState<UnifiedProduct | null>(null)

  useEffect(() => {
    const foundProduct = getProduct(productId)
    setProduct(foundProduct)
  }, [productId, getProduct])

  const updateStock = useCallback(async (data: { stockQuantity?: number; minStock?: number; maxStock?: number }) => {
    if (!product) return

    try {
      await updateProduct(productId, data)
      // Le produit sera automatiquement mis à jour via le cache global
    } catch (error) {
      console.error('Erreur lors de la mise à jour du stock:', error)
      throw error
    }
  }, [product, productId, updateProduct])

  return {
    product,
    loading,
    error,
    refresh,
    updateStock
  }
}
