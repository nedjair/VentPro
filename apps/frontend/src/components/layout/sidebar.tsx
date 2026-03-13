'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { SidebarPremium } from './sidebar-premium'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  FileText,
  BarChart3,
  Building2,
  LogOut,
  Truck,
  Warehouse,
  Stethoscope,
  Settings,
  FileEdit,
  CreditCard,
  ShoppingBag,
  UserCog,
  Moon,
  Sun
} from 'lucide-react'
import { useAuth } from '@/stores/auth'
import { useTheme } from '@/contexts/ThemeContext'

// Composant wrapper pour gérer l'hydratation du Sidebar
function ClientOnlySidebar({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Afficher un placeholder pendant l'hydratation
  if (!isMounted) {
    return (
      <aside className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <div className="flex h-20 shrink-0 items-center border-b border-sidebar-border px-6">
          <div className="flex items-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="ml-3">
              <span className="block text-base font-semibold tracking-tight text-sidebar-foreground">GC TPE</span>
              <span className="block text-xs text-muted-foreground">Gestion commerciale</span>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
          <div className="animate-pulse space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-11 rounded-2xl bg-secondary"></div>
            ))}
          </div>
        </nav>
      </aside>
    )
  }

  return <>{children}</>
}

// Types pour les éléments de navigation
interface NavigationItem {
  name: string
  href: string
  icon: any
  roles?: string[] // Rôles autorisés à voir cet élément
  permissions?: string[] // Permissions requises
}

// Navigation principale
const mainNavigation: NavigationItem[] = [
  {
    name: 'Tableau de bord',
    href: '/dashboard',
    icon: LayoutDashboard,
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
const settingsNavigation: NavigationItem[] = [
  {
    name: 'Paramètres',
    href: '/settings',
    icon: Settings,
  },
]

interface SidebarProps {
  className?: string
}

// Fonction pour vérifier si l'utilisateur peut accéder à un élément de navigation
function canAccessNavItem(item: NavigationItem, userRole?: string): boolean {
  // Si aucune restriction de rôle, accessible à tous
  if (!item.roles || item.roles.length === 0) {
    return true
  }

  // Si pas d'utilisateur connecté, pas d'accès aux éléments restreints
  if (!userRole) {
    return false
  }

  // Vérifier si le rôle de l'utilisateur est dans la liste des rôles autorisés
  // Mapper les rôles du store vers les rôles Prisma
  const roleMapping: { [key: string]: string } = {
    'ADMIN': 'ADMIN',
    'MANAGER': 'MANAGER',
    'USER': 'EMPLOYEE',
    'READONLY': 'EMPLOYEE'
  }

  const mappedRole = roleMapping[userRole] || userRole
  return item.roles.includes(mappedRole) || item.roles.includes(userRole)
}

// Composant interne du Sidebar avec toutes les fonctionnalités
function SidebarContent({ className }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { resolvedTheme, toggleTheme } = useTheme()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Toujours afficher tous les modules principaux (pas de filtrage par rôle pour les modules principaux)
  const filteredMainNavigation = mainNavigation



  // Filtrer seulement les paramètres selon le rôle
  const filteredSettingsNavigation = isMounted && user ?
    settingsNavigation.filter(item => canAccessNavItem(item, user?.role)) :
    []



  return (
    <aside className={cn('flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar shadow-[0_16px_40px_rgba(15,23,42,0.06)] transition-colors duration-300', className)}>
      {/* Logo */}
      <div className="flex h-20 shrink-0 items-center border-b border-sidebar-border px-6">
        <div className="flex items-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="ml-3">
            <span className="block text-base font-semibold tracking-tight text-sidebar-foreground">GC TPE</span>
            <span className="block text-xs text-muted-foreground">Gestion commerciale</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
        {/* Navigation principale */}
        {filteredMainNavigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex w-full items-center rounded-2xl px-3.5 py-3 text-left text-sm font-medium tracking-[-0.01em] transition-all duration-200',
                isActive
                  ? 'bg-card text-sidebar-foreground shadow-[0_10px_24px_rgba(15,23,42,0.08)] ring-1 ring-sidebar-border'
                  : 'text-muted-foreground hover:bg-card hover:text-sidebar-foreground hover:shadow-[0_8px_20px_rgba(15,23,42,0.05)]'
              )}
            >
              <item.icon className={cn(
                'mr-3 h-5 w-5 flex-shrink-0',
                isActive ? 'text-sidebar-foreground' : 'text-muted-foreground group-hover:text-sidebar-foreground'
              )} />
              <span>{item.name}</span>
            </Link>
          )
        })}

        {/* Séparateur si il y a des paramètres à afficher */}
        {filteredSettingsNavigation.length > 0 && (
          <div className="my-3 border-t border-sidebar-border pt-3">
            <div className="px-3 py-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Administration
              </h3>
            </div>
          </div>
        )}

        {/* Navigation des paramètres */}
        {filteredSettingsNavigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex w-full items-center rounded-2xl px-3.5 py-3 text-left text-sm font-medium tracking-[-0.01em] transition-all duration-200',
                isActive
                  ? 'bg-card text-sidebar-foreground shadow-[0_10px_24px_rgba(15,23,42,0.08)] ring-1 ring-sidebar-border'
                  : 'text-muted-foreground hover:bg-card hover:text-sidebar-foreground hover:shadow-[0_8px_20px_rgba(15,23,42,0.05)]'
              )}
            >
              <item.icon className={cn(
                'mr-3 h-5 w-5 flex-shrink-0',
                isActive ? 'text-sidebar-foreground' : 'text-muted-foreground group-hover:text-sidebar-foreground'
              )} />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <footer className="border-t border-sidebar-border bg-card/70 px-4 py-4 backdrop-blur">
        {/* Utilisateur */}
        <div className="flex items-center justify-between">
          <div className="flex items-center min-w-0 flex-1">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <span className="text-primary-foreground text-sm font-medium">
                {user ? (user.firstName?.charAt(0) || user.email.charAt(0)).toUpperCase() : 'A'}
              </span>
            </div>
            <div className="ml-3 min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-sidebar-foreground">
                {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Admin User'}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {user?.role === 'ADMIN' ? 'Administrateur' :
                 user?.role === 'MANAGER' ? 'Manager' :
                 user?.role === 'EMPLOYEE' ? 'Employé' :
                 'Utilisateur'}
              </span>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="ml-2 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl text-muted-foreground transition-colors hover:bg-secondary hover:text-sidebar-foreground"
            title={`Basculer vers le thème ${resolvedTheme === 'light' ? 'sombre' : 'clair'}`}
          >
            {resolvedTheme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          <button
            onClick={logout}
            className="ml-2 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl text-muted-foreground transition-colors hover:bg-secondary hover:text-sidebar-foreground"
            title="Se déconnecter"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </aside>
  )
}

// Composant principal exporté avec protection d'hydratation
export function Sidebar({ className }: SidebarProps) {
  // Point d'entrée unique : toute l'application consomme désormais la variante premium.
  return <SidebarPremium className={className} />
}


