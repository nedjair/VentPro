'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Textarea } from '../../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Label } from '../../ui/label'
import { Badge } from '../../ui/badge'
import { 
  Plus, Trash2, Save, X, AlertCircle, Package, 
  Calculator, Calendar, User, FileText, ShoppingCart
} from 'lucide-react'
import { usePurchaseOrderForm } from '@/hooks/usePurchaseOrderForm'
import { PurchaseOrder, PurchaseOrderStatus } from '@/lib/api'

interface PurchaseOrderFormProps {
  existingOrder?: PurchaseOrder
  onSuccess?: (order: PurchaseOrder) => void
  onCancel?: () => void
}

export function PurchaseOrderForm({ existingOrder, onSuccess, onCancel }: PurchaseOrderFormProps) {
  const {
    formData,
    validation,
    loading,
    saving,
    error,
    suppliers,
    products,
    loadingSuppliers,
    loadingProducts,
    updateField,
    addItem,
    updateItem,
    removeItem,
    validateForm,
    submitForm,
    calculateTotals
  } = usePurchaseOrderForm(existingOrder, onSuccess)

  const { subtotal, taxAmount, total } = calculateTotals()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      await submitForm()
    } catch (error) {
      // L'erreur est déjà gérée dans le hook
      console.error('Erreur lors de la soumission:', error)
    }
  }

  const getSelectedSupplier = () => {
    const selected = suppliers.find(s => s.id === formData.supplierId)
    return selected
  }

  const getSelectedProduct = (productId: string) => {
    return products.find(p => p.id === productId)
  }

  // Debug: Logger l'état des fournisseurs
  React.useEffect(() => {
  }, [suppliers, loadingSuppliers])

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600">
            {existingOrder
              ? `Modification de la commande N° ${existingOrder.number}`
              : 'Créer une nouvelle commande d\'achat'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {existingOrder && (
            <Badge variant={
              existingOrder.status === 'DRAFT' ? 'secondary' :
              existingOrder.status === 'ORDERED' ? 'default' :
              existingOrder.status === 'PARTIALLY_RECEIVED' ? 'outline' :
              existingOrder.status === 'RECEIVED' ? 'default' : 'destructive'
            }>
              {existingOrder.status === 'DRAFT' && 'Brouillon'}
              {existingOrder.status === 'ORDERED' && 'Commandé'}
              {existingOrder.status === 'PARTIALLY_RECEIVED' && 'Partiellement reçu'}
              {existingOrder.status === 'RECEIVED' && 'Reçu'}
              {existingOrder.status === 'CANCELLED' && 'Annulé'}
            </Badge>
          )}
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
        {/* Informations générales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informations générales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fournisseur */}
              <div>
                <Label htmlFor="supplierId">
                  Fournisseur <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.supplierId}
                  onValueChange={(value) => updateField('supplierId', value)}
                  disabled={loadingSuppliers}
                >
                  <SelectTrigger className={validation.errors.supplierId ? 'border-red-500' : ''}>
                    <SelectValue
                      placeholder={loadingSuppliers ? "Chargement..." : "Sélectionner un fournisseur"}
                    >
                      {formData.supplierId && getSelectedSupplier() ? (
                        <div className="flex flex-col">
                          <span className="font-medium">{getSelectedSupplier()?.name}</span>
                          {getSelectedSupplier()?.email && (
                            <span className="text-sm text-gray-500">{getSelectedSupplier()?.email}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500">
                          {loadingSuppliers ? "Chargement..." : "Sélectionner un fournisseur"}
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {loadingSuppliers ? (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        Chargement des fournisseurs...
                      </div>
                    ) : suppliers.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        Aucun fournisseur disponible
                      </div>
                    ) : (
                      suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{supplier.name}</span>
                            {supplier.email && (
                              <span className="text-sm text-gray-500">{supplier.email}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {validation.errors.supplierId && (
                  <p className="text-sm text-red-600 mt-1">{validation.errors.supplierId}</p>
                )}
              </div>

              {/* Date de commande */}
              <div>
                <Label htmlFor="orderDate">
                  Date de commande <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="orderDate"
                  type="date"
                  value={formData.orderDate}
                  onChange={(e) => updateField('orderDate', e.target.value)}
                  className={validation.errors.orderDate ? 'border-red-500' : ''}
                />
                {validation.errors.orderDate && (
                  <p className="text-sm text-red-600 mt-1">{validation.errors.orderDate}</p>
                )}
              </div>

              {/* Date d'échéance */}
              <div>
                <Label htmlFor="expectedDate">Date d'échéance</Label>
                <Input
                  id="expectedDate"
                  type="date"
                  value={formData.expectedDate}
                  onChange={(e) => updateField('expectedDate', e.target.value)}
                  className={validation.errors.expectedDate ? 'border-red-500' : ''}
                />
                {validation.errors.expectedDate && (
                  <p className="text-sm text-red-600 mt-1">{validation.errors.expectedDate}</p>
                )}
              </div>

              {/* Statut (uniquement en mode édition) */}
              {existingOrder && (
                <div>
                  <Label htmlFor="status">
                    Statut <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => updateField('status', value as PurchaseOrderStatus)}
                  >
                    <SelectTrigger className={validation.errors.status ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Sélectionner un statut">
                        {formData.status === 'DRAFT' && 'Brouillon'}
                        {formData.status === 'ORDERED' && 'Commandé'}
                        {formData.status === 'PARTIALLY_RECEIVED' && 'Partiellement reçu'}
                        {formData.status === 'RECEIVED' && 'Reçu'}
                        {formData.status === 'CANCELLED' && 'Annulé'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                          Brouillon
                        </div>
                      </SelectItem>
                      <SelectItem value="ORDERED">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          Commandé
                        </div>
                      </SelectItem>
                      <SelectItem value="PARTIALLY_RECEIVED">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                          Partiellement reçu
                        </div>
                      </SelectItem>
                      <SelectItem value="RECEIVED">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          Reçu
                        </div>
                      </SelectItem>
                      <SelectItem value="CANCELLED">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          Annulé
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {validation.errors.status && (
                    <p className="text-sm text-red-600 mt-1">{validation.errors.status}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    Modifiez le statut pour suivre l'évolution de la commande
                  </p>
                </div>
              )}

              {/* Informations fournisseur */}
              {getSelectedSupplier() && (
                <div className="md:col-span-2">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Informations fournisseur</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-blue-700 font-medium">Contact:</span>
                        <p className="text-blue-800">
                          {getSelectedSupplier()?.contactName || 'Non renseigné'}
                        </p>
                      </div>
                      <div>
                        <span className="text-blue-700 font-medium">Téléphone:</span>
                        <p className="text-blue-800">
                          {getSelectedSupplier()?.phone || 'Non renseigné'}
                        </p>
                      </div>
                      <div>
                        <span className="text-blue-700 font-medium">Conditions de paiement:</span>
                        <p className="text-blue-800">
                          {getSelectedSupplier()?.paymentTerms || 30} jours
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Notes ou instructions particulières..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Articles */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Articles de la commande
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                disabled={loadingProducts}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un article
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {validation.errors.items && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-600">{validation.errors.items}</p>
              </div>
            )}

            {formData.items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Aucun article ajouté</p>
                <p className="text-sm">Cliquez sur "Ajouter un article" pour commencer</p>
              </div>
            ) : (
              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                      {/* Produit */}
                      <div className="md:col-span-2">
                        <Label>Produit <span className="text-red-500">*</span></Label>
                        <Select
                          value={item.productId}
                          onValueChange={(value) => updateItem(index, 'productId', value)}
                          disabled={loadingProducts}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un produit" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{product.name}</span>
                                  <span className="text-sm text-gray-500">
                                    SKU: {product.sku}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Quantité */}
                      <div>
                        <Label>Quantité <span className="text-red-500">*</span></Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        />
                      </div>

                      {/* Prix unitaire */}
                      <div>
                        <Label>Prix unitaire (DA) <span className="text-red-500">*</span></Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-gray-600">
                          Total: {(item.quantity * item.unitPrice).toFixed(2)} DA
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Informations produit */}
                    {getSelectedProduct(item.productId) && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Description:</span>
                            <p className="text-gray-600">
                              {getSelectedProduct(item.productId)?.description || 'Non renseignée'}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">Unité:</span>
                            <p className="text-gray-600">
                              {getSelectedProduct(item.productId)?.unit || 'Unité'}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">Catégorie:</span>
                            <p className="text-gray-600">
                              {getSelectedProduct(item.productId)?.category?.name || 'Non catégorisé'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Totaux */}
        {formData.items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Récapitulatif
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Sous-total HT:</span>
                  <span className="font-medium">{subtotal.toFixed(2)} DA</span>
                </div>
                <div className="flex justify-between">
                  <span>TVA (19%):</span>
                  <span className="font-medium">{taxAmount.toFixed(2)} DA</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total TTC:</span>
                    <span>{total.toFixed(2)} DA</span>
                  </div>
                </div>
              </div>
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
            disabled={saving || !validation.isValid}
            loading={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {existingOrder ? 'Mettre à jour' : 'Créer la commande'}
          </Button>
        </div>
      </form>
    </div>
  )
}
