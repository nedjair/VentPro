'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastData {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastProps {
  toast: ToastData
  onRemove: (id: string) => void
}

function Toast({ toast, onRemove }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id)
    }, toast.duration || 5000)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onRemove])

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-emerald-50 border-emerald-100',
          text: 'text-emerald-700',
          icon: CheckCircle,
          iconColor: 'text-emerald-500'
        }
      case 'error':
        return {
          bg: 'bg-red-50 border-red-100',
          text: 'text-red-700',
          icon: XCircle,
          iconColor: 'text-red-500'
        }
      case 'warning':
        return {
          bg: 'bg-amber-50 border-amber-100',
          text: 'text-amber-700',
          icon: AlertCircle,
          iconColor: 'text-amber-500'
        }
      case 'info':
        return {
          bg: 'bg-sky-50 border-sky-100',
          text: 'text-sky-700',
          icon: Info,
          iconColor: 'text-sky-500'
        }
    }
  }

  const styles = getToastStyles(toast.type)
  const Icon = styles.icon

  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)] ${styles.bg} ${styles.text} animate-in slide-in-from-right duration-300`}>
      <Icon className={`w-5 h-5 flex-shrink-0 ${styles.iconColor}`} />
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className={`flex-shrink-0 rounded-full p-1 transition-colors hover:bg-white/60 ${styles.iconColor} focus:outline-none focus:ring-2 focus:ring-primary/15 focus:ring-offset-2 focus:ring-offset-background`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// Container pour les toasts
interface ToastContainerProps {
  toasts: ToastData[]
  onRemove: (id: string) => void
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

// Hook et système de gestion des toasts
let toasts: ToastData[] = []
let listeners: Array<(toasts: ToastData[]) => void> = []

const addToast = (type: ToastType, message: string, duration?: number) => {
  const id = Math.random().toString(36).substr(2, 9)
  const newToast: ToastData = { id, type, message, duration }
  
  toasts = [...toasts, newToast]
  listeners.forEach(listener => listener(toasts))
}

const removeToast = (id: string) => {
  toasts = toasts.filter(toast => toast.id !== id)
  listeners.forEach(listener => listener(toasts))
}

export const toast = {
  success: (message: string, duration?: number) => addToast('success', message, duration),
  error: (message: string, duration?: number) => addToast('error', message, duration),
  warning: (message: string, duration?: number) => addToast('warning', message, duration),
  info: (message: string, duration?: number) => addToast('info', message, duration),
}

// Hook pour utiliser les toasts dans les composants
export function useToast() {
  const [toastList, setToastList] = useState<ToastData[]>(toasts)

  useEffect(() => {
    const listener = (newToasts: ToastData[]) => {
      setToastList(newToasts)
    }
    
    listeners.push(listener)
    
    return () => {
      listeners = listeners.filter(l => l !== listener)
    }
  }, [])

  return {
    toasts: toastList,
    removeToast
  }
}

// Composant à inclure dans l'app pour afficher les toasts
export function ToastProvider() {
  const { toasts: toastList, removeToast } = useToast()
  
  return <ToastContainer toasts={toastList} onRemove={removeToast} />
}
