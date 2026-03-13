import { FastifyRequest, FastifyReply } from 'fastify'
import { logger } from '../utils/logger'

interface PerformanceMetrics {
  requestId: string
  method: string
  url: string
  startTime: number
  endTime?: number
  duration?: number
  statusCode?: number
  userAgent?: string
  ip?: string
}

/**
 * Middleware de performance pour surveiller et optimiser les temps de réponse
 * Objectif: maintenir un temps de réponse < 2s pour toutes les opérations critiques
 */
export class PerformanceMiddleware {
  private static readonly MAX_RESPONSE_TIME = 2000 // 2 secondes en ms
  private static readonly WARNING_THRESHOLD = 1000 // 1 seconde en ms
  private static metrics: Map<string, PerformanceMetrics> = new Map()

  /**
   * Middleware de mesure des performances
   */
  static async measurePerformance(request: FastifyRequest, reply: FastifyReply) {
    const requestId = this.generateRequestId()
    const startTime = Date.now()

    const metrics: PerformanceMetrics = {
      requestId,
      method: request.method,
      url: request.url,
      startTime,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    }

    // Stocker les métriques pour cette requête
    this.metrics.set(requestId, metrics)

    // Ajouter l'ID de requête aux headers de réponse
    reply.header('X-Request-ID', requestId)

    // Hook pour mesurer le temps de réponse
    reply.addHook('onSend', async (request, reply, payload) => {
      const endTime = Date.now()
      const duration = endTime - startTime

      // Mettre à jour les métriques
      const updatedMetrics: PerformanceMetrics = {
        ...metrics,
        endTime,
        duration,
        statusCode: reply.statusCode,
      }

      this.metrics.set(requestId, updatedMetrics)

      // Ajouter les headers de performance
      reply.header('X-Response-Time', `${duration}ms`)

      // Logger les performances
      this.logPerformance(updatedMetrics)

      // Nettoyer les métriques après un délai
      setTimeout(() => {
        this.metrics.delete(requestId)
      }, 60000) // Garder pendant 1 minute

      return payload
    })
  }

  /**
   * Générer un ID unique pour la requête
   */
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Logger les performances de la requête
   */
  private static logPerformance(metrics: PerformanceMetrics) {
    const { requestId, method, url, duration, statusCode, userAgent, ip } = metrics

    if (!duration) return

    const logData = {
      requestId,
      method,
      url,
      duration,
      statusCode,
      userAgent,
      ip,
    }

    if (duration > this.MAX_RESPONSE_TIME) {
      logger.error('Temps de réponse critique dépassé', {
        ...logData,
        threshold: this.MAX_RESPONSE_TIME,
        severity: 'CRITICAL',
      })
    } else if (duration > this.WARNING_THRESHOLD) {
      logger.warn('Temps de réponse élevé détecté', {
        ...logData,
        threshold: this.WARNING_THRESHOLD,
        severity: 'WARNING',
      })
    } else {
      logger.debug('Performance de requête', logData)
    }
  }

  /**
   * Middleware de timeout pour les requêtes longues
   */
  static timeoutMiddleware(timeoutMs: number = 30000) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const timeout = setTimeout(() => {
        if (!reply.sent) {
          logger.error('Timeout de requête', {
            method: request.method,
            url: request.url,
            timeout: timeoutMs,
          })

          reply.status(408).send({
            success: false,
            message: 'Timeout de la requête',
            error: 'REQUEST_TIMEOUT',
          })
        }
      }, timeoutMs)

      // Nettoyer le timeout quand la réponse est envoyée
      reply.addHook('onSend', async () => {
        clearTimeout(timeout)
      })
    }
  }

  /**
   * Middleware de limitation de débit (rate limiting)
   */
  static rateLimitMiddleware(maxRequests: number = 100, windowMs: number = 60000) {
    const requests = new Map<string, { count: number; resetTime: number }>()

    return async (request: FastifyRequest, reply: FastifyReply) => {
      const clientId = request.ip || 'unknown'
      const now = Date.now()
      const windowStart = now - windowMs

      // Nettoyer les anciennes entrées
      for (const [key, value] of requests.entries()) {
        if (value.resetTime < windowStart) {
          requests.delete(key)
        }
      }

      // Vérifier le nombre de requêtes pour ce client
      const clientRequests = requests.get(clientId)

      if (!clientRequests) {
        requests.set(clientId, { count: 1, resetTime: now + windowMs })
      } else if (clientRequests.resetTime < now) {
        // Réinitialiser le compteur
        requests.set(clientId, { count: 1, resetTime: now + windowMs })
      } else if (clientRequests.count >= maxRequests) {
        // Limite dépassée
        logger.warn('Limite de débit dépassée', {
          clientId,
          count: clientRequests.count,
          maxRequests,
          windowMs,
        })

        reply.status(429).send({
          success: false,
          message: 'Trop de requêtes',
          error: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((clientRequests.resetTime - now) / 1000),
        })
        return
      } else {
        // Incrémenter le compteur
        clientRequests.count++
      }

      // Ajouter les headers de rate limiting
      reply.header('X-RateLimit-Limit', maxRequests.toString())
      reply.header('X-RateLimit-Remaining', Math.max(0, maxRequests - (clientRequests?.count || 0)).toString())
      reply.header('X-RateLimit-Reset', Math.ceil((clientRequests?.resetTime || now) / 1000).toString())
    }
  }

  /**
   * Obtenir les statistiques de performance
   */
  static getPerformanceStats(): {
    totalRequests: number
    averageResponseTime: number
    slowRequests: number
    criticalRequests: number
    requestsByMethod: Record<string, number>
    requestsByStatus: Record<string, number>
  } {
    const stats = {
      totalRequests: 0,
      averageResponseTime: 0,
      slowRequests: 0,
      criticalRequests: 0,
      requestsByMethod: {} as Record<string, number>,
      requestsByStatus: {} as Record<string, number>,
    }

    let totalDuration = 0

    for (const metrics of this.metrics.values()) {
      if (metrics.duration) {
        stats.totalRequests++
        totalDuration += metrics.duration

        if (metrics.duration > this.WARNING_THRESHOLD) {
          stats.slowRequests++
        }

        if (metrics.duration > this.MAX_RESPONSE_TIME) {
          stats.criticalRequests++
        }

        // Compter par méthode
        stats.requestsByMethod[metrics.method] = (stats.requestsByMethod[metrics.method] || 0) + 1

        // Compter par statut
        if (metrics.statusCode) {
          const statusGroup = `${Math.floor(metrics.statusCode / 100)}xx`
          stats.requestsByStatus[statusGroup] = (stats.requestsByStatus[statusGroup] || 0) + 1
        }
      }
    }

    if (stats.totalRequests > 0) {
      stats.averageResponseTime = Math.round(totalDuration / stats.totalRequests)
    }

    return stats
  }

  /**
   * Middleware de compression pour optimiser les réponses
   */
  static compressionMiddleware() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      // Activer la compression pour les réponses JSON volumineuses
      const acceptEncoding = request.headers['accept-encoding'] || ''
      
      if (acceptEncoding.includes('gzip')) {
        reply.header('Content-Encoding', 'gzip')
      }
    }
  }

  /**
   * Middleware de cache pour les réponses statiques
   */
  static cacheMiddleware(maxAge: number = 300) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      // Ajouter les headers de cache pour les requêtes GET
      if (request.method === 'GET') {
        reply.header('Cache-Control', `public, max-age=${maxAge}`)
        reply.header('ETag', `"${Date.now()}"`)
      }
    }
  }

  /**
   * Initialiser tous les middlewares de performance
   */
  static initializePerformanceMiddlewares(server: any) {
    // Middleware de mesure des performances
    server.addHook('preHandler', this.measurePerformance.bind(this))

    // Middleware de timeout global
    server.addHook('preHandler', this.timeoutMiddleware(30000))

    // Middleware de rate limiting global
    server.addHook('preHandler', this.rateLimitMiddleware(1000, 60000))

    logger.info('Middlewares de performance initialisés')
  }
}
