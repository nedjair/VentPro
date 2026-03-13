import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPrisma, mockLogger, mockUnifiedStockService } = vi.hoisted(() => ({
  mockPrisma: {
    $queryRaw: vi.fn(),
    product: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    stock: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    orderItem: {
      count: vi.fn(),
    },
  },
  mockLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  mockUnifiedStockService: {
    updateUnifiedStock: vi.fn(),
  },
}))

vi.mock('../../lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('../../utils/logger', () => ({
  logger: mockLogger,
}))

vi.mock('../../services/unified-stock.service', () => ({
  UnifiedStockService: mockUnifiedStockService,
}))

import { ProductService } from '../../services/product.service'

describe('ProductService compatibility with current local product schema', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads a product by scoped userId and normalizes it for the frontend', async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([{
      id: 'product-1',
      name: 'Ramette A4',
      description: 'Papier bureautique',
      sku: 'RAM-A4',
      barcode: '12345678',
      price: 675,
      cost: 420,
      tvaRate: 19,
      minStock: 3,
      maxStock: 20,
      userId: 'user-1',
      createdAt: new Date('2026-03-07T09:00:00.000Z'),
      updatedAt: new Date('2026-03-07T10:00:00.000Z'),
      stockQuantity: 12,
      stockUpdatedAt: new Date('2026-03-07T10:00:00.000Z'),
      categoryId: 'cat-1',
      categoryName: 'Papeterie',
      categoryDescription: 'Fournitures papier',
      categoryCreatedAt: new Date('2026-03-06T09:00:00.000Z'),
      categoryUpdatedAt: new Date('2026-03-07T08:00:00.000Z'),
    }])

    const result = await ProductService.getProductById('product-1', 'user-1')

    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({
      id: 'product-1',
      name: 'Ramette A4',
      reference: 'RAM-A4',
      stock: 12,
      costPrice: 420,
      minStock: 3,
      maxStock: 20,
      categoryId: 'cat-1',
      trackStock: true,
    })
  })

  it('creates a product in the current schema using the scoped userId', async () => {
    mockPrisma.product.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)

    mockPrisma.$queryRaw
      .mockResolvedValueOnce([{ id: 'cat-1' }])
      .mockResolvedValueOnce([{ id: 'product-4' }])
      .mockResolvedValueOnce([{
        id: 'product-4',
        name: 'Clavier mécanique',
        description: 'Switches tactiles',
        sku: 'CLAVIER-MECA',
        barcode: '1234567890123',
        price: 7900,
        cost: 3500,
        tvaRate: 19,
        minStock: 4,
        maxStock: 20,
        userId: 'user-1',
        createdAt: new Date('2026-03-07T09:00:00.000Z'),
        updatedAt: new Date('2026-03-07T09:00:00.000Z'),
        stockQuantity: 15,
        stockUpdatedAt: new Date('2026-03-07T09:00:00.000Z'),
        categoryId: 'cat-1',
        categoryName: 'Informatique',
        categoryDescription: 'Périphériques',
        categoryCreatedAt: new Date('2026-03-01T09:00:00.000Z'),
        categoryUpdatedAt: new Date('2026-03-07T09:00:00.000Z'),
      }])

    mockPrisma.product.create.mockResolvedValue({
      id: 'product-4',
    })

    mockPrisma.stock.create.mockResolvedValue({
      id: 'stock-4',
      quantity: 15,
      updatedAt: new Date('2026-03-07T09:00:00.000Z'),
    })

    const result = await ProductService.createProduct({
      name: 'Clavier mécanique',
      description: 'Switches tactiles',
      sku: 'CLAVIER-MECA',
      barcode: '1234567890123',
      price: 7900,
      cost: 3500,
      stockQuantity: 15,
      minStock: 4,
      maxStock: 20,
      categoryId: 'cat-1',
      vatRate: 19,
    }, 'user-1')

    expect(mockPrisma.stock.create).toHaveBeenCalledWith({
      data: {
        quantity: 15,
        productId: 'product-4',
        userId: 'user-1',
      },
    })
    expect(mockPrisma.product.findFirst).toHaveBeenCalledTimes(2)
    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(3)
    expect(result).toMatchObject({
      id: 'product-4',
      name: 'Clavier mécanique',
      reference: 'CLAVIER-MECA',
      stock: 15,
      costPrice: 3500,
      minStock: 4,
      maxStock: 20,
      categoryId: 'cat-1',
    })
  })

  it('maps prisma unique constraint errors on sku to a clear business error', async () => {
    mockPrisma.product.findFirst.mockResolvedValueOnce(null)
    mockPrisma.$queryRaw.mockRejectedValue({
      code: 'P2002',
      meta: { target: ['sku'] },
    })

    await expect(ProductService.createProduct({
      name: 'Clavier mécanique',
      sku: 'CLAVIER-MECA',
      price: 7900,
    }, 'user-1')).rejects.toThrow('Un produit avec ce SKU existe déjà')
  })

  it('updates a product in the current schema using the scoped userId', async () => {
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([{
        id: 'product-2',
        name: 'Ancien Produit',
        description: null,
        sku: 'OLD-SKU',
        barcode: '12345678',
        price: 100,
        cost: 80,
        tvaRate: 19,
        minStock: 1,
        maxStock: 8,
        userId: 'user-1',
        createdAt: new Date('2026-03-07T09:00:00.000Z'),
        updatedAt: new Date('2026-03-07T09:00:00.000Z'),
        stockQuantity: 0,
        stockUpdatedAt: null,
        categoryId: 'cat-1',
        categoryName: 'Ancienne catégorie',
        categoryDescription: null,
        categoryCreatedAt: new Date('2026-03-06T09:00:00.000Z'),
        categoryUpdatedAt: new Date('2026-03-07T08:00:00.000Z'),
      }])
      .mockResolvedValueOnce([{ id: 'cat-2' }])
      .mockResolvedValueOnce([{ id: 'product-2' }])
      .mockResolvedValueOnce([{
        id: 'product-2',
        name: 'Produit MAJ',
        description: 'Nouvelle description',
        sku: 'NEW-SKU',
        barcode: '87654321',
        price: 150,
        cost: 95,
        tvaRate: 19,
        minStock: 2,
        maxStock: 12,
        userId: 'user-1',
        createdAt: new Date('2026-03-07T09:00:00.000Z'),
        updatedAt: new Date('2026-03-07T11:00:00.000Z'),
        stockQuantity: 4,
        stockUpdatedAt: new Date('2026-03-07T11:00:00.000Z'),
        categoryId: 'cat-2',
        categoryName: 'Informatique',
        categoryDescription: 'Périphériques',
        categoryCreatedAt: new Date('2026-03-01T09:00:00.000Z'),
        categoryUpdatedAt: new Date('2026-03-07T11:00:00.000Z'),
      }])

    mockPrisma.product.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)

    const result = await ProductService.updateProduct('product-2', {
      name: 'Produit MAJ',
      description: 'Nouvelle description',
      sku: 'NEW-SKU',
      barcode: '87654321',
      price: 150,
      cost: 95,
      categoryId: 'cat-2',
      stockQuantity: 4,
      minStock: 2,
      maxStock: 12,
    }, 'user-1')

    expect(mockUnifiedStockService.updateUnifiedStock).toHaveBeenCalledWith('product-2', 'user-1', {
      stockQuantity: 4,
      minStock: 2,
      maxStock: 12,
    })
    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(4)
    expect(result).toMatchObject({
      id: 'product-2',
      name: 'Produit MAJ',
      reference: 'NEW-SKU',
      stock: 4,
      costPrice: 95,
      categoryId: 'cat-2',
    })
  })

  it('deletes a product from the current schema when no orders reference it', async () => {
    mockPrisma.product.findFirst.mockResolvedValue({ id: 'product-3' })
    mockPrisma.orderItem.count.mockResolvedValue(0)

    await ProductService.deleteProduct('product-3', 'user-1')

    expect(mockPrisma.stock.deleteMany).toHaveBeenCalledWith({
      where: { productId: 'product-3', userId: 'user-1' },
    })
    expect(mockPrisma.product.delete).toHaveBeenCalledWith({
      where: { id: 'product-3' },
    })
  })
})