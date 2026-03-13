import { Product } from '@gestion/database'
import { FastifyInstance, FastifyReply } from 'fastify'
import { AutoSyncService } from '../services/auto-sync.service'
import { SchedulerService } from '../services/scheduler.service'
import { AuthenticatedRequest } from '../types/fastify'
import { logger } from '../utils/logger'

export async function autoSyncRoutes(server: FastifyInstance) {
  // Préfixe pour toutes les routes de synchronisation automatique
  server.register(async function (server) {
    
    // =====================================================
    // ROUTES DE SYNCHRONISATION MANUELLE
    // =====================================================

    // Synchronisation complète d'une entreprise
    server.post('/sync-company', {
      preHandler: [/* @ts-ignore */ server.authenticate],
      schema: {
        description: 'Synchroniser tous les produits d\'une entreprise',
        tags: ['Auto-Sync'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  synced: { type: 'number' },
                  created: { type: 'number' },
                  errors: { type: 'number' }
                }
              },
              message: { type: 'string' }
            }
          }
        }
      }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { companyId } = request.user

        logger.info('Synchronisation manuelle demandée', { companyId })
        const result = await AutoSyncService.syncAllProducts(companyId)

        return reply.send({
          success: true,
          data: result,
          message: `Synchronisation terminée: ${result.synced} mis à jour, ${result.created} créés, ${result.errors} erreurs`
        })
      } catch (error: any) {
        logger.error('Erreur synchronisation manuelle', { error: error.message })
        return reply.status(500).send({
          success: false,
          message: 'Erreur lors de la synchronisation'
        })
      }
    })

    // Vérification de cohérence
    server.get('/check-consistency', {
      preHandler: [/* @ts-ignore */ server.authenticate],
      schema: {
        description: 'Vérifier la cohérence des données products ↔ stocks',
        tags: ['Auto-Sync'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  consistent: { type: 'number' },
                  inconsistent: { type: 'number' },
                  missing: { type: 'number' },
                  details: { type: 'array' }
                }
              }
            }
          }
        }
      }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { companyId } = request.user

        const result = await AutoSyncService.checkConsistency(companyId)

        return reply.send({
          success: true,
          data: result
        })
      } catch (error: any) {
        logger.error('Erreur vérification cohérence', { error: error.message })
        return reply.status(500).send({
          success: false,
          message: 'Erreur lors de la vérification de cohérence'
        })
      }
    })

    // Nettoyage des données orphelines (simple)
    server.post('/cleanup', {
      preHandler: [/* @ts-ignore */ server.authenticate],
      schema: {
        description: 'Nettoyer les enregistrements stock orphelins',
        tags: ['Auto-Sync'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  cleaned: { type: 'number' }
                }
              },
              message: { type: 'string' }
            }
          }
        }
      }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { companyId } = request.user

        const cleaned = await AutoSyncService.cleanupOrphanedStocks(companyId)

        return reply.send({
          success: true,
          data: { cleaned },
          message: `${cleaned} enregistrement(s) stock orphelin(s) supprimé(s)`
        })
      } catch (error: any) {
        logger.error('Erreur nettoyage', { error: error.message })
        return reply.status(500).send({
          success: false,
          message: 'Erreur lors du nettoyage'
        })
      }
    })

    // Nettoyage complet et sécurisé
    server.post('/cleanup-complete', {
      preHandler: [/* @ts-ignore */ server.authenticate],
      schema: {
        description: 'Nettoyage complet et sécurisé de la base de données',
        tags: ['Auto-Sync'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            removeOrphans: { type: 'boolean', default: true },
            createMissing: { type: 'boolean', default: true },
            syncInconsistent: { type: 'boolean', default: true },
            dryRun: { type: 'boolean', default: false }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  orphansRemoved: { type: 'number' },
                  stocksCreated: { type: 'number' },
                  recordsSynced: { type: 'number' },
                  totalActions: { type: 'number' }
                }
              },
              message: { type: 'string' }
            }
          }
        }
      }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { companyId } = request.user
        const options = request.body as {
          removeOrphans?: boolean
          createMissing?: boolean
          syncInconsistent?: boolean
          dryRun?: boolean
        }

        logger.info('Nettoyage complet demandé', { companyId, options })

        const result = await AutoSyncService.performCompleteCleanup(companyId, options)

        const message = options.dryRun
          ? `Simulation: ${result.totalActions} action(s) seraient effectuée(s)`
          : `Nettoyage terminé: ${result.orphansRemoved} orphelins supprimés, ${result.stocksCreated} stocks créés, ${result.recordsSynced} enregistrements synchronisés`

        return reply.send({
          success: true,
          data: result,
          message
        })
      } catch (error: any) {
        logger.error('Erreur nettoyage complet', { error: error.message })
        return reply.status(500).send({
          success: false,
          message: 'Erreur lors du nettoyage complet'
        })
      }
    })

    // =====================================================
    // ROUTES DE GESTION DU PLANIFICATEUR
    // =====================================================

    // Statut du planificateur
    server.get('/scheduler/status', {
      preHandler: [/* @ts-ignore */ server.authenticate],
      schema: {
        description: 'Obtenir le statut du planificateur de tâches',
        tags: ['Auto-Sync'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  jobs: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        running: { type: 'boolean' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const jobs = SchedulerService.getJobsStatus()

        return reply.send({
          success: true,
          data: { jobs }
        })
      } catch (error: any) {
        logger.error('Erreur statut planificateur', { error: error.message })
        return reply.status(500).send({
          success: false,
          message: 'Erreur lors de la récupération du statut'
        })
      }
    })

    // Exécution manuelle d'une tâche
    server.post('/scheduler/run/:jobName', {
      preHandler: [/* @ts-ignore */ server.authenticate],
      schema: {
        description: 'Exécuter manuellement une tâche planifiée',
        tags: ['Auto-Sync'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            jobName: { 
              type: 'string',
              enum: ['stock-sync', 'data-cleanup', 'consistency-check']
            }
          },
          required: ['jobName']
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' }
            }
          }
        }
      }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { jobName } = request.params as { jobName: string }

        const success = await SchedulerService.runJobManually(jobName)

        if (success) {
          return reply.send({
            success: true,
            message: `Tâche ${jobName} exécutée avec succès`
          })
        } else {
          return reply.status(400).send({
            success: false,
            message: `Impossible d'exécuter la tâche ${jobName}`
          })
        }
      } catch (error: any) {
        logger.error('Erreur exécution manuelle tâche', { error: error.message })
        return reply.status(500).send({
          success: false,
          message: 'Erreur lors de l\'exécution de la tâche'
        })
      }
    })

    // Redémarrer une tâche
    server.post('/scheduler/restart/:jobName', {
      preHandler: [/* @ts-ignore */ server.authenticate],
      schema: {
        description: 'Redémarrer une tâche planifiée',
        tags: ['Auto-Sync'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            jobName: { 
              type: 'string',
              enum: ['stock-sync', 'data-cleanup', 'consistency-check']
            }
          },
          required: ['jobName']
        }
      }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { jobName } = request.params as { jobName: string }

        const success = SchedulerService.restartJob(jobName)

        if (success) {
          return reply.send({
            success: true,
            message: `Tâche ${jobName} redémarrée avec succès`
          })
        } else {
          return reply.status(400).send({
            success: false,
            message: `Impossible de redémarrer la tâche ${jobName}`
          })
        }
      } catch (error: any) {
        logger.error('Erreur redémarrage tâche', { error: error.message })
        return reply.status(500).send({
          success: false,
          message: 'Erreur lors du redémarrage de la tâche'
        })
      }
    })

    // =====================================================
    // ROUTES DE CONFIGURATION
    // =====================================================

    // Configuration de la synchronisation automatique
    server.get('/config', {
      preHandler: [/* @ts-ignore */ server.authenticate],
      schema: {
        description: 'Obtenir la configuration de la synchronisation automatique',
        tags: ['Auto-Sync'],
        security: [{ bearerAuth: [] }]
      }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const config = {
          autoSyncEnabled: process.env.ENABLE_AUTO_SYNC !== 'false',
          schedulerEnabled: process.env.ENABLE_SCHEDULER !== 'false',
          stockSyncCron: process.env.STOCK_SYNC_CRON || '0 * * * *',
          dataCleanupCron: process.env.DATA_CLEANUP_CRON || '0 2 * * *',
          consistencyCheckCron: process.env.CONSISTENCY_CHECK_CRON || '0 */6 * * *',
          environment: process.env.NODE_ENV || 'development'
        }

        return reply.send({
          success: true,
          data: config
        })
      } catch (error: any) {
        logger.error('Erreur récupération configuration', { error: error.message })
        return reply.status(500).send({
          success: false,
          message: 'Erreur lors de la récupération de la configuration'
        })
      }
    })

  }, { prefix: '/auto-sync' })
}
