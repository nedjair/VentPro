import { FastifyRequest, FastifyReply } from 'fastify'
import { JWT } from '@fastify/jwt'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    authorize: (roles: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    jwt: JWT
  }

  interface FastifyRequest {
    user?: {
      userId: string
      email: string
      role: string
      companyId: string
    }
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      userId: string
      email: string
      role: string
      companyId: string
    }
  }
}
