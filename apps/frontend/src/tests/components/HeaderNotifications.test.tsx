import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { readHeaderNotificationsMock, subscribeHeaderNotificationsMock } = vi.hoisted(() => ({
  readHeaderNotificationsMock: vi.fn(),
  subscribeHeaderNotificationsMock: vi.fn(() => () => {}),
}))

vi.mock('@/stores/auth', () => ({
  useAuth: () => ({
    user: {
      firstName: 'Administrateur',
      lastName: 'Démonstration',
      email: 'admin@example.com',
    },
  }),
}))

vi.mock('@/lib/header-notifications', () => ({
  readHeaderNotifications: readHeaderNotificationsMock,
  subscribeHeaderNotifications: subscribeHeaderNotificationsMock,
}))

import { Header } from '@/components/layout/header'

describe('Header notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    readHeaderNotificationsMock.mockReturnValue([
      {
        id: 'stock-status-product-1',
        source: 'stock-status',
        title: 'Alerte stock faible',
        message: 'Stock faible : Clavier mécanique — quantité restante : 2',
        createdAt: '2026-03-08T10:00:00.000Z',
        href: '/stocks',
      },
      {
        id: 'stock-status-product-2',
        source: 'stock-status',
        title: 'Rupture de stock',
        message: 'Rupture de stock : Écran 24 pouces — quantité restante : 0',
        createdAt: '2026-03-08T10:00:00.000Z',
        href: '/stocks',
      },
    ])
  })

  afterEach(() => undefined)

  it('opens the notifications panel and displays current stock alerts from the stock page', () => {
    render(<Header title="Gestion des Stocks" subtitle="Suivi et gestion des niveaux de stock" />)

    fireEvent.click(screen.getByRole('button', { name: /notifications/i }))

    expect(screen.getByText('Notifications')).toBeInTheDocument()
    expect(screen.getByText('Alerte stock faible')).toBeInTheDocument()
    expect(screen.getByText('Stock faible : Clavier mécanique — quantité restante : 2')).toBeInTheDocument()
    expect(screen.getByText('Rupture de stock')).toBeInTheDocument()
    expect(screen.getByText('Rupture de stock : Écran 24 pouces — quantité restante : 0')).toBeInTheDocument()
  })
})