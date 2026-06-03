// Déclarations de types pour les modules sans définitions de types

declare module '@/lib/api' {
  export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
  }

  export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }

  export interface User {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
    permissions?: string[];
    avatar?: string;
    createdAt: string;
    lastLoginAt?: string;
  }

  export interface Client {
    id: string;
    type: 'COMPANY' | 'INDIVIDUAL';
    name?: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    website?: string;
    fax?: string;
    address?: string;
    postalCode?: string;
    city?: string;
    country?: string;
    notes?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }

  export interface Product {
    id: string;
    name: string;
    description?: string;
    reference?: string;
    sku?: string;
    barcode?: string;
    price: number;
    cost?: number;
    costPrice?: number;
    vatRate: number;
    stockQuantity: number;
    stock?: number;
    minStock: number;
    maxStock?: number;
    isActive: boolean;
    isService: boolean;
    unit: string;
    categoryId?: string;
    category?: Category;
    supplierId?: string;
    supplier?: Supplier;
    images?: ProductImage[];
    trackStock?: boolean;
    allowBackorder?: boolean;
    createdAt: string;
    updatedAt: string;
  }

  export interface ProductWriteInput {
    name: string;
    sku?: string;
    barcode?: string;
    description?: string;
    categoryId?: string;
    price: number;
    costPrice?: number;
    stock?: number;
    stockQuantity?: number;
    minStock?: number;
    maxStock?: number | null;
    unit?: string;
    isActive?: boolean;
    isService?: boolean;
    trackStock?: boolean;
    allowBackorder?: boolean;
    vatRate?: number;
  }

  export interface Category {
    id: string;
    name: string;
    description?: string;
    parentId?: string;
    parent?: Category;
    children?: Category[];
    products?: Product[];
    createdAt: string;
    updatedAt: string;
  }

  export interface CategoryWriteInput {
    name: string;
    description?: string;
    parentId?: string;
  }

  export interface Supplier {
    id: string;
    type: 'COMPANY' | 'INDIVIDUAL';
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    website?: string;
    fax?: string;
    address?: string;
    postalCode?: string;
    city?: string;
    country?: string;
    siret?: string;
    vatNumber?: string;
    rcs?: string;
    paymentTerms?: number;
    discount?: number;
    currency?: string;
    rating?: number;
    isActive: boolean;
    isPreferred: boolean;
    notes?: string;
    tags?: string[];
    productsCount?: number;
    purchasesCount?: number;
    products?: SupplierProductSummary[];
    deliveryTerms?: string;
    createdAt?: string;
    updatedAt?: string;
  }

  export interface SupplierProductSummary {
    id: string;
    name: string;
    sku?: string;
    price?: number;
    stockQuantity?: number;
    isActive?: boolean;
  }

  export type PurchaseOrderStatus = 'DRAFT' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';

  export interface PurchaseOrderItem {
    id: string;
    quantity: number;
    receivedQty: number;
    unitPrice: number;
    total: number;
    productId: string;
    purchaseOrderId: string;
    product: {
      id: string;
      name: string;
      sku: string;
      description?: string;
      unit?: string;
      category?: { id: string; name: string };
    };
    receptionItems?: GoodsReceptionItem[];
    createdAt: string;
    updatedAt: string;
  }

  export interface GoodsReceptionItem {
    id: string;
    quantityReceived: number;
    quantityExpected: number;
    unitCost?: number;
    notes?: string;
    purchaseOrderItemId: string;
    productId: string;
    goodsReceptionId: string;
    product: { id: string; name: string; sku: string };
    purchaseOrderItem: { id: string; quantity: number; unitPrice: number };
    createdAt: string;
    updatedAt: string;
  }

  export interface GoodsReception {
    id: string;
    number: string;
    receptionDate: string;
    notes?: string;
    isComplete: boolean;
    purchaseOrderId: string;
    companyId: string;
    receivedById: string;
    receivedBy: { id: string; firstName: string; lastName: string; email: string };
    items: GoodsReceptionItem[];
    createdAt: string;
    updatedAt: string;
  }

  export interface PurchaseOrder {
    id: string;
    number: string;
    status: PurchaseOrderStatus;
    orderDate: string;
    expectedDate?: string;
    notes?: string;
    subtotal: number;
    taxAmount: number;
    total: number;
    supplierId: string;
    companyId: string;
    createdById: string;
    supplier: {
      id: string;
      name: string;
      email?: string;
      phone?: string;
      contactName?: string;
      address?: string;
      city?: string;
      country?: string;
      paymentTerms?: number;
      currency?: string;
    };
    createdBy: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    items: PurchaseOrderItem[];
    receptions: GoodsReception[];
    createdAt: string;
    updatedAt: string;
  }

  export interface CreatePurchaseOrderItem {
    productId: string;
    quantity: number;
    unitPrice: number;
  }

  export interface CreatePurchaseOrderData {
    supplierId: string;
    orderDate?: string;
    expectedDate?: string;
    notes?: string;
    status?: PurchaseOrderStatus;
    items: CreatePurchaseOrderItem[];
  }

  export interface UpdatePurchaseOrderData {
    supplierId?: string;
    orderDate?: string;
    expectedDate?: string;
    notes?: string;
    status?: PurchaseOrderStatus;
    items?: CreatePurchaseOrderItem[];
  }

  export interface ReceiveGoodsItem {
    purchaseOrderItemId: string;
    productId: string;
    quantityReceived: number;
    quantityExpected: number;
    unitCost?: number;
    notes?: string;
  }

  export interface CreateGoodsReceptionData {
    purchaseOrderId: string;
    receptionDate?: string;
    notes?: string;
    items: ReceiveGoodsItem[];
  }

  export interface PurchaseOrderFilters {
    search?: string;
    supplierId?: string;
    status?: PurchaseOrderStatus;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }

  export interface PurchaseOrderStats {
    totalOrders: number;
    totalAmount: number;
    pendingOrders: number;
    receivedOrders: number;
    averageOrderValue: number;
    topSuppliers: Array<{
      supplier: { id: string; name: string };
      orderCount: number;
      totalAmount: number;
    }>;
    monthlyTrends: Array<{
      month: string;
      orderCount: number;
      totalAmount: number;
    }>;
  }

  export interface PurchaseOrderResponse {
    success: boolean;
    data: PurchaseOrder;
    message?: string;
  }

  export interface PurchaseOrderListResponse {
    success: boolean;
    data: PurchaseOrder[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    message?: string;
  }

  export interface PurchaseOrderStatsResponse {
    success: boolean;
    data: PurchaseOrderStats;
    message?: string;
  }

  export interface KpiTargetSettings {
    revenueTarget: number | null;
    ordersTarget: number | null;
    clientsTarget: number | null;
    conversionRateTarget: number | null;
    updatedAt: string | null;
    hasConfiguredTargets: boolean;
  }

  export interface UpdateKpiTargetSettingsPayload {
    revenueTarget: number | null;
    ordersTarget: number | null;
    clientsTarget: number | null;
    conversionRateTarget: number | null;
  }

  export interface ProductImage {
    id: string;
    url: string;
    alt?: string;
    isPrimary: boolean;
    productId: string;
  }

  export interface Order {
    id: string;
    reference: string;
    number?: string;
    clientId: string;
    client?: Client;
    status: string;
    type?: 'QUOTE' | 'ORDER' | string;
    totalHT: number;
    totalTTC: number;
    totalVAT: number;
    subtotal?: number;
    vatAmount?: number;
    total?: number;
    items: OrderItem[];
    notes?: string;
    createdAt: string;
    updatedAt: string;
    dueDate?: string;
  }

  export interface OrderItem {
    id: string;
    orderId: string;
    productId: string;
    product?: Product;
    quantity: number;
    unitPrice: number;
    totalHT: number;
    vatRate: number;
    totalVAT: number;
    totalTTC: number;
    discount?: number;
  }

  export interface Invoice {
    id: string;
    reference: string;
    number?: string;
    clientId: string;
    client?: Client;
    orderId?: string;
    order?: Order;
    status: string;
    type?: 'INVOICE' | 'CREDIT_NOTE' | 'QUOTE';
    salesperson?: {
      id?: string;
      name?: string;
      email?: string;
    };
    totalHT: number;
    totalTTC: number;
    totalVAT: number;
    total?: number;
    subtotal?: number;
    vatAmount?: number;
    paidAmount?: number;
    paidDate?: string;
    invoiceDate?: string;
    items: InvoiceItem[];
    notes?: string;
    createdAt: string;
    updatedAt: string;
    dueDate?: string;
    paymentDate?: string;
    invoiceDate?: string;
  }

  export interface InvoiceItem {
    id: string;
    invoiceId: string;
    productId: string;
    product?: Product;
    quantity: number;
    unitPrice: number;
    totalHT: number;
    vatRate: number;
    totalVAT: number;
    totalTTC: number;
    discount?: number;
  }

  export const api: {
    getAuthToken(): string | null;
    setAuthToken(token: string): void;
    clearAuthToken(): void;
    logout(): Promise<ApiResponse<void>>;
    refreshToken(refreshToken: string): Promise<ApiResponse<any>>;
    getProfile(): Promise<ApiResponse<any>>;
    login(credentials: { email: string; password: string; rememberMe?: boolean }): Promise<ApiResponse<any>>;
    
    // Méthodes pour les fournisseurs
    getSupplier(id: string): Promise<ApiResponse<Supplier>>;
    getSuppliers(params?: any): Promise<ApiResponse<PaginatedResponse<Supplier>>>;
    createSupplier(data: Partial<Supplier>): Promise<ApiResponse<Supplier>>;
    updateSupplier(id: string, data: Partial<Supplier>): Promise<ApiResponse<Supplier>>;
    deleteSupplier(id: string): Promise<ApiResponse<void>>;
    
    // Méthodes pour les clients
    getClient(id: string): Promise<ApiResponse<Client>>;
    getClients(params?: any): Promise<ApiResponse<PaginatedResponse<Client>>>;
    createClient(data: Partial<Client>): Promise<ApiResponse<Client>>;
    updateClient(id: string, data: Partial<Client>): Promise<ApiResponse<Client>>;
    deleteClient(id: string): Promise<ApiResponse<void>>;
    
    // Méthodes pour les produits
    getProduct(id: string): Promise<ApiResponse<Product>>;
    getProducts(params?: any): Promise<ApiResponse<PaginatedResponse<Product>>>;
    createProduct(data: ProductWriteInput): Promise<ApiResponse<Product>>;
    updateProduct(id: string, data: Partial<ProductWriteInput>): Promise<ApiResponse<Product>>;
    deleteProduct(id: string): Promise<ApiResponse<void>>;
    
    // Méthodes pour les commandes
    getOrder(id: string): Promise<ApiResponse<Order>>;
    getOrders(params?: any): Promise<ApiResponse<PaginatedResponse<Order>>>;
    createOrder(data: Partial<Order>): Promise<ApiResponse<Order>>;
    updateOrder(id: string, data: Partial<Order>): Promise<ApiResponse<Order>>;
    deleteOrder(id: string): Promise<ApiResponse<void>>;
    deleteQuote(id: string): Promise<ApiResponse<void>>;
    
    // Méthodes pour les factures
    getInvoice(id: string): Promise<ApiResponse<Invoice>>;
    getInvoices(params?: any): Promise<ApiResponse<PaginatedResponse<Invoice>>>;
    createInvoice(data: Partial<Invoice>): Promise<ApiResponse<Invoice>>;
    updateInvoice(id: string, data: Partial<Invoice>): Promise<ApiResponse<Invoice>>;
    deleteInvoice(id: string): Promise<ApiResponse<void>>;
    
    // Méthodes pour les catégories
    getCategory(id: string): Promise<ApiResponse<Category>>;
    getCategories(params?: any): Promise<ApiResponse<Category[]>>;
    createCategory(data: Partial<Category>): Promise<ApiResponse<Category>>;
    updateCategory(id: string, data: Partial<Category>): Promise<ApiResponse<Category>>;
    deleteCategory(id: string): Promise<ApiResponse<void>>;
    
    // Méthodes pour le tableau de bord
    getDashboardStats(): Promise<ApiResponse<any>>;
    getDashboardActivity(limit?: number): Promise<ApiResponse<any[]>>;
    getDashboardCharts(): Promise<ApiResponse<any>>;
    getDashboardAlerts(): Promise<ApiResponse<any[]>>;
    getSalesStats(period?: string): Promise<ApiResponse<any>>;
    getClientStats(period?: string): Promise<ApiResponse<any>>;
    getProductStats(period?: string): Promise<ApiResponse<any>>;
    
    // Méthodes pour les analyses
    getSalesAnalytics(params?: { period?: string }): Promise<ApiResponse<SalesAnalytics>>;
    getEvolutionData(params: { metric: string; period?: string }): Promise<ApiResponse<EvolutionData>>;
    getClientAnalytics(params?: { period?: string }): Promise<ApiResponse<ClientAnalytics>>;
    getKPIMetrics(params?: { period?: string }): Promise<ApiResponse<KPIMetrics>>;
    getKpiTargetSettings(): Promise<ApiResponse<KpiTargetSettings>>;
    updateKpiTargetSettings(data: UpdateKpiTargetSettingsPayload): Promise<ApiResponse<KpiTargetSettings>>;
    getProductAnalytics(params?: { period?: string }): Promise<ApiResponse<ProductAnalytics>>;
    
    // Méthodes HTTP standard
    get<T = any>(url: string, config?: any): Promise<{ data: T; status: number }>;
    post<T = any>(url: string, data?: any, config?: any): Promise<{ data: T; status: number }>;
    put<T = any>(url: string, data?: any, config?: any): Promise<{ data: T; status: number }>;
    delete<T = any>(url: string, config?: any): Promise<{ data: T; status: number }>;
    patch<T = any>(url: string, data?: any, config?: any): Promise<{ data: T; status: number }>;
  };
}

declare module '@/lib/export' {
  export class ExportService {
    static downloadInvoicePDF(invoiceId: string): Promise<void>;
    static downloadClientsExcel(params?: Record<string, any>): Promise<void>;
    static downloadProductsExcel(params?: Record<string, any>): Promise<void>;
    static downloadOrdersExcel(params?: Record<string, any>): Promise<void>;
    static downloadInvoicesExcel(params?: Record<string, any>): Promise<void>;
    static downloadClientsPDF(params?: Record<string, any>): Promise<void>;
    static downloadProductsPDF(params?: Record<string, any>): Promise<void>;
    static downloadOrdersPDF(params?: Record<string, any>): Promise<void>;
    static downloadOrderPDF(orderId: string): Promise<void>;
    static downloadInvoicesPDF(params?: Record<string, any>): Promise<void>;
    static downloadSuppliersExcel(params?: Record<string, any>): Promise<void>;
    static downloadSuppliersPDF(params?: Record<string, any>): Promise<void>;
    static downloadTemplateExcel(type: string): Promise<void>;
    static downloadSalesReportPDF(period: string): Promise<void>;
    static downloadSalesReportExcel(period: string): Promise<void>;
    static checkExportAvailability(): Promise<boolean>;
    
    // Méthodes d'importation
    static validateImportFile(file: File): { isValid: boolean; message?: string };
    static importClientsFromExcel(file: File): Promise<{ success: boolean; message: string; count?: number }>;
    static importProductsFromExcel(file: File): Promise<{ success: boolean; message: string; count?: number }>;
    static importSuppliersFromExcel(file: File): Promise<{ success: boolean; message: string; count?: number }>;
    static importOrdersFromExcel(file: File): Promise<{ success: boolean; message: string; count?: number }>;
    static importInvoicesFromExcel(file: File): Promise<{ success: boolean; message: string; count?: number }>;
    static downloadImportTemplate(type: 'clients' | 'products' | 'suppliers'): Promise<void>;
  }
}

declare module '@/lib/defensive-utils' {
  export interface ValidationResult<T> {
    isValid: boolean;
    data: T;
    error?: string;
  }

  export function safeTextRender(text: string | null | undefined, fallback?: string): string;
  export function withRetry<T>(fn: () => Promise<T>, options?: { retries?: number; delay?: number }): Promise<T>;
  export function validateApiResponse<T>(apiResponse: any): ValidationResult<T | null>;
  export function validateApiArrayResponse<T>(apiResponse: any): ValidationResult<T[]>;
  
  // Fonctions utilitaires supplémentaires
  export function ensureArray<T>(value: T | T[] | null | undefined): T[];
  export function extractCollection<T>(value: unknown): T[];
  export function safeFilter<T>(array: T[] | null | undefined, predicate: (item: T) => boolean): T[];
  export function safeFind<T>(array: T[] | null | undefined, predicate: (item: T) => boolean): T | undefined;
  export function safeMap<T, U>(array: T[] | null | undefined, mapper: (item: T, index: number) => U): U[];
  export function safeFormatCurrency(amount: number | string | null | undefined, fallback?: string): string;
  export function safeFormatDate(date: string | Date | null | undefined, fallback?: string): string;
  export function safeParseInt(value: string | number | null | undefined, fallback?: number): number;
  export function safeParseFloat(value: string | number | null | undefined, fallback?: number): number;
  export function safeStringify(obj: any, fallback?: string): string;
  export function safeJSONParse<T>(json: string | null | undefined, fallback?: T): T;
}

declare module '@/lib/utils' {
  import { type ClassValue } from 'clsx';
  
  export function cn(...inputs: ClassValue[]): string;
  export function formatCurrency(amount: number, currency?: string): string;
  export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string;
  export function formatDateTime(date: string | Date): string;
  export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void;
  export function isValidEmail(email: string): boolean;
  export function generateId(): string;
  export function truncateText(text: string, maxLength: number): string;
  export function capitalizeFirst(str: string): string;
  export function getInitials(name: string): string;
}
