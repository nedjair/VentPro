import { describe, expect, it } from 'vitest'
import { ExportService } from '../../services/export.service'

describe('ExportService PDF encoding', () => {
  it('generates a readable invoice PDF buffer with latin extended characters', async () => {
    const buffer = await ExportService.generateInvoicePdfBuffer({
      number: 'FAC-UTF8-001',
      status: 'SENT',
      client: {
        companyName: 'Électronique Niño & Associés',
      },
      invoiceDate: '2026-03-11T00:00:00.000Z',
      dueDate: '2026-03-21T00:00:00.000Z',
      notes: 'Français: échéance réglée. English: paid on time. Español: información de envío. Montant: 1 250,75 €.',
      subtotal: 1000.5,
      vatAmount: 250.25,
      total: 1250.75,
      items: [
        {
          description: 'Prestation spéciale – révision complète',
          quantity: 1,
          unitPrice: 1000.5,
          total: 1000.5,
        },
      ],
    })

    expect(buffer.length).toBeGreaterThan(0)
    expect(buffer.toString('utf8', 0, 4)).toBe('%PDF')
  })

  it('builds an Algerian-compliant invoice PDF filename pattern', () => {
    const filename = ExportService.buildInvoicePdfFilename({
      number: 'FAC-202603-0005',
      invoiceDate: '2026-03-01T00:00:00.000Z',
      client: {
        companyName: 'Clinique Annaba Médicale',
      },
    })

    expect(filename).toBe('FACTURE_FAC2026030005_CliniqueAnnabaMedicale_20260301.pdf')
  })
})
