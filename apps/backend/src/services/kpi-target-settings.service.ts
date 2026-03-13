import { KpiTargetSettings, prisma } from '@gestion/database'

export interface KpiTargetSettingsPayload {
  revenueTarget: number | null
  ordersTarget: number | null
  clientsTarget: number | null
  conversionRateTarget: number | null
}

export interface KpiTargetSettingsDTO extends KpiTargetSettingsPayload {
  scopeId: string
  updatedAt: string | null
  hasConfiguredTargets: boolean
}

export class KpiTargetSettingsService {
  static async getSettings(scopeId: string): Promise<KpiTargetSettingsDTO> {
    const settings = await prisma.kpiTargetSettings.findUnique({ where: { scopeId } })
    return this.toDTO(scopeId, settings)
  }

  static async saveSettings(scopeId: string, payload: KpiTargetSettingsPayload): Promise<KpiTargetSettingsDTO> {
    const settings = await prisma.kpiTargetSettings.upsert({
      where: { scopeId },
      update: payload,
      create: {
        scopeId,
        ...payload,
      },
    })

    return this.toDTO(scopeId, settings)
  }

  private static toDTO(scopeId: string, settings: KpiTargetSettings | null): KpiTargetSettingsDTO {
    const revenueTarget = settings?.revenueTarget ?? null
    const ordersTarget = settings?.ordersTarget ?? null
    const clientsTarget = settings?.clientsTarget ?? null
    const conversionRateTarget = settings?.conversionRateTarget ?? null

    return {
      scopeId,
      revenueTarget,
      ordersTarget,
      clientsTarget,
      conversionRateTarget,
      updatedAt: settings?.updatedAt?.toISOString() || null,
      hasConfiguredTargets: [revenueTarget, ordersTarget, clientsTarget, conversionRateTarget].some((value) => value !== null),
    }
  }
}