import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { ensureApiAuthenticationMock, apiMock } = vi.hoisted(() => ({
  ensureApiAuthenticationMock: vi.fn(),
  apiMock: {
    getInvoices: vi.fn(),
    deleteInvoice: vi.fn(),
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
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
    downloadInvoicesExcel: vi.fn(),
    downloadInvoicesPDF: vi.fn(),
    downloadInvoicePDF: vi.fn(),
  },
}))

import { InvoicesPage, getInvoiceClientDisplayName } from '@/components/pages/invoices'

describe('Invoices page client name rendering', () => {
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
          {
            id: 'inv-2',
            number: 'FAC-002',
            type: 'INVOICE',
            status: 'SENT',
            clientId: 'client-2',
            client: {
              id: 'client-2',
              type: 'INDIVIDUAL',
              firstName: 'Nadia',
              lastName: 'Benali',
              email: 'nadia.benali@exemple.dz',
              createdAt: '2026-03-01T00:00:00.000Z',
              updatedAt: '2026-03-01T00:00:00.000Z',
            },
            invoiceDate: '2026-03-02T00:00:00.000Z',
            dueDate: '2026-03-11T00:00:00.000Z',
            subtotal: 2000,
            vatAmount: 380,
            total: 2380,
            paidAmount: 0,
            discount: 0,
            items: [],
            createdAt: '2026-03-02T00:00:00.000Z',
            updatedAt: '2026-03-02T00:00:00.000Z',
          },
          {
            id: 'inv-3',
            number: 'FAC-003',
            type: 'INVOICE',
            status: 'SENT',
            clientId: 'client-3',
            client: {
              id: 'client-3',
              type: 'INDIVIDUAL',
              name: 'Sahara Energy Procurement',
              email: 'procurement@sahara-energy.dz',
              createdAt: '2026-03-01T00:00:00.000Z',
              updatedAt: '2026-03-01T00:00:00.000Z',
            },
            invoiceDate: '2026-03-03T00:00:00.000Z',
            dueDate: '2026-03-12T00:00:00.000Z',
            subtotal: 3000,
            vatAmount: 570,
            total: 3570,
            paidAmount: 0,
            discount: 0,
            items: [],
            createdAt: '2026-03-03T00:00:00.000Z',
            updatedAt: '2026-03-03T00:00:00.000Z',
          },
        ],
        total: 3,
        page: 1,
        limit: 50,
        totalPages: 1,
      },
    })
  })

  it('resolves client display names from companyName, first/last and legacy name field', () => {
    expect(getInvoiceClientDisplayName({ type: 'COMPANY', companyName: 'Alpha SARL' } as any)).toBe('Alpha SARL')
    expect(getInvoiceClientDisplayName({ type: 'INDIVIDUAL', firstName: 'Karim', lastName: 'Amari' } as any)).toBe('Karim Amari')
    expect(getInvoiceClientDisplayName({ type: 'INDIVIDUAL', name: 'Legacy Name' } as any)).toBe('Legacy Name')
    expect(getInvoiceClientDisplayName({ type: 'INDIVIDUAL' } as any)).toBe('Client inconnu')
  })

  it('renders all invoice client names without undefined values and keeps table rows stable', async () => {
    render(<InvoicesPage />)

    await waitFor(() => {
      expect(apiMock.getInvoices).toHaveBeenCalled()
    })

    expect(screen.getByText('Entreprise Atlas')).toBeInTheDocument()
    expect(screen.getByText('Nadia Benali')).toBeInTheDocument()
    expect(screen.getByText('Sahara Energy Procurement')).toBeInTheDocument()
    expect(screen.queryByText('undefined undefined')).not.toBeInTheDocument()
    expect(screen.getByText('procurement@sahara-energy.dz')).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(4)
  })
})
