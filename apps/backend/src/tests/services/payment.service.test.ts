import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PaymentService } from '../../services/payment.service'
import { prisma, PaymentReminder } from '@gestion/database'
import { PaymentMethod } from '@gestion/database'

// Mock Prisma
vi.mock('@gestion/database', () => ({
  prisma: {
    payment: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    invoice: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    paymentReminder: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  PaymentMethod: {
    CASH: 'CASH',
    CHECK: 'CHECK',
    TRANSFER: 'TRANSFER',
    CARD: 'CARD',
    OTHER: 'OTHER',
  },
}))

// Mock AuditLogService
vi.mock('../../services/audit-log.service', () => ({
  AuditLogService: {
    logPaymentAction: vi.fn(),
  },
  AuditAction: {
    PAYMENT_CREATED: 'PAYMENT_CREATED',
    PAYMENT_UPDATED: 'PAYMENT_UPDATED',
  },
}))

describe('PaymentService', () => {
  const mockCompanyId = 'company-123'
  const mockUserId = 'user-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createPayment', () => {
    it('should create a payment successfully', async () => {
      const mockPaymentData = {
        invoiceId: 'invoice-123',
        amount: 1000,
        paymentMethod: PaymentMethod.CASH,
        paymentDate: new Date('2024-01-15'),
        reference: 'PAY-001',
        notes: 'Cash payment',
      }

      const mockInvoice = {
        id: 'invoice-123',
        total: 1500,
        paidAmount: 500,
        companyId: mockCompanyId,
        client: {
          id: 'client-123',
          firstName: 'John',
          lastName: 'Doe',
        },
      }

      const mockCreatedPayment = {
        id: 'payment-123',
        ...mockPaymentData,
        companyId: mockCompanyId,
        createdAt: new Date(),
        updatedAt: new Date(),
        invoice: mockInvoice,
      }

      // Mock transaction
      ;(prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return callback(prisma)
      })

      ;(prisma.invoice.findFirst as any).mockResolvedValue(mockInvoice)
      ;(prisma.payment.create as any).mockResolvedValue(mockCreatedPayment)
      ;(prisma.invoice.update as any).mockResolvedValue({
        ...mockInvoice,
        paidAmount: 1500,
      })

      const result = await PaymentService.createPayment(mockPaymentData, mockCompanyId, mockUserId)

      expect(result).toEqual(mockCreatedPayment)
      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...mockPaymentData,
          companyId: mockCompanyId,
        }),
        include: expect.any(Object),
      })
    })

    it('should throw error if invoice not found', async () => {
      const mockPaymentData = {
        invoiceId: 'nonexistent',
        amount: 1000,
        paymentMethod: PaymentMethod.CASH,
        paymentDate: new Date(),
      }

      ;(prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return callback(prisma)
      })

      ;(prisma.invoice.findFirst as any).mockResolvedValue(null)

      await expect(
        PaymentService.createPayment(mockPaymentData, mockCompanyId, mockUserId)
      ).rejects.toThrow('Facture non trouvée')
    })

    it('should throw error if payment amount exceeds remaining balance', async () => {
      const mockPaymentData = {
        invoiceId: 'invoice-123',
        amount: 2000, // More than remaining balance
        paymentMethod: PaymentMethod.CASH,
        paymentDate: new Date(),
      }

      const mockInvoice = {
        id: 'invoice-123',
        total: 1500,
        paidAmount: 500, // Remaining: 1000
        companyId: mockCompanyId,
      }

      ;(prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return callback(prisma)
      })

      ;(prisma.invoice.findFirst as any).mockResolvedValue(mockInvoice)

      await expect(
        PaymentService.createPayment(mockPaymentData, mockCompanyId, mockUserId)
      ).rejects.toThrow('Le montant du paiement dépasse le solde restant')
    })
  })

  describe('getPaymentById', () => {
    it('should return a payment by id', async () => {
      const mockPayment = {
        id: 'payment-123',
        amount: 1000,
        paymentMethod: PaymentMethod.CASH,
        companyId: mockCompanyId,
        invoice: {
          id: 'invoice-123',
          number: 'INV-001',
        },
        client: {
          id: 'client-123',
          firstName: 'John',
          lastName: 'Doe',
        },
      }

      ;(prisma.payment.findFirst as any).mockResolvedValue(mockPayment)

      const result = await PaymentService.getPaymentById('payment-123', mockCompanyId)

      expect(result).toEqual(mockPayment)
      expect(prisma.payment.findFirst).toHaveBeenCalledWith({
        where: { id: 'payment-123', companyId: mockCompanyId },
        include: expect.any(Object),
      })
    })

    it('should return null if payment not found', async () => {
      ;(prisma.payment.findFirst as any).mockResolvedValue(null)

      const result = await PaymentService.getPaymentById('nonexistent', mockCompanyId)

      expect(result).toBeNull()
    })
  })

  describe('getPayments', () => {
    it('should return paginated payments', async () => {
      const mockPayments = [
        {
          id: 'payment-1',
          amount: 1000,
          paymentMethod: PaymentMethod.CASH,
          paymentDate: new Date(),
        },
        {
          id: 'payment-2',
          amount: 500,
          paymentMethod: PaymentMethod.CHECK,
          paymentDate: new Date(),
        },
      ]

      ;(prisma.payment.findMany as any).mockResolvedValue(mockPayments)
      ;(prisma.payment.count as any).mockResolvedValue(2)

      const result = await PaymentService.getPayments({}, mockCompanyId, { page: 1, limit: 10 })

      expect(result.data).toEqual(mockPayments)
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        pages: 1,
      })
    })

    it('should apply filters correctly', async () => {
      const filters = {
        clientId: 'client-123',
        invoiceId: 'invoice-123',
        paymentMethod: PaymentMethod.CASH,
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-01-31'),
        search: 'PAY-001',
      }

      ;(prisma.payment.findMany as any).mockResolvedValue([])
      ;(prisma.payment.count as any).mockResolvedValue(0)

      await PaymentService.getPayments(filters, mockCompanyId, { page: 1, limit: 10 })

      expect(prisma.payment.findMany).toHaveBeenCalledWith({
        where: {
          companyId: mockCompanyId,
          invoice: { clientId: 'client-123' },
          invoiceId: 'invoice-123',
          paymentMethod: PaymentMethod.CASH,
          paymentDate: {
            gte: filters.dateFrom,
            lte: filters.dateTo,
          },
          OR: expect.arrayContaining([
            { reference: { contains: 'PAY-001', mode: 'insensitive' } },
            { notes: { contains: 'PAY-001', mode: 'insensitive' } },
          ]),
        },
        include: expect.any(Object),
        orderBy: { paymentDate: 'desc' },
        skip: 0,
        take: 10,
      })
    })
  })

  describe('generatePaymentReminders', () => {
    it('should generate reminders for overdue invoices', async () => {
      const mockOverdueInvoices = [
        {
          id: 'invoice-1',
          number: 'INV-001',
          total: 1000,
          paidAmount: 0,
          dueDate: new Date('2024-01-01'),
          client: {
            id: 'client-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          },
        },
        {
          id: 'invoice-2',
          number: 'INV-002',
          total: 500,
          paidAmount: 200,
          dueDate: new Date('2024-01-05'),
          client: {
            id: 'client-2',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com',
          },
        },
      ]

      ;(prisma.invoice.findMany as any).mockResolvedValue(mockOverdueInvoices)
      ;(prisma.paymentReminder.create as any).mockResolvedValue({})

      const result = await PaymentService.generatePaymentReminders(mockCompanyId, mockUserId)

      expect(result.generated).toBe(2)
      expect(result.invoices).toHaveLength(2)
      expect(prisma.paymentReminder.create).toHaveBeenCalledTimes(2)
    })

    it('should skip invoices that already have recent reminders', async () => {
      const mockOverdueInvoices = [
        {
          id: 'invoice-1',
          number: 'INV-001',
          total: 1000,
          paidAmount: 0,
          dueDate: new Date('2024-01-01'),
          client: {
            id: 'client-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          },
          paymentReminders: [
            {
              id: 'reminder-1',
              sentDate: new Date(), // Recent reminder
            },
          ],
        },
      ]

      ;(prisma.invoice.findMany as any).mockResolvedValue(mockOverdueInvoices)

      const result = await PaymentService.generatePaymentReminders(mockCompanyId, mockUserId)

      expect(result.generated).toBe(0)
      expect(result.skipped).toBe(1)
      expect(prisma.paymentReminder.create).not.toHaveBeenCalled()
    })
  })

  describe('updatePayment', () => {
    it('should update a payment successfully', async () => {
      const mockExistingPayment = {
        id: 'payment-123',
        amount: 1000,
        companyId: mockCompanyId,
        invoice: {
          id: 'invoice-123',
          total: 1500,
          paidAmount: 1000,
        },
      }

      const updateData = {
        amount: 1200,
        notes: 'Updated payment',
      }

      const mockUpdatedPayment = {
        ...mockExistingPayment,
        ...updateData,
      }

      ;(prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return callback(prisma)
      })

      ;(prisma.payment.findFirst as any).mockResolvedValue(mockExistingPayment)
      ;(prisma.payment.update as any).mockResolvedValue(mockUpdatedPayment)
      ;(prisma.invoice.update as any).mockResolvedValue({})

      const result = await PaymentService.updatePayment('payment-123', updateData, mockCompanyId, mockUserId)

      expect(result).toEqual(mockUpdatedPayment)
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-123' },
        data: updateData,
        include: expect.any(Object),
      })
    })

    it('should throw error if payment not found', async () => {
      ;(prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return callback(prisma)
      })

      ;(prisma.payment.findFirst as any).mockResolvedValue(null)

      await expect(
        PaymentService.updatePayment('nonexistent', { amount: 1000 }, mockCompanyId, mockUserId)
      ).rejects.toThrow('Paiement non trouvé')
    })
  })

  describe('deletePayment', () => {
    it('should delete a payment successfully', async () => {
      const mockPayment = {
        id: 'payment-123',
        amount: 1000,
        companyId: mockCompanyId,
        invoice: {
          id: 'invoice-123',
          total: 1500,
          paidAmount: 1000,
        },
      }

      ;(prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return callback(prisma)
      })

      ;(prisma.payment.findFirst as any).mockResolvedValue(mockPayment)
      ;(prisma.payment.delete as any).mockResolvedValue(mockPayment)
      ;(prisma.invoice.update as any).mockResolvedValue({})

      await PaymentService.deletePayment('payment-123', mockCompanyId)

      expect(prisma.payment.delete).toHaveBeenCalledWith({
        where: { id: 'payment-123' },
      })

      // Should update invoice paid amount
      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'invoice-123' },
        data: { paidAmount: 0 }, // 1000 - 1000
      })
    })

    it('should throw error if payment not found', async () => {
      ;(prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return callback(prisma)
      })

      ;(prisma.payment.findFirst as any).mockResolvedValue(null)

      await expect(PaymentService.deletePayment('nonexistent', mockCompanyId)).rejects.toThrow(
        'Paiement non trouvé'
      )
    })
  })
})
