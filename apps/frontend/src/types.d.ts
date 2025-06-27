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
    category?: string | Category;
    supplierId?: string;
    supplier?: Supplier;
    images?: ProductImage[];
    trackStock?: boolean;
    allowBackorder?: boolean;
    createdAt: string;
    updatedAt: string;
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
    deliveryTerms?: string;
    createdAt?: string;
    updatedAt?: string;
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
    clientId: string;
    client?: Client;
    status: string;
    totalHT: number;
    totalTTC: number;
    totalVAT: number;
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
    totalHT: number;
    totalTTC: number;
    totalVAT: number;
    total?: number;
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
    createProduct(data: Partial<Product>): Promise<ApiResponse<Product>>;
    updateProduct(id: string, data: Partial<Product>): Promise<ApiResponse<Product>>;
    deleteProduct(id: string): Promise<ApiResponse<void>>;
    
    // Méthodes pour les commandes
    getOrder(id: string): Promise<ApiResponse<Order>>;
    getOrders(params?: any): Promise<ApiResponse<PaginatedResponse<Order>>>;
    createOrder(data: Partial<Order>): Promise<ApiResponse<Order>>;
    updateOrder(id: string, data: Partial<Order>): Promise<ApiResponse<Order>>;
    deleteOrder(id: string): Promise<ApiResponse<void>>;
    
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
    getSalesStats(period?: string): Promise<ApiResponse<any>>;
    getClientStats(period?: string): Promise<ApiResponse<any>>;
    getProductStats(period?: string): Promise<ApiResponse<any>>;
    
    // Méthodes pour les analyses
    getSalesAnalytics(params?: { period?: string }): Promise<ApiResponse<SalesAnalytics>>;
    getEvolutionData(params: { metric: string; period?: string }): Promise<ApiResponse<EvolutionData>>;
    getClientAnalytics(params?: { period?: string }): Promise<ApiResponse<ClientAnalytics>>;
    getKPIMetrics(params?: { period?: string }): Promise<ApiResponse<KPIMetrics>>;
    getProductAnalytics(params?: { period?: string }): Promise<ApiResponse<ProductAnalytics>>;
  };
}

declare module '@/lib/export' {
  export class ExportService {
    static downloadInvoicePDF(invoiceId: string): Promise<void>;
    static downloadClientsExcel(): Promise<void>;
    static downloadProductsExcel(): Promise<void>;
    static downloadOrdersExcel(): Promise<void>;
    static downloadInvoicesExcel(): Promise<void>;
    static downloadClientsPDF(): Promise<void>;
    static downloadProductsPDF(): Promise<void>;
    static downloadOrdersPDF(): Promise<void>;
    static downloadInvoicesPDF(): Promise<void>;
    static downloadSuppliersExcel(): Promise<void>;
    static downloadSuppliersPDF(): Promise<void>;
    static downloadTemplateExcel(type: string): Promise<void>;
    static downloadSalesReportPDF(period: string): Promise<void>;
    static downloadSalesReportExcel(period: string): Promise<void>;
    static checkExportAvailability(): Promise<boolean>;
    
    // Méthodes d'importation
    static validateImportFile(file: File): { isValid: boolean; message?: string };
    static importClientsFromExcel(file: File): Promise<{ success: boolean; message: string; count?: number }>;
    static importProductsFromExcel(file: File): Promise<{ success: boolean; message: string; count?: number }>;
    static importSuppliersFromExcel(file: File): Promise<{ success: boolean; message: string; count?: number }>;
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
  export function safeFilter<T>(array: T[] | null | undefined, predicate: (item: T) => boolean): T[];
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