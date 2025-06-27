'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/stores/auth'

const navigation = [
  {
    name: 'Dashboard',
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
    name: 'Commandes',
    href: '/orders',
    icon: ShoppingCart,
  },
  {
    name: 'Factures',
    href: '/invoices',
    icon: FileText,
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
  {
    name: 'Paramètres',
    href: '/settings',
    icon: Settings,
  },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout, isHydrated } = useAuth()

  return (
    <div className={cn('flex h-full w-64 flex-col bg-white shadow-lg', className)}>
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-gray-200">
        <div className="flex items-center">
          <Building2 className="h-8 w-8 text-blue-600" />
          <span className="ml-2 text-xl font-bold text-gray-900">GC TPE</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'nav-item',
                isActive && 'active'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-200">
        {/* Utilisateur */}
        <div className="flex items-center justify-between" suppressHydrationWarning>
          <div className="flex items-center">
            <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {isHydrated && user ? (user.firstName?.charAt(0) || user.email.charAt(0)).toUpperCase() : 'U'}
              </span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">
                {isHydrated && user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Utilisateur'}
              </p>
              <p className="text-xs text-gray-500">
                {isHydrated && user?.role === 'ADMIN' ? 'Administrateur' :
                 isHydrated && user?.role === 'MANAGER' ? 'Manager' :
                 isHydrated && user?.role === 'USER' ? 'Utilisateur' : 'Lecture seule'}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Se déconnecter"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}


