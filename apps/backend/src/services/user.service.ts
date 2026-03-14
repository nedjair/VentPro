import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import bcrypt from 'bcryptjs'
import { UserRole } from '@gestion/database'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  isActive: boolean
  companyId: string
  company?: {
    id: string
    name: string
  }
  createdAt: Date
  updatedAt: Date
  lastLoginAt?: Date | null
}

export interface CreateUserData {
  email: string
  password: string
  firstName: string
  lastName: string
  role: UserRole
  companyId: string
}

export interface UpdateUserData {
  email?: string
  firstName?: string
  lastName?: string
  role?: UserRole
  isActive?: boolean
}

export interface UserFilters {
  search?: string
  role?: UserRole
  isActive?: boolean
  companyId?: string
}

export interface PaginationOptions {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PasswordChangeData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}



export class UserService {
  private static readonly SALT_ROUNDS = 12
  private static readonly PASSWORD_MIN_LENGTH = 8

  /**
   * Valider le format de l'email
   */
  private static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Valider la force du mot de passe
   */
  private static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (password.length < this.PASSWORD_MIN_LENGTH) {
      errors.push(`Le mot de passe doit contenir au moins ${this.PASSWORD_MIN_LENGTH} caractères`)
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une majuscule')
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une minuscule')
    }

    if (!/\d/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un chiffre')
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un caractère spécial')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Hasher un mot de passe
   */
  private static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS)
  }

  /**
   * Vérifier un mot de passe
   */
  private static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword)
  }

  /**
   * Lister tous les utilisateurs admin
   */
  async getAllAdminUsers(): Promise<User[]> {
    try {
      logger.info('Récupération de tous les utilisateurs admin...')

      // Essayer d'utiliser la base de données
      try {
        const users = await prisma.user.findMany({
          where: {
            role: 'ADMIN',
            isActive: true
          },
          include: {
            company: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        })

        logger.info(`${users.length} utilisateurs admin trouvés dans la base de données`)
        return users as User[]

      } catch (dbError) {
        logger.error('Base de données non disponible:', dbError)
        throw new Error('Impossible de se connecter à la base de données')
      }

    } catch (error) {
      logger.error('Erreur lors de la récupération des utilisateurs admin:', error)
      throw error
    }
  }

  /**
   * Lister tous les utilisateurs (tous rôles)
   */
  async getAllUsers(): Promise<User[]> {
    try {
      logger.info('Récupération de tous les utilisateurs...')

      // Essayer d'utiliser la base de données
      try {
        const users = await prisma.user.findMany({
          where: {
            isActive: true
          },
          include: {
            company: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: [
            { role: 'asc' },
            { createdAt: 'asc' }
          ]
        })

        logger.info(`${users.length} utilisateurs trouvés dans la base de données`)
        return users as User[]

      } catch (dbError) {
        logger.error('Base de données non disponible:', dbError)
        throw new Error('Impossible de se connecter à la base de données')
      }

    } catch (error) {
      logger.error('Erreur lors de la récupération des utilisateurs:', error)
      throw error
    }
  }

  /**
   * Récupérer un utilisateur par ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      logger.info(`Récupération de l'utilisateur ${userId}...`)

      // Essayer d'utiliser la base de données
      try {
        const user = await prisma.user.findUnique({
          where: {
            id: userId,
            isActive: true
          },
          include: {
            company: {
              select: {
                id: true,
                name: true
              }
            }
          }
        })

        return user as User | null

      } catch (dbError) {
        logger.warn('Base de données non disponible, recherche dans les données mock')
        const allMockUsers = await this.getAllUsers()
        return allMockUsers.find(user => user.id === userId) || null
      }

    } catch (error) {
      logger.error('Erreur lors de la récupération de l\'utilisateur:', error)
      throw error
    }
  }

  /**
   * Créer un nouvel utilisateur
   */
  async createUser(userData: CreateUserData): Promise<User> {
    try {
      logger.info(`Création d'un nouvel utilisateur: ${userData.email}`)

      // Validation de l'email
      if (!UserService.validateEmail(userData.email)) {
        throw new Error('Format d\'email invalide')
      }

      // Validation du mot de passe
      const passwordValidation = UserService.validatePassword(userData.password)
      if (!passwordValidation.isValid) {
        throw new Error(`Mot de passe invalide: ${passwordValidation.errors.join(', ')}`)
      }

      // Vérifier l'unicité de l'email
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email.toLowerCase() }
      })

      if (existingUser) {
        throw new Error('Un utilisateur avec cet email existe déjà')
      }

      // Vérifier que l'entreprise existe
      const company = await prisma.company.findUnique({
        where: { id: userData.companyId }
      })

      if (!company) {
        throw new Error('Entreprise non trouvée')
      }

      // Hasher le mot de passe
      const hashedPassword = await UserService.hashPassword(userData.password)

      const user = await prisma.user.create({
        data: {
          email: userData.email.toLowerCase(),
          passwordHash: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          companyId: userData.companyId
        },
        include: {
          company: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      logger.info(`Utilisateur créé avec succès: ${user.email}`)
      return user as User

    } catch (error) {
      logger.error('Erreur lors de la création de l\'utilisateur:', error)
      throw error
    }
  }

  /**
   * Mettre à jour un utilisateur
   */
  async updateUser(userId: string, userData: UpdateUserData): Promise<User> {
    try {
      logger.info(`Mise à jour de l'utilisateur ${userId}`)

      const user = await prisma.user.update({
        where: { id: userId },
        data: userData,
        include: {
          company: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      logger.info(`Utilisateur mis à jour avec succès: ${user.email}`)
      return user as User

    } catch (error) {
      logger.error('Erreur lors de la mise à jour de l\'utilisateur:', error)
      throw error
    }
  }

  /**
   * Supprimer un utilisateur (désactivation)
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      logger.info(`Suppression de l'utilisateur ${userId}`)

      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false }
      })

      logger.info(`Utilisateur supprimé avec succès: ${userId}`)

    } catch (error) {
      logger.error('Erreur lors de la suppression de l\'utilisateur:', error)
      throw error
    }
  }

  /**
   * Compter les utilisateurs par rôle
   */
  async getUserStats(): Promise<{ total: number; admins: number; managers: number; employees: number }> {
    try {
      logger.info('Calcul des statistiques utilisateurs...')

      // Essayer d'utiliser la base de données
      try {
        const [total, admins, managers, employees] = await Promise.all([
          prisma.user.count({ where: { isActive: true } }),
          prisma.user.count({ where: { role: 'ADMIN', isActive: true } }),
          prisma.user.count({ where: { role: 'MANAGER', isActive: true } }),
          prisma.user.count({ where: { role: 'EMPLOYEE', isActive: true } })
        ])

        return { total, admins, managers, employees }

      } catch (dbError) {
        logger.warn('Base de données non disponible, calcul sur les données mock')
        const allUsers = await this.getAllUsers()
        return {
          total: allUsers.length,
          admins: allUsers.filter(u => u.role === 'ADMIN').length,
          managers: allUsers.filter(u => u.role === 'MANAGER').length,
          employees: allUsers.filter(u => u.role === 'EMPLOYEE').length
        }
      }

    } catch (error) {
      logger.error('Erreur lors du calcul des statistiques:', error)
      throw error
    }
  }

  /**
   * Récupérer la liste des utilisateurs avec pagination et filtres
   */
  async getUsers(filters: UserFilters = {}, pagination: PaginationOptions) {
    try {
      const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination
      const skip = (page - 1) * limit

      // Construction des filtres
      const where: any = {}

      if (filters.companyId) {
        where.companyId = filters.companyId
      }

      if (filters.role) {
        where.role = filters.role
      }

      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive
      }

      if (filters.search) {
        where.OR = [
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { lastName: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } }
        ]
      }

      // Récupérer les utilisateurs
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            companyId: true,
            createdAt: true,
            updatedAt: true,
            lastLoginAt: true,
            company: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: { [sortBy]: sortOrder },
          skip,
          take: limit
        }),
        prisma.user.count({ where })
      ])

      return {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }

    } catch (error) {
      logger.error('Erreur lors de la récupération des utilisateurs', { error: error.message, filters, pagination })
      throw error
    }
  }

  /**
   * Changer le mot de passe d'un utilisateur
   */
  async changePassword(userId: string, passwordData: PasswordChangeData): Promise<void> {
    try {
      logger.info(`Changement de mot de passe pour l'utilisateur ${userId}`)

      // Vérifier que les nouveaux mots de passe correspondent
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error('Les nouveaux mots de passe ne correspondent pas')
      }

      // Validation du nouveau mot de passe
      const passwordValidation = UserService.validatePassword(passwordData.newPassword)
      if (!passwordValidation.isValid) {
        throw new Error(`Nouveau mot de passe invalide: ${passwordValidation.errors.join(', ')}`)
      }

      // Récupérer l'utilisateur
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        throw new Error('Utilisateur non trouvé')
      }

      // Vérifier l'ancien mot de passe
      const isCurrentPasswordValid = await UserService.verifyPassword(passwordData.currentPassword, user.passwordHash)
      if (!isCurrentPasswordValid) {
        throw new Error('Mot de passe actuel incorrect')
      }

      // Hasher le nouveau mot de passe
      const hashedNewPassword = await UserService.hashPassword(passwordData.newPassword)

      // Mettre à jour le mot de passe
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: hashedNewPassword }
      })

      logger.info(`Mot de passe changé avec succès pour l'utilisateur ${userId}`)

    } catch (error) {
      logger.error('Erreur lors du changement de mot de passe', { error: error.message, userId })
      throw error
    }
  }

  /**
   * Activer/désactiver un utilisateur
   */
  async toggleUserStatus(userId: string, isActive: boolean): Promise<User> {
    try {
      logger.info(`${isActive ? 'Activation' : 'Désactivation'} de l'utilisateur ${userId}`)

      const user = await prisma.user.update({
        where: { id: userId },
        data: { isActive },
        include: {
          company: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      logger.info(`Utilisateur ${isActive ? 'activé' : 'désactivé'} avec succès: ${user.email}`)
      return user as User

    } catch (error) {
      logger.error('Erreur lors du changement de statut de l\'utilisateur', { error: error.message, userId, isActive })
      throw error
    }
  }

  /**
   * Supprimer définitivement un utilisateur
   */
  async hardDeleteUser(userId: string): Promise<void> {
    try {
      logger.info(`Suppression définitive de l'utilisateur ${userId}`)

      await prisma.user.delete({
        where: { id: userId }
      })

      logger.info(`Utilisateur supprimé définitivement: ${userId}`)

    } catch (error) {
      logger.error('Erreur lors de la suppression définitive de l\'utilisateur', { error: error.message, userId })
      throw error
    }
  }

  /**
   * Mettre à jour la date de dernière connexion
   */
  async updateLastLogin(userId: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { lastLoginAt: new Date() }
      })

      logger.info(`Date de dernière connexion mise à jour pour l'utilisateur ${userId}`)

    } catch (error) {
      logger.error('Erreur lors de la mise à jour de la dernière connexion', { error: error.message, userId })
      throw error
    }
  }
}
