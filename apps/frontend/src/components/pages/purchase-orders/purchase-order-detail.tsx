'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { 
  ArrowLeft, Edit, Trash2, Package, Calendar, User, 
  FileText, Phone, Mail, MapPin, CreditCard, Truck,
  CheckCircle, Clock, AlertCircle, XCircle, Download,
  Eye, History, MessageSquare
} from 'lucide-react'
import { PurchaseOrder, GoodsReception } from '@/lib/api'
import { api } from '@/lib/api'

interface PurchaseOrderDetailProps {
  order: PurchaseOrder
  onBack?: () => void
  onEdit?: (order: PurchaseOrder) => void
  onDelete?: (orderId: string) => void
  onReceiveGoods?: (order: PurchaseOrder) => void
  onStatusChange?: (orderId: string, status: string) => void
}

export function PurchaseOrderDetail({ 
  order, 
  onBack, 
  onEdit, 
  onDelete, 
  onReceiveGoods,
  onStatusChange 
}: PurchaseOrderDetailProps) {
  const [loading, setLoading] = useState(false)
  const [receptions, setReceptions] = useState<GoodsReception[]>([])
  const [showHistory, setShowHistory] = useState(false)

  // Charger les réceptions de marchandises
  useEffect(() => {
    const fetchReceptions = async () => {
      try {
        setLoading(true)
        const response = await api.get(`/api/v1/purchase-orders/${order.id}/receptions`)
        if (response.data.success) {
          setReceptions(response.data.data)
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des réceptions:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchReceptions()
  }, [order.id])

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
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR')
  }

  const calculateReceivedQuantity = (itemId: string) => {
    return receptions.reduce((total, reception) => {
      const receptionItem = reception.items.find(item => item.purchaseOrderItemId === itemId)
      return total + (receptionItem?.quantityReceived || 0)
    }, 0)
  }

  const getProgressPercentage = () => {
    const totalOrdered = order.items.reduce((sum, item) => sum + item.quantity, 0)
    const totalReceived = order.items.reduce((sum, item) => sum + item.receivedQty, 0)
    return totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <p className="text-gray-600">
              Commande N° {order.number} - Créée le {formatDate(order.createdAt)}
              {order.createdBy && ` par ${order.createdBy.firstName} ${order.createdBy.lastName}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(order.status)}
          <div className="flex items-center gap-2 ml-4">
            {order.status === 'DRAFT' && (
              <>
                <Button variant="outline" size="sm" onClick={() => onEdit?.(order)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onStatusChange?.(order.id, 'ORDERED')}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmer
                </Button>
              </>
            )}
            {(order.status === 'ORDERED' || order.status === 'PARTIALLY_RECEIVED') && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onReceiveGoods?.(order)}
                className="text-green-600 hover:text-green-700"
              >
                <Truck className="h-4 w-4 mr-2" />
                Réceptionner
              </Button>
            )}
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
            {order.status !== 'RECEIVED' && receptions.length === 0 && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => onDelete?.(order.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Informations générales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informations commande */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informations commande
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Date de commande</label>
              <p className="text-gray-900">{formatDate(order.orderDate)}</p>
            </div>
            {order.expectedDate && (
              <div>
                <label className="text-sm font-medium text-gray-500">Date d'échéance</label>
                <p className="text-gray-900">{formatDate(order.expectedDate)}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-500">Statut</label>
              <div className="mt-1">{getStatusBadge(order.status)}</div>
            </div>
            {order.notes && (
              <div>
                <label className="text-sm font-medium text-gray-500">Notes</label>
                <p className="text-gray-900">{order.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informations fournisseur */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Fournisseur
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Nom</label>
              <p className="text-gray-900 font-medium">{order.supplier.name}</p>
            </div>
            {order.supplier.contactName && (
              <div>
                <label className="text-sm font-medium text-gray-500">Contact</label>
                <p className="text-gray-900">{order.supplier.contactName}</p>
              </div>
            )}
            {order.supplier.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900">{order.supplier.email}</span>
              </div>
            )}
            {order.supplier.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900">{order.supplier.phone}</span>
              </div>
            )}
            {order.supplier.address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-gray-900">{order.supplier.address}</p>
                  {order.supplier.city && order.supplier.country && (
                    <p className="text-gray-600 text-sm">
                      {order.supplier.city}, {order.supplier.country}
                    </p>
                  )}
                </div>
              </div>
            )}
            {order.supplier.paymentTerms && (
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900">
                  Paiement à {order.supplier.paymentTerms} jours
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Résumé financier */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Résumé financier
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Sous-total HT:</span>
              <span className="font-medium">{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">TVA (19%):</span>
              <span className="font-medium">{formatCurrency(order.taxAmount)}</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between text-lg font-bold">
                <span>Total TTC:</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-700 font-medium mb-1">
                Progression de la réception
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getProgressPercentage()}%` }}
                ></div>
              </div>
              <div className="text-xs text-blue-600 mt-1">
                {getProgressPercentage().toFixed(1)}% reçu
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Articles de la commande */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Articles commandés ({order.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Produit
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Quantité
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Prix unitaire
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Reçu
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {order.items.map((item) => {
                  const receivedQty = item.receivedQty
                  const isFullyReceived = receivedQty >= item.quantity
                  const isPartiallyReceived = receivedQty > 0 && receivedQty < item.quantity

                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-medium text-gray-900">
                            {item.product.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            SKU: {item.product.sku}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-gray-900">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-4 text-gray-900">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="px-4 py-4 text-gray-900 font-medium">
                        {formatCurrency(item.total)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-gray-900">
                          {receivedQty} / {item.quantity}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                          <div 
                            className={`h-1 rounded-full transition-all duration-300 ${
                              isFullyReceived ? 'bg-green-500' : 
                              isPartiallyReceived ? 'bg-yellow-500' : 'bg-gray-300'
                            }`}
                            style={{ width: `${(receivedQty / item.quantity) * 100}%` }}
                          ></div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {isFullyReceived ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Reçu
                          </Badge>
                        ) : isPartiallyReceived ? (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                            <Clock className="h-3 w-3 mr-1" />
                            Partiel
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            En attente
                          </Badge>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Réceptions de marchandises */}
      {receptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Réceptions de marchandises ({receptions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {receptions.map((reception) => (
                <div key={reception.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Réception N° {reception.number}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {formatDateTime(reception.receptionDate)} par {reception.receivedBy.firstName} {reception.receivedBy.lastName}
                      </p>
                    </div>
                    <Badge variant={reception.isComplete ? 'default' : 'outline'}>
                      {reception.isComplete ? 'Complète' : 'Partielle'}
                    </Badge>
                  </div>
                  
                  {reception.notes && (
                    <div className="mb-3 p-2 bg-gray-50 rounded text-sm text-gray-700">
                      <MessageSquare className="h-4 w-4 inline mr-1" />
                      {reception.notes}
                    </div>
                  )}

                  <div className="text-sm">
                    <strong>Articles reçus:</strong>
                    <ul className="mt-1 space-y-1">
                      {reception.items.map((item) => (
                        <li key={item.id} className="flex justify-between">
                          <span>{item.product.name}</span>
                          <span>{item.quantityReceived} unités</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historique */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historique
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {showHistory ? 'Masquer' : 'Afficher'}
            </Button>
          </div>
        </CardHeader>
        {showHistory && (
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Commande créée
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDateTime(order.createdAt)} par {order.createdBy.firstName} {order.createdBy.lastName}
                  </p>
                </div>
              </div>
              
              {receptions.map((reception) => (
                <div key={reception.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Réception N° {reception.number}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(reception.receptionDate)} par {reception.receivedBy.firstName} {reception.receivedBy.lastName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
