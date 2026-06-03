declare module '@/lib/api' {
  export interface SalesAnalytics {
    monthlyRevenue: Array<{
      month: string;
      revenue: number;
      invoiceCount: number;
    }>;
    topClients: Array<{
      id: string;
      name: string;
      totalSpent: number;
      invoiceCount: number;
    }>;
    clientTypeDistribution: Array<{
      type: string;
      count: number;
      percentage: number;
    }>;
    averageOrderValue: number;
    totalRevenue: number;
    totalInvoices: number;
  }

  export interface EvolutionData {
    data: Array<{
      date: string;
      value: number;
    }>;
    trend: 'up' | 'down' | 'stable';
    percentage: number;
  }

  export interface ClientAnalytics {
    totalClients: number;
    activeClients: number;
    newClients: number;
    churnRate: number;
    segmentation: Array<{
      segment: string;
      clientCount: number;
      segmentRevenue: number;
      avgRevenue: number;
      count: number;
      percentage: number;
    }>;
    mostActiveClients: Array<{
      id: string;
      name: string;
      type: 'COMPANY' | 'INDIVIDUAL';
      city?: string;
      invoiceCount: number;
      totalRevenue: number;
      lastInvoiceDate: string;
      orderCount: number;
      totalSpent: number;
    }>;
    geographicDistribution: Array<{
      city: string;
      clientCount: number;
      totalRevenue: number;
    }>;
    clientGrowth: Array<{
      month: string;
      newClients: number;
      churnedClients: number;
    }>;
  }

  export interface KPIMetrics {
    revenue: {
      current: number;
      target: number | null;
      growth: number | null;
      targetConfigured: boolean;
      currency: string;
    };
    orders: {
      current: number;
      target: number | null;
      growth: number | null;
      targetConfigured: boolean;
      pending: number;
    };
    clients: {
      current: number;
      target: number | null;
      growth: number | null;
      targetConfigured: boolean;
      newThisMonth: number;
    };
    conversion: {
      rate: number;
      target: number | null;
      growth: number | null;
      targetConfigured: boolean;
      quotes: number;
      convertedQuotes: number;
    };
    products: {
      total: number;
      lowStock: number;
      outOfStock: number;
      soldThisMonth: number;
    };
    invoices: {
      total: number;
      overdue: number;
      paid: number;
    };
    alerts: {
      lowStock: number;
      overdueInvoices: number;
      pendingOrders: number;
    };
    lastUpdated: string;
  }

  export interface ProductAnalytics {
    totalProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    topProducts: Array<{
      id: string;
      name: string;
      totalQuantity: number;
      totalRevenue: number;
      category?: string;
      price?: number;
      invoiceCount?: number;
    }>;
    categoryDistribution: Array<{
      category: string | { name: string };
      count: number;
      percentage: number;
      revenue?: number;
      totalRevenue?: number;
      quantity?: number;
      productCount?: number;
    }>;
    stockStatus: {
      inStock: number;
      lowStock: number;
      outOfStock: number;
    };
  }
}
