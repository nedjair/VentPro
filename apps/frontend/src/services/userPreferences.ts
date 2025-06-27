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
  ui: {
    compactMode: boolean
    theme: 'light' | 'dark' | 'auto'
  }
}

const DEFAULT_PREFERENCES: UserPreferences = {
  stockNotifications: {
    popupsEnabled: false, // DÉSACTIVÉ par défaut pour éviter les interruptions
    disabledByUser: true, // Marqué comme désactivé par l'utilisateur
  },
  ui: {
    compactMode: true,
    theme: 'light'
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
