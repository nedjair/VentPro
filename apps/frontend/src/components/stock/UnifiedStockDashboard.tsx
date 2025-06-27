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
  BarChart3,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { useUnifiedDashboard } from '../../hooks/useUnifiedStockData'
import { formatCurrency } from '../../lib/utils'

interface UnifiedStockDashboardProps {
  onViewAlerts?: () => void
  onViewMovements?: () => void
  onViewProducts?: () => void
}

export function UnifiedStockDashboard({
  onViewAlerts,
  onViewMovements,
  onViewProducts
}: UnifiedStockDashboardProps) {
  const {
    dashboard,
    loading,
    error,
    refresh,
    forceRefresh,
    lastUpdate
  } = useUnifiedDashboard()

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
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">{error}</p>
              <div className="flex gap-2 justify-center mt-3">
                <Button variant="outline" size="sm" onClick={refresh}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Réessayer
                </Button>
                <Button variant="outline" size="sm" onClick={forceRefresh}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Forcer
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!dashboard) {
    return null
  }

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
            <p className="text-green-600 text-sm">
              🔄 Auto-refresh: 30s | Alertes actives: {dashboard.activeAlerts}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualiser
          </Button>
          <Button variant="outline" size="sm" onClick={forceRefresh}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Forcer
          </Button>
        </div>
      </div>

      {/* Cartes de statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total des produits */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Produits</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              {dashboard.productsInStock} en stock
            </p>
          </CardContent>
        </Card>

        {/* Valeur totale du stock */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur Stock</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dashboard.totalStockValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Valeur totale inventaire
            </p>
          </CardContent>
        </Card>

        {/* Alertes critiques */}
        <Card className={dashboard.activeAlerts > 0 ? "border-red-200" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertes</CardTitle>
            {dashboard.activeAlerts > 0 ? (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {dashboard.activeAlerts}
            </div>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span className="text-red-600">{dashboard.criticalAlerts} critiques</span>
              <span className="text-orange-600">{dashboard.warningAlerts} attention</span>
            </div>
            {onViewAlerts && dashboard.activeAlerts > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 w-full"
                onClick={onViewAlerts}
              >
                Voir alertes
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Activité récente */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activité</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.infoAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Mouvements récents
            </p>
            {onViewMovements && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 w-full"
                onClick={onViewMovements}
              >
                Voir mouvements
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cartes de détail par statut */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Produits en rupture */}
        <Card className={dashboard.outOfStockProducts > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <XCircle className="h-5 w-5 mr-2 text-red-500" />
              Rupture de stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 mb-2">
              {dashboard.outOfStockProducts}
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Produits sans stock disponible
            </p>
            {dashboard.outOfStockProducts > 0 && (
              <Badge variant="destructive" className="mb-2">
                Action requise
              </Badge>
            )}
            {onViewProducts && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={onViewProducts}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Voir produits
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Produits en stock faible */}
        <Card className={dashboard.lowStockProducts > 0 ? "border-orange-200 bg-orange-50" : ""}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <TrendingDown className="h-5 w-5 mr-2 text-orange-500" />
              Stock faible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600 mb-2">
              {dashboard.lowStockProducts}
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Produits sous le seuil minimum
            </p>
            {dashboard.lowStockProducts > 0 && (
              <Badge variant="secondary" className="mb-2 bg-orange-100 text-orange-800">
                Attention requise
              </Badge>
            )}
            {onViewProducts && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={onViewProducts}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Voir produits
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Produits en surstock */}
        <Card className={dashboard.overStockProducts > 0 ? "border-blue-200 bg-blue-50" : ""}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
              Surstock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {dashboard.overStockProducts}
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Produits au-dessus du seuil maximum
            </p>
            {dashboard.overStockProducts > 0 && (
              <Badge variant="secondary" className="mb-2 bg-blue-100 text-blue-800">
                Optimisation possible
              </Badge>
            )}
            {onViewProducts && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={onViewProducts}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Voir produits
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
