import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPrisma, mockLogger } = vi.hoisted(() => ({
  mockPrisma: {
    order: {
      findMany: vi.fn(),
    },
    client: {
      findMany: vi.fn(),
    },
    invoice: {
      findMany: vi.fn(),
    },
    stock: {
      count: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
  mockLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('../../lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('../../utils/logger', () => ({
  logger: mockLogger,
}))

import { DashboardService } from '../../services/dashboard.service'

describe('DashboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('formats recent activity with titles and timestamps based on the user scope', async () => {
    mockPrisma.order.findMany.mockResolvedValue([
      {
        id: 'order-1',
        orderNumber: 'CMD-001',
        createdAt: new Date('2026-03-07T10:00:00.000Z'),
        client: { name: 'Client Test' },
      },
    ])
    mockPrisma.client.findMany.mockResolvedValue([
      {
        id: 'client-1',
        name: 'Nouveau Client',
        createdAt: new Date('2026-03-07T09:00:00.000Z'),
      },
    ])
    mockPrisma.invoice.findMany.mockResolvedValue([
      {
        id: 'invoice-1',
        invoiceNumber: 'FAC-001',
        status: 'paid',
        createdAt: new Date('2026-03-07T08:00:00.000Z'),
      },
    ])

    const result = await DashboardService.getRecentActivity('user-123', 6)

    expect(mockPrisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-123' } }))
    expect(result).toEqual([
      expect.objectContaining({
        id: 'order-order-1',
        title: 'Commande créée',
        description: 'Commande CMD-001 créée pour Client Test',
        timestamp: '2026-03-07T10:00:00.000Z',
      }),
      expect.objectContaining({
        id: 'client-client-1',
        title: 'Client ajouté',
      }),
      expect.objectContaining({
        id: 'invoice-invoice-1',
        title: 'Facture encaissée',
      }),
    ])
  })

  it('builds alerts from stock, pending orders and overdue invoices', async () => {
    mockPrisma.stock.count.mockResolvedValue(2)
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([{ count: 4 }])
      .mockResolvedValueOnce([{ count: 1 }])

    const result = await DashboardService.getAlerts('user-456')

    expect(mockPrisma.stock.count).toHaveBeenCalledWith({
      where: {
        userId: 'user-456',
        quantity: { lte: 0 },
      },
    })
    expect(result).toEqual([
      expect.objectContaining({
        id: 'pending-orders',
        type: 'info',
        count: 4,
      }),
      expect.objectContaining({
        id: 'overdue-invoices',
        type: 'critical',
        count: 1,
      }),
      expect.objectContaining({
        id: 'out-of-stock',
        type: 'warning',
        count: 2,
      }),
    ])
  })

  it('returns an ISO currency code for dashboard stats', async () => {
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([{ total: 8, recent: 2 }])
      .mockResolvedValueOnce([{ total: 3, inStock: 2, outOfStock: 1, totalStockValue: 25000 }])
      .mockResolvedValueOnce([{ total: 5, pending: 2, accepted: 3, averageValue: 1200 }])
      .mockResolvedValueOnce([{ total: 4, paid: 2, pending: 1, overdue: 1, totalAmount: 4800, paidAmount: 3000, pendingAmount: 1800 }])
      .mockResolvedValueOnce([{ currentMonth: 3000, previousMonth: 2000 }])

    const result = await DashboardService.getDashboardStats('user-789')

    expect(result.sales.currency).toBe('DZD')
  })
})

