import { afterEach, describe, expect, it, vi } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    orderItem: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@gestion/database', () => ({
  prisma: mockPrisma,
}))

vi.mock('../../services/dashboard.service', () => ({
  DashboardService: {},
}))

vi.mock('../../services/kpi-target-settings.service', () => ({
  KpiTargetSettingsService: {},
}))

import analyticsRoutes from '../../routes/analytics'

describe('Analytics routes product category aggregation', () => {
  let app: FastifyInstance | undefined

  afterEach(async () => {
    vi.clearAllMocks()
    if (app) {
      await app.close()
      app = undefined
    }
  })

  it('returns category names from joined products and aggregates distribution across all sold products', async () => {
    app = Fastify({ logger: false })
    app.decorate('authenticate', async (request: any) => {
      request.user = { id: 'user-123' }
    })

    mockPrisma.orderItem.findMany.mockResolvedValue([
      {
        quantity: 3,
        price: 1200,
        orderId: 'order-1',
        productId: 'product-1',
        product: {
          id: 'product-1',
          name: 'Switch 8 ports',
          price: 1200,
          category: { name: 'Réseau' },
        },
      },
      {
        quantity: 1,
        price: 1200,
        orderId: 'order-2',
        productId: 'product-1',
        product: {
          id: 'product-1',
          name: 'Switch 8 ports',
          price: 1200,
          category: { name: 'Réseau' },
        },
      },
      {
        quantity: 2,
        price: 900,
        orderId: 'order-2',
        productId: 'product-2',
        product: {
          id: 'product-2',
          name: 'Câble RJ45',
          price: 900,
          category: { name: 'Réseau' },
        },
      },
      {
        quantity: 5,
        price: 300,
        orderId: 'order-3',
        productId: 'product-3',
        product: {
          id: 'product-3',
          name: 'Bloc multiprise',
          price: 300,
          category: null,
        },
      },
    ])

    await app.register(analyticsRoutes, { prefix: '/api/v1/analytics' })
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/products?period=3m&limit=2',
    })

    expect(response.statusCode).toBe(200)
    expect(mockPrisma.orderItem.findMany).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({
        product: expect.objectContaining({
          select: expect.objectContaining({
            category: {
              select: {
                name: true,
              },
            },
          }),
        }),
      }),
    }))

    const payload = response.json()

    expect(payload.data.topProducts).toEqual([
      expect.objectContaining({
        id: 'product-1',
        category: 'Réseau',
        totalQuantity: 4,
        totalRevenue: 4800,
      }),
      expect.objectContaining({
        id: 'product-2',
        category: 'Réseau',
        totalQuantity: 2,
        totalRevenue: 1800,
      }),
    ])

    expect(payload.data.categoryDistribution).toEqual([
      {
        category: 'Réseau',
        totalQuantity: 6,
        totalRevenue: 6600,
        productCount: 2,
      },
      {
        category: 'Non catégorisé',
        totalQuantity: 5,
        totalRevenue: 1500,
        productCount: 1,
      },
    ])
  })
})