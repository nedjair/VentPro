'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Medal,
  ShieldAlert,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react'
import { DashboardFinancePanel } from '@/components/dashboard/dashboard-finance-panel'
import { DashboardProductsPanel } from '@/components/dashboard/dashboard-products-panel'
import { MainLayout } from '@/components/layout/main-layout'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import { formatCurrencyAmount, normalizeCurrencyCode } from '@/lib/currency'
import { extractCollection } from '@/lib/defensive-utils'

const clampPercent = (value: number) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))

const toSafeNumber = (value: unknown, fallback = 0) => {
  const numericValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numericValue) ? numericValue : fallback
}

const formatSignedPercent = (value: unknown) => {
  const safeValue = toSafeNumber(value)
  return `${safeValue >= 0 ? '+' : ''}${safeValue.toFixed(1)}%`
}

const formatDateTime = (value?: string) => {
  if (!value) {
    return 'N/A'
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

type DashboardStats = NonNullable<Awaited<ReturnType<typeof api.getDashboardStats>>['data']>
type RecentOrder = NonNullable<NonNullable<Awaited<ReturnType<typeof api.getOrders>>['data']>['data']>[number]
type ProductAnalytics = NonNullable<Awaited<ReturnType<typeof api.getProductAnalytics>>['data']>
type FinanceInvoice = NonNullable<NonNullable<Awaited<ReturnType<typeof api.getInvoices>>['data']>['data']>[number]
type SalesAnalytics = NonNullable<Awaited<ReturnType<typeof api.getSalesAnalytics>>['data']>
type ProductHighlight = NonNullable<NonNullable<Awaited<ReturnType<typeof api.getProductAnalytics>>['data']>['topProducts']>[number]

const formatShortDate = (value?: string) => {
  if (!value) {
    return 'N/A'
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

const getClientDisplayName = (order: RecentOrder) => {
  if (order.client?.companyName) {
    return order.client.companyName
  }

  const fullName = `${order.client?.firstName || ''} ${order.client?.lastName || ''}`.trim()
  return fullName || order.client?.email || 'Client non renseigné'
}

const getPrimaryProductLabel = (order: RecentOrder) => {
  const firstItem = order.items?.[0]
  const firstName = firstItem?.product?.name

  if (!firstName) {
    return order.items?.length ? `${order.items.length} article(s)` : 'Produit non renseigné'
  }

  if ((order.items?.length || 0) <= 1) {
    return firstName
  }

  return `${firstName} +${(order.items?.length || 1) - 1}`
}

const getOrderStatusMeta = (status: RecentOrder['status']) => {
  switch (status) {
    case 'ACCEPTED':
      return {
        label: 'validée',
        icon: CheckCircle2,
        className: 'border-emerald-200 bg-emerald-50 text-emerald-600',
      }
    case 'SENT':
      return {
        label: 'en cours',
        icon: Clock3,
        className: 'border-amber-200 bg-amber-50 text-amber-600',
      }
    case 'REJECTED':
    case 'CANCELLED':
    case 'EXPIRED':
      return {
        label: status === 'EXPIRED' ? 'expirée' : 'annulée',
        icon: XCircle,
        className: 'border-rose-200 bg-rose-50 text-rose-500',
      }
    default:
      return {
        label: 'brouillon',
        icon: Clock3,
        className: 'border-slate-200 bg-slate-100 text-slate-500',
      }
  }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [financeInvoices, setFinanceInvoices] = useState<FinanceInvoice[]>([])
  const [salesAnalytics, setSalesAnalytics] = useState<SalesAnalytics | null>(null)
  const [productAnalytics, setProductAnalytics] = useState<ProductAnalytics | null>(null)
  const [topProducts, setTopProducts] = useState<ProductHighlight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [financeError, setFinanceError] = useState<string | null>(null)
  const [productError, setProductError] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [statsResult, ordersResult, productResult, invoicesResult, salesResult] = await Promise.allSettled([
        api.getDashboardStats(),
        api.getOrders({ page: 1, limit: 5, type: 'ORDER' }),
        api.getProductAnalytics({ period: '3m', limit: 12 }),
        api.getInvoices({ page: 1, limit: 50, type: 'INVOICE' }),
        api.getSalesAnalytics({ period: '6m' }),
      ])

      const statsResponse = statsResult.status === 'fulfilled' ? statsResult.value : null

      if (statsResponse?.success && statsResponse.data) {
        setStats(statsResponse.data)

        const safeOrders = ordersResult.status === 'fulfilled' && ordersResult.value.success
          ? extractCollection<RecentOrder>(ordersResult.value.data)
          : []
        const invoicesLoaded = invoicesResult.status === 'fulfilled' && invoicesResult.value.success
        const safeFinanceInvoices = invoicesLoaded
          ? extractCollection<FinanceInvoice>(invoicesResult.value.data)
          : []
        const salesLoaded = salesResult.status === 'fulfilled' && salesResult.value.success && salesResult.value.data
        const safeSalesAnalytics = salesLoaded ? salesResult.value.data : null

        const safeProductAnalytics = productResult.status === 'fulfilled' && productResult.value.success && productResult.value.data
          ? productResult.value.data
          : null

        const safeTopProducts = safeProductAnalytics
          ? [...(safeProductAnalytics.topProducts || [])]
            .sort((left, right) => toSafeNumber(right.totalQuantity) - toSafeNumber(left.totalQuantity))
            .slice(0, 4)
          : []

        setRecentOrders(safeOrders.slice(0, 5))
        setFinanceInvoices(safeFinanceInvoices)
        setSalesAnalytics(safeSalesAnalytics)
        setProductAnalytics(safeProductAnalytics)
        setTopProducts(safeTopProducts)
        setFinanceError(invoicesLoaded || salesLoaded ? null : 'Impossible de charger les rapports financiers.')
        setProductError(safeProductAnalytics ? null : 'Impossible de charger les rapports produits.')
      } else {
        setStats(null)
        setRecentOrders([])
        setFinanceInvoices([])
        setSalesAnalytics(null)
        setProductAnalytics(null)
        setTopProducts([])
        setError('Impossible de charger les statistiques du tableau de bord.')
        setFinanceError(null)
        setProductError(null)
      }
    } catch {
      setStats(null)
      setRecentOrders([])
      setFinanceInvoices([])
      setSalesAnalytics(null)
      setProductAnalytics(null)
      setTopProducts([])
      setError('Impossible de charger les statistiques du tableau de bord.')
      setFinanceError(null)
      setProductError(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  // Normaliser ici protège aussi l'UI contre d'anciennes réponses backend encore en cache.
  const currency = normalizeCurrencyCode(stats?.sales.currency)

  const derived = useMemo(() => {
    if (!stats) {
      return null
    }

    const conversionRate = clampPercent((toSafeNumber(stats.orders.accepted) / Math.max(toSafeNumber(stats.orders.total), 1)) * 100)
    const stockCoverage = clampPercent((toSafeNumber(stats.products.inStock) / Math.max(toSafeNumber(stats.products.total), 1)) * 100)
    const overdueShare = clampPercent((toSafeNumber(stats.invoices.overdue) / Math.max(toSafeNumber(stats.invoices.total), 1)) * 100)
    const revenueSecured = toSafeNumber(stats.invoices.paidAmount)
    const revenueToCollect = Math.max(toSafeNumber(stats.invoices.pendingAmount), 0)
    const revenueAtRisk = Math.round((revenueToCollect * overdueShare) / 100)
    const revenueForecast = toSafeNumber(stats.sales.currentMonth) + Math.max(revenueToCollect - revenueAtRisk, 0)

    return {
      conversionRate,
      stockCoverage,
      overdueShare,
      revenueSecured,
      revenueToCollect,
      revenueAtRisk,
      revenueForecast,
    }
  }, [stats])

  const summaryCards = [
    {
      delta: stats ? formatSignedPercent(stats.clients.growth) : '—',
      deltaTone: 'bg-emerald-50 text-emerald-600',
      title: 'Clients actifs',
      value: stats ? `${stats.clients.total}` : '—',
      helper: stats ? `${stats.clients.companies} entreprises · ${stats.clients.individuals} particuliers` : 'Chargement...',
      icon: Users,
      accent: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100',
      barClass: 'from-emerald-400 to-emerald-300',
    },
    {
      delta: stats ? formatSignedPercent(stats.sales.growth) : '—',
      deltaTone: stats && toSafeNumber(stats.sales.growth) >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500',
      title: 'CA du mois',
      value: stats ? formatCurrencyAmount(stats.sales.currentMonth, currency) : '—',
      helper: stats ? `Croissance ${formatSignedPercent(stats.sales.growth)}` : 'Chargement...',
      icon: TrendingUp,
      accent: 'bg-sky-50 text-sky-600 ring-1 ring-sky-100',
      barClass: 'from-sky-400 to-sky-300',
    },
    {
      delta: stats ? `+${stats.orders.accepted}` : '—',
      deltaTone: 'bg-amber-50 text-amber-600',
      title: 'Commandes en cours',
      value: stats ? `${stats.orders.pending}` : '—',
      helper: stats ? `${stats.orders.accepted} validées · panier moyen ${formatCurrencyAmount(stats.orders.averageValue, currency)}` : 'Chargement...',
      icon: ShoppingCart,
      accent: 'bg-amber-50 text-amber-600 ring-1 ring-amber-100',
      barClass: 'from-amber-400 to-amber-300',
    },
    {
      delta: stats ? `${stats.invoices.overdue} en retard` : '—',
      deltaTone: stats && stats.invoices.overdue > 0 ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-600',
      title: 'Factures à encaisser',
      value: stats ? formatCurrencyAmount(stats.invoices.pendingAmount, currency) : '—',
      helper: stats ? `${stats.invoices.pending} en attente · ${stats.invoices.overdue} en retard` : 'Chargement...',
      icon: Wallet,
      accent: 'bg-rose-50 text-rose-500 ring-1 ring-rose-100',
      barClass: 'from-rose-400 to-rose-300',
    },
  ]

  const surfaceCardClass = 'border-border/80 bg-white shadow-[0_18px_40px_rgba(19,33,54,0.08)]'

  return (
    <MainLayout title="Tableau de bord">
      <div className="-mx-6 -my-6 min-h-full bg-transparent px-6 py-7 xl:-mx-8 xl:-my-7 xl:px-8 xl:py-8">
        <div className="space-y-7">
          <Tabs defaultValue="ventes">
            <TabsList className="h-auto w-full justify-start gap-2 rounded-[22px] border border-border/70 bg-white/70 p-1 shadow-[0_14px_32px_rgba(19,33,54,0.05)] backdrop-blur">
              <TabsTrigger
                value="ventes"
                className="gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-500 shadow-none hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-[0_12px_26px_rgba(19,33,54,0.1)]"
              >
                <TrendingUp className="h-4 w-4 text-sky-500" />
                Ventes
              </TabsTrigger>
              <TabsTrigger
                value="produits"
                className="gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-500 shadow-none hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-[0_12px_26px_rgba(19,33,54,0.1)]"
              >
                <Medal className="h-4 w-4 text-amber-500" />
                Produits
              </TabsTrigger>
              <TabsTrigger
                value="finances"
                className="gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-500 shadow-none hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-[0_12px_26px_rgba(19,33,54,0.1)]"
              >
                <Wallet className="h-4 w-4 text-cyan-500" />
                Finances
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ventes" className="space-y-6 pt-4">
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 shadow-[0_8px_24px_rgba(239,68,68,0.08)]">
                  {error}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-slate-500 shadow-sm">
                  Dernière synchro: {formatDateTime(stats?.lastUpdated)}
                </Badge>
                <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-slate-500 shadow-sm">
                  Devise: {currency}
                </Badge>
                <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-slate-500 shadow-sm">
                  Périmètre: ventes · facturation · stock
                </Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map((card) => {
                  const Icon = card.icon
                  return (
                    <Card key={card.title} className={`animate-premium-in overflow-hidden rounded-[24px] ${surfaceCardClass}`}>
                      <CardContent className="flex items-start justify-between p-6">
                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{card.title}</p>
                          <p className="text-2xl font-semibold tracking-tight text-slate-950">{loading ? '…' : card.value}</p>
                          <p className="text-xs text-slate-500">{card.helper}</p>
                        </div>
                        <div className="flex flex-col items-end gap-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${card.deltaTone}`}>
                            {card.title === 'Factures à encaisser' || (stats && ((card.title === 'CA du mois' && stats.sales.growth < 0))) ? <ArrowDownRight className="mr-1 h-3.5 w-3.5" /> : <ArrowUpRight className="mr-1 h-3.5 w-3.5" />}
                            {loading ? '…' : card.delta}
                          </span>
                          <div className={`rounded-2xl p-3 ${card.accent}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                        </div>
                      </CardContent>
                      <div className={`h-1.5 w-full bg-gradient-to-r ${card.barClass}`} />
                    </Card>
                  )
                })}
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
                <Card className={`rounded-[28px] ${surfaceCardClass}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-[2rem] font-semibold tracking-tight text-slate-950">Prédiction commerciale</CardTitle>
                        <p className="mt-1 text-sm text-slate-500">
                          Revenu sécurisé · encaissements attendus · exposition au risque.
                        </p>
                      </div>
                      <Badge variant="outline" className="rounded-2xl border-[rgba(91,128,190,0.18)] bg-[rgba(91,128,190,0.1)] px-3 py-1.5 text-slate-600 shadow-sm">
                        Focus clôture
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4">
                      {[
                          {
                            title: 'Confirmé',
                            value: derived ? formatCurrencyAmount(derived.revenueSecured, currency) : '—',
                            description: 'Factures encaissées, revenu déjà sécurisé.',
                            color: 'bg-emerald-500',
                            surfaceClass: 'border-emerald-100 bg-emerald-50/70',
                            valueClass: 'text-emerald-600',
                            percentage: derived ? clampPercent((derived.revenueSecured / Math.max(stats?.invoices.totalAmount || 1, 1)) * 100) : 0,
                            icon: CircleDollarSign,
                          },
                          {
                            title: 'À encaisser',
                            value: derived ? formatCurrencyAmount(derived.revenueToCollect, currency) : '—',
                            description: 'Montant en attente avec action commerciale à poursuivre.',
                            color: 'bg-amber-500',
                            surfaceClass: 'border-amber-100 bg-amber-50/70',
                            valueClass: 'text-amber-600',
                            percentage: derived ? clampPercent((derived.revenueToCollect / Math.max(stats?.invoices.totalAmount || 1, 1)) * 100) : 0,
                            icon: Clock3,
                          },
                          {
                            title: 'À risque',
                            value: derived ? formatCurrencyAmount(derived.revenueAtRisk, currency) : '—',
                            description: 'Part estimée exposée par les retards de règlement.',
                            color: 'bg-rose-500',
                            surfaceClass: 'border-rose-100 bg-rose-50/70',
                            valueClass: 'text-rose-500',
                            percentage: derived?.overdueShare || 0,
                            icon: ShieldAlert,
                          },
                      ].map((block) => {
                        const Icon = block.icon
                        return (
                          <div key={block.title} className={`rounded-[24px] border p-5 shadow-[0_10px_24px_rgba(15,23,42,0.05)] ${block.surfaceClass}`}>
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="text-base font-semibold tracking-tight text-slate-800">{block.title}</p>
                                <p className={`mt-2 text-2xl font-semibold ${block.valueClass}`}>{loading ? '…' : block.value}</p>
                              </div>
                              <div className="rounded-2xl bg-white p-3 text-slate-500 shadow-sm">
                                <Icon className="h-5 w-5" />
                              </div>
                            </div>
                            <p className="mt-3 text-xs text-slate-500">{block.description}</p>
                            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                              <div className={`${block.color} h-full rounded-full`} style={{ width: `${block.percentage}%` }} />
                            </div>
                            <p className="mt-2 text-xs text-slate-500">{toSafeNumber(block.percentage).toFixed(0)}% du volume facturé</p>
                          </div>
                        )
                      })}
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                          <p className="text-sm text-slate-500">Projection fin de mois</p>
                          <p className="mt-2 text-xl font-semibold text-slate-950">{loading || !derived ? '—' : formatCurrencyAmount(derived.revenueForecast, currency)}</p>
                          <p className="mt-1 text-xs text-slate-500">CA du mois + potentiel d'encaissement hors risque.</p>
                      </div>
                      <div className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                          <p className="text-sm text-slate-500">Taux de conversion</p>
                          <p className="mt-2 text-xl font-semibold text-slate-950">{loading || !derived ? '—' : `${derived.conversionRate.toFixed(1)}%`}</p>
                          <p className="mt-1 text-xs text-slate-500">Commandes acceptées rapportées au flux total.</p>
                      </div>
                      <div className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                          <p className="text-sm text-slate-500">Couverture de stock</p>
                          <p className="mt-2 text-xl font-semibold text-slate-950">{loading || !derived ? '—' : `${derived.stockCoverage.toFixed(1)}%`}</p>
                          <p className="mt-1 text-xs text-slate-500">Produits disponibles sans tension immédiate.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`rounded-[28px] ${surfaceCardClass}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-xl font-semibold tracking-tight text-slate-950">Top produits</CardTitle>
                        <p className="mt-1 text-sm text-slate-500">3 derniers mois · par unités vendues</p>
                      </div>
                      <Link href="/reports" className="rounded-2xl border border-border bg-white px-3 py-2 text-xs font-medium text-slate-500 shadow-sm transition-colors hover:bg-secondary hover:text-slate-800">
                        Voir tout
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {(loading ? [] : topProducts).map((product, index) => {
                      const progress = topProducts[0]?.totalQuantity ? clampPercent((product.totalQuantity / topProducts[0].totalQuantity) * 100) : 0
                      const isLeader = index === 0

                      return (
                        <div key={product.id} className="space-y-2">
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 flex h-8 min-w-8 items-center justify-center rounded-xl text-[11px] font-semibold ${isLeader ? 'bg-gold-soft text-gold ring-1 ring-[rgba(198,168,106,0.22)]' : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'}`}>
                              {isLeader ? <Medal className="h-3.5 w-3.5" /> : `#${index + 1}`}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="truncate text-sm font-semibold text-slate-900">{product.name}</p>
                                  <p className="mt-1 text-xs text-slate-400">CA: {formatCurrencyAmount(product.totalRevenue, currency)}</p>
                                </div>
                                <span className="text-sm font-semibold text-[#2F6ED2]">{product.totalQuantity} u.</span>
                              </div>
                              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                <div className={`h-full rounded-full ${isLeader ? 'bg-[linear-gradient(90deg,#C6A86A,#E2C686)]' : 'bg-[linear-gradient(90deg,#4D84DB,#6AA1F4)]'}`} style={{ width: `${progress}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {!loading && topProducts.length === 0 && (
                      <p className="text-sm text-slate-500">Aucune donnée produit récente disponible.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className={`rounded-[28px] ${surfaceCardClass}`}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl font-semibold tracking-tight text-slate-950">Commandes récentes</CardTitle>
                      <p className="mt-1 text-sm text-slate-500">5 dernières commandes enregistrées</p>
                    </div>
                    <Link href="/orders" className="rounded-2xl border border-border bg-white px-3 py-2 text-xs font-medium text-slate-500 shadow-sm transition-colors hover:bg-secondary hover:text-slate-800">
                      Toutes les commandes
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="border-y border-border bg-slate-50/80 text-left text-[11px] uppercase tracking-[0.14em] text-slate-400">
                          <th className="px-6 py-4 font-semibold">N° commande</th>
                          <th className="px-6 py-4 font-semibold">Client</th>
                          <th className="px-6 py-4 font-semibold">Produit</th>
                          <th className="px-6 py-4 font-semibold">Date</th>
                          <th className="px-6 py-4 font-semibold">Montant</th>
                          <th className="px-6 py-4 font-semibold">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.map((order) => {
                          const status = getOrderStatusMeta(order.status)
                          const StatusIcon = status.icon

                          return (
                            <tr key={order.id} className="border-b border-border/70 text-sm transition-colors hover:bg-slate-50/70">
                              <td className="px-6 py-4 font-semibold text-[#2F6ED2]">#{order.number}</td>
                              <td className="px-6 py-4 text-slate-800">{getClientDisplayName(order)}</td>
                              <td className="px-6 py-4 text-slate-500">{getPrimaryProductLabel(order)}</td>
                              <td className="px-6 py-4 text-slate-400">{formatShortDate(order.orderDate)}</td>
                              <td className="px-6 py-4 font-semibold text-slate-950">{formatCurrencyAmount(order.total, currency)}</td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${status.className}`}>
                                  <StatusIcon className="h-3.5 w-3.5" />
                                  {status.label}
                                </span>
                              </td>
                            </tr>
                          )
                        })}

                        {!loading && recentOrders.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">
                              Aucune commande récente disponible.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="produits" className="space-y-6 pt-4">
              <DashboardProductsPanel
                currency={currency}
                productData={productAnalytics}
                loading={loading && !productAnalytics}
                error={productError}
              />
            </TabsContent>

            <TabsContent value="finances" className="space-y-6 pt-4">
              <DashboardFinancePanel
                currency={currency}
                stats={stats ? { invoices: stats.invoices } : null}
                invoices={financeInvoices}
                salesData={salesAnalytics}
                productData={productAnalytics}
                loading={loading && !salesAnalytics && financeInvoices.length === 0}
                error={financeError}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  )
}

