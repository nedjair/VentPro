'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CreatePurchaseOrderData,
  CreatePurchaseOrderItem,
  PurchaseOrder,
  PurchaseOrderStatus,
  Supplier,
  Product
} from '@/lib/api'
import { api } from '@/lib/api'
import { useAuth } from '@/stores/auth'

interface PurchaseOrderFormData {
  supplierId: string
  orderDate: string
  expectedDate: string
  notes: string
  status: PurchaseOrderStatus
  items: CreatePurchaseOrderItem[]
}

interface FormValidation {
  isValid: boolean
  errors: {
    supplierId?: string
    orderDate?: string
    expectedDate?: string
    status?: string
    items?: string
    general?: string
  }
}

interface UsePurchaseOrderFormState {
  formData: PurchaseOrderFormData
  validation: FormValidation
  loading: boolean
  saving: boolean
  error: string | null
  suppliers: Supplier[]
  products: Product[]
  loadingSuppliers: boolean
  loadingProducts: boolean
}

interface UsePurchaseOrderFormReturn extends UsePurchaseOrderFormState {
  updateField: (field: keyof PurchaseOrderFormData, value: any) => void
  addItem: () => void
  updateItem: (index: number, field: keyof CreatePurchaseOrderItem, value: any) => void
  removeItem: (index: number) => void
  validateForm: () => boolean
  resetForm: () => void
  loadFormData: (purchaseOrder: PurchaseOrder) => void
  submitForm: () => Promise<PurchaseOrder>
  calculateTotals: () => { subtotal: number; taxAmount: number; total: number }
  fetchSuppliers: () => Promise<void>
  fetchProducts: () => Promise<void>
}

const initialFormData: PurchaseOrderFormData = {
  supplierId: '',
  orderDate: new Date().toISOString().split('T')[0],
  expectedDate: '',
  notes: '',
  status: 'DRAFT',
  items: []
}

const initialValidation: FormValidation = {
  isValid: false,
  errors: {}
}

export function usePurchaseOrderForm(
  existingOrder?: PurchaseOrder,
  onSuccess?: (order: PurchaseOrder) => void
): UsePurchaseOrderFormReturn {
  const { user, tokens, isAuthenticated } = useAuth()
  const [state, setState] = useState<UsePurchaseOrderFormState>({
    formData: initialFormData,
    validation: initialValidation,
    loading: false,
    saving: false,
    error: null,
    suppliers: [],
    products: [],
    loadingSuppliers: false,
    loadingProducts: false
  })

  const updateField = useCallback((field: keyof PurchaseOrderFormData, value: any) => {
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        [field]: value
      }
      // 🔧 CORRECTION: Ne plus modifier validation ici, c'est géré automatiquement par useEffect
    }))
  }, [])

  const addItem = useCallback(() => {
    const newItem: CreatePurchaseOrderItem = {
      productId: '',
      quantity: 1,
      unitPrice: 0
    }

    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        items: [...prev.formData.items, newItem]
      }
    }))
  }, [])

  const updateItem = useCallback((index: number, field: keyof CreatePurchaseOrderItem, value: any) => {
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

  const removeItem = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        items: prev.formData.items.filter((_, i) => i !== index)
      }
    }))
  }, [])

  const validateForm = useCallback((): boolean => {
    const errors: FormValidation['errors'] = {}

    // Validation du fournisseur
    if (!state.formData.supplierId) {
      errors.supplierId = 'Le fournisseur est requis'
    }

    // Validation de la date de commande
    if (!state.formData.orderDate) {
      errors.orderDate = 'La date de commande est requise'
    }

    // Validation de la date d'échéance
    if (state.formData.expectedDate && state.formData.orderDate) {
      const orderDate = new Date(state.formData.orderDate)
      const expectedDate = new Date(state.formData.expectedDate)
      if (expectedDate < orderDate) {
        errors.expectedDate = 'La date d\'échéance ne peut pas être antérieure à la date de commande'
      }
    }

    // Validation des articles
    if (state.formData.items.length === 0) {
      errors.items = 'Au moins un article est requis'
    } else {
      const hasInvalidItems = state.formData.items.some(item =>
        !item.productId || item.quantity <= 0 || item.unitPrice < 0
      )
      if (hasInvalidItems) {
        errors.items = 'Tous les articles doivent avoir un produit, une quantité positive et un prix valide'
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

  // 🔧 CORRECTION: Recalculer automatiquement la validation quand formData change
  useEffect(() => {
    const errors: FormValidation['errors'] = {}

    // Validation du fournisseur
    if (!state.formData.supplierId) {
      errors.supplierId = 'Le fournisseur est requis'
    }

    // Validation de la date de commande
    if (!state.formData.orderDate) {
      errors.orderDate = 'La date de commande est requise'
    }

    // Validation de la date d'échéance
    if (state.formData.expectedDate && state.formData.orderDate) {
      const orderDate = new Date(state.formData.orderDate)
      const expectedDate = new Date(state.formData.expectedDate)
      if (expectedDate < orderDate) {
        errors.expectedDate = 'La date d\'échéance ne peut pas être antérieure à la date de commande'
      }
    }

    // Validation des articles
    if (state.formData.items.length === 0) {
      errors.items = 'Au moins un article est requis'
    } else {
      const hasInvalidItems = state.formData.items.some(item =>
        !item.productId || item.quantity <= 0 || item.unitPrice < 0
      )
      if (hasInvalidItems) {
        errors.items = 'Tous les articles doivent avoir un produit, une quantité positive et un prix valide'
      }
    }

    const isValid = Object.keys(errors).length === 0

    // Mettre à jour la validation seulement si elle a changé
    setState(prev => {
      if (prev.validation.isValid !== isValid ||
          JSON.stringify(prev.validation.errors) !== JSON.stringify(errors)) {
        console.log('🔧 Validation automatique mise à jour:', { isValid, errors })
        return {
          ...prev,
          validation: {
            isValid,
            errors
          }
        }
      }
      return prev
    })
  }, [state.formData])

  const resetForm = useCallback(() => {
    setState(prev => ({
      ...prev,
      formData: initialFormData,
      validation: initialValidation,
      error: null
    }))
  }, [])

  const loadFormData = useCallback((purchaseOrder: PurchaseOrder) => {
    setState(prev => ({
      ...prev,
      formData: {
        supplierId: purchaseOrder.supplierId,
        orderDate: purchaseOrder.orderDate.split('T')[0],
        expectedDate: purchaseOrder.expectedDate ? purchaseOrder.expectedDate.split('T')[0] : '',
        notes: purchaseOrder.notes || '',
        status: purchaseOrder.status,
        items: purchaseOrder.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        }))
      }
    }))
  }, [])

  const submitForm = useCallback(async (): Promise<PurchaseOrder> => {
    if (!user) throw new Error('Utilisateur non authentifié')

    if (!validateForm()) {
      throw new Error('Veuillez corriger les erreurs du formulaire')
    }

    try {
      setState(prev => ({ ...prev, saving: true, error: null }))

      const submitData: CreatePurchaseOrderData = {
        supplierId: state.formData.supplierId,
        orderDate: state.formData.orderDate,
        expectedDate: state.formData.expectedDate || undefined,
        notes: state.formData.notes || undefined,
        status: state.formData.status,
        items: state.formData.items
      }

      let response
      if (existingOrder) {
        response = await api.put(`/api/v1/purchase-orders/${existingOrder.id}`, submitData)
      } else {
        response = await api.post('/api/v1/purchase-orders', submitData)
      }

      if (response.data.success) {
        const order = response.data.data
        setState(prev => ({ ...prev, saving: false }))
        
        if (onSuccess) {
          onSuccess(order)
        }
        
        return order
      } else {
        throw new Error(response.data.message || 'Erreur lors de la sauvegarde')
      }
    } catch (error) {
      console.error('Erreur lors de la soumission du formulaire:', error)
      setState(prev => ({
        ...prev,
        saving: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }))
      throw error
    }
  }, [user, state.formData, existingOrder, onSuccess, validateForm])

  const calculateTotals = useCallback(() => {
    const subtotal = state.formData.items.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice)
    }, 0)

    // TVA de 19% pour l'Algérie
    const taxAmount = subtotal * 0.19
    const total = subtotal + taxAmount

    return { subtotal, taxAmount, total }
  }, [state.formData.items])

  const fetchSuppliers = useCallback(async () => {
    console.log('🔍 fetchSuppliers: === DÉBUT DU DIAGNOSTIC ===')
    console.log('🔍 fetchSuppliers: user:', user)
    console.log('🔍 fetchSuppliers: isAuthenticated:', isAuthenticated)
    console.log('🔍 fetchSuppliers: tokens:', tokens)

    // SOLUTION: Forcer l'exécution car les API fonctionnent selon les logs
    console.log('🔍 fetchSuppliers: 🚀 FORÇAGE - Les API marchent, on continue sans vérification')

    try {
      console.log('🔍 fetchSuppliers: ✅ Début du chargement des fournisseurs')
      if (user) {
        console.log('🔍 fetchSuppliers: 👤 Utilisateur:', {
          id: user.id,
          email: user.email,
          companyId: user.companyId,
          role: user.role
        })
        console.log('🔍 fetchSuppliers: 🏢 CompanyId pour filtrage:', user.companyId)
      } else {
        console.log('🔍 fetchSuppliers: ⚠️ Pas d\'utilisateur, mais on continue avec les tokens')
      }
      setState(prev => ({ ...prev, loadingSuppliers: true }))

      // Test avec api.get directement - l'API filtre automatiquement par companyId
      console.log('🔍 fetchSuppliers: Tentative avec api.get...')
      console.log('🔍 fetchSuppliers: URL:', '/api/v1/suppliers?isActive=true&limit=100')
      console.log('🔍 fetchSuppliers: L\'API va filtrer par companyId:', user?.companyId)
      const response = await api.get('/api/v1/suppliers?isActive=true&limit=100')
      console.log('🔍 fetchSuppliers: ✅ Réponse API reçue')
      console.log('🔍 fetchSuppliers: 📊 Status:', response.status)
      console.log('🔍 fetchSuppliers: 📋 Headers:', response.headers)
      console.log('🔍 fetchSuppliers: 📦 response.data:', response.data)
      console.log('🔍 fetchSuppliers: 🎯 response.data.success:', response.data.success)
      console.log('🔍 fetchSuppliers: 🎯 response.data.data:', response.data.data)
      console.log('🔍 fetchSuppliers: 🎯 Type de response.data.data:', typeof response.data.data)
      console.log('🔍 fetchSuppliers: 🎯 response.data.data?.data:', response.data.data?.data)
      console.log('🔍 fetchSuppliers: 🎯 Type de response.data.data?.data:', typeof response.data.data?.data)

      // Gestion robuste de la réponse - CORRECTION DU BUG !
      let suppliers = []

      if (response.data.success) {
        // CORRECTION : La vraie structure est response.data.data.data (pagination)
        suppliers = response.data.data?.data || response.data.data || []
      } else if (response.data && Array.isArray(response.data)) {
        // Cas alternatif : les données sont directement dans response.data
        suppliers = response.data
      } else if (response.data && response.data.suppliers) {
        // Cas alternatif : les données sont dans response.data.suppliers
        suppliers = response.data.suppliers
      }

      console.log('🔍 fetchSuppliers: 🎯 Fournisseurs extraits:', suppliers)
      console.log('🔍 fetchSuppliers: 📊 Nombre de fournisseurs:', suppliers.length)
      console.log('🔍 fetchSuppliers: 🏪 Premier fournisseur:', suppliers[0])
      console.log('🔍 fetchSuppliers: 🏪 Tous les fournisseurs:', suppliers.map(s => ({ id: s.id, name: s.name })))

      setState(prev => {
        console.log('🔍 fetchSuppliers: 🔄 Mise à jour de l\'état...')
        console.log('🔍 fetchSuppliers: 📊 État précédent suppliers:', prev.suppliers.length)
        console.log('🔍 fetchSuppliers: 📊 Nouveaux suppliers:', suppliers.length)

        const newState = {
          ...prev,
          suppliers: suppliers,
          loadingSuppliers: false
        }

        console.log('🔍 fetchSuppliers: 📊 Nouvel état suppliers:', newState.suppliers.length)
        return newState
      })

      console.log('🔍 fetchSuppliers: ✅ État mis à jour avec', suppliers.length, 'fournisseurs')

      // Vérification après un délai pour s'assurer que l'état est bien mis à jour
      setTimeout(() => {
        console.log('🔍 fetchSuppliers: 🕐 Vérification après 100ms - état actuel:', state.suppliers.length)
      }, 100)

      if (suppliers.length === 0) {
        console.warn('🔍 fetchSuppliers: Aucun fournisseur trouvé dans la base PostgreSQL')
        console.warn('🔍 fetchSuppliers: Structure de réponse complète:', JSON.stringify(response.data, null, 2))
        console.warn('🔍 fetchSuppliers: Vérifier que les 7 fournisseurs actifs existent en base')
      }
    } catch (error) {
      console.error('🔍 fetchSuppliers: Erreur lors de la récupération des fournisseurs:', error)
      console.error('🔍 fetchSuppliers: Type d\'erreur:', typeof error)
      console.error('🔍 fetchSuppliers: Stack trace:', error instanceof Error ? error.stack : 'Pas de stack')

      // Vérifier si c'est un problème d'authentification
      if (error instanceof Error && error.message.includes('401')) {
        console.error('🔍 fetchSuppliers: Problème d\'authentification - token invalide ou expiré')
      }

      setState(prev => ({
        ...prev,
        loadingSuppliers: false,
        error: 'Erreur lors du chargement des fournisseurs depuis PostgreSQL'
      }))
    }
  }, [user, tokens, isAuthenticated])

  const fetchProducts = useCallback(async () => {
    console.log('🔍 fetchProducts: === DÉBUT DU DIAGNOSTIC ===')
    console.log('🔍 fetchProducts: user:', user)
    console.log('🔍 fetchProducts: isAuthenticated:', isAuthenticated)
    console.log('🔍 fetchProducts: tokens:', tokens)

    // SOLUTION: Forcer l'exécution car les API fonctionnent selon les logs
    console.log('🔍 fetchProducts: 🚀 FORÇAGE - Les API marchent, on continue sans vérification')

    try {
      setState(prev => ({ ...prev, loadingProducts: true }))

      const response = await api.get('/api/v1/products?isActive=true&limit=100')

      if (response.data.success) {
        // CORRECTION : Même problème que pour les fournisseurs - structure paginée
        const products = response.data.data?.data || response.data.data || []
        console.log('🔍 fetchProducts: Produits extraits:', products.length)
        setState(prev => ({
          ...prev,
          products: products,
          loadingProducts: false
        }))
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des produits:', error)
      setState(prev => ({ ...prev, loadingProducts: false }))
    }
  }, [user, tokens, isAuthenticated])

  // Charger les données initiales
  useEffect(() => {
    console.log('🔍 useEffect: Vérification des conditions de chargement...')
    console.log('🔍 useEffect: user:', !!user)
    console.log('🔍 useEffect: isAuthenticated:', isAuthenticated)
    console.log('🔍 useEffect: tokens:', !!tokens?.accessToken)

    // SOLUTION: Forcer le chargement même si le contexte n'est pas encore synchronisé
    // Puisque les API fonctionnent (on voit les succès dans les logs), on force le chargement
    console.log('🔍 useEffect: 🚀 FORÇAGE DU CHARGEMENT - Les API fonctionnent selon les logs')
    fetchSuppliers()
    fetchProducts()

  }, [fetchSuppliers, fetchProducts])

  // Charger les données du bon de commande existant
  useEffect(() => {
    if (existingOrder) {
      loadFormData(existingOrder)
    }
  }, [existingOrder, loadFormData])

  return {
    ...state,
    updateField,
    addItem,
    updateItem,
    removeItem,
    validateForm,
    resetForm,
    loadFormData,
    submitForm,
    calculateTotals,
    fetchSuppliers,
    fetchProducts
  }
}
