/**
 * Service de gestion des préférences utilisateur
 * Permet de contrôler l'affichage des notifications popup
 */

export interface UserPreferences {
  stockNotifications: {
    popupsEnabled: boolean
    lastDisabledAt?: string
    disabledByUser: boolean
  }
  stockMonitor: {
    enabled: boolean
    position: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'
  }
  ui: {
    compactMode: boolean
    theme: 'light' | 'dark' | 'auto'
    language: 'fr' | 'ar'
  }
}

const DEFAULT_PREFERENCES: UserPreferences = {
  stockNotifications: {
    popupsEnabled: false, // COMPLÈTEMENT DÉSACTIVÉ - Aucune notification popup
    disabledByUser: true, // Marqué comme désactivé par l'utilisateur
  },
  stockMonitor: {
    enabled: false, // DÉSACTIVÉ - Moniteur complètement masqué
    position: 'top-right' // Position moins intrusive si réactivé
  },
  ui: {
    compactMode: true,
    theme: 'light',
    language: 'fr'
  }
}

class UserPreferencesService {
  private static readonly STORAGE_KEY = 'userPreferences'

  /**
   * Récupère les préférences utilisateur
   */
  static getPreferences(): UserPreferences {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Fusionner avec les valeurs par défaut pour gérer les nouvelles propriétés
        return {
          ...DEFAULT_PREFERENCES,
          ...parsed,
          stockNotifications: {
            ...DEFAULT_PREFERENCES.stockNotifications,
            ...parsed.stockNotifications
          },
          stockMonitor: {
            ...DEFAULT_PREFERENCES.stockMonitor,
            ...parsed.stockMonitor
          },
          ui: {
            ...DEFAULT_PREFERENCES.ui,
            ...parsed.ui
          }
        }
      }
    } catch (error) {
      console.warn('Erreur lors de la lecture des préférences:', error)
    }
    
    return DEFAULT_PREFERENCES
  }

  /**
   * Sauvegarde les préférences utilisateur
   */
  static savePreferences(preferences: UserPreferences): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(preferences))
      
      // Déclencher un événement pour notifier les composants
      window.dispatchEvent(new CustomEvent('userPreferencesChanged', {
        detail: preferences
      }))
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des préférences:', error)
    }
  }

  /**
   * Active ou désactive les notifications popup
   */
  static toggleStockPopups(enabled: boolean): void {
    const preferences = this.getPreferences()
    preferences.stockNotifications.popupsEnabled = enabled
    preferences.stockNotifications.disabledByUser = !enabled
    preferences.stockNotifications.lastDisabledAt = enabled ? undefined : new Date().toISOString()
    
    this.savePreferences(preferences)
  }

  /**
   * Vérifie si les notifications popup sont activées
   */
  static areStockPopupsEnabled(): boolean {
    return this.getPreferences().stockNotifications.popupsEnabled
  }

  /**
   * Active ou désactive le moniteur de stock
   */
  static toggleStockMonitor(enabled: boolean): void {
    const preferences = this.getPreferences()
    preferences.stockMonitor.enabled = enabled
    this.savePreferences(preferences)
  }

  /**
   * Vérifie si le moniteur de stock est activé
   */
  static isStockMonitorEnabled(): boolean {
    return this.getPreferences().stockMonitor.enabled
  }

  /**
   * Change la position du moniteur de stock
   */
  static setStockMonitorPosition(position: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'): void {
    const preferences = this.getPreferences()
    preferences.stockMonitor.position = position
    this.savePreferences(preferences)
  }

  /**
   * Récupère la position du moniteur de stock
   */
  static getStockMonitorPosition(): 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left' {
    return this.getPreferences().stockMonitor.position
  }

  /**
   * Change le thème de l'interface
   */
  static setTheme(theme: 'light' | 'dark' | 'auto'): void {
    const preferences = this.getPreferences()
    preferences.ui.theme = theme
    this.savePreferences(preferences)
  }

  /**
   * Récupère le thème actuel
   */
  static getTheme(): 'light' | 'dark' | 'auto' {
    return this.getPreferences().ui.theme
  }

  /**
   * Active ou désactive le mode compact
   */
  static setCompactMode(enabled: boolean): void {
    const preferences = this.getPreferences()
    preferences.ui.compactMode = enabled
    this.savePreferences(preferences)
  }

  /**
   * Vérifie si le mode compact est activé
   */
  static isCompactModeEnabled(): boolean {
    return this.getPreferences().ui.compactMode
  }

  /**
   * Change la langue de l'interface
   */
  static setLanguage(language: 'fr' | 'ar'): void {
    const preferences = this.getPreferences()
    preferences.ui.language = language
    this.savePreferences(preferences)
  }

  /**
   * Récupère la langue actuelle
   */
  static getLanguage(): 'fr' | 'ar' {
    return this.getPreferences().ui.language
  }

  /**
   * Réinitialise les préférences aux valeurs par défaut
   */
  static resetToDefaults(): void {
    this.savePreferences(DEFAULT_PREFERENCES)
  }

  /**
   * Exporte les préférences pour sauvegarde/restauration
   */
  static exportPreferences(): string {
    return JSON.stringify(this.getPreferences(), null, 2)
  }

  /**
   * Importe des préférences depuis une sauvegarde
   */
  static importPreferences(preferencesJson: string): boolean {
    try {
      const preferences = JSON.parse(preferencesJson)
      this.savePreferences(preferences)
      return true
    } catch (error) {
      console.error('Erreur lors de l\'importation des préférences:', error)
      return false
    }
  }
}

export default UserPreferencesService
