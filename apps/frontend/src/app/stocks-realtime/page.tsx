'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { StockDashboard } from '../../components/stock/StockDashboard'
import { StockAlerts } from '../../components/stock/StockAlerts'
import { RealTimeStockCard } from '../../components/stock/RealTimeStockCard'
import { StockDebugPanel } from '../../components/stock/StockDebugPanel'
import { StockProvider } from '../../contexts/StockContext'
import { 
  BarChart3, 
  AlertTriangle, 
  Package, 
  TrendingUp,
  Plus,
  Search,
  Filter
} from 'lucide-react'

export default function StocksRealTimePage() {
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <StockProvider>
      <div className="container mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion de Stock Temps Réel</h1>
          <p className="text-gray-600 mt-1">
            Suivi en temps réel des stocks avec alertes automatiques et synchronisation bidirectionnelle
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Search className="h-4 w-4 mr-2" />
            Rechercher
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau mouvement
          </Button>
        </div>
      </div>

      {/* Onglets principaux */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Tableau de bord
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alertes
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Produits
          </TabsTrigger>
          <TabsTrigger value="movements" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Mouvements
          </TabsTrigger>
        </TabsList>

        {/* Tableau de bord */}
        <TabsContent value="dashboard" className="space-y-6">
          <StockDashboard
            onViewAlerts={() => setActiveTab('alerts')}
            onViewMovements={() => setActiveTab('movements')}
            onViewProducts={() => setActiveTab('products')}
          />
        </TabsContent>

        {/* Alertes */}
        <TabsContent value="alerts" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <StockAlerts showFilters={true} />
            </div>
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Actions Rapides</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Package className="h-4 w-4 mr-2" />
                    Réapprovisionner les ruptures
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Ajuster les seuils
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Générer commande fournisseur
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Statistiques Alertes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Critiques</span>
                      <span className="font-semibold text-red-600">0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Importantes</span>
                      <span className="font-semibold text-orange-600">0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Moyennes</span>
                      <span className="font-semibold text-yellow-600">0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Informatives</span>
                      <span className="font-semibold text-blue-600">0</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Produits */}
        <TabsContent value="products" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Liste des Produits</CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Filter className="h-4 w-4 mr-1" />
                        Filtrer
                      </Button>
                      <Button variant="outline" size="sm">
                        <Search className="h-4 w-4 mr-1" />
                        Rechercher
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center py-8 text-gray-500">
                      <Package className="h-12 w-12 mx-auto mb-2" />
                      <p>Sélectionnez un produit pour voir son stock en temps réel</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => setSelectedProductId('example-product-id')}
                      >
                        Voir exemple
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              {selectedProductId ? (
                <RealTimeStockCard
                  productId={selectedProductId}
                  showActions={true}
                  onReserve={(quantity) => {
                    console.log('Réserver', quantity)
                  }}
                  onRelease={(quantity) => {
                    console.log('Libérer', quantity)
                  }}
                  onMovement={() => {
                    console.log('Nouveau mouvement')
                  }}
                />
              ) : (
                <Card>
                  <CardContent className="p-6 text-center text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-2" />
                    <p>Sélectionnez un produit pour voir son stock en temps réel</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Mouvements */}
        <TabsContent value="movements" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Mouvements de Stock</CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Filter className="h-4 w-4 mr-1" />
                        Filtrer
                      </Button>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Nouveau
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <TrendingUp className="h-12 w-12 mx-auto mb-2" />
                    <p>Historique des mouvements de stock</p>
                    <p className="text-sm">Entrées, sorties, ajustements, réservations...</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Actions Rapides</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Plus className="h-4 w-4 mr-2" />
                    Entrée de stock
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Sortie de stock
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Package className="h-4 w-4 mr-2" />
                    Ajustement
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Transfert
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Statistiques</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Aujourd'hui</span>
                      <span className="font-semibold">0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Cette semaine</span>
                      <span className="font-semibold">0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Ce mois</span>
                      <span className="font-semibold">0</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Debug Panel */}
      <StockDebugPanel />
    </div>
    </StockProvider>
  )
}
