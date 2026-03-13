import { AlertCircle, CheckCircle2, Clock3, Mail, MinusCircle, XCircle } from 'lucide-react'
import type { ComponentType } from 'react'
import { Invoice } from '@/lib/api'
import { cn } from '@/lib/utils'

type InvoiceStatusKey = Invoice['status']

type InvoiceStatusMeta = {
  label: string
  className: string
  icon: ComponentType<{ className?: string }>
}

const invoiceStatusMeta: Record<InvoiceStatusKey, InvoiceStatusMeta> = {
  DRAFT: {
    label: 'Brouillon',
    icon: MinusCircle,
    className: 'border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100',
  },
  SENT: {
    label: 'En attente',
    icon: Mail,
    className: 'border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-600 dark:bg-sky-900/40 dark:text-sky-100',
  },
  PAID: {
    label: 'Payée',
    icon: CheckCircle2,
    className: 'border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-100',
  },
  PARTIAL: {
    label: 'Partiellement payée',
    icon: Clock3,
    className: 'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-600 dark:bg-amber-900/40 dark:text-amber-100',
  },
  OVERDUE: {
    label: 'En retard',
    icon: AlertCircle,
    className: 'border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-600 dark:bg-rose-900/40 dark:text-rose-100',
  },
  CANCELLED: {
    label: 'Annulée',
    icon: XCircle,
    className: 'border-zinc-300 bg-zinc-100 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900/40 dark:text-zinc-100',
  },
}

export function getInvoiceStatusMeta(status: Invoice['status']) {
  return invoiceStatusMeta[status] || invoiceStatusMeta.DRAFT
}

interface InvoiceStatusBadgeProps {
  status: Invoice['status']
  size?: 'sm' | 'md'
  className?: string
}

export function InvoiceStatusBadge({ status, size = 'sm', className }: InvoiceStatusBadgeProps) {
  const meta = getInvoiceStatusMeta(status)
  const Icon = meta.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold transition-colors duration-200 ease-out',
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
        meta.className,
        className
      )}
      aria-label={`Statut de la facture : ${meta.label}`}
    >
      <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      <span>{meta.label}</span>
    </span>
  )
}
