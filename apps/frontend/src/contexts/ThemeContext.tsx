'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import UserPreferencesService from '@/services/userPreferences'

export type Theme = 'light' | 'dark' | 'auto'
export type ResolvedTheme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>('light')
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light')
  const [mounted, setMounted] = useState(false)

  // Fonction pour détecter les préférences système
  const getSystemTheme = (): ResolvedTheme => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  }

  // Fonction pour résoudre le thème effectif
  const resolveTheme = (currentTheme: Theme): ResolvedTheme => {
    if (currentTheme === 'auto') {
      return getSystemTheme()
    }
    return currentTheme as ResolvedTheme
  }

  // Fonction pour appliquer le thème au DOM
  const applyTheme = (resolvedTheme: ResolvedTheme) => {
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement
      
      // Supprimer les classes de thème existantes
      root.classList.remove('light', 'dark')
      
      // Ajouter la nouvelle classe de thème
      root.classList.add(resolvedTheme)
      
      // Mettre à jour l'attribut data-theme pour CSS
      root.setAttribute('data-theme', resolvedTheme)
      
      // Mettre à jour les meta tags pour le thème
      const metaThemeColor = document.querySelector('meta[name="theme-color"]')
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', resolvedTheme === 'dark' ? '#081426' : '#F7F8FC')
      }
    }
  }

  // Fonction pour changer le thème
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    
    // Sauvegarder dans les préférences utilisateur
    const preferences = UserPreferencesService.getPreferences()
    preferences.ui.theme = newTheme
    UserPreferencesService.savePreferences(preferences)
    
    // Résoudre et appliquer le nouveau thème
    const resolved = resolveTheme(newTheme)
    setResolvedTheme(resolved)
    applyTheme(resolved)
    
    console.log(`🎨 Thème changé: ${newTheme} (résolu: ${resolved})`)
  }

  // Fonction pour basculer entre clair et sombre
  const toggleTheme = () => {
    const newTheme = resolvedTheme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
  }

  // Initialisation du thème au montage
  useEffect(() => {
    // Récupérer le thème depuis les préférences
    const preferences = UserPreferencesService.getPreferences()
    const savedTheme = preferences.ui.theme
    
    setThemeState(savedTheme)
    const resolved = resolveTheme(savedTheme)
    setResolvedTheme(resolved)
    applyTheme(resolved)
    
    setMounted(true)
    
    console.log(`🎨 Thème initialisé: ${savedTheme} (résolu: ${resolved})`)
  }, [])

  // Écouter les changements de préférences système pour le mode auto
  useEffect(() => {
    if (!mounted) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (theme === 'auto') {
        const newResolvedTheme = e.matches ? 'dark' : 'light'
        setResolvedTheme(newResolvedTheme)
        applyTheme(newResolvedTheme)
        console.log(`🎨 Thème système changé: ${newResolvedTheme}`)
      }
    }

    mediaQuery.addEventListener('change', handleSystemThemeChange)
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
    }
  }, [theme, mounted])

  // Écouter les changements de préférences utilisateur depuis d'autres onglets
  useEffect(() => {
    if (!mounted) return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userPreferences' && e.newValue) {
        try {
          const newPreferences = JSON.parse(e.newValue)
          const newTheme = newPreferences.ui.theme
          
          if (newTheme !== theme) {
            setThemeState(newTheme)
            const resolved = resolveTheme(newTheme)
            setResolvedTheme(resolved)
            applyTheme(resolved)
            console.log(`🎨 Thème synchronisé depuis autre onglet: ${newTheme}`)
          }
        } catch (error) {
          console.error('Erreur lors de la synchronisation du thème:', error)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [theme, mounted])

  // Éviter l'hydratation mismatch en ne rendant rien côté serveur
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#F7F8FC]">
        {children}
      </div>
    )
  }

  const contextValue: ThemeContextType = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

// Hook personnalisé pour utiliser le contexte de thème
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext)
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  
  return context
}

// Hook pour vérifier si on est en mode sombre
export function useIsDark(): boolean {
  const { resolvedTheme } = useTheme()
  return resolvedTheme === 'dark'
}

// Hook pour obtenir les classes CSS conditionnelles
export function useThemeClasses() {
  const { resolvedTheme } = useTheme()
  
  return {
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
    bg: 'bg-background',
    text: 'text-foreground',
    card: 'bg-card border-border',
    input: 'bg-card border-border text-card-foreground'
  }
}
