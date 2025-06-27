import { z } from 'zod'
import { FastifyRequest } from 'fastify'

// Énumérations
export const UserRole = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
} as const

export type UserRole = typeof UserRole[keyof typeof UserRole]

// Schémas de validation Zod
export const LoginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
})

export const RegisterSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  firstName: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  lastName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  companyName: z.string().min(2, 'Le nom de l\'entreprise doit contenir au moins 2 caractères'),
})

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: z.string().min(6, 'Le nouveau mot de passe doit contenir au moins 6 caractères'),
  confirmPassword: z.string().min(1, 'Confirmation du mot de passe requise'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})

// Types TypeScript
export type LoginInput = z.infer<typeof LoginSchema>
export type RegisterInput = z.infer<typeof RegisterSchema>
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  isActive: boolean
  companyId: string
  createdAt: Date
  updatedAt: Date
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthResponse {
  user: User
  tokens: AuthTokens
}

export interface JWTPayload {
  userId: string
  email: string
  role: UserRole
  companyId: string
  iat?: number
  exp?: number
}

// Interface pour les requêtes authentifiées
export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    userId: string
    email: string
    role: string
    companyId: string
  }
}
