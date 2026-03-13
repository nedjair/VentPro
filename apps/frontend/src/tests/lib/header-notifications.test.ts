import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  readHeaderNotifications,
  syncStockProductHeaderNotification,
} from '@/lib/header-notifications'

describe('header-notifications', () => {
  const storage = new Map<string, string>()

  beforeEach(() => {
    storage.clear()

    vi.mocked(window.localStorage.getItem).mockImplementation((key: string) => storage.get(key) ?? null)
    vi.mocked(window.localStorage.setItem).mockImplementation((key: string, value: string) => {
      storage.set(key, value)
    })
    vi.mocked(window.localStorage.removeItem).mockImplementation((key: string) => {
      storage.delete(key)
    })
    vi.mocked(window.localStorage.clear).mockImplementation(() => {
      storage.clear()
    })
  })

  it('removes invalid or obsolete stock notifications while preserving other notification types', () => {
    storage.set(
      'ventespro:header-notifications',
      JSON.stringify([
        {
          id: 'order-1',
          source: 'orders',
          title: 'Commande en attente',
          message: 'La commande CMD-01 doit être validée.',
          createdAt: '2026-03-08T10:00:00.000Z',
        },
        {
          id: 'stock-low-product-1',
          source: 'stock-low',
          title: 'Alerte stock faible',
          message: 'Stock faible : Clavier mécanique — quantité restante : 2',
          createdAt: '2026-03-08T10:00:00.000Z',
        },
        {
          id: 'stock-status-product-2',
          source: 'stock-status',
          title: 'Stock normal',
          message: 'Cette alerte ne devrait plus exister.',
          createdAt: '2026-03-08T10:00:00.000Z',
        },
        {
          id: 'stock-status-product-3',
          source: 'stock-status',
          title: 'Rupture de stock',
          message: 'Rupture de stock : Écran 24 pouces — quantité restante : 0',
          createdAt: '2026-03-08T10:00:00.000Z',
        },
      ])
    )

    expect(readHeaderNotifications()).toEqual([
      {
        id: 'order-1',
        source: 'orders',
        title: 'Commande en attente',
        message: 'La commande CMD-01 doit être validée.',
        createdAt: '2026-03-08T10:00:00.000Z',
      },
      {
        id: 'stock-status-product-3',
        source: 'stock-status',
        title: 'Rupture de stock',
        message: 'Rupture de stock : Écran 24 pouces — quantité restante : 0',
        createdAt: '2026-03-08T10:00:00.000Z',
      },
    ])
  })

  it('replaces and removes stock notifications for a product without duplicates across alert transitions', () => {
    storage.set(
      'ventespro:header-notifications',
      JSON.stringify([
        {
          id: 'order-1',
          source: 'orders',
          title: 'Commande en attente',
          message: 'La commande CMD-01 doit être validée.',
          createdAt: '2026-03-08T10:00:00.000Z',
        },
        {
          id: 'stock-status-product-1',
          source: 'stock-status',
          title: 'Rupture de stock',
          message: 'Rupture de stock : Clavier mécanique — quantité restante : 0',
          createdAt: '2026-03-08T10:00:00.000Z',
        },
      ])
    )

    syncStockProductHeaderNotification('product-1', {
      id: 'stock-status-product-1',
      source: 'stock-status',
      title: 'Alerte stock faible',
      message: 'Stock faible : Clavier mécanique — quantité restante : 2',
      createdAt: '2026-03-08T10:05:00.000Z',
      href: '/stocks',
    })

    expect(readHeaderNotifications()).toEqual([
      {
        id: 'order-1',
        source: 'orders',
        title: 'Commande en attente',
        message: 'La commande CMD-01 doit être validée.',
        createdAt: '2026-03-08T10:00:00.000Z',
      },
      {
        id: 'stock-status-product-1',
        source: 'stock-status',
        title: 'Alerte stock faible',
        message: 'Stock faible : Clavier mécanique — quantité restante : 2',
        createdAt: '2026-03-08T10:05:00.000Z',
        href: '/stocks',
      },
    ])

    syncStockProductHeaderNotification('product-1', {
      id: 'stock-status-product-1',
      source: 'stock-status',
      title: 'Rupture de stock',
      message: 'Rupture de stock : Clavier mécanique — quantité restante : 0',
      createdAt: '2026-03-08T10:10:00.000Z',
      href: '/stocks',
    })

    expect(readHeaderNotifications()).toEqual([
      {
        id: 'order-1',
        source: 'orders',
        title: 'Commande en attente',
        message: 'La commande CMD-01 doit être validée.',
        createdAt: '2026-03-08T10:00:00.000Z',
      },
      {
        id: 'stock-status-product-1',
        source: 'stock-status',
        title: 'Rupture de stock',
        message: 'Rupture de stock : Clavier mécanique — quantité restante : 0',
        createdAt: '2026-03-08T10:10:00.000Z',
        href: '/stocks',
      },
    ])

    syncStockProductHeaderNotification('product-1', null)

    expect(readHeaderNotifications()).toEqual([
      {
        id: 'order-1',
        source: 'orders',
        title: 'Commande en attente',
        message: 'La commande CMD-01 doit être validée.',
        createdAt: '2026-03-08T10:00:00.000Z',
      },
    ])
  })
})