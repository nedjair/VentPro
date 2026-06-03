import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'

export interface RealTimeStockData {
  productId: string
  productName: string
  sku?: string
  category?: string
  currentStock: number
  reservedStock: number
  inTransitStock: number
  availableStock: number
  minStock: number
  maxStock?: number
  stockValue: number
  averageCost?: number
  lastUpdate: string
  alerts: {
    isOutOfStock: boolean
    isLowStock: boolean
    isOverStock: boolean
    isNegativeStock: boolean
  }
}

export interface StockDashboard {
  overview: {
    totalProducts: number
    productsInStock: number
    lowStockProducts: number
    outOfStockProducts: number
    overStockProducts: number
    totalStockValue: number
  }
  activity: {
    recentMovements: number
    activeAlerts: number
  }
  alerts: {
    critical: number
    warning: number
    info: number
  }
  lastUpdate: string
}

export interface StockAlert {
  id: string
  type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCK' | 'EXPIRY_WARNING' | 'NEGATIVE_STOCK'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  message: string
  isRead: boolean
  isActive: boolean
  currentStock?: number
  thresholdValue?: number
  productId: string
  product: {
    id: string
    name: string
    sku?: string
    category?: {
      id: string
      name: string
    }
  }
  createdAt: string
  updatedAt: string
  resolvedAt?: string
}

export function useRealTimeStock(productId?: string) {
  const [stockData, setStockData] = useState<RealTimeStockData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStockData = useCallback(async () => {
    if (!productId) return

    setLoading(true)
    setError(null)

    try {
      const response = await api.get(`/stock/realtime/${productId}`)
      if (response.data.success) {
        setStockData(response.data.data)
      } else {
        setError(response.data.message || 'Erreur lors de la récupération du stock')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    if (productId) {
      fetchStockData()
    }
  }, [productId, fetchStockData])

  return {
    stockData,
    loading,
    error,
    refetch: fetchStockData,
  }
}

export function useStockDashboard(refreshInterval: number = 30000) {
  const [dashboard, setDashboard] = useState<StockDashboard | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const fetchDashboard = useCallback(async (isRetry: boolean = false) => {
    if (!isRetry) {
      setLoading(true)
    }
    setError(null)

    try {
      const response = await api.get('/stock/dashboard')

      if (response.data.success) {
        const newDashboard = response.data.data
        setDashboard(newDashboard)
        setLastUpdate(new Date())
        setRetryCount(0)
      } else {
        throw new Error(response.data.message || 'Erreur lors de la récupération du tableau de bord')
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erreur de connexion'
      setError(errorMessage)
      setRetryCount(prev => prev + 1)

      console.error('❌ Dashboard fetch error:', {
        error: errorMessage,
        retryCount: retryCount + 1,
        timestamp: new Date().toISOString()
      })

      // Retry automatique après 5 secondes si moins de 3 tentatives
      if (retryCount < 3) {
        setTimeout(() => {
          fetchDashboard(true)
        }, 5000)
      }
    } finally {
      if (!isRetry) {
        setLoading(false)
      }
    }
  }, [retryCount])

  // Force refresh function pour déclencher manuellement
  const forceRefresh = useCallback(() => {
    setRetryCount(0)
    fetchDashboard(false)
  }, [fetchDashboard])

  useEffect(() => {
    // Fetch initial data
    fetchDashboard()

    // Set up interval for automatic refresh
    const interval = setInterval(() => {
      fetchDashboard(true) // Silent refresh
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [fetchDashboard, refreshInterval])

  // Register with stock context for global synchronization
  useEffect(() => {
    try {
      // Try to use stock context if available
      const { useStockDashboardSync } = require('../contexts/StockContext')
      const registerSync = useStockDashboardSync()

      if (registerSync) {
        return registerSync(() => {
          fetchDashboard(true)
        })
      }
    } catch (error) {
    }
  }, [fetchDashboard])

  // Listen for focus events to refresh when user returns to tab
  useEffect(() => {
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchDashboard(true)
      }
    }

    document.addEventListener('visibilitychange', handleFocus)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleFocus)
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchDashboard])

  return {
    dashboard,
    loading,
    error,
    lastUpdate,
    retryCount,
    refetch: fetchDashboard,
    forceRefresh,
  }
}

export function useStockAlerts() {
  const [alerts, setAlerts] = useState<StockAlert[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  const fetchAlerts = useCallback(async (filters?: {
    type?: string
    severity?: string
    isRead?: boolean
    isActive?: boolean
    page?: number
    limit?: number
  }) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (filters?.type) params.append('type', filters.type)
      if (filters?.severity) params.append('severity', filters.severity)
      if (typeof filters?.isRead === 'boolean') params.append('isRead', filters.isRead.toString())
      if (typeof filters?.isActive === 'boolean') params.append('isActive', filters.isActive.toString())
      if (filters?.page) params.append('page', filters.page.toString())
      if (filters?.limit) params.append('limit', filters.limit.toString())

      const response = await api.get(`/stock-alerts/alerts?${params.toString()}`)
      if (response.data.success) {
        setAlerts(response.data.data)
        setPagination(response.data.pagination)
      } else {
        setError(response.data.message || 'Erreur lors de la récupération des alertes')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }, [])

  const markAsRead = useCallback(async (alertId: string) => {
    try {
      const response = await api.patch(`/stock-alerts/alerts/${alertId}/read`)
      if (response.data.success) {
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId ? { ...alert, isRead: true } : alert
        ))
        return true
      }
      return false
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du marquage comme lu')
      return false
    }
  }, [])

  const resolveAlert = useCallback(async (alertId: string) => {
    try {
      const response = await api.patch(`/stock-alerts/alerts/${alertId}/resolve`)
      if (response.data.success) {
        setAlerts(prev => prev.map(alert =>
          alert.id === alertId ? { ...alert, isActive: false, resolvedAt: new Date().toISOString() } : alert
        ))
        return true
      }
      return false
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la résolution')
      return false
    }
  }, [])

  const deleteAlert = useCallback(async (alertId: string) => {
    try {
      const response = await api.delete(`/stock-alerts/alerts/${alertId}`)
      if (response.data.success) {
        setAlerts(prev => prev.filter(alert => alert.id !== alertId))
        return true
      }
      return false
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression')
      return false
    }
  }, [])

  const checkAlerts = useCallback(async () => {
    try {
      const response = await api.post('/stock-alerts/alerts/check')
      if (response.data.success) {
        // Recharger les alertes après vérification
        await fetchAlerts()
        return true
      }
      return false
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la vérification')
      return false
    }
  }, [fetchAlerts])

  useEffect(() => {
    fetchAlerts({ isActive: true })
  }, [fetchAlerts])

  return {
    alerts,
    loading,
    error,
    pagination,
    fetchAlerts,
    markAsRead,
    resolveAlert,
    deleteAlert,
    checkAlerts,
  }
}

export function useStockMovements() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reserveStock = useCallback(async (productId: string, quantity: number, orderId?: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await api.post('/stock/reserve', {
        productId,
        quantity,
        orderId,
      })

      if (response.data.success) {
        // Trigger dashboard and alerts refresh after successful operation
        try {
          const { useStockContext } = require('../contexts/StockContext')
          const { triggerDashboardRefresh, triggerAlertsRefresh } = useStockContext()
          setTimeout(() => {
            triggerDashboardRefresh()
            triggerAlertsRefresh()
          }, 1000) // Delay to allow backend processing
        } catch (error) {
        }

        return response.data.data
      } else {
        setError(response.data.message || 'Erreur lors de la réservation')
        return null
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur de connexion')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const releaseReservation = useCallback(async (productId: string, quantity: number, orderId?: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await api.post('/stock/release', {
        productId,
        quantity,
        orderId,
      })

      if (response.data.success) {
        // Trigger dashboard and alerts refresh after successful operation
        try {
          const { useStockContext } = require('../contexts/StockContext')
          const { triggerDashboardRefresh, triggerAlertsRefresh } = useStockContext()
          setTimeout(() => {
            triggerDashboardRefresh()
            triggerAlertsRefresh()
          }, 1000)
        } catch (error) {
        }

        return response.data.data
      } else {
        setError(response.data.message || 'Erreur lors de la libération')
        return null
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur de connexion')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const createMovement = useCallback(async (movementData: {
    type: string
    quantity: number
    productId: string
    unitCost?: number
    reference?: string
    comment?: string
  }) => {
    setLoading(true)
    setError(null)

    try {
      const response = await api.post('/stock/movements', movementData)

      if (response.data.success) {
        // Trigger dashboard and alerts refresh after successful operation
        try {
          const { useStockContext } = require('../contexts/StockContext')
          const { triggerDashboardRefresh, triggerAlertsRefresh } = useStockContext()
          setTimeout(() => {
            triggerDashboardRefresh()
            triggerAlertsRefresh()
          }, 1000)
        } catch (error) {
        }

        return response.data.data
      } else {
        setError(response.data.message || 'Erreur lors de la création du mouvement')
        return null
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur de connexion')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    reserveStock,
    releaseReservation,
    createMovement,
  }
}
