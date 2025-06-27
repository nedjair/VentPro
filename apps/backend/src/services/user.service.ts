import { prisma } from '../lib/database'
import { logger } from '../utils/logger'
import bcrypt from 'bcryptjs'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE'
  isActive: boolean
  companyId: string
  company?: {
    id: string
    name: string
  }
  createdAt: Date
  updatedAt: Date
}

export interface CreateUserData {
  email: string
  password: string
  firstName: string
  lastName: string
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE'
  companyId: string
}

export interface UpdateUserData {
  email?: string
  firstName?: string
  lastName?: string
  role?: 'ADMIN' | 'MANAGER' | 'EMPLOYEE'
  isActive?: boolean
}

// Données mock pour les utilisateurs admin (utilisées quand la DB n'est pas disponible)
const MOCK_ADMIN_USERS: User[] = [
  {
    id: 'admin-1',
    email: 'admin@gestion.com',
    firstName: 'Super',
    lastName: 'Admin',
    role: 'ADMIN',
    isActive: true,
    companyId: 'company-1',
    company: {
      id: 'company-1',
      name: 'Entreprise Demo'
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'admin-2',
    email: 'admin.system@gestion.com',
    firstName: 'Admin',
    lastName: 'Système',
    role: 'ADMIN',
    isActive: true,
    companyId: 'company-1',
    company: {
      id: 'company-1',
      name: 'Entreprise Demo'
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'admin-3',
    email: 'directeur@gestion.com',
    firstName: 'Jean',
    lastName: 'Directeur',
    role: 'ADMIN',
    isActive: true,
    companyId: 'company-2',
    company: {
      id: 'company-2',
      name: 'Autre Entreprise'
    },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  }
]

export class UserService {
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
        logger.warn('Base de données non disponible, utilisation des données mock')
        return MOCK_ADMIN_USERS
      }

    } catch (error) {
      logger.error('Erreur lors de la récupération des utilisateurs admin:', error)
      // En cas d'erreur, retourner les données mock
      return MOCK_ADMIN_USERS
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
        logger.warn('Base de données non disponible, utilisation des données mock')
        // Retourner tous les utilisateurs mock (admin + quelques autres)
        const allMockUsers = [
          ...MOCK_ADMIN_USERS,
          {
            id: 'manager-1',
            email: 'manager@gestion.com',
            firstName: 'Marie',
            lastName: 'Manager',
            role: 'MANAGER' as const,
            isActive: true,
            companyId: 'company-1',
            company: {
              id: 'company-1',
              name: 'Entreprise Demo'
            },
            createdAt: new Date('2024-01-10'),
            updatedAt: new Date('2024-01-10')
          },
          {
            id: 'employee-1',
            email: 'employe@gestion.com',
            firstName: 'Pierre',
            lastName: 'Employé',
            role: 'EMPLOYEE' as const,
            isActive: true,
            companyId: 'company-1',
            company: {
              id: 'company-1',
              name: 'Entreprise Demo'
            },
            createdAt: new Date('2024-01-20'),
            updatedAt: new Date('2024-01-20')
          }
        ]
        return allMockUsers
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

      // Hasher le mot de passe
      const hashedPassword = await bcrypt.hash(userData.password, 10)

      const user = await prisma.user.create({
        data: {
          email: userData.email.toLowerCase(),
          password: hashedPassword,
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
}
