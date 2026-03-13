import Fastify, { FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'

import { reportsRoutes } from '../../routes/reports'

describe('Reports Routes', () => {
  let app: FastifyInstance | undefined

  afterEach(async () => {
    if (app) {
      await app.close()
      app = undefined
    }
  })

  it('registers sales export routes without invalid Fastify schema errors', async () => {
    // Reproduit la panne observée au boot : si le schema.querystring n'est pas
    // un JSON Schema valide, Fastify échoue ici avant même d'écouter sur 3001.
    app = Fastify({ logger: false })

    app.decorate('authenticate', async (request: any) => {
      request.user = {
        companyId: 'company-123',
      }
    })

    await app.register(reportsRoutes, { prefix: '/api/v1/reports' })

    await expect(app.ready()).resolves.toBeUndefined()
  })
})