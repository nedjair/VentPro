import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { AlgeriaConfigService } from '../services/algeria-config.service'
// AuthenticatedRequest type removed - using FastifyRequest with type assertion
import { logger } from '../utils/logger'

// Types pour la validation des données
interface ValidateNIFRequest {
  nif: string
}

interface ValidateNISRequest {
  nis: string
}

interface ValidateRCRequest {
  rc: string
}

interface FormatCurrencyRequest {
  amount: number
  showSymbol?: boolean
  showCode?: boolean
  precision?: number
}

interface CalculateTVARequest {
  amount: number
  rate?: number
}

interface AmountToWordsRequest {
  amount: number
}

export default async function algeriaConfigRoutes(fastify: FastifyInstance) {
  // Middleware d'authentification pour toutes les routes
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.send(err)
    }
  })

  /**
   * GET /api/v1/algeria-config - Configuration générale pour l'Algérie
   */
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const config = AlgeriaConfigService.getConfigForFrontend()

      reply.send({
        success: true,
        data: config,
      })
    } catch (error) {
      logger.error('Erreur lors de la récupération de la configuration algérienne', { error })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération de la configuration',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * POST /api/v1/algeria-config/validate-nif - Validation d'un NIF
   */
  fastify.post<{
    Body: ValidateNIFRequest
  }>('/validate-nif', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { nif } = request.body

      if (!nif) {
        return reply.status(400).send({
          success: false,
          message: 'NIF requis',
        })
      }

      const validation = AlgeriaConfigService.validateNIF(nif)

      reply.send({
        success: true,
        data: validation,
      })
    } catch (error) {
      logger.error('Erreur lors de la validation du NIF', { error, nif: request.body.nif })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la validation du NIF',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * POST /api/v1/algeria-config/validate-nis - Validation d'un NIS
   */
  fastify.post<{
    Body: ValidateNISRequest
  }>('/validate-nis', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { nis } = request.body

      if (!nis) {
        return reply.status(400).send({
          success: false,
          message: 'NIS requis',
        })
      }

      const validation = AlgeriaConfigService.validateNIS(nis)

      reply.send({
        success: true,
        data: validation,
      })
    } catch (error) {
      logger.error('Erreur lors de la validation du NIS', { error, nis: request.body.nis })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la validation du NIS',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * POST /api/v1/algeria-config/validate-rc - Validation d'un RC
   */
  fastify.post<{
    Body: ValidateRCRequest
  }>('/validate-rc', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { rc } = request.body

      if (!rc) {
        return reply.status(400).send({
          success: false,
          message: 'Numéro RC requis',
        })
      }

      const validation = AlgeriaConfigService.validateRC(rc)

      reply.send({
        success: true,
        data: validation,
      })
    } catch (error) {
      logger.error('Erreur lors de la validation du RC', { error, rc: request.body.rc })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la validation du RC',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * POST /api/v1/algeria-config/format-currency - Formatage d'un montant en devise
   */
  fastify.post<{
    Body: FormatCurrencyRequest
  }>('/format-currency', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { amount, showSymbol, showCode, precision } = request.body

      if (typeof amount !== 'number') {
        return reply.status(400).send({
          success: false,
          message: 'Montant requis et doit être un nombre',
        })
      }

      const formattedAmount = AlgeriaConfigService.formatCurrency(amount, {
        showSymbol,
        showCode,
        precision,
      })

      reply.send({
        success: true,
        data: {
          original: amount,
          formatted: formattedAmount,
        },
      })
    } catch (error) {
      logger.error('Erreur lors du formatage de la devise', { error, amount: request.body.amount })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors du formatage de la devise',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * POST /api/v1/algeria-config/calculate-tva - Calcul de la TVA
   */
  fastify.post<{
    Body: CalculateTVARequest
  }>('/calculate-tva', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { amount, rate } = request.body

      if (typeof amount !== 'number') {
        return reply.status(400).send({
          success: false,
          message: 'Montant requis et doit être un nombre',
        })
      }

      const tvaCalculation = AlgeriaConfigService.calculateTVA(amount, rate)

      reply.send({
        success: true,
        data: tvaCalculation,
      })
    } catch (error) {
      logger.error('Erreur lors du calcul de la TVA', { error, amount: request.body.amount })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors du calcul de la TVA',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * POST /api/v1/algeria-config/amount-to-words - Conversion d'un montant en lettres
   */
  fastify.post<{
    Body: AmountToWordsRequest
  }>('/amount-to-words', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { amount } = request.body

      if (typeof amount !== 'number') {
        return reply.status(400).send({
          success: false,
          message: 'Montant requis et doit être un nombre',
        })
      }

      const amountInWords = AlgeriaConfigService.amountToWords(amount)

      reply.send({
        success: true,
        data: {
          amount,
          words: amountInWords,
        },
      })
    } catch (error) {
      logger.error('Erreur lors de la conversion en lettres', { error, amount: request.body.amount })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la conversion en lettres',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * GET /api/v1/algeria-config/wilayas - Liste des wilayas algériennes
   */
  fastify.get('/wilayas', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const wilayas = Object.entries(AlgeriaConfigService.getConfigForFrontend().legalInfo.WILAYA_CODES)
        .map(([code, name]) => ({ code, name }))
        .sort((a, b) => a.name.localeCompare(b.name))

      reply.send({
        success: true,
        data: wilayas,
      })
    } catch (error) {
      logger.error('Erreur lors de la récupération des wilayas', { error })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des wilayas',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * GET /api/v1/algeria-config/company-types - Types d'entreprises algériennes
   */
  fastify.get('/company-types', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const companyTypes = AlgeriaConfigService.getConfigForFrontend().legalInfo.COMPANY_TYPES
        .map(type => ({ value: type, label: type }))

      reply.send({
        success: true,
        data: companyTypes,
      })
    } catch (error) {
      logger.error('Erreur lors de la récupération des types d\'entreprises', { error })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des types d\'entreprises',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })

  /**
   * GET /api/v1/algeria-config/tax-rates - Taux de TVA algériens
   */
  fastify.get('/tax-rates', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const taxRates = AlgeriaConfigService.getConfigForFrontend().taxRates

      const formattedRates = [
        { value: taxRates.ZERO, label: `${taxRates.ZERO}% - Exonéré` },
        { value: taxRates.REDUCED, label: `${taxRates.REDUCED}% - Taux réduit` },
        { value: taxRates.STANDARD, label: `${taxRates.STANDARD}% - Taux standard` },
      ]

      reply.send({
        success: true,
        data: formattedRates,
      })
    } catch (error) {
      logger.error('Erreur lors de la récupération des taux de TVA', { error })
      reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des taux de TVA',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  })
}
