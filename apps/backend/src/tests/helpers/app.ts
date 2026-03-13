import { Quote, QuoteStatus } from '@gestion/database'
import Fastify, { FastifyInstance } from 'fastify'
import { vi } from 'vitest'

// Mock JWT plugin
const mockJwtPlugin = async (fastify: FastifyInstance) => {
  fastify.decorate('jwt', {
    sign: vi.fn().mockReturnValue('mock-token'),
    verify: vi.fn().mockReturnValue({ 
      id: 'user-123', 
      email: 'test@example.com',
      companyId: 'company-123',
      role: 'ADMIN'
    }),
  })

  fastify.addHook('preHandler', async (request: any, reply) => {
    // Mock JWT verification
    request.jwtVerify = vi.fn().mockImplementation(async () => {
      const authHeader = request.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('No token provided')
      }
      
      request.user = {
        id: 'user-123',
        email: 'test@example.com',
        companyId: 'company-123',
        role: 'ADMIN',
        firstName: 'Test',
        lastName: 'User'
      }
    })
  })
}

// Mock database
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
    payment: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    purchaseOrder: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    goodsReception: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
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
  PaymentMethod: {
    CASH: 'CASH',
    CHECK: 'CHECK',
    TRANSFER: 'TRANSFER',
    CARD: 'CARD',
    OTHER: 'OTHER',
  },
  PurchaseOrderStatus: {
    DRAFT: 'DRAFT',
    ORDERED: 'ORDERED',
    PARTIALLY_RECEIVED: 'PARTIALLY_RECEIVED',
    RECEIVED: 'RECEIVED',
    CANCELLED: 'CANCELLED',
  },
}))

export async function build(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false, // Disable logging in tests
  })

  // Register mock JWT plugin
  await app.register(mockJwtPlugin)

  // Register routes
  await app.register(async function (fastify) {
    // Import and register quote routes
    const quotesRoutes = await import('../../routes/quotes')
    await fastify.register(quotesRoutes.default, { prefix: '/api/v1/quotes' })

    // Import and register payment routes
    const paymentsRoutes = await import('../../routes/payments')
    await fastify.register(paymentsRoutes.default, { prefix: '/api/v1/payments' })

    // Import and register purchase order routes
    const purchaseOrdersRoutes = await import('../../routes/purchase-orders')
    await fastify.register(purchaseOrdersRoutes.default, { prefix: '/api/v1/purchase-orders' })

    // Import and register goods reception routes
    const goodsReceptionsRoutes = await import('../../routes/goods-receptions')
    await fastify.register(goodsReceptionsRoutes.default, { prefix: '/api/v1/purchase-orders/receptions' })

    // Import and register audit logs routes
    const auditLogsRoutes = await import('../../routes/audit-logs')
    await fastify.register(auditLogsRoutes.default, { prefix: '/api/v1/audit-logs' })

    // Import and register algeria config routes
    const algeriaConfigRoutes = await import('../../routes/algeria-config')
    await fastify.register(algeriaConfigRoutes.default, { prefix: '/api/v1/algeria-config' })
  })

  return app
}

// Helper function to create authenticated request headers
export function createAuthHeaders(token: string = 'valid-token') {
  return {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
  }
}

// Helper function to create mock user
export function createMockUser(overrides: any = {}) {
  return {
    id: 'user-123',
    email: 'test@example.com',
    companyId: 'company-123',
    role: 'ADMIN',
    firstName: 'Test',
    lastName: 'User',
    ...overrides,
  }
}

// Helper function to create mock pagination
export function createMockPagination(overrides: any = {}) {
  return {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
    ...overrides,
  }
}

// Helper function to create mock quote
export function createMockQuote(overrides: any = {}) {
  return {
    id: 'quote-123',
    number: 'DEV-2024-0001',
    status: 'DRAFT',
    clientId: 'client-123',
    companyId: 'company-123',
    validUntil: new Date('2024-12-31'),
    notes: 'Test quote',
    subtotal: 1000,
    taxAmount: 190,
    total: 1190,
    items: [
      {
        id: 'item-1',
        productId: 'product-1',
        quantity: 2,
        unitPrice: 500,
        total: 1000,
      },
    ],
    client: {
      id: 'client-123',
      firstName: 'John',
      lastName: 'Doe',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// Helper function to create mock payment
export function createMockPayment(overrides: any = {}) {
  return {
    id: 'payment-123',
    amount: 1000,
    paymentMethod: 'CASH',
    paymentDate: new Date(),
    reference: 'PAY-001',
    notes: 'Test payment',
    invoiceId: 'invoice-123',
    companyId: 'company-123',
    invoice: {
      id: 'invoice-123',
      number: 'FACT-2024-0001',
      total: 1500,
      paidAmount: 1000,
    },
    client: {
      id: 'client-123',
      firstName: 'John',
      lastName: 'Doe',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// Helper function to create mock purchase order
export function createMockPurchaseOrder(overrides: any = {}) {
  return {
    id: 'po-123',
    number: 'CF-2024-0001',
    status: 'DRAFT',
    supplierId: 'supplier-123',
    companyId: 'company-123',
    orderDate: new Date(),
    expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    notes: 'Test purchase order',
    subtotal: 2000,
    taxAmount: 380,
    total: 2380,
    items: [
      {
        id: 'item-1',
        productId: 'product-1',
        quantity: 5,
        unitPrice: 400,
        total: 2000,
        receivedQty: 0,
      },
    ],
    supplier: {
      id: 'supplier-123',
      name: 'Test Supplier',
      email: 'supplier@example.com',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// Helper function to create mock goods reception
export function createMockGoodsReception(overrides: any = {}) {
  return {
    id: 'reception-123',
    number: 'REC-2024-0001',
    purchaseOrderId: 'po-123',
    companyId: 'company-123',
    receptionDate: new Date(),
    isComplete: true,
    notes: 'Test reception',
    items: [
      {
        id: 'item-1',
        productId: 'product-1',
        quantityReceived: 5,
        unitCost: 400,
        notes: 'All items received',
      },
    ],
    purchaseOrder: {
      id: 'po-123',
      number: 'CF-2024-0001',
      supplier: {
        name: 'Test Supplier',
      },
    },
    receivedBy: {
      id: 'user-123',
      firstName: 'Test',
      lastName: 'User',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}
