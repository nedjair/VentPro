import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  pushMock,
  ensureApiAuthenticationMock,
  apiMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  ensureApiAuthenticationMock: vi.fn(),
  apiMock: {
    getProducts: vi.fn(),
    deleteProduct: vi.fn(),
  },
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

import { ProductsPage } from '@/components/pages/products'

describe('Products page toolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ensureApiAuthenticationMock.mockResolvedValue(true)
    apiMock.getProducts.mockResolvedValue([
      {
        id: 'product-1',
        name: 'Clavier mécanique',
        sku: 'CLAVIER-MECA',
        reference: 'CLAVIER-MECA',
        category: { id: 'cat-1', name: 'Informatique' },
        price: 7900,
        stockQuantity: 15,
        minStock: 4,
        maxStock: 25,
        unit: 'pièce',
        isActive: true,
        trackStock: true,
        allowBackorder: false,
        createdAt: '2026-03-08T08:00:00.000Z',
        updatedAt: '2026-03-08T08:00:00.000Z',
      },
    ])
  })

  it('moves product actions into the table toolbar in the expected order', async () => {
    render(<ProductsPage />)

    await waitFor(() => expect(apiMock.getProducts).toHaveBeenCalled())

    expect(screen.getByTestId('header-actions')).toBeEmptyDOMElement()

    const searchInput = screen.getByPlaceholderText(/rechercher un produit/i)
    const filtersButton = screen.getByRole('button', { name: /filtres/i })
    const importButton = screen.getByRole('button', { name: /import/i })
    const excelButton = screen.getByRole('button', { name: /excel/i })
    const pdfButton = screen.getByRole('button', { name: /^pdf$/i })
    const newProductButton = screen.getByRole('button', { name: /nouveau produit/i })

    expect(searchInput.compareDocumentPosition(filtersButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(filtersButton.compareDocumentPosition(importButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(importButton.compareDocumentPosition(excelButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(excelButton.compareDocumentPosition(pdfButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(pdfButton.compareDocumentPosition(newProductButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})