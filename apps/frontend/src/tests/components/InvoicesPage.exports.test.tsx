import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  pushMock,
  ensureApiAuthenticationMock,
  apiMock,
  downloadInvoicesExcelMock,
  downloadInvoicesPDFMock,
  downloadInvoicePDFMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  ensureApiAuthenticationMock: vi.fn(),
  apiMock: {
    getInvoices: vi.fn(),
    deleteInvoice: vi.fn(),
  },
  downloadInvoicesExcelMock: vi.fn(),
  downloadInvoicesPDFMock: vi.fn(),
  downloadInvoicePDFMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}))

vi.mock('@/components/layout/main-layout', () => ({
  MainLayout: ({ title, subtitle, actions, children }: any) => (
    <div>
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
      <div data-testid="header-actions">{actions}</div>
      <div>{children}</div>
    </div>
  ),
}))

vi.mock('@/lib/auth-utils', () => ({
  ensureApiAuthentication: ensureApiAuthenticationMock,
}))

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<any>('@/lib/api')
  return {
    ...actual,
    api: apiMock,
  }
})

vi.mock('@/lib/export', () => ({
  ExportService: {
    validateImportFile: vi.fn(() => ({ isValid: true })),
    importInvoicesFromExcel: vi.fn(),
    downloadInvoicesExcel: downloadInvoicesExcelMock,
    downloadInvoicesPDF: downloadInvoicesPDFMock,
    downloadInvoicePDF: downloadInvoicePDFMock,
  },
}))

import { InvoicesPage } from '@/components/pages/invoices'

describe('Invoices page exports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ensureApiAuthenticationMock.mockResolvedValue(true)
    apiMock.getInvoices.mockResolvedValue({
      success: true,
      data: {
        data: [
          {
            id: 'inv-1',
            number: 'FAC-001',
            type: 'INVOICE',
            status: 'SENT',
            clientId: 'client-1',
            client: {
              id: 'client-1',
              type: 'COMPANY',
              companyName: 'Entreprise Atlas',
              email: 'contact@atlas.dz',
              createdAt: '2026-03-01T00:00:00.000Z',
              updatedAt: '2026-03-01T00:00:00.000Z',
            },
            invoiceDate: '2026-03-01T00:00:00.000Z',
            dueDate: '2026-03-10T00:00:00.000Z',
            subtotal: 1000,
            vatAmount: 190,
            total: 1190,
            paidAmount: 0,
            discount: 0,
            items: [],
            createdAt: '2026-03-01T00:00:00.000Z',
            updatedAt: '2026-03-01T00:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      },
    })
  })

  it('exports invoices to Excel with active page filters', async () => {
    render(<InvoicesPage />)

    await waitFor(() => {
      expect(apiMock.getInvoices).toHaveBeenCalled()
    })

    fireEvent.change(screen.getByPlaceholderText(/rechercher une facture/i), { target: { value: 'FAC-001' } })
    fireEvent.change(screen.getByLabelText(/filtrer par type/i), { target: { value: 'INVOICE' } })
    fireEvent.change(screen.getByLabelText(/filtrer par statut/i), { target: { value: 'SENT' } })

    const excelButton = screen.getByRole('button', { name: /excel/i })
    fireEvent.click(excelButton)

    await waitFor(() => {
      expect(downloadInvoicesExcelMock).toHaveBeenCalledWith({
        search: 'FAC-001',
        status: 'SENT',
        type: 'INVOICE',
      })
    })
  })

  it('shows explicit export error notification when PDF export fails', async () => {
    downloadInvoicesPDFMock.mockRejectedValueOnce(new Error('Export PDF factures échoué (500) : backend indisponible'))

    render(<InvoicesPage />)

    await waitFor(() => {
      expect(apiMock.getInvoices).toHaveBeenCalled()
    })

    const pdfButtons = screen.getAllByRole('button', { name: /^pdf$/i })
    fireEvent.click(pdfButtons[0])

    expect(await screen.findByText(/Erreur d'export:/i)).toBeInTheDocument()
    expect(screen.getByText(/backend indisponible/i)).toBeInTheDocument()
  })

  it('triggers row actions PDF and Voir with invoice id', async () => {
    render(<InvoicesPage />)

    await waitFor(() => {
      expect(apiMock.getInvoices).toHaveBeenCalled()
    })

    fireEvent.click(screen.getByRole('button', { name: /^voir$/i }))
    expect(pushMock).toHaveBeenCalledWith('/invoices/inv-1')

    const pdfButtons = screen.getAllByRole('button', { name: /^pdf$/i })
    fireEvent.click(pdfButtons[1])

    await waitFor(() => {
      expect(downloadInvoicePDFMock).toHaveBeenCalledWith('inv-1')
    })
  })

  it('shows a clear loading error when row PDF generation returns an empty file', async () => {
    downloadInvoicePDFMock.mockRejectedValueOnce(new Error('Le PDF retourné est vide. Veuillez réessayer ou ouvrir la facture depuis "Voir".'))

    render(<InvoicesPage />)

    await waitFor(() => {
      expect(apiMock.getInvoices).toHaveBeenCalled()
    })

    const pdfButtons = screen.getAllByRole('button', { name: /^pdf$/i })
    fireEvent.click(pdfButtons[1])

    expect(await screen.findByText(/Erreur de chargement/i)).toBeInTheDocument()
    expect(screen.getByText(/Le PDF retourné est vide/i)).toBeInTheDocument()
  })

  it('shows a clear network error when PDF request fails to fetch', async () => {
    downloadInvoicePDFMock.mockRejectedValueOnce(new Error('Failed to fetch'))

    render(<InvoicesPage />)

    await waitFor(() => {
      expect(apiMock.getInvoices).toHaveBeenCalled()
    })

    const pdfButtons = screen.getAllByRole('button', { name: /^pdf$/i })
    fireEvent.click(pdfButtons[1])

    expect(await screen.findByText(/Erreur de chargement/i)).toBeInTheDocument()
    expect(screen.getByText(/Impossible de joindre le service PDF/i)).toBeInTheDocument()
  })
})
