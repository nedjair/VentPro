'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { 
  RefreshCw, 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Activity,
  DollarSign,
  BarChart3
} from 'lucide-react'
import { useStockDashboard } from '../../hooks/useRealTimeStock'
import { formatCurrency } from '../../lib/utils'

interface StockDashboardProps {
  onViewAlerts?: () => void
  onViewMovements?: () => void
  onViewProducts?: () => void
}

export function StockDashboard({
  onViewAlerts,
  onViewMovements,
  onViewProducts
}: StockDashboardProps) {
  const {
    dashboard,
    loading,
    error,
    lastUpdate,
    retryCount,
    refetch,
    forceRefresh
  } = useStockDashboard(15000) // Refresh toutes les 15 secondes pour plus de réactivité

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <span>Erreur: {error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!dashboard) {
    return null
  }

  const alertLevel = dashboard.alerts.critical > 0 ? 'critical' : 
                   dashboard.alerts.warning > 0 ? 'warning' : 'info'

  return (
    <div className="space-y-6">
      {/* En-tête avec actualisation */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tableau de bord Stock</h2>
          <div className="space-y-1">
            <p className="text-gray-600">
              Dernière mise à jour: {lastUpdate ? lastUpdate.toLocaleString('fr-FR') : 'Jamais'}
            </p>
            {retryCount > 0 && (
              <p className="text-orange-600 text-sm">
                ⚠️ Tentatives de reconnexion: {retryCount}/3
              </p>
            )}
            {dashboard && (
              <p className="text-green-600 text-sm">
                🔄 Auto-refresh: 15s | Alertes: {dashboard.activity.activeAlerts}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={forceRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Force Refresh
          </Button>
          <Button variant="outline" onClick={() => refetch(false)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Cartes de statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total produits */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Produits</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.overview.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              {dashboard.overview.productsInStock} en stock
            </p>
          </CardContent>
        </Card>

        {/* Valeur du stock */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur Stock</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(dashboard.overview.totalStockValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Valeur totale du stock
            </p>
          </CardContent>
        </Card>

        {/* Alertes */}
        <Card className={`${
          alertLevel === 'critical' ? 'border-red-500' :
          alertLevel === 'warning' ? 'border-orange-500' :
          'border-gray-200'
        }`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertes</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${
              alertLevel === 'critical' ? 'text-red-500' :
              alertLevel === 'warning' ? 'text-orange-500' :
              'text-muted-foreground'
            }`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.activity.activeAlerts}</div>
            <div className="flex gap-1 mt-2">
              {dashboard.alerts.critical > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {dashboard.alerts.critical} critique(s)
                </Badge>
              )}
              {dashboard.alerts.warning > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {dashboard.alerts.warning} attention
                </Badge>
              )}
            </div>
            {onViewAlerts && (
              <Button variant="link" size="sm" className="p-0 h-auto mt-1" onClick={onViewAlerts}>
                Voir les alertes
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Activité récente */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activité 24h</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.activity.recentMovements}</div>
            <p className="text-xs text-muted-foreground">
              Mouvements de stock
            </p>
            {onViewMovements && (
              <Button variant="link" size="sm" className="p-0 h-auto mt-1" onClick={onViewMovements}>
                Voir les mouvements
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cartes détaillées */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* État des stocks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              État des Stocks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm">Produits en stock</span>
              </div>
              <span className="font-semibold">{dashboard.overview.productsInStock}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span className="text-sm">Ruptures de stock</span>
              </div>
              <span className="font-semibold text-red-600">
                {dashboard.overview.outOfStockProducts}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                <span className="text-sm">Stock faible</span>
              </div>
              <span className="font-semibold text-orange-600">
                {dashboard.overview.lowStockProducts}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                <span className="text-sm">Surstock</span>
              </div>
              <span className="font-semibold text-blue-600">
                {dashboard.overview.overStockProducts}
              </span>
            </div>

            {onViewProducts && (
              <Button variant="outline" className="w-full mt-4" onClick={onViewProducts}>
                <Package className="h-4 w-4 mr-2" />
                Voir tous les produits
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Actions rapides */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Actions Rapides
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" onClick={() => window.location.href = '/stocks/movements/new'}>
              <Package className="h-4 w-4 mr-2" />
              Nouveau mouvement de stock
            </Button>

            <Button variant="outline" className="w-full justify-start" onClick={() => window.location.href = '/stocks/reception'}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Réception fournisseur
            </Button>

            <Button variant="outline" className="w-full justify-start" onClick={() => window.location.href = '/stocks/adjustment'}>
              <TrendingDown className="h-4 w-4 mr-2" />
              Ajustement d'inventaire
            </Button>

            <Button variant="outline" className="w-full justify-start" onClick={() => window.location.href = '/reports/stock'}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Rapport de stock
            </Button>

            <div className="pt-2 border-t">
              <Button variant="secondary" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Synchroniser les stocks
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Indicateurs de performance */}
      <Card>
        <CardHeader>
          <CardTitle>Indicateurs de Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {dashboard.overview.productsInStock > 0 
                  ? Math.round((dashboard.overview.productsInStock / dashboard.overview.totalProducts) * 100)
                  : 0}%
              </div>
              <p className="text-sm text-gray-600">Taux de disponibilité</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {dashboard.overview.totalProducts > 0 
                  ? Math.round((dashboard.overview.lowStockProducts / dashboard.overview.totalProducts) * 100)
                  : 0}%
              </div>
              <p className="text-sm text-gray-600">Produits en alerte</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {dashboard.activity.recentMovements}
              </div>
              <p className="text-sm text-gray-600">Mouvements/jour</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
