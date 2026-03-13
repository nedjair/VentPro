'use client'

import { useState, useCallback } from 'react'
import { 
  GoodsReception,
  CreateGoodsReceptionData,
  ReceiveGoodsItem,
  PurchaseOrder
} from '@/lib/api'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'

interface GoodsReceptionFormData {
  purchaseOrderId: string
  receptionDate: string
  notes: string
  items: ReceiveGoodsItem[]
}

interface ReceptionValidation {
  isValid: boolean
  errors: {
    receptionDate?: string
    items?: string
    general?: string
  }
}

interface UseGoodsReceptionState {
  formData: GoodsReceptionFormData
  validation: ReceptionValidation
  loading: boolean
  saving: boolean
  error: string | null
  purchaseOrder: PurchaseOrder | null
}

interface UseGoodsReceptionReturn extends UseGoodsReceptionState {
  updateField: (field: keyof GoodsReceptionFormData, value: any) => void
  updateItem: (index: number, field: keyof ReceiveGoodsItem, value: any) => void
  validateForm: () => boolean
  resetForm: () => void
  loadPurchaseOrder: (purchaseOrder: PurchaseOrder) => void
  submitReception: () => Promise<GoodsReception>
  calculateTotalReceived: () => number
  isPartialReception: () => boolean
}

const initialFormData: GoodsReceptionFormData = {
  purchaseOrderId: '',
  receptionDate: new Date().toISOString().split('T')[0],
  notes: '',
  items: []
}

const initialValidation: ReceptionValidation = {
  isValid: false,
  errors: {}
}

export function useGoodsReception(
  onSuccess?: (reception: GoodsReception) => void
): UseGoodsReceptionReturn {
  const { user } = useAuth()
  const [state, setState] = useState<UseGoodsReceptionState>({
    formData: initialFormData,
    validation: initialValidation,
    loading: false,
    saving: false,
    error: null,
    purchaseOrder: null
  })

  const updateField = useCallback((field: keyof GoodsReceptionFormData, value: any) => {
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        [field]: value
      },
      validation: {
        ...prev.validation,
        errors: {
          ...prev.validation.errors,
          [field]: undefined
        }
      }
    }))
  }, [])

  const updateItem = useCallback((index: number, field: keyof ReceiveGoodsItem, value: any) => {
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        items: prev.formData.items.map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        )
      }
    }))
  }, [])

  const validateForm = useCallback((): boolean => {
    const errors: ReceptionValidation['errors'] = {}

    // Validation de la date de réception
    if (!state.formData.receptionDate) {
      errors.receptionDate = 'La date de réception est requise'
    }

    // Validation des articles
    if (state.formData.items.length === 0) {
      errors.items = 'Au moins un article doit être réceptionné'
    } else {
      const hasInvalidItems = state.formData.items.some(item =>
        item.quantityReceived < 0 || 
        item.quantityReceived > item.quantityExpected ||
        !item.productId ||
        !item.purchaseOrderItemId
      )
      if (hasInvalidItems) {
        errors.items = 'Les quantités reçues doivent être positives et ne pas dépasser les quantités attendues'
      }

      const hasNoReceivedItems = state.formData.items.every(item => item.quantityReceived === 0)
      if (hasNoReceivedItems) {
        errors.items = 'Au moins un article doit avoir une quantité reçue supérieure à 0'
      }
    }

    const isValid = Object.keys(errors).length === 0

    setState(prev => ({
      ...prev,
      validation: {
        isValid,
        errors
      }
    }))

    return isValid
  }, [state.formData])

  const resetForm = useCallback(() => {
    setState(prev => ({
      ...prev,
      formData: initialFormData,
      validation: initialValidation,
      error: null,
      purchaseOrder: null
    }))
  }, [])

  const loadPurchaseOrder = useCallback((purchaseOrder: PurchaseOrder) => {
    const receptionItems: ReceiveGoodsItem[] = purchaseOrder.items.map(item => ({
      purchaseOrderItemId: item.id,
      productId: item.productId,
      quantityReceived: 0,
      quantityExpected: item.quantity - item.receivedQty,
      unitCost: item.unitPrice,
      notes: ''
    }))

    setState(prev => ({
      ...prev,
      purchaseOrder,
      formData: {
        purchaseOrderId: purchaseOrder.id,
        receptionDate: new Date().toISOString().split('T')[0],
        notes: '',
        items: receptionItems
      }
    }))
  }, [])

  const submitReception = useCallback(async (): Promise<GoodsReception> => {
    if (!user) throw new Error('Utilisateur non authentifié')

    if (!validateForm()) {
      throw new Error('Veuillez corriger les erreurs du formulaire')
    }

    try {
      setState(prev => ({ ...prev, saving: true, error: null }))

      const submitData: CreateGoodsReceptionData = {
        purchaseOrderId: state.formData.purchaseOrderId,
        receptionDate: state.formData.receptionDate,
        notes: state.formData.notes || undefined,
        items: state.formData.items.filter(item => item.quantityReceived > 0)
      }

      const response = await api.post(`/api/v1/purchase-orders/${state.formData.purchaseOrderId}/receive`, submitData)

      if (response.data.success) {
        const reception = response.data.data
        setState(prev => ({ ...prev, saving: false }))
        
        if (onSuccess) {
          onSuccess(reception)
        }
        
        return reception
      } else {
        throw new Error(response.data.message || 'Erreur lors de la réception')
      }
    } catch (error) {
      console.error('Erreur lors de la soumission de la réception:', error)
      setState(prev => ({
        ...prev,
        saving: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }))
      throw error
    }
  }, [user, state.formData, onSuccess, validateForm])

  const calculateTotalReceived = useCallback((): number => {
    return state.formData.items.reduce((total, item) => total + item.quantityReceived, 0)
  }, [state.formData.items])

  const isPartialReception = useCallback((): boolean => {
    return state.formData.items.some(item => 
      item.quantityReceived > 0 && item.quantityReceived < item.quantityExpected
    )
  }, [state.formData.items])

  return {
    ...state,
    updateField,
    updateItem,
    validateForm,
    resetForm,
    loadPurchaseOrder,
    submitReception,
    calculateTotalReceived,
    isPartialReception
  }
}
