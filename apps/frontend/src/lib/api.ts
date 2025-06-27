import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { withRetry } from './defensive-utils'

// Configuration de l'API - Connexion directe au backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3003'
const API_TIMEOUT = 15000 // 15 secondes - Augmenté pour la robustesse

// Types de base
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface HealthResponse {
  status: string
  timestamp: string
  uptime: number
  version?: string
  environment?: string
}

// Types pour les entités
export interface Client {
  id: string
  type: 'INDIVIDUAL' | 'COMPANY'
  firstName?: string
  lastName?: string
  companyName?: string
  email: string
  phone?: string
  address?: string
  postalCode?: string
  city?: string
  country?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: string
  name: string
  reference?: string
  description?: string
  category?: string
  price: number
  costPrice?: number
  stock?: number
  minStock?: number
  unit: string
  isActive: boolean
  trackStock: boolean
  allowBackorder: boolean
  createdAt: string
  updatedAt: string
}

export interface Supplier {
  id: string
  type: 'COMPANY' | 'INDIVIDUAL'
  name: string
  contactName?: string
  email?: string
  phone?: string
  mobile?: string
  website?: string
  fax?: string
  address?: string
  postalCode?: string
  city?: string
  country?: string
  siret?: string
  vatNumber?: string
  rcs?: string
  paymentTerms?: number
  discount?: number
  currency?: string
  rating?: number
  isActive: boolean
  isPreferred: boolean
  notes?: string
  tags?: string[]
  productsCount?: number
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  id?: string
  productId: string
  product?: Product
  quantity: number
  unitPrice: number
  vatRate: number
  discount: number
}

export interface Order {
  id: string
  number: string
  type: 'QUOTE' | 'ORDER'
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED'
  clientId: string
  client?: Client
  orderDate: string
  validUntil?: string
  deliveryDate?: string
  subtotal: number
  vatAmount: number
  total: number
  discount: number
  notes?: string
  internalNotes?: string
  items: OrderItem[]
  createdAt: string
  updatedAt: string
}

export interface InvoiceItem {
  id?: string
  productId: string
  product?: Product
  quantity: number
  unitPrice: number
  vatRate: number
  discount: number
}

export interface Invoice {
  id: string
  number: string
  type: 'INVOICE' | 'CREDIT_NOTE' | 'PROFORMA'
  status: 'DRAFT' | 'SENT' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'CANCELLED'
  clientId: string
  client?: Client
  orderId?: string
  order?: Order
  invoiceDate: string
  dueDate: string
  paidDate?: string
  subtotal: number
  vatAmount: number
  total: number
  paidAmount: number
  discount: number
  notes?: string
  paymentMethod?: string
  items: InvoiceItem[]
  createdAt: string
  updatedAt: string
}

export interface DashboardStats {
  clients: {
    total: number
    individuals: number
    companies: number
    recentCount: number
    growth: number
  }
  products: {
    total: number
    inStock: number
    lowStock: number
    outOfStock: number
    totalStockValue: number
  }
  sales: {
    currentMonth: number
    previousMonth: number
    growth: number
    currency: string
  }
  orders: {
    total: number
    pending: number
    accepted: number
    rejected: number
    averageValue: number
  }
  invoices: {
    total: number
    paid: number
    pending: number
    overdue: number
    totalAmount: number
    paidAmount: number
    pendingAmount: number
  }
  lastUpdated: string
}

// Types pour Analytics Phase 5
export interface KPIMetrics {
  revenue: {
    current: number
    target: number
    growth: number
    currency: string
  }
  orders: {
    current: number
    target: number
    growth: number
  }
  clients: {
    current: number
    target: number
    growth: number
  }
  conversion: {
    rate: number
    target: number
    growth: number
  }
}

export interface SalesAnalytics {
  period: string
  monthlyRevenue: Array<{
    month: string
    revenue: number
    invoiceCount: number
    avgInvoice: number
  }>
  topClients: Array<{
    id: string
    name: string
    type: string
    totalRevenue: number
    invoiceCount: number
    avgInvoice: number
  }>
  clientTypeDistribution: Array<{
    type: string
    revenue: number
    invoiceCount: number
  }>
}

export interface ProductAnalytics {
  period: string
  topProducts: Array<{
    id: string
    name: string
    category: string
    price: number
    totalQuantity: number
    totalRevenue: number
    invoiceCount: number
    avgPrice: number
  }>
  categoryDistribution: Array<{
    category: string
    totalQuantity: number
    totalRevenue: number
    productCount: number
  }>
}

export interface ClientAnalytics {
  segmentation: Array<{
    segment: string
    clientCount: number
    segmentRevenue: number
    avgRevenue: number
  }>
  geographicDistribution: Array<{
    city: string
    clientCount: number
    totalRevenue: number
  }>
  mostActiveClients: Array<{
    id: string
    name: string
    type: string
    city: string
    invoiceCount: number
    totalRevenue: number
    lastInvoiceDate: string
  }>
}

export interface EvolutionData {
  metric: string
  period: string
  data: Array<{
    period: string
    value: number
  }>
}

// Configuration d'Axios
class ApiClient {
  private client: AxiosInstance
  private authToken: string | null = null

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Pour les cookies
    })

    // Initialiser le token depuis localStorage si disponible
    if (typeof window !== 'undefined') {
      const storedTokens = localStorage.getItem('auth-tokens')
      if (storedTokens) {
        try {
          const tokens = JSON.parse(storedTokens)
          if (tokens.accessToken) {
            this.setAuthToken(tokens.accessToken)
          }
        } catch (error) {
          console.error('Erreur lors de la récupération du token:', error)
          localStorage.removeItem('auth-tokens')
        }
      }
    }

    // Intercepteur de requête
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`)
        return config
      },
      (error) => {
        console.error('❌ API Request Error:', error)
        return Promise.reject(error)
      }
    )

    // Intercepteur de réponse
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`✅ API Success: ${response.config.method?.toUpperCase()} ${response.config.url}`)
        return response
      },
      (error) => {
        console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error)

        // Vérifier si l'erreur est liée à un problème de réseau ou de connexion
        if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || error.code === 'ETIMEDOUT') {
          console.warn('🔌 Erreur de connexion réseau détectée')
          throw new Error('Erreur de connexion au serveur. Veuillez vérifier votre connexion réseau.')
        }

        if (error.response) {
          // Gérer les erreurs d'authentification
          if (error.response.status === 401) {
            console.log('⚠️ API: Erreur 401 détectée pour:', error.config?.url)

            // Ne pas nettoyer automatiquement si on est sur la page de login
            // ou si c'est une requête de login qui a échoué
            const isLoginPage = typeof window !== 'undefined' && window.location.pathname.includes('/login')
            const isLoginRequest = error.config?.url?.includes('/auth/login')

            if (!isLoginPage && !isLoginRequest) {
              console.log('⚠️ API: Nettoyage de l\'authentification pour erreur 401')
              // Token expiré ou invalide, nettoyer le localStorage
              if (typeof window !== 'undefined') {
                localStorage.removeItem('auth-user')
                localStorage.removeItem('auth-tokens')
                this.clearAuthToken()

                // Rediriger vers la page de connexion
                window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname)
              }
            } else {
              console.log('⚠️ API: Erreur 401 ignorée (page de login ou requête de login)')
            }
          }

          // Gérer les erreurs 500 (erreur serveur)
          if (error.response.status === 500) {
            console.warn('🔥 Erreur serveur 500 détectée')
            throw new Error('Erreur serveur. Veuillez contacter l\'administrateur.')
          }

          const message = error.response.data?.message || error.response.data?.error || 'Erreur API'
          throw new Error(`HTTP ${error.response.status}: ${message}`)
        }

        if (error.request) {
          console.warn('📡 Aucune réponse du serveur')
          throw new Error('Le serveur ne répond pas. Veuillez réessayer ultérieurement.')
        }

        throw new Error(error.message || 'Erreur inconnue')
      }
    )
  }

  // Méthodes génériques avec retry automatique
  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    return withRetry(async () => {
      const response = await this.client.request<T>(config)
      return response.data
    }, 3, 1000) // 3 tentatives avec 1 seconde d'attente
  }

  // Méthode sans retry pour les cas spéciaux (login, etc.)
  private async requestWithoutRetry<T>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.client.request<T>(config)
    return response.data
  }

  // Méthodes HTTP standard pour compatibilité avec les composants existants
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config)
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config)
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config)
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config)
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.patch<T>(url, data, config)
  }

  // Health Check
  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>({
      method: 'GET',
      url: '/health',
    })
  }

  // Métriques
  async metrics(): Promise<any> {
    return this.request({
      method: 'GET',
      url: '/metrics',
    })
  }

  // Dashboard
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return this.request<ApiResponse<DashboardStats>>({
      method: 'GET',
      url: '/api/v1/dashboard/stats',
    })
  }

  // Analytics Phase 5
  async getKPIMetrics(): Promise<ApiResponse<KPIMetrics>> {
    return this.request<ApiResponse<KPIMetrics>>({
      method: 'GET',
      url: '/api/v1/analytics/kpi',
    })
  }

  async getSalesAnalytics(params?: {
    period?: string
    startDate?: string
    endDate?: string
  }): Promise<ApiResponse<SalesAnalytics>> {
    return this.request<ApiResponse<SalesAnalytics>>({
      method: 'GET',
      url: '/api/v1/analytics/sales',
      params,
    })
  }

  async getProductAnalytics(params?: {
    period?: string
    limit?: number
  }): Promise<ApiResponse<ProductAnalytics>> {
    return this.request<ApiResponse<ProductAnalytics>>({
      method: 'GET',
      url: '/api/v1/analytics/products',
      params,
    })
  }

  async getClientAnalytics(): Promise<ApiResponse<ClientAnalytics>> {
    return this.request<ApiResponse<ClientAnalytics>>({
      method: 'GET',
      url: '/api/v1/analytics/clients',
    })
  }

  async getEvolutionData(params?: {
    metric?: string
    period?: string
  }): Promise<ApiResponse<EvolutionData>> {
    return this.request<ApiResponse<EvolutionData>>({
      method: 'GET',
      url: '/api/v1/analytics/evolution',
      params,
    })
  }

  // Clients
  async getClients(params?: {
    page?: number
    limit?: number
    search?: string
    type?: string
    city?: string
  }): Promise<ApiResponse<PaginatedResponse<Client>>> {
    return this.request<ApiResponse<PaginatedResponse<Client>>>({
      method: 'GET',
      url: '/api/v1/clients',
      params,
    })
  }

  async getClient(id: string): Promise<ApiResponse<Client>> {
    return this.request<ApiResponse<Client>>({
      method: 'GET',
      url: `/api/v1/clients/${id}`,
    })
  }

  async createClient(data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Client>> {
    // Le backend attend les données en camelCase, pas de transformation nécessaire
    const backendData = {
      type: data.type,
      firstName: data.firstName,
      lastName: data.lastName,
      companyName: data.companyName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      postalCode: data.postalCode,
      city: data.city,
      country: data.country,
      notes: data.notes
    }

    return this.request<ApiResponse<Client>>({
      method: 'POST',
      url: '/api/v1/clients',
      data: backendData,
    })
  }

  async updateClient(id: string, data: Partial<Client>): Promise<ApiResponse<Client>> {
    // Le backend attend les données en camelCase, pas de transformation nécessaire
    const backendData = {
      type: data.type,
      firstName: data.firstName,
      lastName: data.lastName,
      companyName: data.companyName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      postalCode: data.postalCode,
      city: data.city,
      country: data.country,
      notes: data.notes
    }

    return this.request<ApiResponse<Client>>({
      method: 'PUT',
      url: `/api/v1/clients/${id}`,
      data: backendData,
    })
  }

  async deleteClient(id: string): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>({
      method: 'DELETE',
      url: `/api/v1/clients/${id}`,
    })
  }

  // Produits
  async getProducts(params?: {
    page?: number
    limit?: number
    search?: string
    category?: string
    stock?: string
    price?: string
  }): Promise<ApiResponse<PaginatedResponse<Product>>> {
    return this.request<ApiResponse<PaginatedResponse<Product>>>({
      method: 'GET',
      url: '/api/v1/products',
      params,
    })
  }

  async getProduct(id: string): Promise<ApiResponse<Product>> {
    return this.request<ApiResponse<Product>>({
      method: 'GET',
      url: `/api/v1/products/${id}`,
    })
  }

  async createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Product>> {
    // Transformer les données pour correspondre au format backend
    const backendData = {
      name: data.name,
      reference: data.reference,
      description: data.description,
      category: data.category,
      price: data.price,
      cost_price: data.costPrice,
      stock: data.stock,
      min_stock: data.minStock,
      unit: data.unit,
      is_active: data.isActive,
      track_stock: data.trackStock,
      allow_backorder: data.allowBackorder
    }

    return this.request<ApiResponse<Product>>({
      method: 'POST',
      url: '/api/v1/products',
      data: backendData,
    })
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<ApiResponse<Product>> {
    // Transformer les données pour correspondre au format backend
    const backendData = {
      name: data.name,
      reference: data.reference,
      description: data.description,
      category: data.category,
      price: data.price,
      cost_price: data.costPrice,
      stock: data.stock,
      min_stock: data.minStock,
      unit: data.unit,
      is_active: data.isActive,
      track_stock: data.trackStock,
      allow_backorder: data.allowBackorder
    }

    return this.request<ApiResponse<Product>>({
      method: 'PUT',
      url: `/api/v1/products/${id}`,
      data: backendData,
    })
  }

  async deleteProduct(id: string): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>({
      method: 'DELETE',
      url: `/api/v1/products/${id}`,
    })
  }

  // Fournisseurs
  async getSuppliers(params?: {
    page?: number
    limit?: number
    search?: string
    type?: string
    city?: string
    isActive?: boolean
  }): Promise<ApiResponse<PaginatedResponse<Supplier>>> {
    return this.request<ApiResponse<PaginatedResponse<Supplier>>>({
      method: 'GET',
      url: '/api/v1/suppliers',
      params,
    })
  }

  async getSupplier(id: string): Promise<ApiResponse<Supplier>> {
    return this.request<ApiResponse<Supplier>>({
      method: 'GET',
      url: `/api/v1/suppliers/${id}`,
    })
  }

  async createSupplier(data: {
    type: 'COMPANY' | 'INDIVIDUAL'
    name: string
    contactName?: string
    email?: string
    phone?: string
    mobile?: string
    website?: string
    fax?: string
    address?: string
    postalCode?: string
    city?: string
    country?: string
    siret?: string
    vatNumber?: string
    rcs?: string
    paymentTerms?: number
    discount?: number
    currency?: string
    rating?: number
    isActive?: boolean
    isPreferred?: boolean
    notes?: string
    tags?: string[]
  }): Promise<ApiResponse<Supplier>> {
    // Transformer les données pour correspondre au format backend
    const backendData = {
      type: data.type,
      name: data.name,
      contact_name: data.contactName,
      email: data.email,
      phone: data.phone,
      mobile: data.mobile,
      website: data.website,
      fax: data.fax,
      address: data.address,
      postal_code: data.postalCode,
      city: data.city,
      country: data.country,
      siret: data.siret,
      vat_number: data.vatNumber,
      rcs: data.rcs,
      payment_terms: data.paymentTerms,
      discount: data.discount,
      currency: data.currency,
      rating: data.rating,
      is_active: data.isActive !== false,
      is_preferred: data.isPreferred || false,
      notes: data.notes,
      tags: data.tags
    }

    return this.request<ApiResponse<Supplier>>({
      method: 'POST',
      url: '/api/v1/suppliers',
      data: backendData,
    })
  }

  async updateSupplier(id: string, data: Partial<Supplier>): Promise<ApiResponse<Supplier>> {
    // Transformer les données pour correspondre au format backend
    const backendData = {
      type: data.type,
      name: data.name,
      contact_name: data.contactName,
      email: data.email,
      phone: data.phone,
      mobile: data.mobile,
      website: data.website,
      fax: data.fax,
      address: data.address,
      postal_code: data.postalCode,
      city: data.city,
      country: data.country,
      siret: data.siret,
      vat_number: data.vatNumber,
      rcs: data.rcs,
      payment_terms: data.paymentTerms,
      discount: data.discount,
      currency: data.currency,
      rating: data.rating,
      is_active: data.isActive,
      is_preferred: data.isPreferred,
      notes: data.notes,
      tags: data.tags
    }

    return this.request<ApiResponse<Supplier>>({
      method: 'PUT',
      url: `/api/v1/suppliers/${id}`,
      data: backendData,
    })
  }

  async deleteSupplier(id: string): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>({
      method: 'DELETE',
      url: `/api/v1/suppliers/${id}`,
    })
  }

  // Commandes
  async getOrders(params?: {
    page?: number
    limit?: number
    search?: string
    type?: string
    status?: string
    clientId?: string
  }): Promise<ApiResponse<PaginatedResponse<Order>>> {
    return this.request<ApiResponse<PaginatedResponse<Order>>>({
      method: 'GET',
      url: '/api/v1/orders',
      params,
    })
  }

  async getOrder(id: string): Promise<ApiResponse<Order>> {
    return this.request<ApiResponse<Order>>({
      method: 'GET',
      url: `/api/v1/orders/${id}`,
    })
  }

  async createOrder(data: {
    type: 'QUOTE' | 'ORDER'
    clientId: string
    orderDate?: string
    validUntil?: string
    deliveryDate?: string
    notes?: string
    internalNotes?: string
    items: Array<{
      productId: string
      quantity: number
      unitPrice: number
      vatRate?: number
      discount?: number
    }>
  }): Promise<ApiResponse<Order>> {
    // Le backend attend les données en camelCase, pas de transformation nécessaire
    const backendData = {
      type: data.type,
      clientId: data.clientId,
      orderDate: data.orderDate,
      validUntil: data.validUntil,
      deliveryDate: data.deliveryDate,
      notes: data.notes,
      internalNotes: data.internalNotes,
      items: data.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate || 19,
        discount: item.discount || 0
      }))
    }

    return this.request<ApiResponse<Order>>({
      method: 'POST',
      url: '/api/v1/orders',
      data: backendData,
    })
  }

  async updateOrder(id: string, data: Partial<Order>): Promise<ApiResponse<Order>> {
    // Le backend attend les données en camelCase, pas de transformation nécessaire
    const backendData = {
      type: data.type,
      clientId: data.clientId,
      orderDate: data.orderDate,
      validUntil: data.validUntil,
      deliveryDate: data.deliveryDate,
      notes: data.notes,
      internalNotes: data.internalNotes,
      items: data.items?.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate || 19,
        discount: item.discount || 0
      }))
    }

    return this.request<ApiResponse<Order>>({
      method: 'PUT',
      url: `/api/v1/orders/${id}`,
      data: backendData,
    })
  }

  async deleteOrder(id: string): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>({
      method: 'DELETE',
      url: `/api/v1/orders/${id}`,
    })
  }

  async getOrderStats(): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>({
      method: 'GET',
      url: '/api/v1/orders/stats/overview',
    })
  }

  // Factures
  async getInvoices(params?: {
    page?: number
    limit?: number
    search?: string
    type?: string
    status?: string
    clientId?: string
  }): Promise<ApiResponse<PaginatedResponse<Invoice>>> {
    return this.request<ApiResponse<PaginatedResponse<Invoice>>>({
      method: 'GET',
      url: '/api/v1/invoices',
      params,
    })
  }

  async getInvoice(id: string): Promise<ApiResponse<Invoice>> {
    return this.request<ApiResponse<Invoice>>({
      method: 'GET',
      url: `/api/v1/invoices/${id}`,
    })
  }

  async createInvoice(data: {
    type?: 'INVOICE' | 'CREDIT_NOTE' | 'PROFORMA'
    clientId: string
    orderId?: string
    invoiceDate?: string
    dueDate: string
    notes?: string
    paymentMethod?: string
    items: Array<{
      productId: string
      quantity: number
      unitPrice: number
      vatRate?: number
      discount?: number
    }>
  }): Promise<ApiResponse<Invoice>> {
    // Les données sont déjà au bon format pour le backend modulaire
    const backendData = {
      type: data.type || 'INVOICE',
      clientId: data.clientId,
      orderId: data.orderId,
      invoiceDate: data.invoiceDate,
      dueDate: data.dueDate,
      notes: data.notes,
      paymentMethod: data.paymentMethod,
      items: data.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate || 19,
        discount: item.discount || 0
      }))
    }

    return this.request<ApiResponse<Invoice>>({
      method: 'POST',
      url: '/api/v1/invoices',
      data: backendData,
    })
  }

  async updateInvoice(id: string, data: Partial<Invoice>): Promise<ApiResponse<Invoice>> {
    // Les données sont déjà au bon format pour le backend modulaire
    const backendData = {
      type: data.type,
      clientId: data.clientId,
      orderId: data.orderId,
      invoiceDate: data.invoiceDate,
      dueDate: data.dueDate,
      notes: data.notes,
      paymentMethod: data.paymentMethod,
      items: data.items?.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate || 19,
        discount: item.discount || 0
      }))
    }

    return this.request<ApiResponse<Invoice>>({
      method: 'PUT',
      url: `/api/v1/invoices/${id}`,
      data: backendData,
    })
  }

  async deleteInvoice(id: string): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>({
      method: 'DELETE',
      url: `/api/v1/invoices/${id}`,
    })
  }

  async createInvoiceFromOrder(orderId: string): Promise<ApiResponse<Invoice>> {
    return this.request<ApiResponse<Invoice>>({
      method: 'POST',
      url: '/api/v1/invoices/from-order',
      data: { orderId: orderId },
    })
  }

  async updateInvoiceStatus(id: string, status: string): Promise<ApiResponse<Invoice>> {
    return this.request<ApiResponse<Invoice>>({
      method: 'PATCH',
      url: `/api/v1/invoices/${id}/status`,
      data: { status },
    })
  }

  async getInvoiceStats(): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>({
      method: 'GET',
      url: '/api/v1/invoices/stats/overview',
    })
  }

  // Méthodes d'authentification
  setAuthToken(token: string) {
    this.authToken = token
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  clearAuthToken() {
    this.authToken = null
    delete this.client.defaults.headers.common['Authorization']
  }

  getAuthToken(): string | null {
    return this.authToken
  }

  // Authentification
  async login(credentials: { email: string; password: string }): Promise<ApiResponse<any>> {
    try {
      console.log('🔍 Login attempt with:', { email: credentials.email, password: '***' })
      console.log('🔍 API Base URL:', API_BASE_URL)

      // Utiliser fetch directement avec les bonnes options CORS
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        credentials: 'include', // Important pour CORS avec credentials
        mode: 'cors', // Explicitement activer CORS
      })

      console.log('🔍 Response status:', response.status)
      console.log('🔍 Response ok:', response.ok)

      const data = await response.json()
      console.log('🔍 Response data:', data)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${data.message || 'Erreur de connexion'}`)
      }

      return data
    } catch (error) {
      console.error('❌ Login error:', error)
      throw error
    }
  }

  async register(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    companyName?: string;
    phone?: string;
    city?: string;
  }): Promise<ApiResponse<any>> {
    try {
      console.log('🔍 Register attempt with:', { ...userData, password: '***' })

      // Utiliser fetch directement avec les bonnes options CORS
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
        credentials: 'include', // Important pour CORS avec credentials
        mode: 'cors', // Explicitement activer CORS
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${data.message || 'Erreur d\'inscription'}`)
      }

      return data
    } catch (error) {
      console.error('❌ Register error:', error)
      throw error
    }
  }

  async logout(): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>({
      method: 'GET',
      url: '/api/v1/auth/logout',
    })
  }

  async verifyToken(): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>({
      method: 'GET',
      url: '/api/v1/auth/verify',
    })
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      data: { refreshToken },
    })
  }

  async getProfile(): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>({
      method: 'GET',
      url: '/api/v1/auth/profile',
    })
  }

  // Méthodes HTTP standard pour compatibilité avec les composants existants
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config)
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config)
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config)
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config)
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.patch<T>(url, data, config)
  }
}

// Instance globale
export const api = new ApiClient()
