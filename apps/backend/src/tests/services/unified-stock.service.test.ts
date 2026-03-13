import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPrisma, mockLogger } = vi.hoisted(() => ({
  mockPrisma: {
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  },
  mockLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('../../lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('../../utils/logger', () => ({
  logger: mockLogger,
}))

import { UnifiedStockService } from '../../services/unified-stock.service'

describe('UnifiedStockService.read models', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns category metadata on the unified stock detail endpoint', async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([
      {
        id: 'product-1',
        name: 'Produit test',
        sku: 'PROD-1',
        price: 1000,
        stockQuantity: 9,
        minStock: 2,
        maxStock: 25,
        categoryId: 'cat-1',
        categoryName: 'Papeterie',
        categoryDescription: 'Fournitures papier',
        categoryCreatedAt: new Date('2026-03-06T09:00:00.000Z'),
        categoryUpdatedAt: new Date('2026-03-07T09:00:00.000Z'),
        updatedAt: new Date('2026-03-07T10:00:00.000Z'),
        lastUpdate: new Date('2026-03-07T10:00:00.000Z'),
      },
    ])

    const result = await UnifiedStockService.getUnifiedProductStock('product-1', 'user-1')

    expect(result).toMatchObject({
      id: 'product-1',
      categoryId: 'cat-1',
      category: {
        id: 'cat-1',
        name: 'Papeterie',
        description: 'Fournitures papier',
      },
      stockQuantity: 9,
      minStock: 2,
      maxStock: 25,
    })
  })

  it('keeps category mapping when filtering unified stock by status', async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([
      {
        id: 'product-low',
        name: 'Produit faible',
        sku: 'LOW-1',
        price: 500,
        stockQuantity: 1,
        minStock: 2,
        maxStock: 10,
        categoryId: 'cat-low',
        categoryName: 'Alertes',
        categoryDescription: null,
        categoryCreatedAt: new Date('2026-03-06T09:00:00.000Z'),
        categoryUpdatedAt: new Date('2026-03-07T09:00:00.000Z'),
        updatedAt: new Date('2026-03-07T10:00:00.000Z'),
        lastUpdate: new Date('2026-03-07T10:00:00.000Z'),
      },
      {
        id: 'product-ok',
        name: 'Produit normal',
        sku: 'OK-1',
        price: 500,
        stockQuantity: 8,
        minStock: 2,
        maxStock: 10,
        categoryId: null,
        categoryName: null,
        categoryDescription: null,
        categoryCreatedAt: null,
        categoryUpdatedAt: null,
        updatedAt: new Date('2026-03-07T10:00:00.000Z'),
        lastUpdate: new Date('2026-03-07T10:00:00.000Z'),
      },
    ])

    const result = await UnifiedStockService.getAllUnifiedProductsStock('user-1', { status: 'low' })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: 'product-low',
      status: 'low',
      categoryId: 'cat-low',
      category: {
        id: 'cat-low',
        name: 'Alertes',
      },
    })
  })
})

describe('UnifiedStockService.updateUnifiedStock', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a stock row and persists min/max thresholds in the current schema', async () => {
    const tx = {
      product: {
        findFirst: vi.fn().mockResolvedValue({ id: 'product-1' }),
      },
      stock: {
        update: vi.fn(),
        create: vi.fn().mockResolvedValue({ id: 'stock-1' }),
      },
      $executeRaw: vi.fn().mockResolvedValue(1),
      $queryRaw: vi.fn().mockResolvedValue([]),
    }

    mockPrisma.$transaction.mockImplementation(async (callback: (trx: typeof tx) => Promise<unknown>) => {
      return callback(tx)
    })

    mockPrisma.$queryRaw.mockResolvedValue([
      {
        id: 'product-1',
        name: 'Produit test',
        sku: 'PROD-1',
        price: 1000,
        tvaRate: 19,
        createdAt: new Date('2026-03-07T09:00:00.000Z'),
        updatedAt: new Date('2026-03-07T09:00:00.000Z'),
        stockQuantity: 9,
        minStock: 2,
        maxStock: 25,
        lastUpdate: new Date('2026-03-07T09:00:00.000Z'),
      },
    ])

    const result = await UnifiedStockService.updateUnifiedStock('product-1', 'user-1', {
      stockQuantity: 9,
      minStock: 2,
      maxStock: 25,
    })

    expect(tx.$executeRaw).toHaveBeenCalledTimes(1)
    expect(tx.stock.create).toHaveBeenCalledWith({
      data: {
        quantity: 9,
        productId: 'product-1',
        userId: 'user-1',
      },
    })
    expect(result).toMatchObject({
      id: 'product-1',
      stockQuantity: 9,
      minStock: 2,
      maxStock: 25,
    })
  })
})

