import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { InvoiceDetailPage } from '@/components/pages/invoices/invoice-detail'
import { OrderDetailPage } from '@/components/pages/orders/order-detail'

const { getInvoiceMock, getOrderMock, downloadOrderPDFMock } = vi.hoisted(() => ({
  getInvoiceMock: vi.fn(),
  getOrderMock: vi.fn(),
  downloadOrderPDFMock: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}))

vi.mock('@/components/layout/main-layout', () => ({
  MainLayout: ({ children, title, actions }: { children: ReactNode; title: string; actions?: ReactNode }) => (
    <div>
      <h1>{title}</h1>
      <div data-testid="header-actions">{actions}</div>
      {children}
    </div>
  ),
}))

vi.mock('@/lib/api', () => ({
  api: {
    getInvoice: getInvoiceMock,
    getOrder: getOrderMock,
  },
}))

vi.mock('@/lib/export', () => ({
  ExportService: {
    downloadInvoicePDF: vi.fn(),
    downloadOrderPDF: downloadOrderPDFMock,
  },
}))

describe('Document email actions', () => {
  const openMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'open', {
      value: openMock,
      writable: true,
    })
  })

  it('opens a prefilled mailto link from the invoice detail page', async () => {
    getInvoiceMock.mockResolvedValue({
      success: true,
      data: {
        id: 'invoice-1',
        number: 'FAC-202603-0001',
        type: 'INVOICE',
        status: 'PAID',
        clientId: 'client-1',
        client: {
          id: 'client-1',
          type: 'COMPANY',
          companyName: 'SARL Technoplus',
          email: 'contact@technoplus.dz',
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
        },
        invoiceDate: '2026-03-07T00:00:00.000Z',
        dueDate: '2026-03-20T00:00:00.000Z',
        subtotal: 150000,
        vatAmount: 0,
        total: 150000,
        paidAmount: 150000,
        discount: 0,
        items: [],
        createdAt: '2026-03-07T00:00:00.000Z',
        updatedAt: '2026-03-07T00:00:00.000Z',
      },
    })

    render(<InvoiceDetailPage invoiceId="invoice-1" />)

    await screen.findByText('Télécharger PDF')
    expect(screen.getByTestId('header-actions')).toBeEmptyDOMElement()
    expect(screen.getByRole('button', { name: /retour/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /télécharger pdf/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /envoyer par email/i }))

    await waitFor(() => {
      expect(openMock).toHaveBeenCalledTimes(1)
    })

    expect(openMock.mock.calls[0][0]).toContain('mailto:contact@technoplus.dz')
    expect(openMock.mock.calls[0][0]).toContain('FAC-202603-0001')
    expect(openMock.mock.calls[0][1]).toBe('_self')
  })

  it('shows a non-blocking message when no client email is available', async () => {
    getInvoiceMock.mockResolvedValue({
      success: true,
      data: {
        id: 'invoice-2',
        number: 'FAC-202603-0002',
        type: 'INVOICE',
        status: 'SENT',
        clientId: 'client-2',
        client: {
          id: 'client-2',
          type: 'COMPANY',
          companyName: 'Bureautique Plus',
          email: '',
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
        },
        invoiceDate: '2026-03-06T00:00:00.000Z',
        dueDate: '2026-03-25T00:00:00.000Z',
        subtotal: 90000,
        vatAmount: 0,
        total: 90000,
        paidAmount: 0,
        discount: 0,
        items: [],
        createdAt: '2026-03-06T00:00:00.000Z',
        updatedAt: '2026-03-06T00:00:00.000Z',
      },
    })

    render(<InvoiceDetailPage invoiceId="invoice-2" />)

    await screen.findByText('Télécharger PDF')
    expect(screen.getByTestId('header-actions')).toBeEmptyDOMElement()
    fireEvent.click(screen.getByRole('button', { name: /envoyer par email/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Aucune adresse email client n’est disponible pour cette facture.')
    expect(openMock).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Facture FAC-202603-0002', level: 1 })).toBeInTheDocument()
  })

  it('uses the dedicated order PDF download helper from the order detail page', async () => {
    getOrderMock.mockResolvedValue({
      success: true,
      data: {
        id: 'order-1',
        number: 'CMD-202603-0001',
        type: 'ORDER',
        status: 'SENT',
        clientId: 'client-1',
        client: {
          id: 'client-1',
          type: 'COMPANY',
          companyName: 'SARL Technoplus',
          email: 'contact@technoplus.dz',
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
        },
        createdAt: '2026-03-07T00:00:00.000Z',
        updatedAt: '2026-03-07T00:00:00.000Z',
        subtotal: 200000,
        vatAmount: 0,
        total: 200000,
        notes: '',
        items: [],
      },
    })

    render(<OrderDetailPage orderId="order-1" />)

    await screen.findByRole('heading', { name: 'Commande CMD-202603-0001', level: 1 })
    expect(screen.getByTestId('header-actions')).toBeEmptyDOMElement()
    expect(screen.getByRole('button', { name: /retour/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /envoyer par email/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /télécharger pdf/i }))

    await waitFor(() => {
      expect(downloadOrderPDFMock).toHaveBeenCalledWith('order-1')
    })
  })
})