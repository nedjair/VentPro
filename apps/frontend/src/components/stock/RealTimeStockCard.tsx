'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { RefreshCw, Package, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'
import { useRealTimeStock, RealTimeStockData } from '../../hooks/useRealTimeStock'
import { formatCurrency } from '../../lib/utils'

interface RealTimeStockCardProps {
  productId: string
  showActions?: boolean
  onReserve?: (quantity: number) => void
  onRelease?: (quantity: number) => void
  onMovement?: () => void
}

export function RealTimeStockCard({ 
  productId, 
  showActions = false,
  onReserve,
  onRelease,
  onMovement 
}: RealTimeStockCardProps) {
  const { stockData, loading, error, refetch } = useRealTimeStock(productId)

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Chargement du stock...</span>
          </div>
        </CardContent>
      </Card>
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

  if (!stockData) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            <div className="flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Stock en temps réel
            </div>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-sm text-gray-600">
          {stockData.productName} {stockData.sku && `(${stockData.sku})`}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Alertes */}
        {(stockData.alerts.isOutOfStock || stockData.alerts.isLowStock || 
          stockData.alerts.isOverStock || stockData.alerts.isNegativeStock) && (
          <div className="space-y-2">
            {stockData.alerts.isNegativeStock && (
              <Badge variant="destructive" className="w-full justify-center">
                ⚠️ Stock négatif - Erreur critique
              </Badge>
            )}
            {stockData.alerts.isOutOfStock && (
              <Badge variant="destructive" className="w-full justify-center">
                📦 Rupture de stock
              </Badge>
            )}
            {stockData.alerts.isLowStock && !stockData.alerts.isOutOfStock && (
              <Badge variant="secondary" className="w-full justify-center">
                ⚠️ Stock faible
              </Badge>
            )}
            {stockData.alerts.isOverStock && (
              <Badge variant="outline" className="w-full justify-center">
                📈 Surstock
              </Badge>
            )}
          </div>
        )}

        {/* Quantités */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Stock actuel</span>
              <span className={`text-lg font-bold ${
                stockData.currentStock <= 0 ? 'text-red-600' :
                stockData.currentStock <= stockData.minStock ? 'text-orange-600' :
                'text-green-600'
              }`}>
                {stockData.currentStock}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Disponible</span>
              <span className="text-sm font-medium text-blue-600">
                {stockData.availableStock}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Réservé</span>
              <span className="text-sm font-medium text-orange-600">
                {stockData.reservedStock}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">En transit</span>
              <span className="text-sm font-medium text-purple-600">
                {stockData.inTransitStock}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Seuil min</span>
              <span className="text-sm text-gray-600">
                {stockData.minStock}
              </span>
            </div>
            
            {stockData.maxStock && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Seuil max</span>
                <span className="text-sm text-gray-600">
                  {stockData.maxStock}
                </span>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Valeur stock</span>
              <span className="text-sm font-bold text-green-600">
                {formatCurrency(stockData.stockValue)}
              </span>
            </div>
            
            {stockData.averageCost && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Coût moyen</span>
                <span className="text-sm text-gray-600">
                  {formatCurrency(stockData.averageCost)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Barre de progression du stock */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-600">
            <span>0</span>
            <span>Seuil min: {stockData.minStock}</span>
            {stockData.maxStock && <span>Max: {stockData.maxStock}</span>}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                stockData.currentStock <= 0 ? 'bg-red-500' :
                stockData.currentStock <= stockData.minStock ? 'bg-orange-500' :
                stockData.maxStock && stockData.currentStock > stockData.maxStock ? 'bg-blue-500' :
                'bg-green-500'
              }`}
              style={{ 
                width: stockData.maxStock 
                  ? `${Math.min((stockData.currentStock / stockData.maxStock) * 100, 100)}%`
                  : `${Math.min((stockData.currentStock / (stockData.minStock * 2)) * 100, 100)}%`
              }}
            />
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onReserve?.(1)}
              disabled={stockData.availableStock <= 0}
            >
              <TrendingDown className="h-4 w-4 mr-1" />
              Réserver
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onRelease?.(1)}
              disabled={stockData.reservedStock <= 0}
            >
              <TrendingUp className="h-4 w-4 mr-1" />
              Libérer
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onMovement}
            >
              <Package className="h-4 w-4 mr-1" />
              Mouvement
            </Button>
          </div>
        )}

        {/* Dernière mise à jour */}
        <div className="text-xs text-gray-500 text-center pt-2 border-t">
          Dernière mise à jour: {new Date(stockData.lastUpdate).toLocaleString('fr-FR')}
        </div>
      </CardContent>
    </Card>
  )
}
