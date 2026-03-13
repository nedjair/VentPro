import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  pushMock,
  ensureApiAuthenticationMock,
  apiMock,
  upsertHeaderNotificationsBySourceMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  ensureApiAuthenticationMock: vi.fn(),
  apiMock: {
    get: vi.fn(),
  },
  upsertHeaderNotificationsBySourceMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}))

vi.mock('@/components/layout/main-layout', () => ({
  MainLayout: ({ title, subtitle, children }: any) => (
    <div>
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
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

vi.mock('@/lib/header-notifications', () => ({
  upsertHeaderNotificationsBySource: upsertHeaderNotificationsBySourceMock,
}))

import { StocksPageSimple, buildStockStatusNotifications } from '@/components/pages/stocks-simple'

describe('StocksPageSimple', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ensureApiAuthenticationMock.mockResolvedValue(true)
    apiMock.get.mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            id: 'product-1',
            name: 'Clavier mécanique',
            sku: 'CLAVIER-MECA',
            price: 7900,
            stockQuantity: 2,
            minStock: 4,
            maxStock: 12,
            isActive: true,
            isService: false,
            unit: 'pièce',
            category: { id: 'cat-1', name: 'Informatique' },
          },
          {
            id: 'product-2',
            name: 'Écran 24 pouces',
            sku: 'SCREEN-24',
            price: 22000,
            stockQuantity: 0,
            minStock: 3,
            maxStock: 20,
            isActive: true,
            isService: false,
            unit: 'pièce',
          },
          {
            id: 'product-3',
            name: 'Souris bureautique',
            sku: 'MOUSE-OFFICE',
            price: 2500,
            stockQuantity: 18,
            minStock: 5,
            maxStock: 30,
            isActive: true,
            isService: false,
            unit: 'pièce',
          },
        ],
      },
    })
  })

  it('renders the stock title in the global header, reuses the product status style, and publishes current stock alerts only', async () => {
    const { container } = render(<StocksPageSimple />)

    await waitFor(() => expect(apiMock.get).toHaveBeenCalledWith('/api/v1/products?limit=100'))

    expect(screen.getByText('Gestion des Stocks')).toBeInTheDocument()
    expect(screen.getByText('Suivi et gestion des niveaux de stock')).toBeInTheDocument()

    const table = screen.getByRole('table')
    expect(container.querySelector('.card table')).toBe(table)

    const lowStockBadge = within(table).getByText('Stock faible')
    expect(lowStockBadge).toHaveClass('bg-orange-100')
    expect(lowStockBadge).toHaveClass('text-orange-800')

    const outOfStockBadge = within(table).getByText('Rupture')
    expect(outOfStockBadge).toHaveClass('bg-red-100')
    expect(outOfStockBadge).toHaveClass('text-red-800')

    expect(upsertHeaderNotificationsBySourceMock).toHaveBeenCalledWith(
      'stock-status',
      [
        expect.objectContaining({
          id: 'stock-status-product-2',
          title: 'Rupture de stock',
          message: 'Rupture de stock : Écran 24 pouces — quantité restante : 0',
        }),
        expect.objectContaining({
          id: 'stock-status-product-1',
          title: 'Alerte stock faible',
          message: 'Stock faible : Clavier mécanique — quantité restante : 2',
        }),
      ]
    )

    expect(screen.queryByRole('button', { name: /nouveau stock/i })).not.toBeInTheDocument()
  })

  it('filters the stock list from the search field across visible stock fields', async () => {
    render(<StocksPageSimple />)

    await waitFor(() => expect(apiMock.get).toHaveBeenCalledWith('/api/v1/products?limit=100'))

    const searchInput = screen.getByRole('textbox', { name: /rechercher dans les stocks/i })

    fireEvent.change(searchInput, { target: { value: 'ecran' } })

    expect(screen.getByText('Écran 24 pouces')).toBeInTheDocument()
    expect(screen.queryByText('Clavier mécanique')).not.toBeInTheDocument()
    expect(screen.queryByText('Souris bureautique')).not.toBeInTheDocument()

    fireEvent.change(searchInput, { target: { value: 'informatique' } })

    expect(screen.getByText('Clavier mécanique')).toBeInTheDocument()
    expect(screen.queryByText('Écran 24 pouces')).not.toBeInTheDocument()

    fireEvent.change(searchInput, { target: { value: 'introuvable' } })

    expect(screen.getByText('Aucun stock ne correspond à votre recherche.')).toBeInTheDocument()
  })

  it('builds stock notifications without keeping obsolete alerts when a product changes status', () => {
    const product = {
      id: 'product-1',
      name: 'Clavier mécanique',
      sku: 'CLAVIER-MECA',
      price: 7900,
      minStock: 4,
      maxStock: 12,
      isActive: true,
      isService: false,
      unit: 'pièce',
    }

    const lowStockNotifications = buildStockStatusNotifications([
      { ...product, stockQuantity: 2 },
    ])
    expect(lowStockNotifications).toHaveLength(1)
    expect(lowStockNotifications[0]).toMatchObject({
      id: 'stock-status-product-1',
      title: 'Alerte stock faible',
      message: 'Stock faible : Clavier mécanique — quantité restante : 2',
    })

    const normalStockNotifications = buildStockStatusNotifications([
      { ...product, stockQuantity: 8 },
    ])
    expect(normalStockNotifications).toEqual([])

    const outOfStockNotifications = buildStockStatusNotifications([
      { ...product, stockQuantity: 0 },
    ])
    expect(outOfStockNotifications).toHaveLength(1)
    expect(outOfStockNotifications[0]).toMatchObject({
      id: 'stock-status-product-1',
      title: 'Rupture de stock',
      message: 'Rupture de stock : Clavier mécanique — quantité restante : 0',
    })

    const recoveredFromOutOfStockNotifications = buildStockStatusNotifications([
      { ...product, stockQuantity: 9 },
    ])
    expect(recoveredFromOutOfStockNotifications).toEqual([])
  })

  it('navigates to the existing stock edit route when clicking Modifier from the stock list', async () => {
    render(<StocksPageSimple />)

    await waitFor(() => expect(apiMock.get).toHaveBeenCalledWith('/api/v1/products?limit=100'))

    const productCell = screen.getByText('Clavier mécanique')
    const row = productCell.closest('tr')

    expect(row).not.toBeNull()

    fireEvent.click(within(row as HTMLTableRowElement).getByRole('button', { name: 'Modifier' }))

    expect(pushMock).toHaveBeenCalledWith('/stocks/product-1/edit')
  })
})