import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPrisma, mockLogger } = vi.hoisted(() => ({
  mockPrisma: {
    client: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    order: {
      count: vi.fn(),
    },
    invoice: {
      count: vi.fn(),
    },
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

import { ClientService } from '../../services/client.service'

describe('ClientService compatibility with current local client schema', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads a client by scoped userId and normalizes it for the frontend', async () => {
    mockPrisma.client.findFirst.mockResolvedValue({
      id: 'client-1',
      name: 'Acme SARL',
      email: 'contact@acme.test',
      phone: '0550 00 00 00',
      address: 'Alger',
      userId: 'user-1',
      createdAt: new Date('2026-03-07T09:00:00.000Z'),
      updatedAt: new Date('2026-03-07T10:00:00.000Z'),
    })

    const result = await ClientService.getClientById('client-1', 'user-1')

    expect(mockPrisma.client.findFirst).toHaveBeenCalledWith({
      where: { id: 'client-1', userId: 'user-1' },
    })
    expect(result).toMatchObject({
      id: 'client-1',
      type: 'COMPANY',
      companyName: 'Acme SARL',
      email: 'contact@acme.test',
    })
  })

  it('creates a client in the current schema using name and userId', async () => {
    mockPrisma.client.findFirst.mockResolvedValue(null)
    mockPrisma.client.create.mockResolvedValue({
      id: 'client-2',
      name: 'Ali Baba',
      email: 'ali@example.com',
      phone: '0660 00 00 00',
      address: 'Oran',
      userId: 'user-1',
      createdAt: new Date('2026-03-07T09:00:00.000Z'),
      updatedAt: new Date('2026-03-07T09:00:00.000Z'),
    })

    const result = await ClientService.createClient({
      type: 'INDIVIDUAL' as any,
      firstName: 'Ali',
      lastName: 'Baba',
      email: 'ali@example.com',
      phone: '0660 00 00 00',
      address: 'Oran',
    }, 'user-1')

    expect(mockPrisma.client.create).toHaveBeenCalledWith({
      data: {
        name: 'Ali Baba',
        email: 'ali@example.com',
        phone: '0660 00 00 00',
        address: 'Oran',
        userId: 'user-1',
      },
    })
    expect(result).toMatchObject({
      id: 'client-2',
      companyName: 'Ali Baba',
      email: 'ali@example.com',
    })
  })

  it('updates a client in the current schema using the scoped userId', async () => {
    mockPrisma.client.findFirst
      .mockResolvedValueOnce({
        id: 'client-3',
        name: 'Ancien Nom',
        email: 'ancien@example.com',
        phone: '0550 00 00 00',
        address: 'Blida',
        userId: 'user-1',
        createdAt: new Date('2026-03-07T09:00:00.000Z'),
        updatedAt: new Date('2026-03-07T09:00:00.000Z'),
      })
      .mockResolvedValueOnce(null)

    mockPrisma.client.update.mockResolvedValue({
      id: 'client-3',
      name: 'Nouveau Nom',
      email: 'nouveau@example.com',
      phone: '0770 00 00 00',
      address: 'Blida',
      userId: 'user-1',
      createdAt: new Date('2026-03-07T09:00:00.000Z'),
      updatedAt: new Date('2026-03-07T11:00:00.000Z'),
    })

    const result = await ClientService.updateClient('client-3', {
      type: 'COMPANY' as any,
      companyName: 'Nouveau Nom',
      email: 'nouveau@example.com',
      phone: '0770 00 00 00',
    }, 'user-1')

    expect(mockPrisma.client.update).toHaveBeenCalledWith({
      where: { id: 'client-3' },
      data: {
        name: 'Nouveau Nom',
        email: 'nouveau@example.com',
        phone: '0770 00 00 00',
        address: undefined,
      },
    })
    expect(result).toMatchObject({
      id: 'client-3',
      companyName: 'Nouveau Nom',
      email: 'nouveau@example.com',
    })
  })

  it('falls back to Algérie as default country in the legacy schema when current schema creation fails', async () => {
    mockPrisma.client.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)

    mockPrisma.client.create
      .mockRejectedValueOnce(new Error('current schema unavailable'))
      .mockResolvedValueOnce({
        id: 'client-legacy-1',
        companyName: 'Atlas Industrie',
        email: 'contact@atlas.test',
        country: 'Algérie',
        companyId: 'user-1',
      })

    const result = await ClientService.createClient({
      type: 'COMPANY' as any,
      companyName: 'Atlas Industrie',
      email: 'contact@atlas.test',
    }, 'user-1')

    expect(mockPrisma.client.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        companyName: 'Atlas Industrie',
        country: 'Algérie',
        paymentTerms: 30,
        discount: 0,
        companyId: 'user-1',
      }),
    })
    expect(result).toMatchObject({
      id: 'client-legacy-1',
      country: 'Algérie',
    })
  })

  it('deletes a client from the current schema when no documents are linked', async () => {
    mockPrisma.client.findFirst.mockResolvedValue({
      id: 'client-4',
      name: 'Client Libre',
      email: 'libre@example.com',
      phone: null,
      address: null,
      userId: 'user-1',
      createdAt: new Date('2026-03-07T09:00:00.000Z'),
      updatedAt: new Date('2026-03-07T09:00:00.000Z'),
    })
    mockPrisma.order.count.mockResolvedValue(0)
    mockPrisma.invoice.count.mockResolvedValue(0)

    await ClientService.deleteClient('client-4', 'user-1')

    expect(mockPrisma.order.count).toHaveBeenCalledWith({
      where: { clientId: 'client-4', userId: 'user-1' },
    })
    expect(mockPrisma.invoice.count).toHaveBeenCalledWith({
      where: { clientId: 'client-4', userId: 'user-1' },
    })
    expect(mockPrisma.client.delete).toHaveBeenCalledWith({
      where: { id: 'client-4' },
    })
  })
})