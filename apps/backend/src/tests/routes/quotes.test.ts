import { Quote, QuoteStatus } from '@gestion/database'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { build } from '../helpers/app'
import { FastifyInstance } from 'fastify'

// Mock services
vi.mock('../../services/quote.service', () => ({
  QuoteService: {
    createQuote: vi.fn(),
    getQuoteById: vi.fn(),
    getQuotes: vi.fn(),
    updateQuote: vi.fn(),
    updateQuoteStatus: vi.fn(),
    deleteQuote: vi.fn(),
    convertToOrder: vi.fn(),
  },
}))

vi.mock('../../services/audit-log.service', () => ({
  AuditLogService: {
    logQuoteAction: vi.fn(),
  },
  AuditAction: {
    QUOTE_CREATED: 'QUOTE_CREATED',
  },
}))

describe('Quotes Routes', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await build()
  })

  afterEach(async () => {
    await app.close()
    vi.clearAllMocks()
  })

  describe('POST /api/v1/quotes', () => {
    it('should create a quote successfully', async () => {
      const mockQuote = {
        id: 'quote-123',
        number: 'DEV-2024-0001',
        status: 'DRAFT',
        clientId: 'client-123',
        validUntil: new Date('2024-12-31'),
        subtotal: 1000,
        taxAmount: 190,
        total: 1190,
        items: [
          {
            productId: 'product-1',
            quantity: 2,
            unitPrice: 500,
            total: 1000,
          },
        ],
      }

      const { QuoteService } = await import('../../services/quote.service')
      ;(QuoteService.createQuote as any).mockResolvedValue(mockQuote)

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/quotes',
        headers: {
          authorization: 'Bearer valid-token',
        },
        payload: {
          clientId: 'client-123',
          validUntil: '2024-12-31',
          notes: 'Test quote',
          items: [
            {
              productId: 'product-1',
              quantity: 2,
              unitPrice: 500,
              total: 1000,
            },
          ],
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data).toEqual(mockQuote)
    })

    it('should return 400 for invalid data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/quotes',
        headers: {
          authorization: 'Bearer valid-token',
        },
        payload: {
          // Missing required fields
          notes: 'Test quote',
        },
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
    })

    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/quotes',
        payload: {
          clientId: 'client-123',
          validUntil: '2024-12-31',
          items: [],
        },
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /api/v1/quotes', () => {
    it('should return paginated quotes', async () => {
      const mockQuotes = {
        data: [
          {
            id: 'quote-1',
            number: 'DEV-2024-0001',
            status: 'DRAFT',
            total: 1000,
          },
          {
            id: 'quote-2',
            number: 'DEV-2024-0002',
            status: 'SENT',
            total: 2000,
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1,
        },
      }

      const { QuoteService } = await import('../../services/quote.service')
      ;(QuoteService.getQuotes as any).mockResolvedValue(mockQuotes)

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/quotes',
        headers: {
          authorization: 'Bearer valid-token',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data).toEqual(mockQuotes.data)
      expect(body.pagination).toEqual(mockQuotes.pagination)
    })

    it('should apply query filters', async () => {
      const { QuoteService } = await import('../../services/quote.service')
      ;(QuoteService.getQuotes as any).mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 },
      })

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/quotes?status=SENT&clientId=client-123&search=test&page=2&limit=5',
        headers: {
          authorization: 'Bearer valid-token',
        },
      })

      expect(response.statusCode).toBe(200)
      expect(QuoteService.getQuotes).toHaveBeenCalledWith(
        {
          status: 'SENT',
          clientId: 'client-123',
          search: 'test',
        },
        expect.any(String), // companyId
        { page: 2, limit: 5 }
      )
    })
  })

  describe('GET /api/v1/quotes/:id', () => {
    it('should return a quote by id', async () => {
      const mockQuote = {
        id: 'quote-123',
        number: 'DEV-2024-0001',
        status: 'DRAFT',
        total: 1000,
        client: {
          id: 'client-123',
          firstName: 'John',
          lastName: 'Doe',
        },
      }

      const { QuoteService } = await import('../../services/quote.service')
      ;(QuoteService.getQuoteById as any).mockResolvedValue(mockQuote)

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/quotes/quote-123',
        headers: {
          authorization: 'Bearer valid-token',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data).toEqual(mockQuote)
    })

    it('should return 404 if quote not found', async () => {
      const { QuoteService } = await import('../../services/quote.service')
      ;(QuoteService.getQuoteById as any).mockResolvedValue(null)

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/quotes/nonexistent',
        headers: {
          authorization: 'Bearer valid-token',
        },
      })

      expect(response.statusCode).toBe(404)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.message).toBe('Devis non trouvé')
    })
  })

  describe('PATCH /api/v1/quotes/:id/status', () => {
    it('should update quote status successfully', async () => {
      const mockUpdatedQuote = {
        id: 'quote-123',
        number: 'DEV-2024-0001',
        status: 'SENT',
        total: 1000,
      }

      const { QuoteService } = await import('../../services/quote.service')
      ;(QuoteService.updateQuoteStatus as any).mockResolvedValue(mockUpdatedQuote)

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/quotes/quote-123/status',
        headers: {
          authorization: 'Bearer valid-token',
        },
        payload: {
          status: 'SENT',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data).toEqual(mockUpdatedQuote)
    })

    it('should return 400 for invalid status', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/quotes/quote-123/status',
        headers: {
          authorization: 'Bearer valid-token',
        },
        payload: {
          status: 'INVALID_STATUS',
        },
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
    })
  })

  describe('POST /api/v1/quotes/:id/convert-to-order', () => {
    it('should convert quote to order successfully', async () => {
      const mockOrder = {
        id: 'order-123',
        number: 'CMD-2024-0001',
        status: 'DRAFT',
        total: 1000,
        quoteId: 'quote-123',
      }

      const { QuoteService } = await import('../../services/quote.service')
      ;(QuoteService.convertToOrder as any).mockResolvedValue(mockOrder)

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/quotes/quote-123/convert-to-order',
        headers: {
          authorization: 'Bearer valid-token',
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data).toEqual(mockOrder)
    })
  })

  describe('DELETE /api/v1/quotes/:id', () => {
    it('should delete a quote successfully', async () => {
      const { QuoteService } = await import('../../services/quote.service')
      ;(QuoteService.deleteQuote as any).mockResolvedValue(undefined)

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/quotes/quote-123',
        headers: {
          authorization: 'Bearer valid-token',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.message).toBe('Devis supprimé avec succès')
    })

    it('should handle service errors', async () => {
      const { QuoteService } = await import('../../services/quote.service')
      ;(QuoteService.deleteQuote as any).mockRejectedValue(new Error('Cannot delete quote'))

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/quotes/quote-123',
        headers: {
          authorization: 'Bearer valid-token',
        },
      })

      expect(response.statusCode).toBe(500)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.error).toBe('Cannot delete quote')
    })
  })
})
