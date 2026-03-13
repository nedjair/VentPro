'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { BarChart3, Building2, CreditCard, FileText, LayoutDashboard, LogOut, Moon, Package, PanelLeftClose, PanelLeftOpen, Settings, ShoppingBag, ShoppingCart, Stethoscope, Sun, Truck, Users, Warehouse } from 'lucide-react'

import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/stores/auth'
import { cn } from '@/lib/utils'

const SIDEBAR_KEY = 'gc-premium-sidebar-collapsed'

type NavItem = { name: string; href: string; icon: LucideIcon; badge?: number; roles?: string[] }

const mainNavigation: NavItem[] = [
  { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Produits', href: '/products', icon: Package },
  { name: 'Stock', href: '/stocks', icon: Warehouse },
  { name: 'Fournisseurs', href: '/suppliers', icon: Truck },
  { name: 'Commandes', href: '/orders', icon: ShoppingCart, badge: 3 },
  { name: 'Factures', href: '/invoices', icon: FileText, badge: 1 },
  { name: 'Paiements', href: '/payments', icon: CreditCard },
  { name: 'Achats', href: '/purchase-orders', icon: ShoppingBag },
  { name: 'Rapports', href: '/reports', icon: BarChart3 },
  { name: 'Diagnostic', href: '/diagnostic', icon: Stethoscope },
]

const settingsNavigation: NavItem[] = [{ name: 'Paramètres', href: '/settings', icon: Settings, roles: ['ADMIN', 'MANAGER'] }]

const getRoleLabel = (role?: string) => role === 'ADMIN' ? 'Administrateur' : role === 'MANAGER' ? 'Manager' : role === 'EMPLOYEE' ? 'Employé' : 'Utilisateur'
const canAccess = (item: NavItem, role?: string) => !item.roles?.length || !!role && item.roles.includes(role)

export function SidebarPremium({ className }: { className?: string }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { resolvedTheme, toggleTheme } = useTheme()
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // On restaure la préférence locale pour garder la sidebar stable entre deux visites.
    setCollapsed(window.localStorage.getItem(SIDEBAR_KEY) === 'true')
  }, [])

  useEffect(() => {
    if (mounted) window.localStorage.setItem(SIDEBAR_KEY, String(collapsed))
  }, [collapsed, mounted])

  const filteredSettings = mounted ? settingsNavigation.filter((item) => canAccess(item, user?.role)) : []

  return (
    <aside className={cn('flex h-full flex-col border-r border-[#16345C] bg-[#0C1F3B] px-4 py-5 text-white shadow-[0_20px_48px_rgba(4,12,24,0.28)] transition-[width] duration-300', collapsed ? 'w-24' : 'w-72', className)}>
      <div className="flex items-center justify-between rounded-[24px] bg-[#0C1F3B] px-3.5 py-3 shadow-[0_10px_24px_rgba(6,18,36,0.16)]">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-[#3E76C8] to-[#173764] text-white shadow-[0_16px_30px_rgba(62,118,200,0.35)] ring-1 ring-white/10"><Building2 className="h-5 w-5" /></div>
          {!collapsed && <div className="min-w-0"><span className="block truncate font-[family:var(--font-display)] text-lg font-semibold text-white">VentesPro</span><span className="block truncate text-xs text-slate-200">Gestion PME premium</span></div>}
        </div>
        <button type="button" onClick={() => setCollapsed((current) => !current)} className="flex h-10 w-10 items-center justify-center rounded-2xl text-slate-200 transition-all hover:bg-[#1A3A67] hover:text-white" aria-label={collapsed ? 'Déplier la barre latérale' : 'Replier la barre latérale'}>
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <nav className="premium-scrollbar mt-5 flex-1 space-y-6 overflow-y-auto pb-4">
        <div className="space-y-2">
          {!collapsed && <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-300">Navigation</p>}
          {mainNavigation.map((item, index) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link key={item.name} href={item.href} title={collapsed ? item.name : undefined} className={cn('group flex items-center rounded-[22px] px-3.5 py-3 text-sm transition-all duration-200', collapsed ? 'justify-center' : 'justify-between', isActive ? 'bg-[#173764] text-white shadow-[0_14px_28px_rgba(6,18,36,0.26)] ring-1 ring-[#3E76C8]/35' : 'text-slate-100 hover:bg-[#143056] hover:text-white', index < 5 ? 'animate-premium-in' : '')}>
                <div className={cn('flex min-w-0 items-center', collapsed ? 'justify-center' : 'gap-3')}>
                  <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-all', isActive ? 'bg-[#21497F] text-white ring-1 ring-white/10' : 'bg-[#16345E] text-slate-100 group-hover:bg-[#21497F] group-hover:text-white')}><Icon className="h-4.5 w-4.5" /></span>
                  {!collapsed && <span className="block truncate font-medium tracking-[-0.01em]">{item.name}</span>}
                </div>
                {!collapsed && item.badge ? <span className="ml-3 inline-flex min-w-6 items-center justify-center rounded-full bg-[#2C5C9E] px-2 py-1 text-[10px] font-semibold text-white shadow-[0_10px_20px_rgba(22,52,94,0.28)]">{item.badge}</span> : null}
              </Link>
            )
          })}
        </div>

        {filteredSettings.length > 0 && (
          <div className="space-y-2">
            {!collapsed && <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-300">Administration</p>}
            {filteredSettings.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return <Link key={item.name} href={item.href} title={collapsed ? item.name : undefined} className={cn('group flex items-center rounded-[22px] px-3.5 py-3 text-sm transition-all duration-200', collapsed ? 'justify-center' : 'gap-3', isActive ? 'bg-[#173764] text-white ring-1 ring-[#3E76C8]/35' : 'text-slate-100 hover:bg-[#143056] hover:text-white')}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#16345E] text-slate-100 transition-all group-hover:bg-[#21497F] group-hover:text-white"><Icon className="h-4.5 w-4.5" /></span>{!collapsed && <span className="font-medium">{item.name}</span>}</Link>
            })}
          </div>
        )}
      </nav>

      <footer className="mt-4 rounded-[24px] bg-[#0C1F3B] p-3 shadow-[0_10px_24px_rgba(6,18,36,0.16)]">
        <div className={cn('flex items-center', collapsed ? 'flex-col justify-center gap-3' : 'justify-between gap-3')}>
          <div className={cn('flex min-w-0 items-center', collapsed ? 'justify-center' : 'gap-3')}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(198,168,106,0.95),rgba(140,113,54,0.95))] text-sm font-semibold text-[#10233D] shadow-[0_14px_28px_rgba(198,168,106,0.26)]">{user ? (user.firstName?.charAt(0) || user.email.charAt(0)).toUpperCase() : 'A'}</div>
            {!collapsed && <div className="min-w-0"><span className="block truncate text-sm font-medium text-white">{user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Admin User'}</span><span className="block truncate text-xs text-slate-200">{getRoleLabel(user?.role)}</span></div>}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={toggleTheme} className="flex h-10 w-10 items-center justify-center rounded-2xl text-slate-100 transition-all hover:bg-[#1A3A67] hover:text-white" aria-label={`Basculer vers le thème ${resolvedTheme === 'light' ? 'sombre' : 'clair'}`}>{resolvedTheme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</button>
            <button type="button" onClick={logout} className="flex h-10 w-10 items-center justify-center rounded-2xl text-[#F08A8A] transition-all hover:bg-[rgba(240,138,138,0.1)] hover:text-[#FFB1B1]" aria-label="Se déconnecter"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </footer>
    </aside>
  )
}

