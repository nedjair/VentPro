/**
 * Hook unifié pour synchroniser toutes les données de stock
 * Utilise une seule source de vérité et synchronise tous les composants
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '@/lib/api'

export interface UnifiedStockAlert {
  id: string
  type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCK' | 'EXPIRY_WARNING' | 'NEGATIVE_STOCK'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  message: string
  isRead: boolean
  isActive: boolean
  currentStock: number
  thresholdValue: number
  productId: string
  product?: {
    id: string
    name: string
    sku?: string
  }
  createdAt: string
  updatedAt: string
}

export interface UnifiedStockProduct {
  id: string
  name: string
  sku?: string
  stockQuantity: number
  minStock: number
  maxStock?: number
  status: 'normal' | 'low' | 'out' | 'over'
  statusLabel: string
  statusColor: string
  value: number
  unit: string
}

export interface UnifiedStockData {
  // Données du dashboard
  dashboard: {
    totalProducts: number
    productsInStock: number
    lowStockProducts: number
    outOfStockProducts: number
    overStockProducts: number
    totalStockValue: number
    activeAlerts: number
    criticalAlerts: number
    warningAlerts: number
    infoAlerts: number
  }
  
  // Alertes détaillées
  alerts: UnifiedStockAlert[]
  
  // Produits avec statut
  products: UnifiedStockProduct[]
  
  // État de chargement
  loading: boolean
  error: string | null
  lastUpdate: Date | null
  
  // Actions
  refresh: () => Promise<void>
  forceRefresh: () => Promise<void>
}

// Cache global pour éviter les appels multiples
let globalCache: {
  data: UnifiedStockData | null
  timestamp: number
  subscribers: Set<(data: UnifiedStockData) => void>
} = {
  data: null,
  timestamp: 0,
  subscribers: new Set()
}

const CACHE_DURATION = 5000 // 5 secondes

export function useUnifiedStockData(): UnifiedStockData {
  const [data, setData] = useState<UnifiedStockData>({
    dashboard: {
      totalProducts: 0,
      productsInStock: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,
      overStockProducts: 0,
      totalStockValue: 0,
      activeAlerts: 0,
      criticalAlerts: 0,
      warningAlerts: 0,
      infoAlerts: 0
    },
    alerts: [],
    products: [],
    loading: true,
    error: null,
    lastUpdate: null,
    refresh: async () => {},
    forceRefresh: async () => {}
  })

  const subscriberRef = useRef<(data: UnifiedStockData) => void>()

  const fetchUnifiedData = useCallback(async (force: boolean = false) => {
    try {
      // Vérifier le cache si pas de force refresh
      if (!force && globalCache.data && (Date.now() - globalCache.timestamp) < CACHE_DURATION) {
        setData(globalCache.data)
        return
      }
      
      setData(prev => ({ ...prev, loading: true, error: null }))
      const [dashboardResponse, alertsResponse, productsResponse] = await Promise.all([
        api.get('/api/v1/stock/dashboard?t=' + Date.now()),
        api.get('/api/v1/stock-alerts/alerts?isActive=true&limit=100&t=' + Date.now()),
        api.get('/api/v1/products?limit=100&t=' + Date.now())
      ])

      if (!dashboardResponse.data.success || !alertsResponse.data.success || !productsResponse.data.success) {
        throw new Error('Erreur lors du chargement des données')
      }

      // Traitement des données du dashboard existant
      const dashboardData = dashboardResponse.data.data

      // Gestion flexible des alertes (peut être dans data ou data.alerts)
      let alertsData = alertsResponse.data.data || []
      if (!Array.isArray(alertsData) && alertsData.alerts) {
        alertsData = alertsData.alerts
      }
      if (!Array.isArray(alertsData)) {
        alertsData = []
      }

      // Gestion flexible des produits (peut être dans data, data.data, ou data.products)
      let productsData = productsResponse.data.data || []
      if (!Array.isArray(productsData)) {
        if (productsData.data && Array.isArray(productsData.data)) {
          productsData = productsData.data
        } else if (productsData.products && Array.isArray(productsData.products)) {
          productsData = productsData.products
        } else {
          productsData = []
        }
      }

      // Calcul des alertes par sévérité
      const alertsBySeverity = alertsData.reduce((acc: any, alert: UnifiedStockAlert) => {
        acc[alert.severity] = (acc[alert.severity] || 0) + 1
        return acc
      }, {})

      // Traitement des produits avec statut - Gestion des différents formats de champs
      const processedProducts: UnifiedStockProduct[] = productsData.map((product: any) => {
        // Normalisation des champs de stock (gestion des différents noms)
        const stockQuantity = product.stockQuantity ?? product.quantiteActuelle ?? product.stock ?? 0
        const minStock = product.minStock ?? product.quantiteMinimale ?? product.min_stock ?? 0
        const maxStock = product.maxStock ?? product.quantiteMaximale ?? product.max_stock ?? null
        const price = product.price ?? 0

        let status: 'normal' | 'low' | 'out' | 'over' = 'normal'
        let statusLabel = 'Stock normal'
        let statusColor = 'green'

        if (stockQuantity === 0) {
          status = 'out'
          statusLabel = 'Rupture'
          statusColor = 'red'
        } else if (stockQuantity <= minStock && minStock > 0) {
          status = 'low'
          statusLabel = 'Stock faible'
          statusColor = 'orange'
        } else if (maxStock && stockQuantity > maxStock) {
          status = 'over'
          statusLabel = 'Surstock'
          statusColor = 'blue'
        }

        return {
          id: product.id,
          name: product.name,
          sku: product.sku,
          stockQuantity,
          minStock,
          maxStock,
          status,
          statusLabel,
          statusColor,
          value: stockQuantity * price,
          unit: product.unit || 'pièce'
        }
      })

      // Calcul des compteurs basés sur les données réelles (source de vérité = produits traités)
      const outOfStockCount = processedProducts.filter(p => p.status === 'out').length
      const lowStockCount = processedProducts.filter(p => p.status === 'low').length
      const overStockCount = processedProducts.filter(p => p.status === 'over').length
      const inStockCount = processedProducts.filter(p => p.status !== 'out').length
      const totalStockValue = processedProducts.reduce((sum, p) => sum + p.value, 0)

      // Vérification de cohérence avec le dashboard
      const dashboardOutOfStockFromAPI = dashboardData.overview?.outOfStockProducts ?? 0
      const dashboardLowStockFromAPI = dashboardData.overview?.lowStockProducts ?? 0

      if (dashboardOutOfStockFromAPI !== outOfStockCount || dashboardLowStockFromAPI !== lowStockCount) {
        console.warn('⚠️  Incohérence détectée:', {
          dashboard: { outOfStock: dashboardOutOfStockFromAPI, lowStock: dashboardLowStockFromAPI },
          calculated: { outOfStock: outOfStockCount, lowStock: lowStockCount }
        })
      }

      // Construction des données unifiées - Utilisation des produits comme source de vérité
      const unifiedData: UnifiedStockData = {
        dashboard: {
          // Utiliser les données calculées comme source de vérité
          totalProducts: processedProducts.length,
          productsInStock: inStockCount,
          lowStockProducts: lowStockCount,
          outOfStockProducts: outOfStockCount,
          overStockProducts: overStockCount,
          totalStockValue,
          activeAlerts: alertsData.length,
          criticalAlerts: alertsBySeverity.CRITICAL || 0,
          warningAlerts: (alertsBySeverity.HIGH || 0) + (alertsBySeverity.MEDIUM || 0),
          infoAlerts: alertsBySeverity.LOW || 0
        },
        alerts: alertsData,
        products: processedProducts,
        loading: false,
        error: null,
        lastUpdate: new Date(),
        refresh: () => fetchUnifiedData(false),
        forceRefresh: () => fetchUnifiedData(true)
      }

      // Vérification de cohérence finale avec le dashboard
      const dashboardOutOfStockFinal = dashboardData.overview?.outOfStockProducts ?? 0
      const dashboardLowStockFinal = dashboardData.overview?.lowStockProducts ?? 0
      const dashboardActiveAlertsFinal = dashboardData.activity?.activeAlerts ?? 0

      if (dashboardOutOfStockFinal !== outOfStockCount ||
          dashboardLowStockFinal !== lowStockCount ||
          dashboardActiveAlertsFinal !== alertsData.length) {
        console.warn('⚠️  Incohérence détectée entre dashboard et données calculées:', {
          dashboard: {
            outOfStock: dashboardOutOfStockFinal,
            lowStock: dashboardLowStockFinal,
            activeAlerts: dashboardActiveAlertsFinal
          },
          calculated: {
            outOfStock: outOfStockCount,
            lowStock: lowStockCount,
            activeAlerts: alertsData.length
          },
          source: 'frontend-unified-verification'
        })
      }

      // Mise à jour du cache global
      globalCache.data = unifiedData
      globalCache.timestamp = Date.now()

      // Notification de tous les abonnés
      globalCache.subscribers.forEach(subscriber => {
        try {
          subscriber(unifiedData)
        } catch (error) {
          console.error('Erreur lors de la notification d\'un abonné:', error)
        }
      })

      setData(unifiedData)

    } catch (error: any) {
      console.error('❌ Erreur lors du chargement des données unifiées:', error)
      
      const errorData: UnifiedStockData = {
        ...data,
        loading: false,
        error: error.response?.data?.message || error.message || 'Erreur de chargement',
        refresh: () => fetchUnifiedData(false),
        forceRefresh: () => fetchUnifiedData(true)
      }

      setData(errorData)
      
      // Mettre à jour le cache même en cas d'erreur pour éviter les boucles
      globalCache.data = errorData
      globalCache.timestamp = Date.now()
    }
  }, [])

  // Abonnement aux mises à jour globales
  useEffect(() => {
    subscriberRef.current = (newData: UnifiedStockData) => {
      setData(newData)
    }

    globalCache.subscribers.add(subscriberRef.current)

    return () => {
      if (subscriberRef.current) {
        globalCache.subscribers.delete(subscriberRef.current)
      }
    }
  }, [])

  // Chargement initial
  useEffect(() => {
    fetchUnifiedData(false)
  }, [fetchUnifiedData])

  // Auto-refresh toutes les 30 secondes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchUnifiedData(false)
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchUnifiedData])

  return data
}

// Hook simplifié pour les composants qui n'ont besoin que des alertes
export function useUnifiedAlerts() {
  const { alerts, loading, error, refresh, forceRefresh } = useUnifiedStockData()
  
  return {
    alerts,
    loading,
    error,
    refresh,
    forceRefresh,
    totalAlerts: alerts.length,
    criticalAlerts: alerts.filter(a => a.severity === 'HIGH' || a.severity === 'CRITICAL').length,
    warningAlerts: alerts.filter(a => a.severity === 'MEDIUM').length,
    infoAlerts: alerts.filter(a => a.severity === 'LOW').length
  }
}

// Hook simplifié pour les composants qui n'ont besoin que du dashboard
export function useUnifiedDashboard() {
  const { dashboard, loading, error, refresh, forceRefresh, lastUpdate } = useUnifiedStockData()
  
  return {
    dashboard,
    loading,
    error,
    refresh,
    forceRefresh,
    lastUpdate
  }
}

// Hook simplifié pour les composants qui n'ont besoin que des produits
export function useUnifiedProducts() {
  const { products, loading, error, refresh, forceRefresh } = useUnifiedStockData()
  
  return {
    products,
    loading,
    error,
    refresh,
    forceRefresh,
    lowStockProducts: products.filter(p => p.status === 'low'),
    outOfStockProducts: products.filter(p => p.status === 'out'),
    overStockProducts: products.filter(p => p.status === 'over'),
    normalStockProducts: products.filter(p => p.status === 'normal')
  }
}
