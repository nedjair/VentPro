import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

import { KpiTargetsSettings } from '@/components/settings/KpiTargetsSettings'

const { getKpiTargetSettingsMock, updateKpiTargetSettingsMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  getKpiTargetSettingsMock: vi.fn(),
  updateKpiTargetSettingsMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  api: {
    getKpiTargetSettings: getKpiTargetSettingsMock,
    updateKpiTargetSettings: updateKpiTargetSettingsMock,
  },
}))

vi.mock('@/components/ui/toast', () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}))

describe('KpiTargetsSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getKpiTargetSettingsMock.mockResolvedValue({
      success: true,
      data: {
        revenueTarget: 250000,
        ordersTarget: 40,
        clientsTarget: 150,
        conversionRateTarget: 35,
        updatedAt: '2026-03-07T13:00:00.000Z',
        hasConfiguredTargets: true,
      },
    })
  })

  it('loads stored KPI targets and saves updated values', async () => {
    updateKpiTargetSettingsMock.mockResolvedValue({
      success: true,
      data: {
        revenueTarget: 300000,
        ordersTarget: 45,
        clientsTarget: 180,
        conversionRateTarget: 38.5,
        updatedAt: '2026-03-07T13:10:00.000Z',
        hasConfiguredTargets: true,
      },
    })

    render(<KpiTargetsSettings />)

    expect(await screen.findByDisplayValue('250000')).toBeInTheDocument()
    expect(screen.getByDisplayValue('40')).toBeInTheDocument()
    expect(screen.getByDisplayValue('150')).toBeInTheDocument()
    expect(screen.getByDisplayValue('35')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Objectif chiffre d’affaires mensuel (DZD)'), { target: { value: '300000' } })
    fireEvent.change(screen.getByLabelText('Objectif commandes'), { target: { value: '45' } })
    fireEvent.change(screen.getByLabelText('Objectif clients suivis'), { target: { value: '180' } })
    fireEvent.change(screen.getByLabelText('Objectif taux de conversion (%)'), { target: { value: '38.5' } })

    fireEvent.click(screen.getByText('Enregistrer les objectifs KPI'))

    await waitFor(() => {
      expect(updateKpiTargetSettingsMock).toHaveBeenCalledWith({
        revenueTarget: 300000,
        ordersTarget: 45,
        clientsTarget: 180,
        conversionRateTarget: 38.5,
      })
      expect(toastSuccessMock).toHaveBeenCalledWith('Objectifs KPI enregistrés avec succès')
    })
  })
})