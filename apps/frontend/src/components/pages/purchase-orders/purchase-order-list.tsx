'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Badge } from '../../ui/badge'
import { 
  Search, Filter, Plus, Eye, Edit, Trash2, Package, 
  Calendar, User, FileText, ChevronLeft, ChevronRight,
  Download, RefreshCw, MoreHorizontal, CheckCircle,
  Clock, AlertCircle, XCircle, Truck
} from 'lucide-react'
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders'
import { PurchaseOrder, PurchaseOrderFilters, Supplier } from '@/lib/api'
import { api } from '@/lib/api'

interface PurchaseOrderListProps {
  onCreateNew?: () => void
  onEdit?: (order: PurchaseOrder) => void
  onView?: (order: PurchaseOrder) => void
  onReceiveGoods?: (order: PurchaseOrder) => void
}

export function PurchaseOrderList({ 
  onCreateNew, 
  onEdit, 
  onView, 
  onReceiveGoods 
}: PurchaseOrderListProps) {
  const {
    purchaseOrders,
    loading,
    error,
    pagination,
    fetchPurchaseOrders,
    deletePurchaseOrder,
    updateStatus,
    refreshData
  } = usePurchaseOrders()

  const [filters, setFilters] = useState<PurchaseOrderFilters>({
    search: '',
    supplierId: '',
    status: undefined,
    dateFrom: '',
    dateTo: '',
    page: 1,
    limit: 10
  })

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])

  // Charger les fournisseurs pour les filtres
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoadingSuppliers(true)
        const response = await api.get('/api/v1/suppliers?isActive=true&limit=100')
        if (response.data.success) {
          setSuppliers(response.data.data)
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des fournisseurs:', error)
      } finally {
        setLoadingSuppliers(false)
      }
    }

    fetchSuppliers()
  }, [])

  // Rafraîchir les données quand le composant est monté
  useEffect(() => {
    fetchPurchaseOrders(filters)
  }, [])

  // Appliquer les filtres
  const handleFilterChange = (key: keyof PurchaseOrderFilters, value: any) => {
    const newFilters = { ...filters, [key]: value, page: 1 }
    setFilters(newFilters)
    fetchPurchaseOrders(newFilters)
  }

  // Recherche
  const handleSearch = (searchTerm: string) => {
    handleFilterChange('search', searchTerm)
  }

  // Pagination
  const handlePageChange = (page: number) => {
    const newFilters = { ...filters, page }
    setFilters(newFilters)
    fetchPurchaseOrders(newFilters)
  }

  // Sélection multiple
  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    )
  }

  const handleSelectAll = () => {
    if (selectedOrders.length === purchaseOrders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(purchaseOrders.map(order => order.id))
    }
  }

  // Actions
  const handleDelete = async (orderId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette commande ?')) {
      try {
        await deletePurchaseOrder(orderId)
      } catch (error) {
        console.error('Erreur lors de la suppression:', error)
      }
    }
  }

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await updateStatus(orderId, newStatus)
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error)
    }
  }

  // Utilitaires d'affichage
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: { label: 'Brouillon', variant: 'secondary' as const, icon: FileText },
      ORDERED: { label: 'Commandé', variant: 'default' as const, icon: CheckCircle },
      PARTIALLY_RECEIVED: { label: 'Partiellement reçu', variant: 'outline' as const, icon: Clock },
      RECEIVED: { label: 'Reçu', variant: 'default' as const, icon: Package },
      CANCELLED: { label: 'Annulé', variant: 'destructive' as const, icon: XCircle }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR')
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-gray-600">
            {pagination.total} commande{pagination.total > 1 ? 's' : ''} au total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtres
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button size="sm" onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle commande
          </Button>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher par numéro, fournisseur..."
            value={filters.search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Filtres avancés */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filtres avancés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fournisseur
                </label>
                <Select
                  value={filters.supplierId}
                  onValueChange={(value) => handleFilterChange('supplierId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les fournisseurs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tous les fournisseurs</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statut
                </label>
                <Select
                  value={filters.status || ''}
                  onValueChange={(value) => handleFilterChange('status', value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tous les statuts</SelectItem>
                    <SelectItem value="DRAFT">Brouillon</SelectItem>
                    <SelectItem value="ORDERED">Commandé</SelectItem>
                    <SelectItem value="PARTIALLY_RECEIVED">Partiellement reçu</SelectItem>
                    <SelectItem value="RECEIVED">Reçu</SelectItem>
                    <SelectItem value="CANCELLED">Annulé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de début
                </label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de fin
                </label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  const resetFilters = {
                    search: '',
                    supplierId: '',
                    status: undefined,
                    dateFrom: '',
                    dateTo: '',
                    page: 1,
                    limit: 10
                  }
                  setFilters(resetFilters)
                  fetchPurchaseOrders(resetFilters)
                }}
              >
                Réinitialiser
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions en lot */}
      {selectedOrders.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedOrders.length} commande{selectedOrders.length > 1 ? 's' : ''} sélectionnée{selectedOrders.length > 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exporter
                </Button>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message d'erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Liste des commandes */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Chargement...</span>
            </div>
          ) : purchaseOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune commande fournisseur
              </h3>
              <p className="text-gray-600 mb-4">
                Commencez par créer votre première commande fournisseur
              </p>
              <Button onClick={onCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle commande
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedOrders.length === purchaseOrders.length && purchaseOrders.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commande
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fournisseur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {purchaseOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => handleSelectOrder(order.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {order.number}
                          </div>
                          <div className="text-sm text-gray-500">
                            {order.items.length} article{order.items.length > 1 ? 's' : ''}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {order.supplier.name}
                          </div>
                          {order.supplier.email && (
                            <div className="text-sm text-gray-500">
                              {order.supplier.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {formatDate(order.orderDate)}
                        </div>
                        {order.expectedDate && (
                          <div className="text-sm text-gray-500">
                            Échéance: {formatDate(order.expectedDate)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(order.total)}
                        </div>
                        <div className="text-sm text-gray-500">
                          HT: {formatCurrency(order.subtotal)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onView?.(order)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {order.status === 'DRAFT' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onEdit?.(order)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {(order.status === 'ORDERED' || order.status === 'PARTIALLY_RECEIVED') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onReceiveGoods?.(order)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Truck className="h-4 w-4" />
                            </Button>
                          )}
                          {order.status !== 'RECEIVED' && (!order.receptions || order.receptions.length === 0) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(order.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Affichage de {((pagination.page - 1) * pagination.limit) + 1} à{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} sur{' '}
            {pagination.total} résultats
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </Button>
            <span className="text-sm text-gray-700">
              Page {pagination.page} sur {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
            >
              Suivant
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
