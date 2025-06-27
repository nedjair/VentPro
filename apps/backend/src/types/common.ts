import { FastifyRequest } from 'fastify'

// Interface pour les requêtes authentifiées
export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    userId: string
    email: string
    role: string
    companyId: string
  }
}

// Types de pagination
export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginationResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Types de réponse API
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  errors?: string[]
}