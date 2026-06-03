'use client'

import React, { useState } from 'react'
import { PurchaseOrderList } from './purchase-order-list'
import { PurchaseOrderForm } from './purchase-order-form'
import { PurchaseOrderDetail } from './purchase-order-detail'
import { GoodsReceptionForm } from './goods-reception-form'
import { PurchaseOrder, GoodsReception } from '@/lib/api'

type ViewMode = 'list' | 'form' | 'detail' | 'reception'

interface PurchaseOrdersPageState {
  viewMode: ViewMode
  selectedOrder: PurchaseOrder | null
  isEditing: boolean
}

const PurchaseOrdersPage: React.FC = () => {
  const [state, setState] = useState<PurchaseOrdersPageState>({
    viewMode: 'list',
    selectedOrder: null,
    isEditing: false
  })

  // Gestionnaires de navigation
  const handleCreateNew = () => {
    setState({
      viewMode: 'form',
      selectedOrder: null,
      isEditing: false
    })
  }

  const handleEdit = (order: PurchaseOrder) => {
    setState({
      viewMode: 'form',
      selectedOrder: order,
      isEditing: true
    })
  }

  const handleView = (order: PurchaseOrder) => {
    setState({
      viewMode: 'detail',
      selectedOrder: order,
      isEditing: false
    })
  }

  const handleReceiveGoods = (order: PurchaseOrder) => {
    setState({
      viewMode: 'reception',
      selectedOrder: order,
      isEditing: false
    })
  }

  const handleBack = () => {
    setState({
      viewMode: 'list',
      selectedOrder: null,
      isEditing: false
    })
  }

  // Gestionnaires de succès
  const handleFormSuccess = (order: PurchaseOrder) => {
    // Pour une nouvelle commande, retourner à la liste pour voir la commande dans la liste
    // Pour une modification, aller à la vue détail
    if (state.isEditing) {
      setState({
        viewMode: 'detail',
        selectedOrder: order,
        isEditing: false
      })
    } else {
      // Nouvelle commande créée - retourner à la liste
      setState({
        viewMode: 'list',
        selectedOrder: null,
        isEditing: false
      })
    }
  }

  const handleReceptionSuccess = (reception: GoodsReception) => {
    // Retourner à la liste après une réception réussie
    handleBack()
  }

  const handleDelete = (orderId: string) => {
    // Retourner à la liste après suppression
    handleBack()
  }

  const handleStatusChange = (orderId: string, status: string) => {
    // Rafraîchir la vue actuelle si on est en détail
    if (state.viewMode === 'detail' && state.selectedOrder?.id === orderId) {
      // La vue détail se rafraîchira automatiquement
    }
  }

  // Rendu conditionnel basé sur le mode de vue
  const renderContent = () => {
    switch (state.viewMode) {
      case 'form':
        return (
          <PurchaseOrderForm
            existingOrder={state.isEditing ? state.selectedOrder ?? undefined : undefined}
            onSuccess={handleFormSuccess}
            onCancel={handleBack}
          />
        )

      case 'detail':
        return state.selectedOrder ? (
          <PurchaseOrderDetail
            order={state.selectedOrder}
            onBack={handleBack}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReceiveGoods={handleReceiveGoods}
            onStatusChange={handleStatusChange}
          />
        ) : null

      case 'reception':
        return state.selectedOrder ? (
          <GoodsReceptionForm
            purchaseOrder={state.selectedOrder}
            onSuccess={handleReceptionSuccess}
            onCancel={handleBack}
          />
        ) : null

      case 'list':
      default:
        return (
          <PurchaseOrderList
            onCreateNew={handleCreateNew}
            onEdit={handleEdit}
            onView={handleView}
            onReceiveGoods={handleReceiveGoods}
          />
        )
    }
  }

  return (
    <div className="w-full">
      {renderContent()}
    </div>
  )
}

export default PurchaseOrdersPage










