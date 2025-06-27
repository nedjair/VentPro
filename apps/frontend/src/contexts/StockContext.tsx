'use client'

import React, { createContext, useContext, useCallback, useRef } from 'react'

interface StockContextType {
  triggerDashboardRefresh: () => void
  triggerAlertsRefresh: () => void
  registerDashboardRefresh: (callback: () => void) => () => void
  registerAlertsRefresh: (callback: () => void) => () => void
}

const StockContext = createContext<StockContextType | undefined>(undefined)

export function StockProvider({ children }: { children: React.ReactNode }) {
  const dashboardCallbacks = useRef<Set<() => void>>(new Set())
  const alertsCallbacks = useRef<Set<() => void>>(new Set())

  const triggerDashboardRefresh = useCallback(() => {
    console.log('🔄 Triggering dashboard refresh for all components')
    dashboardCallbacks.current.forEach(callback => {
      try {
        callback()
      } catch (error) {
        console.error('Error in dashboard refresh callback:', error)
      }
    })
  }, [])

  const triggerAlertsRefresh = useCallback(() => {
    console.log('🔄 Triggering alerts refresh for all components')
    alertsCallbacks.current.forEach(callback => {
      try {
        callback()
      } catch (error) {
        console.error('Error in alerts refresh callback:', error)
      }
    })
  }, [])

  const registerDashboardRefresh = useCallback((callback: () => void) => {
    dashboardCallbacks.current.add(callback)
    return () => {
      dashboardCallbacks.current.delete(callback)
    }
  }, [])

  const registerAlertsRefresh = useCallback((callback: () => void) => {
    alertsCallbacks.current.add(callback)
    return () => {
      alertsCallbacks.current.delete(callback)
    }
  }, [])

  return (
    <StockContext.Provider value={{
      triggerDashboardRefresh,
      triggerAlertsRefresh,
      registerDashboardRefresh,
      registerAlertsRefresh,
    }}>
      {children}
    </StockContext.Provider>
  )
}

export function useStockContext() {
  const context = useContext(StockContext)
  if (context === undefined) {
    throw new Error('useStockContext must be used within a StockProvider')
  }
  return context
}

// Hook pour synchroniser automatiquement le dashboard
export function useStockDashboardSync() {
  const { registerDashboardRefresh } = useStockContext()
  
  return useCallback((refreshCallback: () => void) => {
    return registerDashboardRefresh(refreshCallback)
  }, [registerDashboardRefresh])
}

// Hook pour synchroniser automatiquement les alertes
export function useStockAlertsSync() {
  const { registerAlertsRefresh } = useStockContext()
  
  return useCallback((refreshCallback: () => void) => {
    return registerAlertsRefresh(refreshCallback)
  }, [registerAlertsRefresh])
}
