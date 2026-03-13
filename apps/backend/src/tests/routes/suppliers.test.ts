import { afterEach, describe, expect, it, vi } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'

const {
  mockGetSupplierById,
  mockGetSuppliers,
  mockCreateSupplier,
  mockUpdateSupplier,
  mockGenerateSuppliersExcel,
  mockGenerateSuppliersPdf,
  mockCompanyFindUnique,
} = vi.hoisted(() => ({
  mockGetSupplierById: vi.fn(),
  mockGetSuppliers: vi.fn(),
  mockCreateSupplier: vi.fn(),
  mockUpdateSupplier: vi.fn(),
  mockGenerateSuppliersExcel: vi.fn(),
  mockGenerateSuppliersPdf: vi.fn(),
  mockCompanyFindUnique: vi.fn(),
}))

vi.mock('../../services/suppliers.service', () => ({
  suppliersService: {
    getSupplierById: mockGetSupplierById,
    createSupplier: mockCreateSupplier,
    updateSupplier: mockUpdateSupplier,
    getSuppliers: mockGetSuppliers,
    deleteSupplier: vi.fn(),
    getSuppliersStats: vi.fn(),
  },
}))

vi.mock('../../services/import.service', () => ({
  ImportService: class ImportService {},
}))

vi.mock('../../services/export.service', () => ({
  ExportService: {
    generateSuppliersExcel: mockGenerateSuppliersExcel,
    generateSuppliersPdf: mockGenerateSuppliersPdf,
  },
}))

vi.mock('../../lib/database', () => ({
  prisma: {
    company: {
      findUnique: mockCompanyFindUnique,
    },
  },
}))

import supplierRoutes from '../../routes/suppliers'

describe('Suppliers routes response serialization', () => {
  let app: FastifyInstance | undefined

  afterEach(async () => {
    vi.clearAllMocks()
    if (app) {
      await app.close()
      app = undefined
    }
  })

  it('preserves supplier fields on GET /:id instead of serializing data to an empty object', async () => {
    app = Fastify({ logger: false })
    app.decorate('authenticate', async (request: any) => {
      request.user = { id: 'user-123' }
    })

    mockGetSupplierById.mockResolvedValue({
      id: 'sup-1',
      type: 'COMPANY',
      name: 'EURL Electro Sud',
      email: 'commande@electrosud.dz',
      phone: '+213 29 70 18 55',
      address: 'Zone d\'activité Hassi Ameur, Ouargla',
      country: 'Algérie',
      paymentTerms: 30,
      currency: 'DZD',
    })

    await app.register(supplierRoutes, { prefix: '/api/v1/suppliers' })
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/suppliers/sup-1',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        id: 'sup-1',
        name: 'EURL Electro Sud',
        email: 'commande@electrosud.dz',
      },
    })
    expect(mockGetSupplierById).toHaveBeenCalledWith('user-123', 'sup-1')
  })

  it('preserves supplier fields on PUT /:id responses', async () => {
    app = Fastify({ logger: false })
    app.decorate('authenticate', async (request: any) => {
      request.user = { id: 'user-123' }
    })

    mockUpdateSupplier.mockResolvedValue({
      id: 'sup-1',
      type: 'COMPANY',
      name: 'EURL Electro Sud MAJ',
      email: 'commande@electrosud.dz',
      phone: '+213 29 70 18 55',
      address: 'Zone d\'activité Hassi Ameur, Ouargla',
      country: 'Algérie',
    })

    await app.register(supplierRoutes, { prefix: '/api/v1/suppliers' })
    await app.ready()

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/suppliers/sup-1',
      payload: {
        name: 'EURL Electro Sud MAJ',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        id: 'sup-1',
        name: 'EURL Electro Sud MAJ',
      },
      message: 'Fournisseur mis à jour avec succès',
    })
  })

  it('applies Algérie as the default country on POST / when the payload omits country', async () => {
    app = Fastify({ logger: false })
    app.decorate('authenticate', async (request: any) => {
      request.user = { id: 'user-123' }
    })

    mockCreateSupplier.mockResolvedValue({
      id: 'sup-2',
      type: 'COMPANY',
      name: 'Nouveau fournisseur',
      country: 'Algérie',
    })

    await app.register(supplierRoutes, { prefix: '/api/v1/suppliers' })
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/suppliers',
      payload: {
        name: 'Nouveau fournisseur',
      },
    })

    expect(response.statusCode).toBe(201)
    expect(mockCreateSupplier).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({
        name: 'Nouveau fournisseur',
        country: 'Algérie',
      })
    )
  })

  it('exports the suppliers Excel with the scoped user id and sanitized filters', async () => {
    app = Fastify({ logger: false })
    app.decorate('authenticate', async (request: any) => {
      request.user = { id: 'user-123' }
    })

    mockGetSuppliers.mockResolvedValue({
      data: [
        {
          id: 'sup-1',
          name: 'Atlas Distribution',
          discount: 0,
        },
      ],
    })
    mockGenerateSuppliersExcel.mockResolvedValue(Buffer.from('xlsx-content'))

    await app.register(supplierRoutes, { prefix: '/api/v1/suppliers' })
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/suppliers/export?format=xlsx&country=Alg%C3%A9rie',
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    expect(mockGetSuppliers).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({ country: 'Algérie' })
    )
    expect(mockGenerateSuppliersExcel).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'sup-1', name: 'Atlas Distribution' })])
    )
  })

  it('exports the suppliers PDF even when the authenticated scope has no companyId', async () => {
    app = Fastify({ logger: false })
    app.decorate('authenticate', async (request: any) => {
      request.user = { id: 'user-123' }
    })

    mockGetSuppliers.mockResolvedValue({
      data: [
        {
          id: 'sup-1',
          name: 'Atlas Distribution',
          discount: 0,
        },
      ],
    })
    mockGenerateSuppliersPdf.mockResolvedValue(Buffer.from('pdf-content'))

    await app.register(supplierRoutes, { prefix: '/api/v1/suppliers' })
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/suppliers/export?format=pdf',
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('application/pdf')
    expect(mockCompanyFindUnique).not.toHaveBeenCalled()
    expect(mockGenerateSuppliersPdf).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'sup-1', name: 'Atlas Distribution' })]),
      expect.objectContaining({ name: 'Gestion Commerciale' })
    )
  })
})