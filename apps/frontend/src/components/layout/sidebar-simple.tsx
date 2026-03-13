'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  FileText,
  BarChart3,
  Building2,
  LogOut,
  Activity,
  Truck,
  Warehouse,
  Stethoscope,
  Settings,
  CreditCard,
  ShoppingBag,
  UserCog
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/stores/auth'

// Navigation principale - TOUS LES MODULES TOUJOURS VISIBLES
const mainNavigation = [
  {
    name: 'Tableau de bord',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: Activity,
  },
  {
    name: 'Clients',
    href: '/clients',
    icon: Users,
  },
  {
    name: 'Produits',
    href: '/products',
    icon: Package,
  },
  {
    name: 'Stock',
    href: '/stocks',
    icon: Warehouse,
  },
  {
    name: 'Fournisseurs',
    href: '/suppliers',
    icon: Truck,
  },
  {
    name: 'Commandes & Devis',
    href: '/orders',
    icon: ShoppingCart,
  },
  {
    name: 'Factures',
    href: '/invoices',
    icon: FileText,
  },
  {
    name: 'Paiements',
    href: '/payments',
    icon: CreditCard,
  },
  {
    name: 'Achats',
    href: '/purchase-orders',
    icon: ShoppingBag,
  },
  {
    name: 'Rapports',
    href: '/reports',
    icon: BarChart3,
  },
  {
    name: 'Diagnostic',
    href: '/diagnostic',
    icon: Stethoscope,
  },
]

// Navigation des paramètres
const settingsNavigation = [
  {
    name: 'Paramètres',
    href: '/settings',
    icon: Settings,
  },
]

interface SidebarProps {
  className?: string
}

export function SidebarSimple({ className }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  // Debug: Vérifier que le sidebar simplifié est bien chargé
  console.log('🔧 SidebarSimple: Chargé avec', mainNavigation.length, 'modules principaux')

  // Fonction pour gérer la navigation avec debug
  const handleNavigation = (href: string, name: string) => {
    console.log(`🧭 SidebarSimple Navigation: Clic sur ${name} vers ${href}`)
    console.log(`🧭 URL actuelle: ${pathname}`)

    try {
      router.push(href)
      console.log(`✅ Navigation initiée vers ${href}`)
    } catch (error) {
      console.error(`❌ Erreur de navigation vers ${href}:`, error)
    }
  }

  return (
    <aside className={cn('flex h-full w-64 flex-col bg-white shadow-lg border-r border-gray-200', className)}>
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center">
          <Building2 className="h-8 w-8 text-blue-600" />
          <span className="ml-2 text-xl font-bold text-gray-900">GC TPE</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* Navigation principale */}
        <div className="space-y-1">
          {mainNavigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href, item.name)}
                className={cn(
                  'flex items-center px-3 py-2.5 text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200 rounded-lg text-sm w-full text-left',
                  isActive && 'bg-blue-100 text-blue-700 font-medium border-r-2 border-blue-600'
                )}
              >
                <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-medium">{item.name}</span>
              </button>
            )
          })}
        </div>

        {/* Séparateur pour les paramètres */}
        {user?.role === 'ADMIN' && (
          <div className="border-t border-gray-200 my-2 pt-2">
            <div className="px-3 py-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Administration
              </h3>
            </div>
          </div>
        )}

        {/* Navigation des paramètres - seulement pour les admins */}
        {user?.role === 'ADMIN' && (
          <div className="space-y-1">
            {settingsNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.href, item.name)}
                  className={cn(
                    'flex items-center px-3 py-2.5 text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200 rounded-lg text-sm w-full text-left',
                    isActive && 'bg-blue-100 text-blue-700 font-medium border-r-2 border-blue-600'
                  )}
                >
                  <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium">{item.name}</span>
                </button>
              )
            })}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center min-w-0 flex-1">
            <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-medium">
                {user ? (user.firstName?.charAt(0) || user.email.charAt(0)).toUpperCase() : 'A'}
              </span>
            </div>
            <div className="ml-3 min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-900 truncate">
                {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Admin User'}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {user?.role === 'ADMIN' ? 'Administrateur' :
                 user?.role === 'MANAGER' ? 'Manager' :
                 user?.role === 'EMPLOYEE' ? 'Employé' :
                 'Utilisateur'}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-2 flex-shrink-0"
            title="Se déconnecter"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
