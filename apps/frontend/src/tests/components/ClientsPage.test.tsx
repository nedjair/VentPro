import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  pushMock,
  ensureApiAuthenticationMock,
  apiMock,
  downloadClientsExcelMock,
  downloadClientsPDFMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  ensureApiAuthenticationMock: vi.fn(),
  apiMock: {
    getClients: vi.fn(),
    deleteClient: vi.fn(),
  },
  downloadClientsExcelMock: vi.fn(),
  downloadClientsPDFMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
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

vi.mock('@/lib/api', () => ({
  api: apiMock,
}))

vi.mock('@/lib/export', () => ({
  ExportService: {
    validateImportFile: vi.fn(() => ({ isValid: true })),
    importClientsFromExcel: vi.fn(),
    downloadClientsExcel: downloadClientsExcelMock,
    downloadClientsPDF: downloadClientsPDFMock,
  },
}))

import { ClientsPage } from '@/components/pages/clients'

describe('Clients page toolbar and exports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ensureApiAuthenticationMock.mockResolvedValue(true)
    apiMock.getClients.mockResolvedValue([
      {
        id: 'client-1',
        type: 'INDIVIDUAL',
        firstName: 'Ahmed',
        lastName: 'Benali',
        email: 'ahmed@example.dz',
        phone: '+213 555 000 111',
        city: 'Alger',
        createdAt: '2026-03-08T08:00:00.000Z',
        updatedAt: '2026-03-08T08:00:00.000Z',
      },
    ])
    downloadClientsExcelMock.mockResolvedValue(undefined)
    downloadClientsPDFMock.mockResolvedValue(undefined)
  })

  it('moves client actions into the table toolbar and exports the filtered list to PDF', async () => {
    render(<ClientsPage />)

    await waitFor(() => expect(apiMock.getClients).toHaveBeenCalled())

    const headerActions = screen.getByTestId('header-actions')
    expect(headerActions).toBeEmptyDOMElement()

    const searchInput = screen.getByPlaceholderText(/rechercher un client/i)
    const filtersButton = screen.getByRole('button', { name: /filtres/i })
    const importButton = screen.getByRole('button', { name: /import/i })
    const excelButton = screen.getByRole('button', { name: /excel/i })
    const pdfButton = screen.getByRole('button', { name: /^pdf$/i })
    const newClientButton = screen.getByRole('button', { name: /nouveau client/i })

    expect(searchInput.compareDocumentPosition(filtersButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(filtersButton.compareDocumentPosition(importButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(importButton.compareDocumentPosition(excelButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(excelButton.compareDocumentPosition(pdfButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(pdfButton.compareDocumentPosition(newClientButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    fireEvent.change(searchInput, { target: { value: 'Ahmed' } })
    fireEvent.click(filtersButton)
    fireEvent.change(screen.getByLabelText(/type de client/i), { target: { value: 'INDIVIDUAL' } })
    fireEvent.change(screen.getByLabelText(/ville/i), { target: { value: 'Alger' } })
    fireEvent.click(pdfButton)

    await waitFor(() => {
      expect(downloadClientsPDFMock).toHaveBeenCalledWith({
        search: 'Ahmed',
        type: 'INDIVIDUAL',
        city: 'Alger',
      })
    })
  })
})