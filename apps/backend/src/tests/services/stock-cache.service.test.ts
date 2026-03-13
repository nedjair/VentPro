import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { StockCacheService } from '../../services/stock-cache.service'
import { prisma, Product } from '@gestion/database'

// Mock Prisma
vi.mock('@gestion/database', () => ({
  prisma: {
    stock: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

describe('StockCacheService', () => {
  const mockCompanyId = 'company-123'
  const mockProductId = 'product-123'

  beforeEach(() => {
    vi.clearAllMocks()
    // Clear cache before each test
    ;(StockCacheService as any).cache.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getProductStock', () => {
    it('should fetch stock from database when not cached', async () => {
      const mockStock = {
        id: 'stock-123',
        productId: mockProductId,
        companyId: mockCompanyId,
        quantiteActuelle: 100,
        quantiteMinimale: 10,
        quantiteMaximale: 500,
        product: {
          id: mockProductId,
          name: 'Test Product',
          isService: false,
        },
      }

      ;(prisma.stock.findFirst as any).mockResolvedValue(mockStock)

      const result = await StockCacheService.getProductStock(mockProductId, mockCompanyId)

      expect(result).toEqual({
        productId: mockProductId,
        companyId: mockCompanyId,
        quantity: 100,
        lastUpdated: expect.any(Date),
        minThreshold: 10,
        maxThreshold: 500,
      })

      expect(prisma.stock.findFirst).toHaveBeenCalledWith({
        where: { productId: mockProductId, companyId: mockCompanyId },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              isService: true,
            },
          },
        },
      })
    })

    it('should return cached stock when available and valid', async () => {
      // First call to populate cache
      const mockStock = {
        id: 'stock-123',
        productId: mockProductId,
        companyId: mockCompanyId,
        quantiteActuelle: 100,
        quantiteMinimale: 10,
        quantiteMaximale: 500,
        product: {
          id: mockProductId,
          name: 'Test Product',
          isService: false,
        },
      }

      ;(prisma.stock.findFirst as any).mockResolvedValue(mockStock)

      await StockCacheService.getProductStock(mockProductId, mockCompanyId)

      // Clear mock to ensure second call uses cache
      vi.clearAllMocks()

      const result = await StockCacheService.getProductStock(mockProductId, mockCompanyId)

      expect(result).toEqual({
        productId: mockProductId,
        companyId: mockCompanyId,
        quantity: 100,
        lastUpdated: expect.any(Date),
        minThreshold: 10,
        maxThreshold: 500,
      })

      // Should not call database again
      expect(prisma.stock.findFirst).not.toHaveBeenCalled()
    })

    it('should return null when stock not found', async () => {
      ;(prisma.stock.findFirst as any).mockResolvedValue(null)

      const result = await StockCacheService.getProductStock(mockProductId, mockCompanyId)

      expect(result).toBeNull()
    })

    it('should handle database errors gracefully', async () => {
      ;(prisma.stock.findFirst as any).mockRejectedValue(new Error('Database error'))

      const result = await StockCacheService.getProductStock(mockProductId, mockCompanyId)

      expect(result).toBeNull()
    })
  })

  describe('getBatchProductStocks', () => {
    it('should fetch multiple stocks efficiently', async () => {
      const productIds = ['product-1', 'product-2', 'product-3']
      const mockStocks = [
        {
          id: 'stock-1',
          productId: 'product-1',
          companyId: mockCompanyId,
          quantiteActuelle: 100,
          quantiteMinimale: 10,
          quantiteMaximale: null,
          product: { id: 'product-1', name: 'Product 1', isService: false },
        },
        {
          id: 'stock-2',
          productId: 'product-2',
          companyId: mockCompanyId,
          quantiteActuelle: 50,
          quantiteMinimale: 5,
          quantiteMaximale: 200,
          product: { id: 'product-2', name: 'Product 2', isService: false },
        },
      ]

      ;(prisma.stock.findMany as any).mockResolvedValue(mockStocks)

      const result = await StockCacheService.getBatchProductStocks(productIds, mockCompanyId)

      expect(result.size).toBe(2)
      expect(result.get('product-1')).toEqual({
        productId: 'product-1',
        companyId: mockCompanyId,
        quantity: 100,
        lastUpdated: expect.any(Date),
        minThreshold: 10,
        maxThreshold: undefined,
      })
      expect(result.get('product-2')).toEqual({
        productId: 'product-2',
        companyId: mockCompanyId,
        quantity: 50,
        lastUpdated: expect.any(Date),
        minThreshold: 5,
        maxThreshold: 200,
      })

      expect(prisma.stock.findMany).toHaveBeenCalledWith({
        where: {
          productId: { in: productIds },
          companyId: mockCompanyId,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              isService: true,
            },
          },
        },
      })
    })

    it('should use cached entries when available', async () => {
      const productIds = ['product-1', 'product-2']

      // Pre-populate cache for product-1
      StockCacheService.updateCache('product-1', mockCompanyId, 100, 10, 500)

      const mockStocks = [
        {
          id: 'stock-2',
          productId: 'product-2',
          companyId: mockCompanyId,
          quantiteActuelle: 50,
          quantiteMinimale: 5,
          quantiteMaximale: 200,
          product: { id: 'product-2', name: 'Product 2', isService: false },
        },
      ]

      ;(prisma.stock.findMany as any).mockResolvedValue(mockStocks)

      const result = await StockCacheService.getBatchProductStocks(productIds, mockCompanyId)

      expect(result.size).toBe(2)
      expect(result.get('product-1')).toEqual({
        productId: 'product-1',
        companyId: mockCompanyId,
        quantity: 100,
        lastUpdated: expect.any(Date),
        minThreshold: 10,
        maxThreshold: 500,
      })

      // Should only fetch product-2 from database
      expect(prisma.stock.findMany).toHaveBeenCalledWith({
        where: {
          productId: { in: ['product-2'] },
          companyId: mockCompanyId,
        },
        include: expect.any(Object),
      })
    })
  })

  describe('updateCache', () => {
    it('should update cache entry', () => {
      StockCacheService.updateCache(mockProductId, mockCompanyId, 150, 15, 600)

      const cacheKey = `${mockCompanyId}:${mockProductId}`
      const cache = (StockCacheService as any).cache
      const entry = cache.get(cacheKey)

      expect(entry).toEqual({
        productId: mockProductId,
        companyId: mockCompanyId,
        quantity: 150,
        lastUpdated: expect.any(Date),
        minThreshold: 15,
        maxThreshold: 600,
      })
    })

    it('should preserve existing thresholds when not provided', () => {
      // First update with thresholds
      StockCacheService.updateCache(mockProductId, mockCompanyId, 100, 10, 500)

      // Second update without thresholds
      StockCacheService.updateCache(mockProductId, mockCompanyId, 150)

      const cacheKey = `${mockCompanyId}:${mockProductId}`
      const cache = (StockCacheService as any).cache
      const entry = cache.get(cacheKey)

      expect(entry.quantiteActuelle).toBe(150)
      expect(entry.quantiteMinimale).toBe(10)
      expect(entry.quantiteMaximale).toBe(500)
    })
  })

  describe('invalidateCache', () => {
    it('should remove specific cache entry', () => {
      StockCacheService.updateCache(mockProductId, mockCompanyId, 100, 10, 500)

      const cacheKey = `${mockCompanyId}:${mockProductId}`
      const cache = (StockCacheService as any).cache

      expect(cache.has(cacheKey)).toBe(true)

      StockCacheService.invalidateCache(mockProductId, mockCompanyId)

      expect(cache.has(cacheKey)).toBe(false)
    })
  })

  describe('invalidateCompanyCache', () => {
    it('should remove all cache entries for a company', () => {
      StockCacheService.updateCache('product-1', mockCompanyId, 100, 10, 500)
      StockCacheService.updateCache('product-2', mockCompanyId, 50, 5, 200)
      StockCacheService.updateCache('product-3', 'other-company', 75, 7, 300)

      const cache = (StockCacheService as any).cache
      expect(cache.size).toBe(3)

      StockCacheService.invalidateCompanyCache(mockCompanyId)

      expect(cache.size).toBe(1)
      expect(cache.has('other-company:product-3')).toBe(true)
    })
  })

  describe('checkStockAvailability', () => {
    it('should return availability status', async () => {
      const mockStock = {
        id: 'stock-123',
        productId: mockProductId,
        companyId: mockCompanyId,
        quantiteActuelle: 100,
        quantiteMinimale: 10,
        quantiteMaximale: 500,
        product: {
          id: mockProductId,
          name: 'Test Product',
          isService: false,
        },
      }

      ;(prisma.stock.findFirst as any).mockResolvedValue(mockStock)

      const result = await StockCacheService.checkStockAvailability(mockProductId, 50, mockCompanyId)

      expect(result).toEqual({
        available: true,
        currentStock: 100,
      })
    })

    it('should return unavailable when stock insufficient', async () => {
      const mockStock = {
        id: 'stock-123',
        productId: mockProductId,
        companyId: mockCompanyId,
        quantiteActuelle: 30,
        quantiteMinimale: 10,
        quantiteMaximale: 500,
        product: {
          id: mockProductId,
          name: 'Test Product',
          isService: false,
        },
      }

      ;(prisma.stock.findFirst as any).mockResolvedValue(mockStock)

      const result = await StockCacheService.checkStockAvailability(mockProductId, 50, mockCompanyId)

      expect(result).toEqual({
        available: false,
        currentStock: 30,
        message: 'Stock insuffisant. Disponible: 30, Demandé: 50',
      })
    })

    it('should return unavailable when product not found', async () => {
      ;(prisma.stock.findFirst as any).mockResolvedValue(null)

      const result = await StockCacheService.checkStockAvailability(mockProductId, 50, mockCompanyId)

      expect(result).toEqual({
        available: false,
        currentStock: 0,
        message: 'Produit non trouvé en stock',
      })
    })
  })

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      // Add some entries to cache
      StockCacheService.updateCache('product-1', mockCompanyId, 100, 10, 500)
      StockCacheService.updateCache('product-2', mockCompanyId, 50, 5, 200)

      const stats = StockCacheService.getCacheStats()

      expect(stats.totalEntries).toBe(2)
      expect(stats.validEntries).toBe(2)
      expect(stats.expiredEntries).toBe(0)
    })
  })
})
