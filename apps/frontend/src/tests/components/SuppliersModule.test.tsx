import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { pushMock, searchParamGetMock, apiMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  searchParamGetMock: vi.fn(),
  apiMock: {
    getSuppliers: vi.fn(),
    getSupplier: vi.fn(),
    deleteSupplier: vi.fn(),
    updateSupplier: vi.fn(),
    createSupplier: vi.fn(),
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => ({ get: searchParamGetMock }),
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

vi.mock('@/components/ui/import-export-buttons', () => ({
  ImportExportButtons: ({ className }: { className?: string }) => (
    <div data-testid="import-export-buttons" className={className}>
      <button type="button">Import</button>
      <button type="button">Excel</button>
      <button type="button">PDF</button>
    </div>
  ),
  ImportExportMessage: ({ message }: { message?: string }) => (message ? <div>{message}</div> : null),
}))

vi.mock('@/lib/api', () => ({
  api: apiMock,
}))

import SupplierDetailPage from '@/app/suppliers/[id]/page'
import { SuppliersPage } from '@/components/pages/suppliers'
import { SupplierFormPage } from '@/components/pages/suppliers/supplier-form'

const buildSupplier = (overrides: Record<string, unknown> = {}) => ({
  id: 'sup-1',
  type: 'COMPANY',
  name: 'Alpha Fournitures',
  contactName: 'Jean Fournisseur',
  email: 'contact@alpha.test',
  phone: '01 23 45 67 88',
  mobile: '06 11 22 33 44',
  fax: '01 23 45 67 89',
  website: 'https://alpha.test',
  address: '10 rue des Tests',
  city: 'Paris',
  postalCode: '75001',
  country: 'France',
  siret: '12345678901234',
  vatNumber: 'FR00123456789',
  rcs: 'Paris B 123 456 789',
  isActive: true,
  isPreferred: true,
  paymentTerms: 45,
  deliveryTerms: 'Livraison sur site',
  discount: 5,
  currency: 'EUR',
  rating: 4,
  productsCount: 2,
  purchasesCount: 8,
  notes: 'Partenaire historique',
  tags: ['Premium'],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-02-01T00:00:00.000Z',
  products: [
    { id: 'prod-1', name: 'SSD entreprise', sku: 'SSD-ENT-1', stockQuantity: 12, price: 120, isActive: true },
    { id: 'prod-2', name: 'Serveur rack', sku: 'SRV-RACK-2', stockQuantity: 2, price: 2500, isActive: false },
  ],
  ...overrides,
})

describe('Suppliers module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    searchParamGetMock.mockReturnValue(null)
  })

  it('renders supplier actions in the toolbar instead of the global header', async () => {
    apiMock.getSuppliers.mockResolvedValue({ success: true, data: [buildSupplier()] })

    render(<SuppliersPage />)

    await waitFor(() => expect(apiMock.getSuppliers).toHaveBeenCalled())

    const headerActions = screen.getByTestId('header-actions')
    expect(within(headerActions).queryByRole('button', { name: /nouveau fournisseur/i })).not.toBeInTheDocument()

    const filtersButton = screen.getByRole('button', { name: /filtres/i })
    const importButton = screen.getByRole('button', { name: /^import$/i })
    const excelButton = screen.getByRole('button', { name: /^excel$/i })
    const pdfButton = screen.getByRole('button', { name: /^pdf$/i })
    const newSupplierButton = screen.getByRole('button', { name: /nouveau fournisseur/i })

    expect(screen.getAllByRole('button', { name: /nouveau fournisseur/i })).toHaveLength(1)
    expect(filtersButton.compareDocumentPosition(importButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(importButton.compareDocumentPosition(excelButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(pdfButton.compareDocumentPosition(newSupplierButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    fireEvent.click(filtersButton)

    expect(screen.getByLabelText(/type de fournisseur/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/pays/i)).toBeInTheDocument()
  })

  it('renders complete supplier information and moves detail actions out of the header', async () => {
    apiMock.getSupplier.mockResolvedValue({ success: true, data: buildSupplier() })

    render(<SupplierDetailPage params={{ id: 'sup-1' }} />)

    await waitFor(() => expect(apiMock.getSupplier).toHaveBeenCalledWith('sup-1'))

    const headerActions = screen.getByTestId('header-actions')
    expect(within(headerActions).queryByRole('button', { name: /retour/i })).not.toBeInTheDocument()
    expect(within(headerActions).queryByRole('button', { name: /nouveau fournisseur/i })).not.toBeInTheDocument()
    expect(within(headerActions).queryByRole('button', { name: /modifier/i })).not.toBeInTheDocument()
    expect(within(headerActions).queryByRole('button', { name: /supprimer/i })).not.toBeInTheDocument()

    expect(screen.getByText('Fax')).toBeInTheDocument()
    expect(screen.getByText('01 23 45 67 89')).toBeInTheDocument()
    expect(screen.getByText('SIRET')).toBeInTheDocument()
    expect(screen.getByText('FR00123456789')).toBeInTheDocument()
    expect(screen.getByText('RCS')).toBeInTheDocument()
    expect(screen.getByText('Produits fournis')).toBeInTheDocument()
    expect(screen.getByText('SSD entreprise')).toBeInTheDocument()
    expect(screen.getByText('Serveur rack')).toBeInTheDocument()
    expect(screen.getByText('Achats enregistrés')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /modifier/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /supprimer/i })).toBeDisabled()
  })

  it('prefills the edit form and moves edit actions to the bottom area instead of the header', async () => {
    apiMock.getSupplier.mockResolvedValue({ success: true, data: buildSupplier() })

    render(<SupplierFormPage mode="edit" supplierId="sup-1" />)

    await waitFor(() => expect(apiMock.getSupplier).toHaveBeenCalledWith('sup-1'))

    const headerActions = screen.getByTestId('header-actions')
    expect(within(headerActions).queryByRole('button', { name: /sauvegarder|enregistrer/i })).not.toBeInTheDocument()
    expect(within(headerActions).queryByRole('button', { name: /retour/i })).not.toBeInTheDocument()
    expect(within(headerActions).queryByRole('button', { name: /nouveau fournisseur/i })).not.toBeInTheDocument()

    expect(screen.getByRole('button', { name: /annuler/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /enregistrer les modifications/i })).toBeInTheDocument()

    expect(screen.getByDisplayValue('Alpha Fournitures')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Jean Fournisseur')).toBeInTheDocument()
    expect(screen.getByDisplayValue('contact@alpha.test')).toBeInTheDocument()
    expect(screen.getByDisplayValue('01 23 45 67 88')).toBeInTheDocument()
    expect(screen.getByDisplayValue('06 11 22 33 44')).toBeInTheDocument()
    expect(screen.getByDisplayValue('01 23 45 67 89')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://alpha.test')).toBeInTheDocument()
    expect(screen.getByDisplayValue('10 rue des Tests')).toBeInTheDocument()
    expect(screen.getByDisplayValue('75001')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Paris')).toBeInTheDocument()
    expect(screen.getByDisplayValue('12345678901234')).toBeInTheDocument()
    expect(screen.getByDisplayValue('FR00123456789')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Paris B 123 456 789')).toBeInTheDocument()
    expect(screen.getByDisplayValue('45')).toBeInTheDocument()
    expect(screen.getByDisplayValue('5')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Partenaire historique')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Premium')).toBeInTheDocument()
  })

  it('includes Algérie in the supplier country list and keeps it selected by default in create mode', () => {
    render(<SupplierFormPage mode="create" />)

    const algeriaOption = screen.getByRole('option', { name: 'Algérie' }) as HTMLOptionElement

    expect(algeriaOption).toBeInTheDocument()
    expect(algeriaOption.selected).toBe(true)
  })

  it('filters suppliers by Algérie from the country filter', async () => {
    apiMock.getSuppliers.mockResolvedValue({
      success: true,
      data: [
        buildSupplier({ id: 'sup-dz', name: 'Atlas Distribution', country: 'Algérie', city: 'Alger' }),
        buildSupplier({ id: 'sup-fr', name: 'Paris Export', country: 'France', city: 'Paris' }),
      ],
    })

    render(<SuppliersPage />)

    await waitFor(() => expect(apiMock.getSuppliers).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: /filtres/i }))
    fireEvent.change(screen.getByLabelText(/pays/i), { target: { value: 'Algérie' } })

    expect(screen.getByText('Atlas Distribution')).toBeInTheDocument()
    expect(screen.queryByText('Paris Export')).not.toBeInTheDocument()
  })
})