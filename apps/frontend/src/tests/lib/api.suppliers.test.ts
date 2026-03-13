import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requestMock, axiosCreateMock } = vi.hoisted(() => {
  const request = vi.fn()
  const client = {
    request,
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  }

  return {
    requestMock: request,
    axiosCreateMock: vi.fn(() => client),
  }
})

vi.mock('axios', () => ({
  default: {
    create: axiosCreateMock,
  },
  create: axiosCreateMock,
  isAxiosError: () => false,
}))

describe('api suppliers response normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('unwraps nested supplier detail envelopes before applying default values', async () => {
    requestMock.mockResolvedValue({
      data: {
        success: true,
        data: {
          success: true,
          data: {
            id: 'sup-1',
            type: 'COMPANY',
            name: 'Alpha Fournitures',
            contactName: 'Jean Fournisseur',
            email: 'contact@alpha.test',
            phone: '01 23 45 67 88',
            city: 'Paris',
            country: 'France',
            paymentTerms: 45,
            currency: 'EUR',
            isActive: true,
            isPreferred: true,
            createdAt: '2026-03-09T09:00:00.000Z',
            updatedAt: '2026-03-09T09:30:00.000Z',
          },
        },
      },
    })

    const { api } = await import('@/lib/api')
    const response = await api.getSupplier('sup-1')

    expect(requestMock).toHaveBeenCalledWith(expect.objectContaining({
      method: 'GET',
      url: '/api/v1/suppliers/sup-1',
    }))
    expect(response.success).toBe(true)
    expect(response.data).toMatchObject({
      id: 'sup-1',
      name: 'Alpha Fournitures',
      contactName: 'Jean Fournisseur',
      email: 'contact@alpha.test',
      phone: '01 23 45 67 88',
      city: 'Paris',
      country: 'France',
      paymentTerms: 45,
      currency: 'EUR',
    })
  })

  it('unwraps nested suppliers list envelopes before normalizing collection items', async () => {
    requestMock.mockResolvedValue({
      data: {
        success: true,
        data: {
          success: true,
          data: {
            data: [
              {
                id: 'sup-1',
                type: 'COMPANY',
                name: 'Alpha Fournitures',
                city: 'Paris',
                country: 'France',
                paymentTerms: 45,
                currency: 'EUR',
                isActive: true,
                isPreferred: false,
                createdAt: '2026-03-09T09:00:00.000Z',
                updatedAt: '2026-03-09T09:30:00.000Z',
              },
            ],
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1,
          },
        },
      },
    })

    const { api } = await import('@/lib/api')
    const response = await api.getSuppliers()

    expect(response.success).toBe(true)
    expect(response.data?.data).toHaveLength(1)
    expect(response.data?.data[0]).toMatchObject({
      id: 'sup-1',
      name: 'Alpha Fournitures',
      city: 'Paris',
      country: 'France',
      paymentTerms: 45,
      currency: 'EUR',
    })
    expect(response.data?.total).toBe(1)
  })
})