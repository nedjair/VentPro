import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { pushMock, ensureApiAuthenticationMock, apiMock, useUnifiedProductMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  ensureApiAuthenticationMock: vi.fn(),
  apiMock: {
    getCategories: vi.fn(),
      createCategory: vi.fn(),
    getSuppliers: vi.fn(),
    getProduct: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
  },
  useUnifiedProductMock: vi.fn(),
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

vi.mock('@/hooks/useUnifiedStockCache', () => ({
  useUnifiedProduct: useUnifiedProductMock,
}))

import { ProductDetailsPage } from '@/components/pages/products/product-details'
import { ProductFormPage } from '@/components/pages/products/product-form'

describe('Product pages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ensureApiAuthenticationMock.mockResolvedValue(true)
    apiMock.getSuppliers.mockResolvedValue({ success: true, data: { data: [{ id: 'sup-1', name: 'Fournisseur A' }] } })
    apiMock.getCategories.mockResolvedValue({ success: true, data: [{ id: 'cat-1', name: 'Informatique', description: 'Périphériques et matériel IT' }] })
    apiMock.createCategory.mockResolvedValue({
      success: true,
      data: {
        id: 'cat-2',
        name: 'Accessoires réseau',
        description: 'Switches, câbles et routeurs',
        createdAt: '2026-03-08T09:00:00.000Z',
        updatedAt: '2026-03-08T09:00:00.000Z',
      },
    })
    apiMock.createProduct.mockResolvedValue({ success: true, data: { id: 'product-1' } })
    apiMock.updateProduct.mockResolvedValue({ success: true, data: { id: 'product-1' } })
    apiMock.getProduct.mockResolvedValue({
      success: true,
      data: {
        id: 'product-1',
        name: 'Clavier mécanique',
        reference: 'CLAVIER-MECA',
        sku: 'CLAVIER-MECA',
        description: 'Switches tactiles et rétroéclairage.',
        categoryId: 'cat-1',
        category: { id: 'cat-1', name: 'Informatique', description: 'Périphériques et matériel IT' },
        price: 7900,
        costPrice: 3500,
        stock: 15,
        minStock: 4,
        maxStock: 25,
        unit: 'pièce',
        isActive: true,
        trackStock: true,
        allowBackorder: false,
        createdAt: '2026-03-07T09:00:00.000Z',
        updatedAt: '2026-03-07T10:00:00.000Z',
      },
    })
    useUnifiedProductMock.mockReturnValue({
      product: { stockQuantity: 15, minStock: 4, maxStock: 25, value: 118500, status: 'normal', lastUpdate: '2026-03-07T10:00:00.000Z' },
      loading: false,
      error: null,
    })
  })

  it('submits the create form without crashing and redirects to the products list', async () => {
    render(<ProductFormPage mode="create" />)

    await waitFor(() => {
      expect(apiMock.getSuppliers).toHaveBeenCalled()
      expect(apiMock.getCategories).toHaveBeenCalled()
    })

    fireEvent.change(screen.getByLabelText(/nom du produit/i), { target: { value: 'Clavier mécanique' } })
    fireEvent.change(screen.getByLabelText(/référence produit/i), { target: { value: 'CLAVIER-MECA' } })
    fireEvent.change(screen.getByLabelText(/prix de vente/i), { target: { value: '7900' } })
    fireEvent.change(screen.getByLabelText(/prix d'achat/i), { target: { value: '3500' } })
    fireEvent.change(screen.getByLabelText(/stock actuel/i), { target: { value: '15' } })
    fireEvent.change(screen.getByLabelText(/stock minimum/i), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText(/stock maximum/i), { target: { value: '25' } })
    fireEvent.change(screen.getByRole('combobox', { name: /catégorie/i }), { target: { value: 'cat-1' } })

    fireEvent.click(screen.getAllByRole('button', { name: /créer le produit/i })[1])

    await waitFor(() => {
      expect(apiMock.createProduct).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Clavier mécanique',
        sku: 'CLAVIER-MECA',
        price: 7900,
        costPrice: 3500,
        stock: 15,
        minStock: 4,
        maxStock: 25,
        categoryId: 'cat-1',
      }))
    })
    expect(pushMock).toHaveBeenCalledWith('/products')
  })

  it('allows creating a category inline and preselects it in the product form', async () => {
    apiMock.getCategories
      .mockResolvedValueOnce({ success: true, data: [{ id: 'cat-1', name: 'Informatique', description: 'Périphériques et matériel IT' }] })
      .mockResolvedValueOnce({
        success: true,
        data: [
          { id: 'cat-2', name: 'Accessoires réseau', description: 'Switches, câbles et routeurs' },
          { id: 'cat-1', name: 'Informatique', description: 'Périphériques et matériel IT' },
        ],
      })

    render(<ProductFormPage mode="create" />)

    await waitFor(() => expect(apiMock.getCategories).toHaveBeenCalledTimes(1))

    const categoryCreateTrigger = screen.getByRole('button', { name: /créer une catégorie/i })
    expect(categoryCreateTrigger).toHaveTextContent('+')
    expect(categoryCreateTrigger).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(categoryCreateTrigger)
    expect(screen.getByRole('button', { name: /masquer la création de catégorie/i })).toHaveTextContent('+')
    fireEvent.change(screen.getByLabelText(/nom de la catégorie/i), { target: { value: 'Accessoires réseau' } })
    fireEvent.change(screen.getByLabelText(/description/i, { selector: 'textarea#quickCategoryDescription' }), { target: { value: 'Switches, câbles et routeurs' } })
    fireEvent.click(screen.getByRole('button', { name: /créer la catégorie/i }))

    await waitFor(() => {
      expect(apiMock.createCategory).toHaveBeenCalledWith({
        name: 'Accessoires réseau',
        description: 'Switches, câbles et routeurs',
      })
    })

    await waitFor(() => expect(apiMock.getCategories).toHaveBeenCalledTimes(2))
    expect(screen.getByRole('combobox', { name: /catégorie/i })).toHaveValue('cat-2')
    expect(screen.queryByLabelText(/nom de la catégorie/i)).not.toBeInTheDocument()
  })

  it('renders the product details page with local actions instead of header actions', async () => {
    render(<ProductDetailsPage productId="product-1" />)

    expect(await screen.findByText(/informations générales/i)).toBeInTheDocument()
    expect(screen.getByTestId('header-actions')).toBeEmptyDOMElement()
    expect(screen.getByText(/prix et coûts/i)).toBeInTheDocument()
    expect(screen.getByText(/gestion du stock/i)).toBeInTheDocument()
    expect(screen.getByText(/informations système/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retour/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /modifier/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /supprimer/i })).toBeInTheDocument()
    expect(screen.getAllByText(/clavier mécanique/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/stock actuel/i)).toBeInTheDocument()
    expect(screen.getByText(/informatique/i)).toBeInTheDocument()
    expect(screen.getByText(/3.*500/)).toBeInTheDocument()
    expect(screen.getAllByText(/25/).length).toBeGreaterThan(0)
  })

  it('prefills persisted fields on the edit form', async () => {
    render(<ProductFormPage mode="edit" productId="product-1" />)

    await waitFor(() => expect(apiMock.getProduct).toHaveBeenCalledWith('product-1'))

    expect(screen.getAllByLabelText(/stock minimum/i)).toHaveLength(1)
    expect(screen.getByLabelText(/prix d'achat/i)).toHaveValue(3500)
    expect(screen.getByLabelText(/stock minimum/i)).toHaveValue(4)
    expect(screen.getByLabelText(/stock maximum/i)).toHaveValue(25)
    expect(screen.getByRole('combobox', { name: /catégorie/i })).toHaveValue('cat-1')
  })

  it('removes redundant header actions on the edit form and keeps the local submit action', async () => {
    render(<ProductFormPage mode="edit" productId="product-1" />)

    await waitFor(() => expect(apiMock.getProduct).toHaveBeenCalledWith('product-1'))

    const headerActions = screen.getByTestId('header-actions')
    expect(headerActions).toBeEmptyDOMElement()
    expect(headerActions).not.toHaveTextContent(/retour/i)
    expect(headerActions).not.toHaveTextContent(/sauvegarder/i)
    expect(screen.getByRole('button', { name: /enregistrer les modifications/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /annuler/i })).toBeInTheDocument()
  })

  it('keeps a single stock minimum field editable and sends the updated value on save', async () => {
    render(<ProductFormPage mode="edit" productId="product-1" />)

    await waitFor(() => expect(apiMock.getProduct).toHaveBeenCalledWith('product-1'))

    const minStockInputs = screen.getAllByLabelText(/stock minimum/i)
    expect(minStockInputs).toHaveLength(1)

    fireEvent.change(minStockInputs[0], { target: { value: '7' } })
    fireEvent.click(screen.getByRole('button', { name: /enregistrer les modifications/i }))

    await waitFor(() => {
      expect(apiMock.updateProduct).toHaveBeenCalledWith('product-1', expect.objectContaining({
        minStock: 7,
        categoryId: 'cat-1',
      }))
    })
  })

  it('shows the backend validation message when product creation is rejected', async () => {
    apiMock.createProduct.mockRejectedValue(new Error('HTTP 400: Un produit avec ce SKU existe déjà'))

    render(<ProductFormPage mode="create" />)

    await waitFor(() => {
      expect(apiMock.getSuppliers).toHaveBeenCalled()
      expect(apiMock.getCategories).toHaveBeenCalled()
    })

    fireEvent.change(screen.getByLabelText(/nom du produit/i), { target: { value: 'Clavier mécanique' } })
    fireEvent.change(screen.getByLabelText(/référence produit/i), { target: { value: 'CLAVIER-MECA' } })
    fireEvent.change(screen.getByLabelText(/prix de vente/i), { target: { value: '7900' } })

    fireEvent.click(screen.getAllByRole('button', { name: /créer le produit/i })[1])

    expect(await screen.findByText(/un produit avec ce sku existe déjà/i)).toBeInTheDocument()
    expect(pushMock).not.toHaveBeenCalled()
  })
})

