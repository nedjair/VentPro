import 'dotenv/config'
import { createServer } from '../src/server'
import { prisma } from '../src/lib/prisma'

async function main() {
  // Crée l'application Fastify sans ouvrir de port réseau.
  const server = await createServer()

  try {
    // Vérifie d'abord le health check pour confirmer que les routes s'enregistrent.
    const health = await server.inject({ method: 'GET', url: '/health' })
    console.log('HEALTH', health.statusCode, health.body)

    // Liste quelques emails disponibles pour aider au diagnostic si le login échoue.
    const users = await prisma.$queryRaw<Array<{ email: string }>>`
      SELECT email
      FROM "User"
      WHERE "isActive" = true
      ORDER BY email ASC
      LIMIT 5
    `
    console.log('ACTIVE_USERS', users.map((user) => user.email).join(', ') || 'none')

    // Affiche la structure réelle d'un produit pour aligner les requêtes SQL avec la base locale.
    const products = await prisma.$queryRaw<Array<{ payload: Record<string, unknown> }>>`
      SELECT to_jsonb(p) AS payload
      FROM "Product" p
      LIMIT 1
    `
    console.log('PRODUCT_SAMPLE_KEYS', Object.keys(products[0]?.payload || {}).join(', ') || 'none')

    const stocks = await prisma.$queryRaw<Array<{ payload: Record<string, unknown> }>>`
      SELECT to_jsonb(s) AS payload
      FROM "Stock" s
      LIMIT 1
    `
    console.log('STOCK_SAMPLE_KEYS', Object.keys(stocks[0]?.payload || {}).join(', ') || 'none')

    // Deux mots de passe probables vus dans le code local : test123 et password123.
    const credentials = [
      { email: 'admin@test.com', password: 'test123' },
      { email: 'admin@test.com', password: 'password123' },
      { email: 'admin@example.com', password: 'test123' },
      { email: 'admin@example.com', password: 'password123' },
      { email: 'admin@example.com', password: 'admin123' },
    ]

    let token: string | null = null

    for (const credential of credentials) {
      const loginResponse = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: credential,
      })

      console.log('LOGIN_ATTEMPT', credential.email, credential.password, loginResponse.statusCode)
      console.log(loginResponse.body)

      if (loginResponse.statusCode === 200) {
        const parsed = JSON.parse(loginResponse.body)
        token = parsed?.data?.tokens?.accessToken || null
        break
      }
    }

    if (!token) {
      throw new Error('Impossible d’obtenir un token JWT avec les identifiants de test')
    }

    const authenticatedGet = async (url: string) => {
      const response = await server.inject({
        method: 'GET',
        url,
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

      console.log('REQUEST', url, response.statusCode)
      console.log(response.body)
    }

    // Endpoints des pages ciblées : commandes, factures, devis, stock unifié.
    await authenticatedGet('/api/v1/orders?page=1&limit=5')
    await authenticatedGet('/api/v1/invoices?page=1&limit=5')
    await authenticatedGet('/api/v1/quotes?page=1&limit=5')
    await authenticatedGet('/api/v1/stock/unified/products?limit=5')
  } finally {
    await server.close()
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error('SMOKE_TEST_ERROR', error)
  process.exit(1)
})

