'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { 
  RefreshCw, 
  Bug, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'
import { useStockDashboard, useStockAlerts } from '../../hooks/useRealTimeStock'
import { api } from '../../lib/api'

interface DebugLog {
  timestamp: string
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
  data?: any
}

export function StockDebugPanel() {
  const [isVisible, setIsVisible] = useState(false)
  const [logs, setLogs] = useState<DebugLog[]>([])
  const [apiStatus, setApiStatus] = useState<'unknown' | 'connected' | 'error'>('unknown')
  
  const { dashboard, loading: dashboardLoading, error: dashboardError, lastUpdate } = useStockDashboard(10000)
  const { alerts, loading: alertsLoading, error: alertsError } = useStockAlerts()

  const addLog = (type: DebugLog['type'], message: string, data?: any) => {
    const newLog: DebugLog = {
      timestamp: new Date().toISOString(),
      type,
      message,
      data
    }
    setLogs(prev => [newLog, ...prev.slice(0, 49)]) // Keep last 50 logs
  }

  // Test API connectivity
  const testApiConnection = async () => {
    try {
      addLog('info', 'Testing API connection...')
      const response = await api.get('/health')
      setApiStatus('connected')
      addLog('success', 'API connection successful', response.data)
    } catch (error: any) {
      setApiStatus('error')
      addLog('error', 'API connection failed', error.message)
    }
  }

  // Test dashboard API specifically
  const testDashboardApi = async () => {
    try {
      addLog('info', 'Testing dashboard API...')
      const response = await api.get('/stock/dashboard')
      addLog('success', 'Dashboard API successful', {
        activeAlerts: response.data.data?.activity?.activeAlerts,
        totalProducts: response.data.data?.overview?.totalProducts
      })
    } catch (error: any) {
      addLog('error', 'Dashboard API failed', error.response?.data || error.message)
    }
  }

  // Test alerts API
  const testAlertsApi = async () => {
    try {
      addLog('info', 'Testing alerts API...')
      const response = await api.get('/stock-alerts/alerts?isActive=true')
      addLog('success', 'Alerts API successful', {
        alertsCount: response.data.data?.length,
        pagination: response.data.pagination
      })
    } catch (error: any) {
      addLog('error', 'Alerts API failed', error.response?.data || error.message)
    }
  }

  // Force synchronization
  const forceSynchronization = async () => {
    try {
      addLog('info', 'Forcing synchronization...')
      const response = await api.post('/stock/sync')
      addLog('success', 'Synchronization successful', {
        activeAlerts: response.data.data?.activity?.activeAlerts,
        message: response.data.message
      })
    } catch (error: any) {
      addLog('error', 'Synchronization failed', error.response?.data || error.message)
    }
  }

  // Monitor dashboard changes
  useEffect(() => {
    if (dashboard) {
      addLog('info', 'Dashboard updated', {
        activeAlerts: dashboard.activity.activeAlerts,
        critical: dashboard.alerts.critical,
        warning: dashboard.alerts.warning,
        info: dashboard.alerts.info,
        lastUpdate: dashboard.lastUpdate
      })
    }
  }, [dashboard])

  // Monitor alerts changes
  useEffect(() => {
    if (alerts.length > 0) {
      addLog('info', 'Alerts updated', {
        alertsCount: alerts.length,
        activeAlerts: alerts.filter(a => a.isActive).length
      })
    }
  }, [alerts])

  // Monitor errors
  useEffect(() => {
    if (dashboardError) {
      addLog('error', 'Dashboard error', dashboardError)
    }
  }, [dashboardError])

  useEffect(() => {
    if (alertsError) {
      addLog('error', 'Alerts error', alertsError)
    }
  }, [alertsError])

  // Initial API test
  useEffect(() => {
    testApiConnection()
  }, [])

  if (!isVisible) {
    return (
      <div className="fixed top-4 right-40 z-20">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsVisible(true)}
          className="bg-white shadow-md"
        >
          <Bug className="h-3 w-3 mr-1" />
          Debug
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed top-4 right-40 w-96 max-h-96 z-20">
      <Card className="shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center">
              <Bug className="h-4 w-4 mr-2" />
              Debug Panel Stock
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Status */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                apiStatus === 'connected' ? 'bg-green-500' :
                apiStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'
              }`} />
              <span>API: {apiStatus}</span>
            </div>
            <div className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              <span>Dashboard: {dashboardLoading ? 'Loading' : 'Ready'}</span>
            </div>
          </div>

          {/* Current Data */}
          <div className="bg-gray-50 p-2 rounded text-xs">
            <div className="font-medium mb-1">État actuel:</div>
            <div>Alertes actives: {dashboard?.activity.activeAlerts || 0}</div>
            <div>Critiques: {dashboard?.alerts.critical || 0}</div>
            <div>Warnings: {dashboard?.alerts.warning || 0}</div>
            <div>Dernière MAJ: {lastUpdate?.toLocaleTimeString() || 'Jamais'}</div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-1">
            <Button variant="outline" size="sm" onClick={testApiConnection}>
              <RefreshCw className="h-3 w-3 mr-1" />
              API
            </Button>
            <Button variant="outline" size="sm" onClick={testDashboardApi}>
              Dashboard
            </Button>
            <Button variant="outline" size="sm" onClick={testAlertsApi}>
              Alerts
            </Button>
            <Button variant="outline" size="sm" onClick={forceSynchronization}>
              🔄 Sync
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLogs([])} className="col-span-2">
              Clear Logs
            </Button>
          </div>

          {/* Logs */}
          <div className="max-h-48 overflow-y-auto space-y-1">
            {logs.map((log, index) => (
              <div key={index} className="text-xs p-1 rounded bg-gray-50">
                <div className="flex items-center gap-1 mb-1">
                  <Badge variant={
                    log.type === 'success' ? 'default' :
                    log.type === 'error' ? 'destructive' :
                    log.type === 'warning' ? 'secondary' : 'outline'
                  } className="text-xs px-1 py-0">
                    {log.type}
                  </Badge>
                  <span className="text-gray-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="font-medium">{log.message}</div>
                {log.data && (
                  <pre className="text-xs text-gray-600 mt-1 overflow-hidden">
                    {JSON.stringify(log.data, null, 2).slice(0, 200)}
                  </pre>
                )}
              </div>
            ))}
            
            {logs.length === 0 && (
              <div className="text-center text-gray-500 text-xs py-4">
                Aucun log disponible
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
