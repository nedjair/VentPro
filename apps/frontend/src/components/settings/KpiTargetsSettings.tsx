'use client'

import { useEffect, useMemo, useState } from 'react'
import { Target, Save, RefreshCw } from 'lucide-react'

import { api, UpdateKpiTargetSettingsPayload } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'

interface FormState {
  revenueTarget: string
  ordersTarget: string
  clientsTarget: string
  conversionRateTarget: string
}

const emptyFormState: FormState = {
  revenueTarget: '',
  ordersTarget: '',
  clientsTarget: '',
  conversionRateTarget: '',
}

function formatFieldValue(value: number | null): string {
  return value === null ? '' : String(value)
}

export function KpiTargetsSettings() {
  const [formState, setFormState] = useState<FormState>(emptyFormState)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  useEffect(() => {
    void loadTargets()
  }, [])

  const hasConfiguredTargets = useMemo(
    () => Object.values(formState).some((value) => value.trim().length > 0),
    [formState],
  )

  const loadTargets = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await api.getKpiTargetSettings()

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Impossible de charger les objectifs KPI')
      }

      setFormState({
        revenueTarget: formatFieldValue(response.data.revenueTarget),
        ordersTarget: formatFieldValue(response.data.ordersTarget),
        clientsTarget: formatFieldValue(response.data.clientsTarget),
        conversionRateTarget: formatFieldValue(response.data.conversionRateTarget),
      })
      setUpdatedAt(response.data.updatedAt)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de charger les objectifs KPI'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: keyof FormState, value: string) => {
    setFormState((current) => ({ ...current, [field]: value }))
  }

  const parseNumberField = (value: string, options?: { integer?: boolean; min?: number; max?: number }) => {
    const normalizedValue = value.trim().replace(',', '.')

    if (!normalizedValue) {
      return null
    }

    const parsedValue = Number(normalizedValue)

    if (Number.isNaN(parsedValue)) {
      throw new Error('Veuillez saisir uniquement des nombres valides pour les objectifs KPI.')
    }

    if (options?.integer && !Number.isInteger(parsedValue)) {
      throw new Error('Les objectifs commandes et clients doivent être des nombres entiers.')
    }

    if (options?.min != null && parsedValue < options.min) {
      throw new Error(`La valeur minimale autorisée est ${options.min}.`)
    }

    if (options?.max != null && parsedValue > options.max) {
      throw new Error(`La valeur maximale autorisée est ${options.max}.`)
    }

    return parsedValue
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      const payload: UpdateKpiTargetSettingsPayload = {
        revenueTarget: parseNumberField(formState.revenueTarget, { min: 0 }),
        ordersTarget: parseNumberField(formState.ordersTarget, { integer: true, min: 0 }),
        clientsTarget: parseNumberField(formState.clientsTarget, { integer: true, min: 0 }),
        conversionRateTarget: parseNumberField(formState.conversionRateTarget, { min: 0, max: 100 }),
      }

      const response = await api.updateKpiTargetSettings(payload)

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Impossible d’enregistrer les objectifs KPI')
      }

      setUpdatedAt(response.data.updatedAt)
      toast.success('Objectifs KPI enregistrés avec succès')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible d’enregistrer les objectifs KPI'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Objectifs KPI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Chargement des objectifs KPI...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Objectifs KPI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Ces objectifs sont stockés en base et utilisés par la page <strong>Rapports</strong> pour comparer
          les KPI réels à vos objectifs configurés. Laissez un champ vide si vous ne souhaitez pas comparer ce KPI.
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="revenueTarget">Objectif chiffre d’affaires mensuel (DZD)</Label>
            <Input
              id="revenueTarget"
              type="number"
              min="0"
              step="0.01"
              value={formState.revenueTarget}
              onChange={(event) => updateField('revenueTarget', event.target.value)}
              placeholder="Ex: 250000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ordersTarget">Objectif commandes</Label>
            <Input
              id="ordersTarget"
              type="number"
              min="0"
              step="1"
              value={formState.ordersTarget}
              onChange={(event) => updateField('ordersTarget', event.target.value)}
              placeholder="Ex: 40"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientsTarget">Objectif clients suivis</Label>
            <Input
              id="clientsTarget"
              type="number"
              min="0"
              step="1"
              value={formState.clientsTarget}
              onChange={(event) => updateField('clientsTarget', event.target.value)}
              placeholder="Ex: 150"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="conversionRateTarget">Objectif taux de conversion (%)</Label>
            <Input
              id="conversionRateTarget"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={formState.conversionRateTarget}
              onChange={(event) => updateField('conversionRateTarget', event.target.value)}
              placeholder="Ex: 35"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-muted-foreground">
            {updatedAt
              ? `Dernière mise à jour : ${new Date(updatedAt).toLocaleString('fr-FR')}`
              : hasConfiguredTargets
                ? 'Les objectifs seront persistés lors de l’enregistrement.'
                : 'Aucun objectif KPI n’est encore configuré.'}
          </div>

          <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer les objectifs KPI'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}