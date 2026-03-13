import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ReportsPage } from '@/components/pages/reports'

const { getKPIMetricsMock, downloadSalesReportPDFMock, downloadClientsPDFMock, downloadProductsPDFMock } = vi.hoisted(() => ({
  getKPIMetricsMock: vi.fn(),
  downloadSalesReportPDFMock: vi.fn(),
  downloadClientsPDFMock: vi.fn(),
  downloadProductsPDFMock: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}))

vi.mock('@/components/layout/main-layout', () => ({
  MainLayout: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}))

vi.mock('@/components/dashboard/kpi-metrics', () => ({
  KPIMetricsComponent: () => <div data-testid="kpi-metrics">KPI Metrics</div>,
}))

vi.mock('@/components/ui/import-export-buttons', () => ({
  ImportExportMessage: () => null,
}))

vi.mock('@/lib/export', () => ({
  ExportService: {
    exportReportsData: vi.fn(),
    downloadSalesReportPDF: downloadSalesReportPDFMock,
    downloadClientsPDF: downloadClientsPDFMock,
    downloadProductsPDF: downloadProductsPDFMock,
    downloadSalesReportExcel: vi.fn(),
    downloadClientsExcel: vi.fn(),
    downloadProductsExcel: vi.fn(),
    downloadOrdersExcel: vi.fn(),
    downloadInvoicesExcel: vi.fn(),
  },
}))

vi.mock('@/lib/api', () => ({
  api: {
    getKPIMetrics: getKPIMetricsMock,
  },
}))

describe('ReportsPage', () => {
  it('renders real KPI-backed report cards instead of static placeholder values', async () => {
    getKPIMetricsMock.mockResolvedValue({
      success: true,
      data: {
        revenue: { current: 152500.75, target: 140000, growth: 8.9, targetConfigured: true, currency: 'DZD' },
        orders: { current: 18, target: 14, growth: 28.6, targetConfigured: true, pending: 3 },
        clients: { current: 42, target: 38, growth: 10.5, targetConfigured: true, newThisMonth: 4 },
        conversion: { rate: 33.3, target: 25, growth: 33.2, targetConfigured: true, quotes: 12, convertedQuotes: 4 },
        products: { total: 25, lowStock: 2, outOfStock: 1, soldThisMonth: 97 },
        invoices: { total: 13, overdue: 1, paid: 7 },
        alerts: { lowStock: 2, overdueInvoices: 1, pendingOrders: 3 },
        lastUpdated: '2026-03-07T12:15:04.220Z',
      },
    })

    render(<ReportsPage />)

    await waitFor(() => {
      expect(getKPIMetricsMock).toHaveBeenCalledTimes(1)
    })

    expect(await screen.findByText('Factures payées')).toBeInTheDocument()
    expect(screen.getAllByText('Clients suivis').length).toBeGreaterThan(0)
    expect(screen.getByText('Nouveaux ce mois')).toBeInTheDocument()
    expect(screen.getByText('Unités vendues')).toBeInTheDocument()
    expect(screen.getByText('Écart objectif CA')).toBeInTheDocument()
    expect(screen.getByText('97')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()

    expect(screen.queryByText('Rapports générés')).not.toBeInTheDocument()
    expect(screen.queryByText('Clients analysés')).not.toBeInTheDocument()
  })

  it('downloads the matching recent report when clicking Télécharger', async () => {
    getKPIMetricsMock.mockResolvedValue({
      success: true,
      data: {
        revenue: { current: 152500.75, target: 140000, growth: 8.9, targetConfigured: true, currency: 'DZD' },
        orders: { current: 18, target: 14, growth: 28.6, targetConfigured: true, pending: 3 },
        clients: { current: 42, target: 38, growth: 10.5, targetConfigured: true, newThisMonth: 4 },
        conversion: { rate: 33.3, target: 25, growth: 33.2, targetConfigured: true, quotes: 12, convertedQuotes: 4 },
        products: { total: 25, lowStock: 2, outOfStock: 1, soldThisMonth: 97 },
        invoices: { total: 13, overdue: 1, paid: 7 },
        alerts: { lowStock: 2, overdueInvoices: 1, pendingOrders: 3 },
        lastUpdated: '2026-03-07T12:15:04.220Z',
      },
    })

    render(<ReportsPage />)

    await screen.findByText('Analyse clients Q4 2024')

    const downloadButtons = screen.getAllByRole('button', { name: 'Télécharger' })
    fireEvent.click(downloadButtons[1])

    await waitFor(() => {
      expect(downloadClientsPDFMock).toHaveBeenCalledTimes(1)
    })

    expect(downloadSalesReportPDFMock).not.toHaveBeenCalled()
    expect(downloadProductsPDFMock).not.toHaveBeenCalled()
  })
})