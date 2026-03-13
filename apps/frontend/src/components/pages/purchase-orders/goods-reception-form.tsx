'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Textarea } from '../../ui/textarea'
import { Label } from '../../ui/label'
import { Badge } from '../../ui/badge'
import { 
  Package, Save, X, AlertCircle, Truck, 
  Calculator, Calendar, CheckCircle, Clock
} from 'lucide-react'
import { useGoodsReception } from '@/hooks/useGoodsReception'
import { PurchaseOrder, GoodsReception } from '@/lib/api'

interface GoodsReceptionFormProps {
  purchaseOrder: PurchaseOrder
  onSuccess?: (reception: GoodsReception) => void
  onCancel?: () => void
}

export function GoodsReceptionForm({ 
  purchaseOrder, 
  onSuccess, 
  onCancel 
}: GoodsReceptionFormProps) {
  const {
    formData,
    validation,
    loading,
    saving,
    error,
    updateField,
    updateItem,
    validateForm,
    submitReception,
    calculateTotalReceived,
    isPartialReception
  } = useGoodsReception(onSuccess)

  // Charger les données de la commande au montage
  React.useEffect(() => {
    if (purchaseOrder) {
      // Le hook se charge automatiquement de créer les items de réception
      updateField('purchaseOrderId', purchaseOrder.id)
      updateField('receptionDate', new Date().toISOString().split('T')[0])
      
      // Créer les items de réception basés sur la commande
      const receptionItems = purchaseOrder.items.map(item => ({
        purchaseOrderItemId: item.id,
        productId: item.productId,
        quantityReceived: 0,
        quantityExpected: item.quantity - item.receivedQty,
        unitCost: item.unitPrice,
        notes: ''
      }))
      
      updateField('items', receptionItems)
    }
  }, [purchaseOrder, updateField])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      await submitReception()
    } catch (error) {
      console.error('Erreur lors de la soumission:', error)
    }
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

  const getTotalValue = () => {
    return formData.items.reduce((total, item) => {
      return total + (item.quantityReceived * (item.unitCost || 0))
    }, 0)
  }

  const getItemProgress = (item: any) => {
    const orderItem = purchaseOrder.items.find(oi => oi.id === item.purchaseOrderItemId)
    if (!orderItem) return 0
    
    const totalReceived = orderItem.receivedQty + item.quantityReceived
    return (totalReceived / orderItem.quantity) * 100
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600">
            Réception pour la commande N° {purchaseOrder.number} - {purchaseOrder.supplier.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Package className="h-3 w-3" />
            {purchaseOrder.items.length} article{purchaseOrder.items.length > 1 ? 's' : ''}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(purchaseOrder.orderDate)}
          </Badge>
        </div>
      </div>

      {/* Erreur générale */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informations de réception */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Informations de réception
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date de réception */}
              <div>
                <Label htmlFor="receptionDate">
                  Date de réception <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="receptionDate"
                  type="date"
                  value={formData.receptionDate}
                  onChange={(e) => updateField('receptionDate', e.target.value)}
                  className={validation.errors.receptionDate ? 'border-red-500' : ''}
                />
                {validation.errors.receptionDate && (
                  <p className="text-sm text-red-600 mt-1">{validation.errors.receptionDate}</p>
                )}
              </div>

              {/* Informations commande */}
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Fournisseur:</span>
                  <span className="ml-2 text-gray-900">{purchaseOrder.supplier.name}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Total commande:</span>
                  <span className="ml-2 text-gray-900">{formatCurrency(purchaseOrder.total)}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Date d'échéance:</span>
                  <span className="ml-2 text-gray-900">
                    {purchaseOrder.expectedDate ? formatDate(purchaseOrder.expectedDate) : 'Non définie'}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes de réception</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Notes sur la réception, état des marchandises, etc."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Articles à réceptionner */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Articles à réceptionner
            </CardTitle>
          </CardHeader>
          <CardContent>
            {validation.errors.items && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-600">{validation.errors.items}</p>
              </div>
            )}

            <div className="space-y-4">
              {formData.items.map((item, index) => {
                const orderItem = purchaseOrder.items.find(oi => oi.id === item.purchaseOrderItemId)
                if (!orderItem) return null

                const progress = getItemProgress(item)
                const isFullyReceived = progress >= 100
                const maxReceivable = item.quantityExpected

                return (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-center">
                      {/* Informations produit */}
                      <div className="lg:col-span-2">
                        <div className="font-medium text-gray-900">
                          {orderItem.product.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          SKU: {orderItem.product.sku}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Commandé: {orderItem.quantity} | 
                          Déjà reçu: {orderItem.receivedQty} | 
                          Restant: {maxReceivable}
                        </div>
                      </div>

                      {/* Quantité à réceptionner */}
                      <div>
                        <Label>Quantité reçue</Label>
                        <Input
                          type="number"
                          min="0"
                          max={maxReceivable}
                          value={item.quantityReceived}
                          onChange={(e) => updateItem(index, 'quantityReceived', parseInt(e.target.value) || 0)}
                          className="text-center"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          Max: {maxReceivable}
                        </div>
                      </div>

                      {/* Coût unitaire */}
                      <div>
                        <Label>Coût unitaire (DA)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitCost || 0}
                          onChange={(e) => updateItem(index, 'unitCost', parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      {/* Total */}
                      <div>
                        <Label>Total</Label>
                        <div className="text-lg font-medium text-gray-900">
                          {formatCurrency(item.quantityReceived * (item.unitCost || 0))}
                        </div>
                      </div>

                      {/* Progression */}
                      <div>
                        <Label>Progression</Label>
                        <div className="space-y-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                isFullyReceived ? 'bg-green-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-center">
                            {progress.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Notes article */}
                    <div className="mt-3">
                      <Label>Notes pour cet article</Label>
                      <Input
                        value={item.notes || ''}
                        onChange={(e) => updateItem(index, 'notes', e.target.value)}
                        placeholder="État, qualité, remarques..."
                      />
                    </div>

                    {/* Statut de l'article */}
                    <div className="mt-3 flex items-center gap-2">
                      {item.quantityReceived === 0 ? (
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" />
                          En attente
                        </Badge>
                      ) : item.quantityReceived < maxReceivable ? (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                          <Clock className="h-3 w-3 mr-1" />
                          Réception partielle
                        </Badge>
                      ) : (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Complètement reçu
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Récapitulatif */}
        {calculateTotalReceived() > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Récapitulatif de la réception
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {calculateTotalReceived()}
                  </div>
                  <div className="text-sm text-gray-600">Articles reçus</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(getTotalValue())}
                  </div>
                  <div className="text-sm text-gray-600">Valeur reçue</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {isPartialReception() ? 'Partielle' : 'Complète'}
                  </div>
                  <div className="text-sm text-gray-600">Type de réception</div>
                </div>
              </div>

              {isPartialReception() && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm text-yellow-800">
                      Cette réception est partielle. Le statut de la commande sera mis à jour en conséquence.
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={saving}
          >
            <X className="h-4 w-4 mr-2" />
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={saving || !validation.isValid || calculateTotalReceived() === 0}
            loading={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            Confirmer la réception
          </Button>
        </div>
      </form>
    </div>
  )
}
