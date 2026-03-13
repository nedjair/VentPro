import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    kpiTargetSettings: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

vi.mock('@gestion/database', () => ({
  prisma: mockPrisma,
}))

import { KpiTargetSettingsService } from '../../services/kpi-target-settings.service'

describe('KpiTargetSettingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns an empty DTO when no target settings exist for the scope', async () => {
    mockPrisma.kpiTargetSettings.findUnique.mockResolvedValue(null)

    const result = await KpiTargetSettingsService.getSettings('scope-1')

    expect(mockPrisma.kpiTargetSettings.findUnique).toHaveBeenCalledWith({ where: { scopeId: 'scope-1' } })
    expect(result).toEqual({
      scopeId: 'scope-1',
      revenueTarget: null,
      ordersTarget: null,
      clientsTarget: null,
      conversionRateTarget: null,
      updatedAt: null,
      hasConfiguredTargets: false,
    })
  })

  it('persists settings and reports them as configured', async () => {
    mockPrisma.kpiTargetSettings.upsert.mockResolvedValue({
      id: 'kpi-1',
      scopeId: 'scope-2',
      revenueTarget: 250000,
      ordersTarget: 40,
      clientsTarget: 150,
      conversionRateTarget: 35,
      createdAt: new Date('2026-03-07T12:00:00.000Z'),
      updatedAt: new Date('2026-03-07T12:10:00.000Z'),
    })

    const payload = {
      revenueTarget: 250000,
      ordersTarget: 40,
      clientsTarget: 150,
      conversionRateTarget: 35,
    }

    const result = await KpiTargetSettingsService.saveSettings('scope-2', payload)

    expect(mockPrisma.kpiTargetSettings.upsert).toHaveBeenCalledWith({
      where: { scopeId: 'scope-2' },
      update: payload,
      create: {
        scopeId: 'scope-2',
        ...payload,
      },
    })
    expect(result).toEqual({
      scopeId: 'scope-2',
      revenueTarget: 250000,
      ordersTarget: 40,
      clientsTarget: 150,
      conversionRateTarget: 35,
      updatedAt: '2026-03-07T12:10:00.000Z',
      hasConfiguredTargets: true,
    })
  })
})