import 'dotenv/config'
import { createServer } from '../src/server'

async function main() {
  // Démarre Fastify sans ouvrir de port réseau pour tester les routes localement.
  const server = await createServer()

  try {
    // Signe un JWT localement avec les mêmes claims que ceux attendus par le plugin d'auth.
    const token = (server as any).jwt.sign({
      userId: 'test-user',
      companyId: 'test-company',
      email: 'test@example.com',
      role: 'ADMIN',
    })

    // Header standard Bearer pour simuler une requête authentifiée.
    const headers = {
      authorization: `Bearer ${token}`,
    }

    // Payloads volontairement invalides pour forcer une réponse 400 avant tout accès DB.
    const checks = [
      { method: 'POST', url: '/api/v1/orders', payload: {} },
      { method: 'POST', url: '/api/v1/invoices', payload: {} },
      { method: 'POST', url: '/api/v1/quotes', payload: {} },
      { method: 'POST', url: '/api/v1/payments', payload: {} },
    ]

    for (const check of checks) {
      const response = await server.inject({
        method: check.method as any,
        url: check.url,
        payload: check.payload,
        headers,
      })

      // Affiche le code HTTP et la réponse brute pour confirmer le câblage route/auth/validation.
      console.log('VALIDATION_CHECK', check.url, response.statusCode, response.body)
    }
  } finally {
    // Ferme proprement Fastify pour libérer les ressources.
    await server.close()
  }
}

main().catch((error) => {
  console.error('VALIDATION_CHECK_ERROR', error)
  process.exit(1)
})

