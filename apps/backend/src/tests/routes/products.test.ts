import { afterEach, describe, expect, it, vi } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'

const {
  mockCreateProduct,
  mockGetProductById,
  mockGetProducts,
  mockUpdateProduct,
  mockDeleteProduct,
  mockGenerateProductsExcel,
  mockGenerateProductsPdf,
  mockCompanyFindUnique,
} = vi.hoisted(() => ({
  mockCreateProduct: vi.fn(),
  mockGetProductById: vi.fn(),
  mockGetProducts: vi.fn(),
  mockUpdateProduct: vi.fn(),
  mockDeleteProduct: vi.fn(),
  mockGenerateProductsExcel: vi.fn(),
  mockGenerateProductsPdf: vi.fn(),
  mockCompanyFindUnique: vi.fn(),
}))

vi.mock('../../services/product.service', () => ({
  ProductService: {
    createProduct: mockCreateProduct,
    getProductById: mockGetProductById,
    getProducts: mockGetProducts,
    updateProduct: mockUpdateProduct,
    deleteProduct: mockDeleteProduct,
  },
}))

vi.mock('../../services/export.service', () => ({
  ExportService: {
    generateProductsExcel: mockGenerateProductsExcel,
    generateProductsPdf: mockGenerateProductsPdf,
  },
}))

vi.mock('@gestion/database', () => ({
  prisma: {
    company: {
      findUnique: mockCompanyFindUnique,
    },
  },
}))

import productRoutes from '../../routes/products'

describe('Products routes auth scope compatibility', () => {
  let app: FastifyInstance | undefined

  afterEach(async () => {
    vi.clearAllMocks()
    if (app) {
      await app.close()
      app = undefined
    }
  })

  it('uses request.user.id when companyId is absent for GET /:id', async () => {
    app = Fastify({ logger: false })
    app.decorate('authenticate', async (request: any) => {
      request.user = { id: 'user-123' }
    })

    mockGetProductById.mockResolvedValue({ id: 'product-1' })

    await app.register(productRoutes, { prefix: '/api/v1/products' })
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/products/product-1',
    })

    expect(response.statusCode).toBe(200)
    expect(mockGetProductById).toHaveBeenCalledWith('product-1', 'user-123')
  })

  it('uses request.user.id when companyId is absent for POST /', async () => {
    app = Fastify({ logger: false })
    app.decorate('authenticate', async (request: any) => {
      request.user = { id: 'user-123' }
    })

    mockCreateProduct.mockResolvedValue({ id: 'product-2', name: 'Nouveau produit' })

    await app.register(productRoutes, { prefix: '/api/v1/products' })
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      payload: {
        name: 'Nouveau produit',
        price: 1000,
      },
    })

    expect(response.statusCode).toBe(201)
    expect(mockCreateProduct).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Nouveau produit', price: 1000 }),
      'user-123'
    )
  })

  it('uses request.user.id when companyId is absent for PUT /:id', async () => {
    app = Fastify({ logger: false })
    app.decorate('authenticate', async (request: any) => {
      request.user = { id: 'user-123' }
    })

    mockUpdateProduct.mockResolvedValue({ id: 'product-1', name: 'Produit MAJ' })

    await app.register(productRoutes, { prefix: '/api/v1/products' })
    await app.ready()

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/products/product-1',
      payload: {
        name: 'Produit MAJ',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(mockUpdateProduct).toHaveBeenCalledWith(
      'product-1',
      expect.objectContaining({ name: 'Produit MAJ' }),
      'user-123'
    )
  })

  it('uses request.user.id when companyId is absent for DELETE /:id', async () => {
    app = Fastify({ logger: false })
    app.decorate('authenticate', async (request: any) => {
      request.user = { id: 'user-123' }
    })

    mockDeleteProduct.mockResolvedValue(undefined)

    await app.register(productRoutes, { prefix: '/api/v1/products' })
    await app.ready()

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/products/product-1',
    })

    expect(response.statusCode).toBe(200)
    expect(mockDeleteProduct).toHaveBeenCalledWith('product-1', 'user-123')
  })

  it('exports the products PDF even when the authenticated scope has no companyId', async () => {
    app = Fastify({ logger: false })
    app.decorate('authenticate', async (request: any) => {
      request.user = { id: 'user-123' }
    })

    mockGetProducts.mockResolvedValue({
      data: [
        {
          id: 'product-1',
          name: 'Clavier mécanique',
          sku: 'CLAVIER-MECA',
          price: 7900,
        },
      ],
    })
    mockGenerateProductsPdf.mockResolvedValue(Buffer.from('pdf-content'))

    await app.register(productRoutes, { prefix: '/api/v1/products' })
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/products/export?format=pdf',
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('application/pdf')
    expect(mockGetProducts).toHaveBeenCalledWith('user-123', {})
    expect(mockCompanyFindUnique).not.toHaveBeenCalled()
    expect(mockGenerateProductsPdf).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'product-1', name: 'Clavier mécanique' })]),
      expect.objectContaining({ name: 'Gestion Commerciale' })
    )
  })
})