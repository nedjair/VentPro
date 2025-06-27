import { FastifyInstance } from 'fastify'
import { stockCorrectionController } from '../controllers/stockCorrectionController'

export default async function stockCorrectionRoutes(fastify: FastifyInstance) {
  // Toutes les routes nécessitent une authentification
  fastify.addHook('preHandler', fastify.authenticate)

  /**
   * @route POST /execute-all
   * @desc Exécute toutes les corrections automatiques
   * @access Private (Admin/Manager)
   */
  fastify.post('/execute-all', async (request, reply) => {
    return stockCorrectionController.executeAllCorrections(request as any, reply as any)
  })

  /**
   * @route POST /execute-critical
   * @desc Exécute seulement les corrections critiques
   * @access Private (Admin/Manager)
   */
  fastify.post('/execute-critical', async (request, reply) => {
    return stockCorrectionController.executeHighPriorityCorrections(request as any, reply as any)
  })
}
