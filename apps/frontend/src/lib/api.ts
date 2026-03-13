import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { API_BASE_URL, buildApiUrl } from './api-config'
import { withRetry } from './defensive-utils'

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
  name?: string
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

// Interface pour les catégories
export interface Category {
  id: string
  name: string
  description?: string
  parentId?: string
  parent?: Category
  children?: Category[]
  createdAt: string
  updatedAt: string
}

export interface CategoryWriteInput {
  name: string
  description?: string
  parentId?: string
}

export interface Product {
  id: string
  name: string
  sku?: string          // Référence produit (identifiant interne)
  barcode?: string      // Code-barres (code numérique standardisé)
  reference?: string    // Compatibilité avec l'ancien système
  description?: string
  categoryId?: string   // ID de la catégorie
  category?: Category   // Objet catégorie complet (quand inclus par l'API)
  price: number
  costPrice?: number
  stock?: number
  stockQuantity?: number
  minStock?: number
  maxStock?: number | null
  unit: string
  isActive: boolean
  isService?: boolean
  trackStock: boolean
  allowBackorder: boolean
  vatRate?: number
  createdAt: string
  updatedAt: string
}

export interface ProductWriteInput {
  name: string
  sku?: string
  barcode?: string
  description?: string
  categoryId?: string
  price: number
  costPrice?: number
  stock?: number
  stockQuantity?: number
  minStock?: number
  maxStock?: number | null
  unit?: string
  isActive?: boolean
  isService?: boolean
  trackStock?: boolean
  allowBackorder?: boolean
  vatRate?: number
}

export interface SupplierProductSummary {
  id: string
  name: string
  sku?: string
  price?: number
  stockQuantity?: number
  isActive?: boolean
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
  deliveryTerms?: string
  tags?: string[]
  productsCount?: number
  purchasesCount?: number
  products?: SupplierProductSummary[]
  createdAt: string
  updatedAt: string
}

// Types pour les commandes fournisseurs
export type PurchaseOrderStatus = 'DRAFT' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'

export interface PurchaseOrderItem {
  id: string
  quantity: number
  receivedQty: number
  unitPrice: number
  total: number
  productId: string
  purchaseOrderId: string
  product: {
    id: string
    name: string
    sku: string
    description?: string
    unit?: string
    category?: {
      id: string
      name: string
    }
  }
  receptionItems?: GoodsReceptionItem[]
  createdAt: string
  updatedAt: string
}

export interface GoodsReception {
  id: string
  number: string
  receptionDate: string
  notes?: string
  isComplete: boolean
  purchaseOrderId: string
  companyId: string
  receivedById: string
  receivedBy: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  items: GoodsReceptionItem[]
  createdAt: string
  updatedAt: string
}

export interface GoodsReceptionItem {
  id: string
  quantityReceived: number
  quantityExpected: number
  unitCost?: number
  notes?: string
  purchaseOrderItemId: string
  productId: string
  goodsReceptionId: string
  product: {
    id: string
    name: string
    sku: string
  }
  purchaseOrderItem: {
    id: string
    quantity: number
    unitPrice: number
  }
  createdAt: string
  updatedAt: string
}

export interface PurchaseOrder {
  id: string
  number: string
  status: PurchaseOrderStatus
  orderDate: string
  expectedDate?: string
  notes?: string
  subtotal: number
  taxAmount: number
  total: number
  supplierId: string
  companyId: string
  createdById: string
  supplier: {
    id: string
    name: string
    email?: string
    phone?: string
    contactName?: string
    address?: string
    city?: string
    country?: string
    paymentTerms?: number
    currency?: string
  }
  createdBy: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  items: PurchaseOrderItem[]
  receptions: GoodsReception[]
  createdAt: string
  updatedAt: string
}

// Types pour les formulaires
export interface CreatePurchaseOrderItem {
  productId: string
  quantity: number
  unitPrice: number
}

export interface CreatePurchaseOrderData {
  supplierId: string
  orderDate?: string
  expectedDate?: string
  notes?: string
  status?: PurchaseOrderStatus
  items: CreatePurchaseOrderItem[]
}

export interface UpdatePurchaseOrderData {
  supplierId?: string
  orderDate?: string
  expectedDate?: string
  notes?: string
  status?: PurchaseOrderStatus
  items?: CreatePurchaseOrderItem[]
}

// Types pour les filtres et recherche
export interface PurchaseOrderFilters {
  search?: string
  supplierId?: string
  status?: PurchaseOrderStatus
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

// Types pour la réception de marchandises
export interface ReceiveGoodsItem {
  purchaseOrderItemId: string
  productId: string
  quantityReceived: number
  quantityExpected: number
  unitCost?: number
  notes?: string
}

export interface CreateGoodsReceptionData {
  purchaseOrderId: string
  receptionDate?: string
  notes?: string
  items: ReceiveGoodsItem[]
}

// Types pour les statistiques et rapports
export interface PurchaseOrderStats {
  totalOrders: number
  totalAmount: number
  pendingOrders: number
  receivedOrders: number
  averageOrderValue: number
  topSuppliers: Array<{
    supplier: Supplier
    orderCount: number
    totalAmount: number
  }>
  monthlyTrends: Array<{
    month: string
    orderCount: number
    totalAmount: number
  }>
}

// Types pour l'audit et l'historique
export interface PurchaseOrderAuditLog {
  id: string
  action: string
  entityType: 'PURCHASE_ORDER' | 'PURCHASE_ORDER_ITEM' | 'GOODS_RECEPTION'
  entityId: string
  entityData?: string
  previousData?: string
  changes?: string
  userId?: string
  user?: {
    firstName: string
    lastName: string
    email: string
  }
  companyId: string
  timestamp: string
}

// Types pour les réponses API
export interface PurchaseOrderResponse {
  success: boolean
  data: PurchaseOrder
  message?: string
}

export interface PurchaseOrderListResponse {
  success: boolean
  data: PurchaseOrder[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  message?: string
}

export interface PurchaseOrderStatsResponse {
  success: boolean
  data: PurchaseOrderStats
  message?: string
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
  salesperson?: {
    id: string
    name: string
    email?: string
  }
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

export interface DashboardActivityItem {
  id: string
  type: string
  title: string
  description: string
  timestamp: string
  user?: string
}

export interface DashboardAlert {
  id: string
  type: 'critical' | 'warning' | 'info'
  title: string
  message: string
  count?: number
  priority?: string
}

// Types pour Analytics Phase 5
export interface KpiTargetSettings {
  revenueTarget: number | null
  ordersTarget: number | null
  clientsTarget: number | null
  conversionRateTarget: number | null
  updatedAt: string | null
  hasConfiguredTargets: boolean
}

export interface UpdateKpiTargetSettingsPayload {
  revenueTarget: number | null
  ordersTarget: number | null
  clientsTarget: number | null
  conversionRateTarget: number | null
}

export interface KPIMetrics {
  revenue: {
    current: number
    target: number | null
    growth: number | null
    targetConfigured: boolean
    currency: string
  }
  orders: {
    current: number
    target: number | null
    growth: number | null
    targetConfigured: boolean
    pending: number
  }
  clients: {
    current: number
    target: number | null
    growth: number | null
    targetConfigured: boolean
    newThisMonth: number
  }
  conversion: {
    rate: number
    target: number | null
    growth: number | null
    targetConfigured: boolean
    quotes: number
    convertedQuotes: number
  }
  products: {
    total: number
    lowStock: number
    outOfStock: number
    soldThisMonth: number
  }
  invoices: {
    total: number
    overdue: number
    paid: number
  }
  alerts: {
    lowStock: number
    overdueInvoices: number
    pendingOrders: number
  }
  lastUpdated: string
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

/**
 * Lit une réponse HTTP sans supposer que le backend renvoie toujours du JSON.
 * Cela évite d'exposer une erreur technique de parsing dans l'UI de connexion.
 */
async function parseJsonResponse<T>(response: Response): Promise<T | null> {
  const rawBody = await response.text()

  if (!rawBody) {
    return null
  }

  try {
    return JSON.parse(rawBody) as T
  } catch {
    return null
  }
}

/**
 * Convertit les erreurs techniques du navigateur/API en message exploitable
 * pour l'utilisateur final sur l'écran de connexion.
 */
function normalizeLoginErrorMessage(error: unknown): string {
  const fallbackMessage = 'Erreur de connexion. Veuillez réessayer.'
  const rawMessage = error instanceof Error ? error.message.trim() : ''

  if (!rawMessage) {
    return fallbackMessage
  }

  const httpErrorMatch = rawMessage.match(/^HTTP\s+(\d{3}):\s*(.+)$/i)
  if (httpErrorMatch) {
    const [, statusCode, backendMessage] = httpErrorMatch
    const cleanedBackendMessage = backendMessage.trim()

    if (cleanedBackendMessage) {
      return cleanedBackendMessage
    }

    if (statusCode === '401') {
      return 'Email ou mot de passe incorrect.'
    }

    if (statusCode.startsWith('5')) {
      return 'Erreur serveur lors de la connexion. Veuillez réessayer plus tard.'
    }

    return fallbackMessage
  }

  const normalizedMessage = rawMessage.toLowerCase()
  if (
    normalizedMessage === 'failed to fetch' ||
    normalizedMessage.includes('networkerror') ||
    normalizedMessage.includes('load failed') ||
    normalizedMessage.includes('fetch failed')
  ) {
    return 'Impossible de joindre le serveur de connexion. Vérifiez que le backend est démarré et que la configuration réseau/CORS est correcte.'
  }

  return rawMessage
}

// Configuration d'Axios
class ApiClient {
  private client: AxiosInstance
  private authToken: string | null = null

  constructor() {
    this.client = axios.create({
      // Laisser axios utiliser des URLs relatives si aucune base publique n'est
      // fournie. Les méthodes existantes utilisent déjà /api/v1/... comme chemin.
      baseURL: API_BASE_URL || undefined,
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

  private normalizeSupplier(supplier: any): Supplier {
    const tags = Array.isArray(supplier?.tags)
      ? supplier.tags
      : typeof supplier?.tags === 'string' && supplier.tags.length > 0
        ? supplier.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
        : []

    const purchasesCount = Number(supplier?.purchasesCount ?? 0)
    const productsCount = Number(supplier?.productsCount ?? purchasesCount)
    const products = Array.isArray(supplier?.products)
      ? supplier.products
          .filter((product: unknown) => product && typeof product === 'object')
          .map((product: any) => ({
            id: String(product?.id ?? ''),
            name: String(product?.name ?? ''),
            sku: product?.sku ? String(product.sku) : '',
            price: product?.price !== undefined ? Number(product.price) : undefined,
            stockQuantity: product?.stockQuantity !== undefined ? Number(product.stockQuantity) : undefined,
            isActive: product?.isActive !== undefined ? Boolean(product.isActive) : undefined,
          }))
      : []

    return {
      id: String(supplier?.id ?? ''),
      type: supplier?.type === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'COMPANY',
      name: supplier?.name ?? '',
      contactName: supplier?.contactName ?? '',
      email: supplier?.email ?? '',
      phone: supplier?.phone ?? '',
      mobile: supplier?.mobile ?? '',
      website: supplier?.website ?? '',
      fax: supplier?.fax ?? '',
      address: supplier?.address ?? '',
      postalCode: supplier?.postalCode ?? '',
      city: supplier?.city ?? '',
      country: supplier?.country ?? 'Algérie',
      siret: supplier?.siret ?? '',
      vatNumber: supplier?.vatNumber ?? '',
      rcs: supplier?.rcs ?? '',
      paymentTerms: Number(supplier?.paymentTerms ?? 30),
      discount: Number(supplier?.discount ?? 0),
      currency: supplier?.currency ?? 'DZD',
      rating: Number(supplier?.rating ?? 0),
      isActive: supplier?.isActive ?? true,
      isPreferred: supplier?.isPreferred ?? false,
      notes: supplier?.notes ?? '',
      deliveryTerms: supplier?.deliveryTerms ?? '',
      tags,
      productsCount,
      purchasesCount,
      products,
      createdAt: supplier?.createdAt ?? new Date().toISOString(),
      updatedAt: supplier?.updatedAt ?? new Date().toISOString(),
    }
  }

  /**
   * Déplie de manière défensive les enveloppes API imbriquées du type
   * `{ success, data }`.
   *
   * Pourquoi : certaines routes ou couches proxy peuvent renvoyer un objet déjà
   * enveloppé dans `data`. Sans ce dépliage, `normalizeSupplier(...)` reçoit le
   * mauvais niveau d'objet et remplit la fiche avec des valeurs par défaut
   * (`Sans nom`, `Algérie`, `30 jours`, `DZD`, etc.).
   */
  private unwrapApiEnvelope<T>(value: unknown): T {
    let current = value

    while (
      current &&
      typeof current === 'object' &&
      'success' in current &&
      'data' in current
    ) {
      current = (current as { data?: unknown }).data
    }

    return current as T
  }

  private normalizeSuppliersResponse(
    response: ApiResponse<PaginatedResponse<any>>
  ): ApiResponse<PaginatedResponse<Supplier>> {
    const payload = this.unwrapApiEnvelope<PaginatedResponse<any> | any[]>(response.data)
    const normalizedPayload = payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload
      : { data: Array.isArray(payload) ? payload : [] }

    return {
      ...response,
      data: {
        ...normalizedPayload,
        data: Array.isArray(normalizedPayload.data)
          ? normalizedPayload.data.map((supplier) => this.normalizeSupplier(supplier))
          : [],
      },
    }
  }

  private normalizeSupplierResponse(response: ApiResponse<any>): ApiResponse<Supplier> {
    const payload = this.unwrapApiEnvelope(response.data)

    return {
      ...response,
      data: this.normalizeSupplier(payload),
    }
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

  async getDashboardActivity(limit = 8): Promise<ApiResponse<DashboardActivityItem[]>> {
    return this.request<ApiResponse<DashboardActivityItem[]>>({
      method: 'GET',
      url: '/api/v1/dashboard/activity',
      params: { limit },
    })
  }

  async getDashboardAlerts(): Promise<ApiResponse<DashboardAlert[]>> {
    return this.request<ApiResponse<DashboardAlert[]>>({
      method: 'GET',
      url: '/api/v1/dashboard/alerts',
    })
  }

  // Analytics Phase 5
  async getKPIMetrics(): Promise<ApiResponse<KPIMetrics>> {
    return this.request<ApiResponse<KPIMetrics>>({
      method: 'GET',
      url: '/api/v1/analytics/kpi',
    })
  }

  async getKpiTargetSettings(): Promise<ApiResponse<KpiTargetSettings>> {
    return this.request<ApiResponse<KpiTargetSettings>>({
      method: 'GET',
      url: '/api/v1/settings/kpi-targets',
    })
  }

  async updateKpiTargetSettings(data: UpdateKpiTargetSettingsPayload): Promise<ApiResponse<KpiTargetSettings>> {
    return this.request<ApiResponse<KpiTargetSettings>>({
      method: 'PUT',
      url: '/api/v1/settings/kpi-targets',
      data,
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
  async getCategories(): Promise<ApiResponse<Category[]>> {
    return this.request<ApiResponse<Category[]>>({
      method: 'GET',
      url: '/api/v1/categories',
    })
  }

  async createCategory(data: CategoryWriteInput): Promise<ApiResponse<Category>> {
    return this.requestWithoutRetry<ApiResponse<Category>>({
      method: 'POST',
      url: '/api/v1/categories',
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || undefined,
        parentId: data.parentId || undefined,
      },
    })
  }

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

  private normalizeProductWritePayload(data: ProductWriteInput) {
    return {
      name: data.name,
      sku: data.sku?.trim() || undefined,
      barcode: data.barcode?.trim() || undefined,
      description: data.description?.trim() || undefined,
      categoryId: data.categoryId || undefined,
      price: Number(data.price ?? 0),
      cost: data.costPrice,
      vatRate: data.vatRate ?? 20,
      stockQuantity: data.stockQuantity ?? data.stock ?? 0,
      minStock: data.minStock ?? 0,
      maxStock: data.maxStock ?? undefined,
      unit: data.unit || 'pièce',
      isActive: data.isActive ?? true,
      isService: data.isService ?? false,
      // Le backend local ne persiste pas encore ces deux indicateurs,
      // on ne les envoie donc pas pour éviter les écarts de contrat API.
    }
  }

  async createProduct(data: ProductWriteInput): Promise<ApiResponse<Product>> {
    const backendData = this.normalizeProductWritePayload(data)

    // Sécurité importante : une création produit est une opération non idempotente.
    // On évite donc tout retry automatique pour ne pas risquer une double création
    // suivie d'une erreur de contrainte unique côté backend.
    return this.requestWithoutRetry<ApiResponse<Product>>({
      method: 'POST',
      url: '/api/v1/products',
      data: backendData,
    })
  }

  async updateProduct(id: string, data: Partial<ProductWriteInput>): Promise<ApiResponse<Product>> {
    const backendData = this.normalizeProductWritePayload(data as ProductWriteInput)

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
    const response = await this.request<ApiResponse<PaginatedResponse<Supplier>>>({
      method: 'GET',
      url: '/api/v1/suppliers',
      params,
    })

    return this.normalizeSuppliersResponse(response)
  }

  async getSupplier(id: string): Promise<ApiResponse<Supplier>> {
    const response = await this.request<ApiResponse<Supplier>>({
      method: 'GET',
      url: `/api/v1/suppliers/${id}`,
    })

    return this.normalizeSupplierResponse(response)
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
    // Le backend attend les données en camelCase, pas de transformation nécessaire
    const backendData = {
      type: data.type,
      name: data.name,
      contactName: data.contactName,
      email: data.email,
      phone: data.phone,
      mobile: data.mobile,
      website: data.website,
      fax: data.fax,
      address: data.address,
      postalCode: data.postalCode,
      city: data.city,
      country: data.country,
      siret: data.siret,
      vatNumber: data.vatNumber,
      rcs: data.rcs,
      paymentTerms: data.paymentTerms,
      discount: data.discount,
      currency: data.currency,
      rating: data.rating,
      isActive: data.isActive !== false,
      isPreferred: data.isPreferred || false,
      notes: data.notes,
      tags: data.tags
    }

    const response = await this.request<ApiResponse<Supplier>>({
      method: 'POST',
      url: '/api/v1/suppliers',
      data: backendData,
    })

    return this.normalizeSupplierResponse(response)
  }

  async updateSupplier(id: string, data: Partial<Supplier>): Promise<ApiResponse<Supplier>> {
    // Le backend attend les données en camelCase, pas de transformation nécessaire
    const backendData = {
      type: data.type,
      name: data.name,
      contactName: data.contactName,
      email: data.email,
      phone: data.phone,
      mobile: data.mobile,
      website: data.website,
      fax: data.fax,
      address: data.address,
      postalCode: data.postalCode,
      city: data.city,
      country: data.country,
      siret: data.siret,
      vatNumber: data.vatNumber,
      rcs: data.rcs,
      paymentTerms: data.paymentTerms,
      discount: data.discount,
      currency: data.currency,
      rating: data.rating,
      isActive: data.isActive,
      isPreferred: data.isPreferred,
      notes: data.notes,
      tags: data.tags
    }

    const response = await this.request<ApiResponse<Supplier>>({
      method: 'PUT',
      url: `/api/v1/suppliers/${id}`,
      data: backendData,
    })

    return this.normalizeSupplierResponse(response)
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

  async deleteQuote(id: string): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>({
      method: 'DELETE',
      url: `/api/v1/quotes/${id}`,
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
      console.log('🔍 API Base URL:', API_BASE_URL || '[same-origin via Next.js rewrite]')

      // Utiliser une URL relative par défaut évite les erreurs CORS côté
      // navigateur et laisse Next.js proxyfier la requête vers le backend.
      const response = await fetch(buildApiUrl('/api/v1/auth/login'), {
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

      // Parser de façon tolérante pour éviter qu'une réponse vide/HTML masque
      // l'erreur métier de connexion côté utilisateur.
      const data = await parseJsonResponse<ApiResponse<any>>(response)
      console.log('🔍 Response data:', data)

      if (!response.ok) {
        const errorMessage = data?.message || data?.error || 'Erreur de connexion'
        throw new Error(`HTTP ${response.status}: ${errorMessage}`)
      }

      if (!data) {
        throw new Error('Réponse invalide du serveur de connexion.')
      }

      return data
    } catch (error) {
      console.error('❌ Login error:', error)

      // Normaliser avant de propager au store pour éviter l'affichage de
      // messages techniques comme "Failed to fetch".
      throw new Error(normalizeLoginErrorMessage(error))
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

      // Même stratégie que le login : passer par le proxy Next.js par défaut.
      const response = await fetch(buildApiUrl('/api/v1/auth/register'), {
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
