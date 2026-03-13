import { Product } from '@gestion/database'
import cron from 'node-cron'
import { AutoSyncService } from './auto-sync.service'
import { logger } from '../utils/logger'
import { prisma } from '../lib/prisma'

/**
 * Service de planification pour les tâches automatiques
 */
export class SchedulerService {
  private static jobs: Map<string, cron.ScheduledTask> = new Map()
  private static isInitialized = false

  /**
   * Initialise le service de planification
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('SchedulerService déjà initialisé')
      return
    }

    try {
      logger.info('Initialisation du service de planification')

      // Vérifier si les tâches planifiées sont activées
      const enableScheduler = process.env.ENABLE_SCHEDULER !== 'false'
      
      if (!enableScheduler) {
        logger.info('Planificateur désactivé via ENABLE_SCHEDULER=false')
        return
      }

      // Planifier la synchronisation périodique des stocks
      this.scheduleStockSync()

      // Planifier le nettoyage des données
      this.scheduleDataCleanup()

      // Planifier les vérifications de cohérence
      this.scheduleConsistencyCheck()

      this.isInitialized = true
      logger.info('Service de planification initialisé avec succès')

    } catch (error) {
      logger.error('Erreur lors de l\'initialisation du planificateur', { error })
      throw error
    }
  }

  /**
   * Planifie la synchronisation automatique des stocks
   */
  private static scheduleStockSync(): void {
    // Synchronisation toutes les heures (par défaut)
    const syncCron = process.env.STOCK_SYNC_CRON || '0 * * * *'
    
    const syncJob = cron.schedule(syncCron, async () => {
      await this.runStockSyncJob()
    }, {
      scheduled: false,
      timezone: 'Africa/Algiers'
    })

    this.jobs.set('stock-sync', syncJob)
    syncJob.start()

    logger.info('Tâche de synchronisation des stocks planifiée', { 
      cron: syncCron,
      timezone: 'Africa/Algiers'
    })
  }

  /**
   * Planifie le nettoyage des données
   */
  private static scheduleDataCleanup(): void {
    // Nettoyage quotidien à 2h du matin
    const cleanupCron = process.env.DATA_CLEANUP_CRON || '0 2 * * *'
    
    const cleanupJob = cron.schedule(cleanupCron, async () => {
      await this.runDataCleanupJob()
    }, {
      scheduled: false,
      timezone: 'Africa/Algiers'
    })

    this.jobs.set('data-cleanup', cleanupJob)
    cleanupJob.start()

    logger.info('Tâche de nettoyage des données planifiée', { 
      cron: cleanupCron,
      timezone: 'Africa/Algiers'
    })
  }

  /**
   * Planifie les vérifications de cohérence
   */
  private static scheduleConsistencyCheck(): void {
    // Vérification de cohérence toutes les 6 heures
    const checkCron = process.env.CONSISTENCY_CHECK_CRON || '0 */6 * * *'
    
    const checkJob = cron.schedule(checkCron, async () => {
      await this.runConsistencyCheckJob()
    }, {
      scheduled: false,
      timezone: 'Africa/Algiers'
    })

    this.jobs.set('consistency-check', checkJob)
    checkJob.start()

    logger.info('Tâche de vérification de cohérence planifiée', { 
      cron: checkCron,
      timezone: 'Africa/Algiers'
    })
  }

  /**
   * Exécute la synchronisation des stocks pour toutes les entreprises
   */
  private static async runStockSyncJob(): Promise<void> {
    const startTime = Date.now()
    logger.info('Début de la synchronisation automatique des stocks')

    try {
      // Récupérer toutes les entreprises actives
      const companies = await prisma.company.findMany({
        where: { isActive: true },
        select: { id: true, name: true }
      })

      logger.info(`Synchronisation pour ${companies.length} entreprise(s)`)

      let totalSynced = 0
      let totalCreated = 0
      let totalErrors = 0

      // Synchroniser chaque entreprise
      for (const company of companies) {
        try {
          const result = await AutoSyncService.syncAllProducts(company.id)
          totalSynced += result.synced
          totalCreated += result.created
          totalErrors += result.errors

          logger.debug('Synchronisation entreprise terminée', {
            companyId: company.id,
            companyName: company.name,
            result
          })

        } catch (error) {
          totalErrors++
          logger.error('Erreur synchronisation entreprise', {
            companyId: company.id,
            companyName: company.name,
            error: error instanceof Error ? error.message : 'Erreur inconnue'
          })
        }
      }

      const duration = Date.now() - startTime
      logger.info('Synchronisation automatique terminée', {
        duration: `${duration}ms`,
        companies: companies.length,
        totalSynced,
        totalCreated,
        totalErrors
      })

    } catch (error) {
      logger.error('Erreur lors de la synchronisation automatique', { error })
    }
  }

  /**
   * Exécute le nettoyage des données
   */
  private static async runDataCleanupJob(): Promise<void> {
    const startTime = Date.now()
    logger.info('Début du nettoyage automatique des données')

    try {
      // Récupérer toutes les entreprises actives
      const companies = await prisma.company.findMany({
        where: { isActive: true },
        select: { id: true, name: true }
      })

      let totalCleaned = 0

      // Nettoyer chaque entreprise
      for (const company of companies) {
        try {
          const cleaned = await AutoSyncService.cleanupOrphanedStocks(company.id)
          totalCleaned += cleaned

          logger.debug('Nettoyage entreprise terminé', {
            companyId: company.id,
            companyName: company.name,
            cleaned
          })

        } catch (error) {
          logger.error('Erreur nettoyage entreprise', {
            companyId: company.id,
            companyName: company.name,
            error: error instanceof Error ? error.message : 'Erreur inconnue'
          })
        }
      }

      const duration = Date.now() - startTime
      logger.info('Nettoyage automatique terminé', {
        duration: `${duration}ms`,
        companies: companies.length,
        totalCleaned
      })

    } catch (error) {
      logger.error('Erreur lors du nettoyage automatique', { error })
    }
  }

  /**
   * Exécute la vérification de cohérence
   */
  private static async runConsistencyCheckJob(): Promise<void> {
    const startTime = Date.now()
    logger.info('Début de la vérification automatique de cohérence')

    try {
      // Récupérer toutes les entreprises actives
      const companies = await prisma.company.findMany({
        where: { isActive: true },
        select: { id: true, name: true }
      })

      let totalInconsistent = 0
      let totalMissing = 0

      // Vérifier chaque entreprise
      for (const company of companies) {
        try {
          const result = await AutoSyncService.checkConsistency(company.id)
          totalInconsistent += result.inconsistent
          totalMissing += result.missing

          // Logger les problèmes détectés
          if (result.inconsistent > 0 || result.missing > 0) {
            logger.warn('Incohérences détectées', {
              companyId: company.id,
              companyName: company.name,
              inconsistent: result.inconsistent,
              missing: result.missing
            })

            // Optionnel: déclencher une synchronisation automatique
            if (result.inconsistent > 0 || result.missing > 0) {
              logger.info('Déclenchement d\'une synchronisation corrective', {
                companyId: company.id
              })
              await AutoSyncService.syncAllProducts(company.id)
            }
          }

        } catch (error) {
          logger.error('Erreur vérification cohérence entreprise', {
            companyId: company.id,
            companyName: company.name,
            error: error instanceof Error ? error.message : 'Erreur inconnue'
          })
        }
      }

      const duration = Date.now() - startTime
      logger.info('Vérification automatique de cohérence terminée', {
        duration: `${duration}ms`,
        companies: companies.length,
        totalInconsistent,
        totalMissing
      })

    } catch (error) {
      logger.error('Erreur lors de la vérification de cohérence', { error })
    }
  }

  /**
   * Arrête toutes les tâches planifiées
   */
  static stopAll(): void {
    logger.info('Arrêt de toutes les tâches planifiées')

    this.jobs.forEach((job, name) => {
      job.stop()
      logger.debug(`Tâche arrêtée: ${name}`)
    })

    this.jobs.clear()
    this.isInitialized = false
    
    logger.info('Toutes les tâches planifiées ont été arrêtées')
  }

  /**
   * Arrête une tâche spécifique
   */
  static stopJob(jobName: string): boolean {
    const job = this.jobs.get(jobName)
    
    if (job) {
      job.stop()
      this.jobs.delete(jobName)
      logger.info(`Tâche arrêtée: ${jobName}`)
      return true
    }

    logger.warn(`Tâche non trouvée: ${jobName}`)
    return false
  }

  /**
   * Redémarre une tâche spécifique
   */
  static restartJob(jobName: string): boolean {
    const job = this.jobs.get(jobName)
    
    if (job) {
      job.stop()
      job.start()
      logger.info(`Tâche redémarrée: ${jobName}`)
      return true
    }

    logger.warn(`Tâche non trouvée: ${jobName}`)
    return false
  }

  /**
   * Obtient le statut de toutes les tâches
   */
  static getJobsStatus(): Array<{ name: string, running: boolean }> {
    const status: Array<{ name: string, running: boolean }> = []

    this.jobs.forEach((job, name) => {
      status.push({
        name,
        running: job.getStatus() === 'scheduled'
      })
    })

    return status
  }

  /**
   * Exécute manuellement une tâche
   */
  static async runJobManually(jobName: string): Promise<boolean> {
    logger.info(`Exécution manuelle de la tâche: ${jobName}`)

    try {
      switch (jobName) {
        case 'stock-sync':
          await this.runStockSyncJob()
          break
        case 'data-cleanup':
          await this.runDataCleanupJob()
          break
        case 'consistency-check':
          await this.runConsistencyCheckJob()
          break
        default:
          logger.warn(`Tâche inconnue: ${jobName}`)
          return false
      }

      logger.info(`Exécution manuelle terminée: ${jobName}`)
      return true

    } catch (error) {
      logger.error(`Erreur lors de l'exécution manuelle de ${jobName}`, { error })
      return false
    }
  }
}
