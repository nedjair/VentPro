import { z } from 'zod'

// Types de base communs
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

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  errors?: string[]
}

export interface ApiError {
  success: false
  message: string
  errors?: string[]
  statusCode?: number
}

// Schémas de validation communs
export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  // La validation accepte une borne large pour rester compatible avec les
  // anciens clients, puis chaque handler plafonne réellement la taille renvoyée.
  limit: z.coerce.number().min(1).max(10000).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const SearchSchema = z.object({
  q: z.string().optional(),
  ...PaginationSchema.shape,
})

// Types pour les filtres de date
export const DateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

export type DateRange = z.infer<typeof DateRangeSchema>

// Types pour les réponses d'erreur HTTP
export interface ValidationError {
  field: string
  message: string
}

export interface HttpError extends Error {
  statusCode: number
  errors?: ValidationError[]
}

// Utilitaires de type
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

// Types pour les statuts génériques
export const StatusEnum = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  PENDING: 'PENDING',
  ARCHIVED: 'ARCHIVED',
} as const

export type Status = typeof StatusEnum[keyof typeof StatusEnum]
