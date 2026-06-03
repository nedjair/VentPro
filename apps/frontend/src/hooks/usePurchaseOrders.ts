'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  PurchaseOrder, 
  PurchaseOrderFilters, 
  PurchaseOrderListResponse,
  PurchaseOrderResponse,
  CreatePurchaseOrderData,
  UpdatePurchaseOrderData,
  PurchaseOrderStats,
  PurchaseOrderStatsResponse
} from '@/lib/api'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'

interface UsePurchaseOrdersState {
  purchaseOrders: PurchaseOrder[]
  loading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  stats: PurchaseOrderStats | null
}

interface UsePurchaseOrdersReturn extends UsePurchaseOrdersState {
  fetchPurchaseOrders: (filters?: PurchaseOrderFilters) => Promise<void>
  createPurchaseOrder: (data: CreatePurchaseOrderData) => Promise<PurchaseOrder>
  updatePurchaseOrder: (id: string, data: UpdatePurchaseOrderData) => Promise<PurchaseOrder>
  deletePurchaseOrder: (id: string) => Promise<void>
  updateStatus: (id: string, status: string) => Promise<PurchaseOrder>
  fetchStats: () => Promise<void>
  refreshData: () => Promise<void>
}

export function usePurchaseOrders(initialFilters?: PurchaseOrderFilters): UsePurchaseOrdersReturn {
  const { user } = useAuth()
  const [state, setState] = useState<UsePurchaseOrdersState>({
    purchaseOrders: [],
    loading: false,
    error: null,
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0
    },
    stats: null
  })

  const [currentFilters, setCurrentFilters] = useState<PurchaseOrderFilters>(
    initialFilters || { page: 1, limit: 10 }
  )

  const fetchPurchaseOrders = useCallback(async (filters?: PurchaseOrderFilters) => {

    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      const filtersToUse = filters || currentFilters
      setCurrentFilters(filtersToUse)

      const queryParams = new URLSearchParams()
      
      if (filtersToUse.page) queryParams.append('page', filtersToUse.page.toString())
      if (filtersToUse.limit) queryParams.append('limit', filtersToUse.limit.toString())
      if (filtersToUse.search) queryParams.append('search', filtersToUse.search)
      if (filtersToUse.supplierId) queryParams.append('supplierId', filtersToUse.supplierId)
      if (filtersToUse.status) queryParams.append('status', filtersToUse.status)
      if (filtersToUse.dateFrom) queryParams.append('dateFrom', filtersToUse.dateFrom)
      if (filtersToUse.dateTo) queryParams.append('dateTo', filtersToUse.dateTo)

      const url = `/api/v1/purchase-orders?${queryParams.toString()}`

      const response = await api.get<PurchaseOrderListResponse>(url)

      if (response.data.success) {
        setState(prev => ({
          ...prev,
          purchaseOrders: response.data.data,
          pagination: response.data.pagination,
          loading: false
        }))
      } else {
        throw new Error(response.data.message || 'Erreur lors de la récupération des commandes')
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des commandes fournisseurs:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }))
    }
  }, [])

  const createPurchaseOrder = useCallback(async (data: CreatePurchaseOrderData): Promise<PurchaseOrder> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      const response = await api.post<PurchaseOrderResponse>('/api/v1/purchase-orders', data)

      if (response.data.success) {

        // Rafraîchir la liste après création avec les filtres actuels
        await fetchPurchaseOrders(currentFilters)

        setState(prev => ({ ...prev, loading: false }))
        return response.data.data
      } else {
        throw new Error(response.data.message || 'Erreur lors de la création de la commande')
      }
    } catch (error) {
      console.error('Erreur lors de la création de la commande fournisseur:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }))
      throw error
    }
  }, [currentFilters])

  const updatePurchaseOrder = useCallback(async (id: string, data: UpdatePurchaseOrderData): Promise<PurchaseOrder> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      const response = await api.put<PurchaseOrderResponse>(`/api/v1/purchase-orders/${id}`, data)

      if (response.data.success) {
        // Mettre à jour la commande dans la liste
        setState(prev => ({
          ...prev,
          purchaseOrders: prev.purchaseOrders.map(order =>
            order.id === id ? response.data.data : order
          ),
          loading: false
        }))
        return response.data.data
      } else {
        throw new Error(response.data.message || 'Erreur lors de la mise à jour de la commande')
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la commande fournisseur:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }))
      throw error
    }
  }, [user])

  const deletePurchaseOrder = useCallback(async (id: string): Promise<void> => {
    if (!user) throw new Error('Utilisateur non authentifié')

    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      const response = await api.delete(`/api/v1/purchase-orders/${id}`)

      if (response.data.success) {
        // Supprimer la commande de la liste
        setState(prev => ({
          ...prev,
          purchaseOrders: prev.purchaseOrders.filter(order => order.id !== id),
          loading: false
        }))
      } else {
        throw new Error(response.data.message || 'Erreur lors de la suppression de la commande')
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de la commande fournisseur:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }))
      throw error
    }
  }, [])

  const updateStatus = useCallback(async (id: string, status: string): Promise<PurchaseOrder> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      const response = await api.patch<PurchaseOrderResponse>(`/api/v1/purchase-orders/${id}/status`, { status })

      if (response.data.success) {
        // Mettre à jour le statut dans la liste
        setState(prev => ({
          ...prev,
          purchaseOrders: prev.purchaseOrders.map(order =>
            order.id === id ? response.data.data : order
          ),
          loading: false
        }))
        return response.data.data
      } else {
        throw new Error(response.data.message || 'Erreur lors de la mise à jour du statut')
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }))
      throw error
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get<PurchaseOrderStatsResponse>('/api/v1/purchase-orders/stats')

      if (response.data.success) {
        setState(prev => ({
          ...prev,
          stats: response.data.data
        }))
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error)
    }
  }, [])

  const refreshData = useCallback(async () => {
    await Promise.all([
      fetchPurchaseOrders(),
      fetchStats()
    ])
  }, [])

  // Charger les données initiales
  useEffect(() => {
    if (user) {
      fetchPurchaseOrders()
      fetchStats()
    }
  }, [user])

  return {
    ...state,
    fetchPurchaseOrders,
    createPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    updateStatus,
    fetchStats,
    refreshData
  }
}
