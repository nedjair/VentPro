import { afterEach, describe, expect, it, vi } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'

const {
  mockCreateClient,
  mockGetClientById,
  mockUpdateClient,
  mockDeleteClient,
  mockGetClients,
  mockGenerateClientsExcel,
  mockGenerateClientsPdf,
  mockCompanyFindUnique,
} = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockGetClientById: vi.fn(),
  mockUpdateClient: vi.fn(),
  mockDeleteClient: vi.fn(),
  mockGetClients: vi.fn(),
  mockGenerateClientsExcel: vi.fn(),
  mockGenerateClientsPdf: vi.fn(),
  mockCompanyFindUnique: vi.fn(),
}))

vi.mock('../../services/client.service', () => ({
  ClientService: {
    createClient: mockCreateClient,
    getClientById: mockGetClientById,
    updateClient: mockUpdateClient,
    deleteClient: mockDeleteClient,
    getClients: mockGetClients,
  },
}))

vi.mock('../../services/export.service', () => ({
  ExportService: {
    generateClientsExcel: mockGenerateClientsExcel,
    generateClientsPdf: mockGenerateClientsPdf,
  },
}))

vi.mock('../../lib/prisma', () => ({
  prisma: {
    company: {
      findUnique: mockCompanyFindUnique,
    },
  },
}))

import clientRoutes from '../../routes/clients'

describe('Clients routes auth scope compatibility', () => {
  let app: FastifyInstance | undefined

  afterEach(async () => {
    vi.clearAllMocks()
    if (app) {
      await app.close()
      app = undefined
    }
  })

  it('uses request.user.id when companyId is absent for GET /:id', async () => {
    app = Fastify({ logger: false })
    app.decorate('authenticate', async (request: any) => {
      request.user = { id: 'user-123' }
    })

    mockGetClientById.mockResolvedValue({ id: 'client-1' })

    await app.register(clientRoutes, { prefix: '/api/v1/clients' })
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/clients/client-1',
    })

    expect(response.statusCode).toBe(200)
    expect(mockGetClientById).toHaveBeenCalledWith('client-1', 'user-123')
  })

  it('uses request.user.id when companyId is absent for POST /', async () => {
    app = Fastify({ logger: false })
    app.decorate('authenticate', async (request: any) => {
      request.user = { id: 'user-123' }
    })

    mockCreateClient.mockResolvedValue({ id: 'client-2', companyName: 'Acme' })

    await app.register(clientRoutes, { prefix: '/api/v1/clients' })
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/clients',
      payload: {
        type: 'COMPANY',
        companyName: 'Acme',
      },
    })

    expect(response.statusCode).toBe(201)
    expect(mockCreateClient).toHaveBeenCalledWith(
      expect.objectContaining({ companyName: 'Acme', type: 'COMPANY' }),
      'user-123'
    )
  })

  it('exports the clients PDF even when the authenticated scope has no companyId', async () => {
    app = Fastify({ logger: false })
    app.decorate('authenticate', async (request: any) => {
      request.user = { id: 'user-123' }
    })

    mockGetClients.mockResolvedValue({
      data: [
        {
          id: 'client-1',
          type: 'INDIVIDUAL',
          firstName: 'Ahmed',
          lastName: 'Benali',
          email: 'ahmed@example.dz',
          phone: '+213555000111',
          city: 'Alger',
          createdAt: '2026-03-08T08:00:00.000Z',
        },
      ],
    })
    mockGenerateClientsPdf.mockResolvedValue(Buffer.from('pdf-content'))

    await app.register(clientRoutes, { prefix: '/api/v1/clients' })
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/clients/export?format=pdf',
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('application/pdf')
    expect(mockGetClients).toHaveBeenCalledWith('user-123', {
      search: undefined,
      type: undefined,
      city: undefined,
      isActive: undefined,
    })
    expect(mockCompanyFindUnique).not.toHaveBeenCalled()
    expect(mockGenerateClientsPdf).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'client-1', email: 'ahmed@example.dz' }),
      ]),
      expect.objectContaining({ name: 'Gestion Commerciale' })
    )
  })
})