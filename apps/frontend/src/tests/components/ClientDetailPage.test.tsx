import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { pushMock, getClientMock, deleteClientMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  getClientMock: vi.fn(),
  deleteClientMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}))

vi.mock('@/components/layout/main-layout', () => ({
  MainLayout: ({ actions, children }: { actions?: any; children: any }) => (
    <div>
      <div data-testid="header-actions">{actions}</div>
      <div>{children}</div>
    </div>
  ),
}))

vi.mock('@/lib/api', () => ({
  api: {
    getClient: getClientMock,
    deleteClient: deleteClientMock,
  },
}))

import { ClientDetailPage } from '@/components/pages/clients/client-detail'

describe('ClientDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getClientMock.mockResolvedValue({
      success: true,
      data: {
        id: 'client-1',
        type: 'COMPANY',
        companyName: 'Acme SARL',
        email: 'contact@acme.test',
        phone: '0550 00 00 00',
        address: 'Alger',
        city: 'Alger',
        country: 'Algérie',
        createdAt: '2026-03-08T08:00:00.000Z',
      },
    })
  })

  it('renders client actions inside the page instead of the header', async () => {
    render(<ClientDetailPage clientId="client-1" />)

    await screen.findByRole('heading', { name: 'Acme SARL' })

    expect(screen.getByTestId('header-actions')).toBeEmptyDOMElement()
    expect(screen.getByRole('button', { name: /retour à la liste/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /modifier/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /supprimer/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /modifier/i }))

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/clients/client-1/edit')
    })
  })
})