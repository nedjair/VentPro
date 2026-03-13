import { MainLayout } from '@/components/layout/main-layout'

interface DashboardData {
  clients?: {
    total: number
    individuals: number
    companies: number
    recentCount: number
    growth: number
  }
  products?: {
    total: number
    inStock: number
    lowStock: number
    outOfStock: number
    totalStockValue: number
  }
  sales?: {
    currentMonth: number
    previousMonth: number
    growth: number
    currency: string
  }
  orders?: {
    total: number
    pending: number
    accepted: number
    rejected: number
    averageValue: number
  }
  invoices?: {
    total: number
    paid: number
    pending: number
    overdue: number
    totalAmount: number
    paidAmount: number
    pendingAmount: number
  }
}

interface User {
  userId: string
  email: string
  role: string
  companyId: string
}

interface DashboardServerSideProps {
  user: User
  dashboardData: { success: boolean; data?: DashboardData } | null
  initialToken: string
}

function StatCard({ 
  title, 
  value, 
  subtitle, 
  trend, 
  icon 
}: { 
  title: string
  value: string | number
  subtitle?: string
  trend?: number
  icon: string
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
      {trend !== undefined && (
        <div className="mt-4">
          <span className={`inline-flex items-center text-sm ${
            trend >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend >= 0 ? '↗' : '↘'} {Math.abs(trend)}%
          </span>
        </div>
      )}
    </div>
  )
}

function formatCurrency(amount: number, currency: string = 'DA'): string {
  return new Intl.NumberFormat('fr-DZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount) + ` ${currency}`
}

export function DashboardServerSide({ user, dashboardData, initialToken }: DashboardServerSideProps) {
  const data = dashboardData?.data

  return (
    <MainLayout title="Tableau de bord" subtitle="Vue d'ensemble de votre activité commerciale">
      <div className="space-y-6">
        {/* Informations utilisateur */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {user.email.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-800">
                Connecté en tant que: {user.email}
              </p>
              <p className="text-sm text-blue-600">
                Rôle: {user.role} | ID: {user.userId}
              </p>
            </div>
          </div>
        </div>

        {/* Message d'erreur si pas de données */}
        {!dashboardData?.success && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400 text-xl">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Erreur de chargement des données
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>Impossible de charger les données du tableau de bord. Vérifiez la connexion au backend.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cartes de statistiques */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Clients */}
            <StatCard
              title="Clients"
              value={data.clients?.total || 0}
              subtitle={`${data.clients?.individuals || 0} particuliers, ${data.clients?.companies || 0} entreprises`}
              trend={data.clients?.growth}
              icon="👥"
            />

            {/* Produits */}
            <StatCard
              title="Produits"
              value={data.products?.total || 0}
              subtitle={`${data.products?.inStock || 0} en stock, ${data.products?.lowStock || 0} stock faible`}
              icon="📦"
            />

            {/* Ventes */}
            <StatCard
              title="Ventes du mois"
              value={formatCurrency(data.sales?.currentMonth || 0, data.sales?.currency)}
              trend={data.sales?.growth}
              icon="💰"
            />

            {/* Commandes */}
            <StatCard
              title="Commandes"
              value={data.orders?.total || 0}
              subtitle={`${data.orders?.pending || 0} en attente, ${data.orders?.accepted || 0} acceptées`}
              icon="📋"
            />
          </div>
        )}

        {/* Section détaillée */}
        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Détails des ventes */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Détails des Ventes</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Mois actuel:</span>
                  <span className="font-semibold">
                    {formatCurrency(data.sales?.currentMonth || 0, data.sales?.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Mois précédent:</span>
                  <span className="font-semibold">
                    {formatCurrency(data.sales?.previousMonth || 0, data.sales?.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Évolution:</span>
                  <span className={`font-semibold ${
                    (data.sales?.growth || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {(data.sales?.growth || 0) >= 0 ? '+' : ''}{data.sales?.growth || 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Détails des stocks */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">État des Stocks</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Produits en stock:</span>
                  <span className="font-semibold text-green-600">{data.products?.inStock || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Stock faible:</span>
                  <span className="font-semibold text-orange-600">{data.products?.lowStock || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rupture de stock:</span>
                  <span className="font-semibold text-red-600">{data.products?.outOfStock || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Valeur totale:</span>
                  <span className="font-semibold">
                    {formatCurrency(data.products?.totalStockValue || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Informations de débogage */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Informations de débogage</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <p>✅ Middleware: Token validé côté serveur</p>
            <p>✅ SSR: Données chargées côté serveur</p>
            <p>✅ Rendu: Page générée sans JavaScript côté client</p>
            <p>📊 API: {dashboardData?.success ? 'Connexion réussie' : 'Erreur de connexion'}</p>
            <p>🕒 Timestamp: {new Date().toLocaleString('fr-FR')}</p>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
