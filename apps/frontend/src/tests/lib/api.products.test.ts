import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requestMock, axiosCreateMock } = vi.hoisted(() => {
  const request = vi.fn()
  const client = {
    request,
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  }

  return {
    requestMock: request,
    axiosCreateMock: vi.fn(() => client),
  }
})

vi.mock('axios', () => ({
  default: {
    create: axiosCreateMock,
  },
  create: axiosCreateMock,
  isAxiosError: () => false,
}))

describe('api product payload mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requestMock.mockResolvedValue({
      data: {
        success: true,
        data: { id: 'product-1' },
      },
    })
  })

  it('maps createProduct to the backend camelCase contract', async () => {
    const { api } = await import('@/lib/api')

    await api.createProduct({
      name: 'Clavier mécanique',
      sku: 'CLAVIER-MECA',
      barcode: '1234567890123',
      price: 7900,
      costPrice: 3500,
      stock: 15,
      minStock: 4,
      maxStock: 20,
      categoryId: 'cat-1',
      unit: 'pièce',
      isActive: true,
      trackStock: true,
      allowBackorder: false,
    })

    expect(requestMock).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST',
      url: '/api/v1/products',
      data: expect.objectContaining({
        sku: 'CLAVIER-MECA',
        barcode: '1234567890123',
        price: 7900,
        cost: 3500,
        stockQuantity: 15,
        minStock: 4,
        maxStock: 20,
        categoryId: 'cat-1',
        unit: 'pièce',
        isActive: true,
        isService: false,
        vatRate: 20,
      }),
    }))
  })

  it('maps updateProduct to the same backend contract', async () => {
    const { api } = await import('@/lib/api')

    await api.updateProduct('product-1', {
      name: 'Clavier mécanique v2',
      stockQuantity: 9,
      minStock: 2,
      maxStock: 12,
      categoryId: 'cat-2',
      costPrice: 4100,
      price: 8200,
    })

    expect(requestMock).toHaveBeenCalledWith(expect.objectContaining({
      method: 'PUT',
      url: '/api/v1/products/product-1',
      data: expect.objectContaining({
        name: 'Clavier mécanique v2',
        stockQuantity: 9,
        minStock: 2,
        maxStock: 12,
        categoryId: 'cat-2',
        cost: 4100,
        price: 8200,
      }),
    }))
  })

  it('does not retry createProduct when the backend rejects the creation', async () => {
    const { api } = await import('@/lib/api')
    requestMock.mockRejectedValueOnce(new Error('HTTP 400: Un produit avec ce SKU existe déjà'))

    await expect(api.createProduct({
      name: 'Clavier mécanique',
      sku: 'CLAVIER-MECA',
      price: 7900,
    })).rejects.toThrow('HTTP 400: Un produit avec ce SKU existe déjà')

    expect(requestMock).toHaveBeenCalledTimes(1)
  })
})

