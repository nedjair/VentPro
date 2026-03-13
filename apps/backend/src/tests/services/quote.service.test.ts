import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { QuoteService } from '../../services/quote.service'
import { prisma, Quote, QuoteStatus } from '@gestion/database'
import { QuoteStatus } from '@gestion/database'

// Mock Prisma
vi.mock('@gestion/database', () => ({
  prisma: {
    quote: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    quoteItem: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    order: {
      create: vi.fn(),
    },
    orderItem: {
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  QuoteStatus: {
    DRAFT: 'DRAFT',
    SENT: 'SENT',
    ACCEPTED: 'ACCEPTED',
    REJECTED: 'REJECTED',
    EXPIRED: 'EXPIRED',
  },
}))

// Mock AuditLogService
vi.mock('../../services/audit-log.service', () => ({
  AuditLogService: {
    logQuoteAction: vi.fn(),
  },
  AuditAction: {
    QUOTE_CREATED: 'QUOTE_CREATED',
    QUOTE_STATUS_CHANGED: 'QUOTE_STATUS_CHANGED',
  },
}))

// Mock AlgeriaConfigService
vi.mock('../../services/algeria-config.service', () => ({
  AlgeriaConfigService: {
    generateDocumentNumber: vi.fn().mockReturnValue('DEV-2024-0001'),
  },
}))

describe('QuoteService', () => {
  const mockCompanyId = 'company-123'
  const mockUserId = 'user-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createQuote', () => {
    it('should create a quote with items successfully', async () => {
      const mockQuoteData = {
        clientId: 'client-123',
        validUntil: new Date('2024-12-31'),
        notes: 'Test quote',
        items: [
          {
            productId: 'product-1',
            quantity: 2,
            unitPrice: 100,
            total: 200,
          },
          {
            productId: 'product-2',
            quantity: 1,
            unitPrice: 50,
            total: 50,
          },
        ],
      }

      const mockCreatedQuote = {
        id: 'quote-123',
        number: 'DEV-2024-0001',
        status: QuoteStatus.DRAFT,
        clientId: mockQuoteData.clientId,
        companyId: mockCompanyId,
        validUntil: mockQuoteData.validUntil,
        notes: mockQuoteData.notes,
        subtotal: 250,
        taxAmount: 47.5,
        total: 297.5,
        items: mockQuoteData.items.map((item, index) => ({
          id: `item-${index + 1}`,
          ...item,
          quoteId: 'quote-123',
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Mock Prisma transaction
      ;(prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return callback(prisma)
      })

      // Mock quote creation
      ;(prisma.quote.create as any).mockResolvedValue(mockCreatedQuote)

      const result = await QuoteService.createQuote(mockQuoteData, mockCompanyId, mockUserId)

      expect(result).toEqual(mockCreatedQuote)
      expect(prisma.quote.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          number: 'DEV-2024-0001',
          status: QuoteStatus.DRAFT,
          clientId: mockQuoteData.clientId,
          companyId: mockCompanyId,
          validUntil: mockQuoteData.validUntil,
          notes: mockQuoteData.notes,
          subtotal: 250,
          taxAmount: 47.5,
          total: 297.5,
        }),
        include: expect.any(Object),
      })
    })

    it('should handle empty items array', async () => {
      const mockQuoteData = {
        clientId: 'client-123',
        validUntil: new Date('2024-12-31'),
        notes: 'Empty quote',
        items: [],
      }

      const mockCreatedQuote = {
        id: 'quote-123',
        number: 'DEV-2024-0001',
        status: QuoteStatus.DRAFT,
        clientId: mockQuoteData.clientId,
        companyId: mockCompanyId,
        validUntil: mockQuoteData.validUntil,
        notes: mockQuoteData.notes,
        subtotal: 0,
        taxAmount: 0,
        total: 0,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return callback(prisma)
      })

      ;(prisma.quote.create as any).mockResolvedValue(mockCreatedQuote)

      const result = await QuoteService.createQuote(mockQuoteData, mockCompanyId, mockUserId)

      expect(result.subtotal).toBe(0)
      expect(result.taxAmount).toBe(0)
      expect(result.total).toBe(0)
    })
  })

  describe('getQuoteById', () => {
    it('should return a quote by id', async () => {
      const mockQuote = {
        id: 'quote-123',
        number: 'DEV-2024-0001',
        status: QuoteStatus.DRAFT,
        clientId: 'client-123',
        companyId: mockCompanyId,
        subtotal: 250,
        taxAmount: 47.5,
        total: 297.5,
        items: [],
        client: {
          id: 'client-123',
          firstName: 'John',
          lastName: 'Doe',
        },
      }

      ;(prisma.quote.findFirst as any).mockResolvedValue(mockQuote)

      const result = await QuoteService.getQuoteById('quote-123', mockCompanyId)

      expect(result).toEqual(mockQuote)
      expect(prisma.quote.findFirst).toHaveBeenCalledWith({
        where: { id: 'quote-123', companyId: mockCompanyId },
        include: expect.any(Object),
      })
    })

    it('should return null if quote not found', async () => {
      ;(prisma.quote.findFirst as any).mockResolvedValue(null)

      const result = await QuoteService.getQuoteById('nonexistent', mockCompanyId)

      expect(result).toBeNull()
    })
  })

  describe('updateQuoteStatus', () => {
    it('should update quote status successfully', async () => {
      const mockExistingQuote = {
        id: 'quote-123',
        status: QuoteStatus.DRAFT,
        companyId: mockCompanyId,
      }

      const mockUpdatedQuote = {
        ...mockExistingQuote,
        status: QuoteStatus.SENT,
      }

      ;(prisma.quote.findFirst as any).mockResolvedValue(mockExistingQuote)
      ;(prisma.quote.update as any).mockResolvedValue(mockUpdatedQuote)

      const result = await QuoteService.updateQuoteStatus('quote-123', QuoteStatus.SENT, mockCompanyId)

      expect(result).toEqual(mockUpdatedQuote)
      expect(prisma.quote.update).toHaveBeenCalledWith({
        where: { id: 'quote-123' },
        data: { status: QuoteStatus.SENT },
        include: expect.any(Object),
      })
    })

    it('should throw error if quote not found', async () => {
      ;(prisma.quote.findFirst as any).mockResolvedValue(null)

      await expect(
        QuoteService.updateQuoteStatus('nonexistent', QuoteStatus.SENT, mockCompanyId)
      ).rejects.toThrow('Devis non trouvé')
    })
  })

  describe('getQuotes', () => {
    it('should return paginated quotes', async () => {
      const mockQuotes = [
        {
          id: 'quote-1',
          number: 'DEV-2024-0001',
          status: QuoteStatus.DRAFT,
          total: 100,
        },
        {
          id: 'quote-2',
          number: 'DEV-2024-0002',
          status: QuoteStatus.SENT,
          total: 200,
        },
      ]

      ;(prisma.quote.findMany as any).mockResolvedValue(mockQuotes)
      ;(prisma.quote.count as any).mockResolvedValue(2)

      const result = await QuoteService.getQuotes({}, mockCompanyId, { page: 1, limit: 10 })

      expect(result.data).toEqual(mockQuotes)
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        pages: 1,
      })
    })

    it('should apply filters correctly', async () => {
      const filters = {
        status: QuoteStatus.SENT,
        clientId: 'client-123',
        search: 'test',
      }

      ;(prisma.quote.findMany as any).mockResolvedValue([])
      ;(prisma.quote.count as any).mockResolvedValue(0)

      await QuoteService.getQuotes(filters, mockCompanyId, { page: 1, limit: 10 })

      expect(prisma.quote.findMany).toHaveBeenCalledWith({
        where: {
          companyId: mockCompanyId,
          status: QuoteStatus.SENT,
          clientId: 'client-123',
          OR: expect.arrayContaining([
            { number: { contains: 'test', mode: 'insensitive' } },
            { notes: { contains: 'test', mode: 'insensitive' } },
          ]),
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      })
    })
  })

  describe('deleteQuote', () => {
    it('should delete a quote successfully', async () => {
      const mockQuote = {
        id: 'quote-123',
        status: QuoteStatus.DRAFT,
        companyId: mockCompanyId,
      }

      ;(prisma.quote.findFirst as any).mockResolvedValue(mockQuote)
      ;(prisma.quote.delete as any).mockResolvedValue(mockQuote)

      await QuoteService.deleteQuote('quote-123', mockCompanyId)

      expect(prisma.quote.delete).toHaveBeenCalledWith({
        where: { id: 'quote-123' },
      })
    })

    it('should throw error if quote not found', async () => {
      ;(prisma.quote.findFirst as any).mockResolvedValue(null)

      await expect(QuoteService.deleteQuote('nonexistent', mockCompanyId)).rejects.toThrow(
        'Devis non trouvé'
      )
    })

    it('should throw error if quote is not in draft status', async () => {
      const mockQuote = {
        id: 'quote-123',
        status: QuoteStatus.SENT,
        companyId: mockCompanyId,
      }

      ;(prisma.quote.findFirst as any).mockResolvedValue(mockQuote)

      await expect(QuoteService.deleteQuote('quote-123', mockCompanyId)).rejects.toThrow(
        'Seuls les devis en brouillon peuvent être supprimés'
      )
    })
  })
})
