import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { pushMock, apiMock, syncStockProductHeaderNotificationMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  apiMock: {
    get: vi.fn(),
    getProduct: vi.fn(),
    updateProduct: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
  syncStockProductHeaderNotificationMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}))

vi.mock('@/components/layout/main-layout', () => ({
  MainLayout: ({ title, subtitle, actions, children }: any) => (
    <div>
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
      <div>{actions}</div>
      <div>{children}</div>
    </div>
  ),
}))

vi.mock('@/lib/api', () => ({
  api: apiMock,
}))

vi.mock('@/lib/header-notifications', () => ({
  syncStockProductHeaderNotification: syncStockProductHeaderNotificationMock,
}))

import { StockFormPage } from '@/components/pages/stocks/stock-form'

describe('StockFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMock.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          data: [
            { id: 'product-1', name: 'Clavier mécanique', sku: 'CLAVIER-MECA', price: 7900, unit: 'pièce' },
          ],
        },
      },
    })
    apiMock.getProduct.mockResolvedValue({
      success: true,
      data: {
        id: 'product-1',
        name: 'Clavier mécanique',
        sku: 'CLAVIER-MECA',
        barcode: '1234567890123',
        description: 'Switches tactiles et rétroéclairage.',
        categoryId: 'cat-1',
        price: 7900,
        costPrice: 3500,
        unit: 'pièce',
        isActive: true,
        isService: false,
        trackStock: true,
        allowBackorder: false,
        vatRate: 20,
        stockQuantity: 2,
        minStock: 4,
        maxStock: 12,
      },
    })
    apiMock.updateProduct.mockResolvedValue({ success: true, data: { id: 'product-1' } })
    apiMock.put.mockResolvedValue({ data: { success: true, data: { id: 'product-1' } } })
  })

  it('loads the existing stock data from the product id and saves through the product update API', async () => {
    render(<StockFormPage mode="edit" stockId="product-1" />)

    await waitFor(() => expect(apiMock.getProduct).toHaveBeenCalledWith('product-1'))

    expect(screen.queryByText('Erreur lors du chargement du stock')).not.toBeInTheDocument()
    expect(screen.queryByText('Retour')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /annuler/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/produit/i)).toHaveValue('product-1')
    expect(screen.getByLabelText(/quantité actuelle/i)).toHaveValue(2)
    expect(screen.getByLabelText(/quantité minimale/i)).toHaveValue(4)
    expect(screen.getByLabelText(/quantité maximale/i)).toHaveValue(12)

    fireEvent.change(screen.getByLabelText(/quantité actuelle/i), { target: { value: '9' } })
    fireEvent.click(screen.getByRole('button', { name: /sauvegarder/i }))

    await waitFor(() => {
      expect(apiMock.updateProduct).toHaveBeenCalledWith('product-1', expect.objectContaining({
        name: 'Clavier mécanique',
        sku: 'CLAVIER-MECA',
        stockQuantity: 9,
        minStock: 4,
        maxStock: 12,
        price: 7900,
        unit: 'pièce',
      }))
    })

    expect(syncStockProductHeaderNotificationMock).toHaveBeenCalledWith(
      'product-1',
      expect.objectContaining({
        id: 'stock-status-product-1',
        title: 'Alerte stock faible',
      })
    )
    expect(syncStockProductHeaderNotificationMock).toHaveBeenLastCalledWith('product-1', null)

    expect(pushMock).toHaveBeenCalledWith('/stocks')
  })

  it('omits maxStock when the field is left at zero in edit mode', async () => {
    render(<StockFormPage mode="edit" stockId="product-1" />)

    await waitFor(() => expect(apiMock.getProduct).toHaveBeenCalledWith('product-1'))

    fireEvent.change(screen.getByLabelText(/quantité maximale/i), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: /sauvegarder/i }))

    await waitFor(() => {
      expect(apiMock.updateProduct).toHaveBeenCalledWith('product-1', expect.objectContaining({
        maxStock: undefined,
      }))
    })
  })
})