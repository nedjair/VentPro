import type { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import DashboardPage from '@/app/dashboard/page'
import { Sidebar } from '@/components/layout/sidebar'

const {
  getDashboardStatsMock,
  getInvoicesMock,
  getProductAnalyticsMock,
  getOrdersMock,
  getSalesAnalyticsMock,
  logoutMock,
  toggleThemeMock,
} = vi.hoisted(() => ({
  getDashboardStatsMock: vi.fn(),
  getInvoicesMock: vi.fn(),
  getProductAnalyticsMock: vi.fn(),
  getOrdersMock: vi.fn(),
  getSalesAnalyticsMock: vi.fn(),
  logoutMock: vi.fn(),
  toggleThemeMock: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}))

vi.mock('@/components/layout/main-layout', () => ({
  // Le mock expose les props visibles du layout pour figer les libellés métier.
  MainLayout: ({ children, title, subtitle, actions }: { children: ReactNode; title: string; subtitle?: string; actions?: ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
      {actions}
      {children}
    </div>
  ),
}))

vi.mock('@/lib/api', () => ({
  api: {
    getDashboardStats: getDashboardStatsMock,
    getInvoices: getInvoicesMock,
    getProductAnalytics: getProductAnalyticsMock,
    getOrders: getOrdersMock,
    getSalesAnalytics: getSalesAnalyticsMock,
  },
}))

vi.mock('@/stores/auth', () => ({
  useAuth: () => ({
    user: { firstName: 'Admin', lastName: 'User', email: 'admin@example.com', role: 'ADMIN' },
    logout: logoutMock,
  }),
}))

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    resolvedTheme: 'light',
    toggleTheme: toggleThemeMock,
  }),
}))

describe('Dashboard labels', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Données minimales mais réalistes pour laisser la page se rendre normalement.
    getDashboardStatsMock.mockResolvedValue({
      success: true,
      data: {
        clients: { total: 8, individuals: 0, companies: 8, recentCount: 2, growth: 12.5 },
        products: { total: 10, inStock: 8, lowStock: 1, outOfStock: 2, totalStockValue: 25000 },
        sales: { currentMonth: 120000, previousMonth: 100000, growth: 20, currency: 'DZD' },
        orders: { total: 5, pending: 1, accepted: 4, rejected: 0, averageValue: 30000 },
        invoices: { total: 6, paid: 3, pending: 2, overdue: 1, totalAmount: 180000, paidAmount: 90000, pendingAmount: 45000 },
        lastUpdated: '2026-03-07T10:00:00.000Z',
      },
    })

    getProductAnalyticsMock.mockResolvedValue({
      success: true,
      data: {
        period: '3m',
        topProducts: [
          { id: 'product-1', name: 'Ordinateur portable Pro', category: 'Informatique', price: 150000, totalQuantity: 30, totalRevenue: 4500000, invoiceCount: 12, avgPrice: 150000 },
          { id: 'product-2', name: 'Imprimante laser', category: 'Bureautique', price: 50000, totalQuantity: 24, totalRevenue: 1200000, invoiceCount: 8, avgPrice: 50000 },
          { id: 'product-3', name: 'Routeur Wi-Fi', category: 'Réseau', price: 18000, totalQuantity: 21, totalRevenue: 378000, invoiceCount: 7, avgPrice: 18000 },
        ],
        categoryDistribution: [
          { category: 'Informatique', totalQuantity: 30, totalRevenue: 4500000, productCount: 1 },
          { category: 'Bureautique', totalQuantity: 24, totalRevenue: 1200000, productCount: 1 },
          { category: 'Réseau', totalQuantity: 21, totalRevenue: 378000, productCount: 1 },
        ],
      },
    })

    getOrdersMock.mockResolvedValue({
      success: true,
      data: {
        data: [
          {
            id: 'order-1',
            number: 'CMD-0041',
            type: 'ORDER',
            status: 'ACCEPTED',
            clientId: 'client-1',
            client: { id: 'client-1', type: 'COMPANY', companyName: 'SARL Technoplus', email: 'contact@technoplus.dz', createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z' },
            orderDate: '2026-03-07T00:00:00.000Z',
            subtotal: 67500,
            vatAmount: 0,
            total: 67500,
            discount: 0,
            items: [{ productId: 'product-1', quantity: 1, unitPrice: 67500, vatRate: 0, discount: 0, product: { id: 'product-1', name: 'Ramette papier A4 x90', sku: 'RAM-A4', price: 67500, stockQuantity: 10, minStockLevel: 1, categoryId: 'cat-1', active: true, createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z' } }],
            createdAt: '2026-03-07T00:00:00.000Z',
            updatedAt: '2026-03-07T00:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 5,
        totalPages: 1,
      },
    })

    getInvoicesMock.mockResolvedValue({
      success: true,
      data: {
        data: [
          {
            id: 'invoice-1',
            number: 'FAC-202603-0001',
            type: 'INVOICE',
            status: 'PAID',
            salesperson: { id: 'user-1', name: 'Nadia Benali', email: 'nadia@example.com' },
            clientId: 'client-1',
            client: { id: 'client-1', type: 'COMPANY', companyName: 'SARL Technoplus', email: 'contact@technoplus.dz', country: 'Algérie', address: 'Alger, Algérie', createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z' },
            invoiceDate: '2026-03-07T00:00:00.000Z',
            dueDate: '2026-03-20T00:00:00.000Z',
            paidDate: '2026-03-15T00:00:00.000Z',
            subtotal: 150000,
            vatAmount: 0,
            total: 150000,
            paidAmount: 150000,
            discount: 0,
            items: [{ productId: 'product-1', quantity: 1, unitPrice: 150000, vatRate: 0, discount: 0, product: { id: 'product-1', name: 'Ordinateur portable Pro', sku: 'LAP-PRO', price: 150000, stockQuantity: 10, minStockLevel: 1, categoryId: 'cat-1', active: true, createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z' } }],
            createdAt: '2026-03-07T00:00:00.000Z',
            updatedAt: '2026-03-07T00:00:00.000Z',
          },
          {
            id: 'invoice-2',
            number: 'FAC-202603-0002',
            type: 'INVOICE',
            status: 'PARTIAL',
            salesperson: { id: 'user-2', name: 'Karim Touati', email: 'karim@example.com' },
            clientId: 'client-2',
            client: { id: 'client-2', type: 'COMPANY', companyName: 'Bureautique Plus', email: 'contact@bureautique.dz', country: 'Tunisie', address: 'Tunis, Tunisie', createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z' },
            invoiceDate: '2026-03-06T00:00:00.000Z',
            dueDate: '2026-03-25T00:00:00.000Z',
            subtotal: 90000,
            vatAmount: 0,
            total: 90000,
            paidAmount: 45000,
            discount: 0,
            items: [{ productId: 'product-2', quantity: 1, unitPrice: 90000, vatRate: 0, discount: 0, product: { id: 'product-2', name: 'Imprimante laser', sku: 'IMP-LZR', price: 90000, stockQuantity: 10, minStockLevel: 1, categoryId: 'cat-2', active: true, createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z' } }],
            createdAt: '2026-03-06T00:00:00.000Z',
            updatedAt: '2026-03-06T00:00:00.000Z',
          },
        ],
        total: 2,
        page: 1,
        limit: 50,
        totalPages: 1,
      },
    })

    getSalesAnalyticsMock.mockResolvedValue({
      success: true,
      data: {
        period: '6m',
        monthlyRevenue: [
          { month: '2025-10', revenue: 65000, invoiceCount: 2, avgInvoice: 32500 },
          { month: '2025-11', revenue: 82000, invoiceCount: 2, avgInvoice: 41000 },
          { month: '2025-12', revenue: 91000, invoiceCount: 2, avgInvoice: 45500 },
          { month: '2026-01', revenue: 104000, invoiceCount: 2, avgInvoice: 52000 },
          { month: '2026-02', revenue: 141000, invoiceCount: 2, avgInvoice: 70500 },
          { month: '2026-03', revenue: 177000, invoiceCount: 2, avgInvoice: 88500 },
        ],
        topClients: [],
        clientTypeDistribution: [],
      },
    })
  })

  it('renders the French dashboard labels and keeps old wording out of the page', async () => {
    render(<DashboardPage />)

    await waitFor(() => {
      expect(getDashboardStatsMock).toHaveBeenCalledTimes(1)
    })

    expect(screen.getByRole('heading', { name: 'Tableau de bord' })).toBeInTheDocument()
    expect(screen.getByText('Ventes')).toBeInTheDocument()
    expect(screen.getByText('Produits')).toBeInTheDocument()
    expect(screen.getByText('Finances')).toBeInTheDocument()
    expect(screen.queryByText('Rapports des ventes')).not.toBeInTheDocument()
    expect(screen.getByText('Prédiction commerciale')).toBeInTheDocument()
    expect(screen.getByText('Top produits')).toBeInTheDocument()
    expect(screen.getByText('Commandes récentes')).toBeInTheDocument()
    expect(screen.queryByText('Actualiser')).not.toBeInTheDocument()
    expect(screen.queryByText('Exporter les données')).not.toBeInTheDocument()
    expect(screen.queryByText('Ouvrir les rapports')).not.toBeInTheDocument()
    expect(screen.queryByText('Pilotage commercial')).not.toBeInTheDocument()
    expect(screen.queryByText('Forecast commercial inspiré Odoo')).not.toBeInTheDocument()
    expect(screen.queryByText('Actions métiers')).not.toBeInTheDocument()
    expect(screen.queryByText('Alertes prioritaires')).not.toBeInTheDocument()
    expect(screen.queryByText('Activité récente')).not.toBeInTheDocument()
    expect(screen.queryByText(/odoo/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Temps réel')).not.toBeInTheDocument()
  })

  it('renders the products angle with rankings and charts', async () => {
    render(<DashboardPage />)

    await waitFor(() => {
      expect(getDashboardStatsMock).toHaveBeenCalledTimes(1)
    })

    fireEvent.click(screen.getByText('Produits'))

    await waitFor(() => {
      expect(getProductAnalyticsMock).toHaveBeenCalled()
    })

    expect(screen.getByText('Classement des 3 meilleurs produits')).toBeInTheDocument()
    expect(screen.getByText('Classement des 3 meilleures catégories')).toBeInTheDocument()
    expect(screen.getByText("Meilleures ventes par chiffre d'affaires")).toBeInTheDocument()
    expect(screen.getByText('Meilleures ventes par unités vendues')).toBeInTheDocument()
    expect(screen.getAllByText('Ordinateur portable Pro').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Informatique').length).toBeGreaterThan(0)
    expect(screen.getAllByText('30').length).toBeGreaterThan(0)
    expect(screen.getAllByText('1 produit(s) concernés').length).toBeGreaterThan(0)
  })

  it('renders the finance angle with invoice reports', async () => {
    render(<DashboardPage />)

    await waitFor(() => {
      expect(getDashboardStatsMock).toHaveBeenCalledTimes(1)
    })

    fireEvent.click(screen.getByText('Finances'))

    expect(screen.getByText('Meilleures factures')).toBeInTheDocument()
    expect(screen.getByText('Facturé par mois')).toBeInTheDocument()
    expect(screen.getByText('Meilleurs pays')).toBeInTheDocument()
    expect(screen.getByText('Meilleures catégories')).toBeInTheDocument()
    expect(screen.getByText('Commercial')).toBeInTheDocument()
    expect(screen.getByText('FAC-202603-0001')).toBeInTheDocument()
    expect(screen.getByText('Nadia Benali')).toBeInTheDocument()
    expect(screen.getByText('Algérie')).toBeInTheDocument()
    expect(screen.getByText('Informatique')).toBeInTheDocument()
  })

  it('uses the category distribution returned by analytics for category rankings', async () => {
    getProductAnalyticsMock.mockResolvedValueOnce({
      success: true,
      data: {
        period: '3m',
        topProducts: [
          { id: 'product-1', name: 'Produit A', category: 'Catégorie A', price: 1000, totalQuantity: 2, totalRevenue: 2000, invoiceCount: 1, avgPrice: 1000 },
          { id: 'product-2', name: 'Produit B', category: 'Catégorie B', price: 1000, totalQuantity: 1, totalRevenue: 1000, invoiceCount: 1, avgPrice: 1000 },
        ],
        categoryDistribution: [
          { category: 'Catégorie corrigée', totalQuantity: 9, totalRevenue: 9000, productCount: 3 },
          { category: 'Catégorie B', totalQuantity: 1, totalRevenue: 1000, productCount: 1 },
        ],
      },
    })

    render(<DashboardPage />)

    await waitFor(() => {
      expect(getDashboardStatsMock).toHaveBeenCalledTimes(1)
    })

    fireEvent.click(screen.getByText('Produits'))

    await waitFor(() => {
      expect(getProductAnalyticsMock).toHaveBeenCalled()
    })

    expect(screen.getAllByText('Catégorie corrigée').length).toBeGreaterThan(0)
    expect(screen.getAllByText('3 produit(s) concernés').length).toBeGreaterThan(0)
    expect(screen.getAllByText('9').length).toBeGreaterThan(0)
  })


  it('renders business empty states in the finance angle when finance sources are empty', async () => {
    getInvoicesMock.mockResolvedValueOnce({
      success: true,
      data: { data: [], total: 0, page: 1, limit: 50, totalPages: 0 },
    })
    getSalesAnalyticsMock.mockResolvedValueOnce({
      success: true,
      data: {
        period: '6m',
        monthlyRevenue: [],
        topClients: [],
        clientTypeDistribution: [],
      },
    })
    getProductAnalyticsMock.mockResolvedValueOnce({
      success: true,
      data: {
        period: '3m',
        topProducts: [],
        categoryDistribution: [],
      },
    })

    render(<DashboardPage />)

    await waitFor(() => {
      expect(getDashboardStatsMock).toHaveBeenCalledTimes(1)
    })

    fireEvent.click(screen.getByText('Finances'))

    expect(screen.getByText('Aucune évolution mensuelle disponible')).toBeInTheDocument()
    expect(screen.getByText('Aucune facture stratégique disponible')).toBeInTheDocument()
    expect(screen.getByText('Aucun classement pour meilleurs pays')).toBeInTheDocument()
    expect(screen.getByText('Aucun classement pour meilleures catégories')).toBeInTheDocument()
  })

  it('shows the localized error message when dashboard statistics cannot be loaded', async () => {
    getDashboardStatsMock.mockRejectedValueOnce(new Error('network error'))

    render(<DashboardPage />)

    expect(await screen.findByText('Impossible de charger les statistiques du tableau de bord.')).toBeInTheDocument()
  })

  it('keeps the dashboard usable when orders use a flat payload and product analytics fail', async () => {
    getOrdersMock.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 'order-1',
          number: 'CMD-0041',
          type: 'ORDER',
          status: 'ACCEPTED',
          clientId: 'client-1',
          client: { id: 'client-1', type: 'COMPANY', companyName: 'SARL Technoplus', email: 'contact@technoplus.dz', createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z' },
          orderDate: '2026-03-07T00:00:00.000Z',
          subtotal: 67500,
          vatAmount: 0,
          total: 67500,
          discount: 0,
          items: [{ productId: 'product-1', quantity: 1, unitPrice: 67500, vatRate: 0, discount: 0, product: { id: 'product-1', name: 'Ramette papier A4 x90', sku: 'RAM-A4', price: 67500, stockQuantity: 10, minStockLevel: 1, categoryId: 'cat-1', active: true, createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z' } }],
          createdAt: '2026-03-07T00:00:00.000Z',
          updatedAt: '2026-03-07T00:00:00.000Z',
        },
      ],
    })
    getProductAnalyticsMock.mockRejectedValueOnce(new Error('analytics unavailable'))

    render(<DashboardPage />)

    expect(await screen.findByText('SARL Technoplus')).toBeInTheDocument()
    expect(screen.queryByText('Impossible de charger les statistiques du tableau de bord.')).not.toBeInTheDocument()
  })

  it('does not crash when growth values are missing from dashboard statistics', async () => {
    getDashboardStatsMock.mockResolvedValueOnce({
      success: true,
      data: {
        clients: { total: 8, individuals: 0, companies: 8, recentCount: 2 },
        products: { total: 10, inStock: 8, lowStock: 1, outOfStock: 2, totalStockValue: 25000 },
        sales: { currentMonth: 120000, previousMonth: 100000, currency: 'DZD' },
        orders: { total: 5, pending: 1, accepted: 4, rejected: 0, averageValue: 30000 },
        invoices: { total: 6, paid: 3, pending: 2, overdue: 1, totalAmount: 180000, paidAmount: 90000, pendingAmount: 45000 },
        lastUpdated: '2026-03-07T10:00:00.000Z',
      },
    })

    render(<DashboardPage />)

    expect(await screen.findByText('Croissance +0.0%')).toBeInTheDocument()
    expect(screen.queryByText('Impossible de charger les statistiques du tableau de bord.')).not.toBeInTheDocument()
  })

  it('renders the sidebar entry as Tableau de bord', async () => {
    render(<Sidebar />)

    expect(await screen.findByText('Tableau de bord')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })
})