import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  pushMock,
  getClientMock,
  createClientMock,
  updateClientMock,
  getAuthTokenMock,
  setAuthTokenMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  getClientMock: vi.fn(),
  createClientMock: vi.fn(),
  updateClientMock: vi.fn(),
  getAuthTokenMock: vi.fn(),
  setAuthTokenMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
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
    createClient: createClientMock,
    updateClient: updateClientMock,
    getAuthToken: getAuthTokenMock,
    setAuthToken: setAuthTokenMock,
  },
}))

import { ClientFormPage } from '@/components/pages/clients/client-form'

describe('ClientFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAuthTokenMock.mockReturnValue('token-123')
  })

  it('renders create actions inside the page instead of the header and submits the form', async () => {
    createClientMock.mockResolvedValue({ success: true, data: { id: 'client-1' } })

    render(<ClientFormPage mode="create" />)

    expect(screen.getByTestId('header-actions')).toBeEmptyDOMElement()

    fireEvent.change(screen.getByLabelText('Prénom *'), { target: { value: 'Ali' } })
    fireEvent.change(screen.getByLabelText('Nom *'), { target: { value: 'Baba' } })
    fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'ali@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /sauvegarder/i }))

    await waitFor(() => {
      expect(createClientMock).toHaveBeenCalledWith(expect.objectContaining({
        type: 'INDIVIDUAL',
        firstName: 'Ali',
        lastName: 'Baba',
        email: 'ali@example.com',
      }))
      expect(pushMock).toHaveBeenCalledWith('/clients')
    })
  })

  it('renders edit actions inside the page instead of the header and submits the form', async () => {
    getClientMock.mockResolvedValue({
      success: true,
      data: {
        id: 'client-2',
        type: 'COMPANY',
        companyName: 'Acme',
        email: 'contact@acme.test',
        phone: '0550 00 00 00',
        address: 'Alger',
      },
    })
    updateClientMock.mockResolvedValue({ success: true, data: { id: 'client-2' } })

    render(<ClientFormPage mode="edit" clientId="client-2" />)

    await screen.findByDisplayValue('Acme')
    expect(screen.getByTestId('header-actions')).toBeEmptyDOMElement()
    fireEvent.change(screen.getByLabelText(/nom de l'entreprise/i), { target: { value: 'Acme Updated' } })
    fireEvent.click(screen.getByRole('button', { name: /sauvegarder/i }))

    await waitFor(() => {
      expect(updateClientMock).toHaveBeenCalledWith(
        'client-2',
        expect.objectContaining({ companyName: 'Acme Updated', type: 'COMPANY' })
      )
      expect(pushMock).toHaveBeenCalledWith('/clients')
    })
  })

  it('uses Algérie as the default country in create mode', () => {
    render(<ClientFormPage mode="create" />)

    expect(screen.getByLabelText(/pays/i)).toHaveValue('Algérie')
  })
})