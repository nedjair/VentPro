import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getAuthTokenMock } = vi.hoisted(() => ({
  getAuthTokenMock: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  api: {
    getAuthToken: getAuthTokenMock,
  },
}))

vi.mock('@/lib/api-config', () => ({
  buildApiUrl: (path: string) => `http://localhost:3001${path}`,
}))

import { ExportService } from '@/lib/export'

describe('ExportService query sanitization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAuthTokenMock.mockReturnValue('token-123')
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue('attachment; filename="export.xlsx"'),
      },
      blob: vi.fn().mockResolvedValue(new Blob(['content'])),
    }) as any

    vi.spyOn(ExportService as any, 'downloadBlob').mockImplementation(() => undefined)
  })

  it('omits undefined supplier filters from Excel export requests', async () => {
    await ExportService.downloadSuppliersExcel({
      search: 'Atlas',
      type: undefined,
      isActive: undefined,
      country: 'Algérie',
    })

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/v1/suppliers/export?format=xlsx&search=Atlas&country=Alg%C3%A9rie',
      expect.any(Object)
    )
  })

  it('keeps explicit false values in supplier PDF export requests', async () => {
    await ExportService.downloadSuppliersPDF({
      isPreferred: false,
      country: 'Algérie',
    })

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/v1/suppliers/export?format=pdf&isPreferred=false&country=Alg%C3%A9rie',
      expect.any(Object)
    )
  })

  it('uses unified invoice export endpoint for PDF with format=pdf', async () => {
    await ExportService.downloadInvoicesPDF()

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/v1/invoices/export?format=pdf',
      expect.any(Object)
    )
  })

  it('throws backend message when invoice export fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      clone: vi.fn().mockReturnValue({
        json: vi.fn().mockResolvedValue({ message: 'Export backend indisponible' }),
      }),
      json: vi.fn().mockResolvedValue({ message: 'Export backend indisponible' }),
      text: vi.fn().mockResolvedValue(''),
      headers: { get: vi.fn() },
    }) as any

    await expect(ExportService.downloadInvoicesExcel()).rejects.toThrow(
      /Export Excel factures .*Export backend indisponible/
    )
  })

  it('retries invoice PDF download once when first response is empty', async () => {
    const firstResponse = {
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue('attachment; filename="facture.pdf"'),
      },
      blob: vi.fn().mockResolvedValue(new Blob([])),
    }
    const secondResponse = {
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue('attachment; filename="facture.pdf"'),
      },
      blob: vi.fn().mockResolvedValue(new Blob(['pdf-content'])),
    }

    global.fetch = vi.fn()
      .mockResolvedValueOnce(firstResponse as any)
      .mockResolvedValueOnce(secondResponse as any) as any

    await ExportService.downloadInvoicePDF('inv-123')

    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it('maps native fetch network errors to explicit PDF service error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) as any

    await expect(ExportService.downloadInvoicePDF('inv-123')).rejects.toThrow(
      /Impossible de joindre le service PDF/
    )
  })
})
