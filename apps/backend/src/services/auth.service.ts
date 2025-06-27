import { prisma } from '../lib/database'
import bcrypt from 'bcryptjs'
import { logger } from '../utils/logger'

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: string
  companyId: string | null
}

export class AuthService {
  /**
   * Authentifier un utilisateur
   */
  async login(credentials: LoginCredentials): Promise<AuthUser | null> {
    try {
      const { email, password } = credentials

      // Rechercher l'utilisateur par email
      const user = await /* @ts-ignore */ prisma.user.findUnique({
        where: { 
          email: email.toLowerCase(),
          isActive: true 
        },
        include: {
          company: true
        }
      })

      if (!user) {
        logger.warn(`Tentative de connexion avec email inexistant: ${email}`)
        return null
      }

      // Vérifier le mot de passe
      const isPasswordValid = await bcrypt.compare(password, user.password)
      if (!isPasswordValid) {
        logger.warn(`Tentative de connexion avec mot de passe incorrect: ${email}`)
        return null
      }

      logger.info(`Connexion réussie pour: ${email}`)

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId
      }

    } catch (error) {
      logger.error('Erreur lors de l\'authentification:', error)
      throw new Error('Erreur interne lors de l\'authentification')
    }
  }

  /**
   * Créer un nouvel utilisateur
   */
  async createUser(userData: {
    email: string
    password: string
    firstName?: string
    lastName?: string
    role?: 'ADMIN' | 'USER' | 'MANAGER'
    companyId: string
  }): Promise<AuthUser> {
    try {
      const { email, password, firstName, lastName, role = 'USER', companyId } = userData

      // Vérifier si l'email existe déjà
      const existingUser = await /* @ts-ignore */ prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      })

      if (existingUser) {
        throw new Error('Un utilisateur avec cet email existe déjà')
      }

      // Hasher le mot de passe
      const hashedPassword = await bcrypt.hash(password, 10)

      // Créer l'utilisateur
      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          firstName,
          lastName,
          role,
          companyId
        }
      })

      logger.info(`Nouvel utilisateur créé: ${email}`)

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId
      }

    } catch (error) {
      logger.error('Erreur lors de la création de l\'utilisateur:', error)
      throw error
    }
  }

  /**
   * Récupérer un utilisateur par ID
   */
  async getUserById(userId: string): Promise<AuthUser | null> {
    try {
      const user = await /* @ts-ignore */ prisma.user.findUnique({
        where: { 
          id: userId,
          isActive: true 
        }
      })

      if (!user) {
        return null
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId
      }

    } catch (error) {
      logger.error('Erreur lors de la récupération de l\'utilisateur:', error)
      throw error
    }
  }

  /**
   * Mettre à jour le mot de passe d'un utilisateur
   */
  async updatePassword(userId: string, newPassword: string): Promise<void> {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10)

      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
      })

      logger.info(`Mot de passe mis à jour pour l'utilisateur: ${userId}`)

    } catch (error) {
      logger.error('Erreur lors de la mise à jour du mot de passe:', error)
      throw error
    }
  }
}

