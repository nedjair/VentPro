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

const FALLBACK_ADMIN_EMAIL = 'admin@example.com'
const FALLBACK_ADMIN_PASSWORD = 'admin123'
const FALLBACK_COMPANY_ID = 'dev-company-fallback'

function isDatabaseUnavailableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)

  return (
    message.includes("Can't reach database server") ||
    message.includes('ECONNREFUSED') ||
    message.includes('connect ECONNREFUSED') ||
    message.includes('Error querying the database') ||
    message.includes('Erreur de connexion à la base de données')
  )
}

function isMissingRelationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('relation "users" does not exist') || message.includes('relation "User" does not exist')
}

export class AuthService {
  private legacyUsersTableExists: boolean | null = null

  /**
   * Fournit un compte de secours strictement local quand PostgreSQL est hors
   * service. Ce mode est volontairement limité au compte admin de démonstration
   * pour garder un accès de maintenance au frontend le temps de réparer la base.
   */
  private async tryDevelopmentFallback(credentials: LoginCredentials, rootCause?: unknown): Promise<AuthUser | null> {
    if (process.env.NODE_ENV !== 'development') {
      return null
    }

    if (
      credentials.email.toLowerCase() !== FALLBACK_ADMIN_EMAIL ||
      credentials.password !== FALLBACK_ADMIN_PASSWORD
    ) {
      return null
    }

    logger.warn(
      {
        email: credentials.email.toLowerCase(),
        rootCause: rootCause instanceof Error ? rootCause.message : String(rootCause || ''),
      },
      'Base indisponible, utilisation du compte administrateur de secours en développement'
    )

    return {
      id: 'dev-admin-fallback',
      email: FALLBACK_ADMIN_EMAIL,
      firstName: 'Admin',
      lastName: 'Fallback',
      role: 'ADMIN',
      // Important: several routes scope data by companyId first.
      // A stable non-null fallback prevents empty datasets on screens that
      // rely on the authenticated company context while PostgreSQL is down.
      companyId: FALLBACK_COMPANY_ID,
    }
  }

  /**
   * Détecte la présence de la table legacy `public.users`.
   *
   * Pourquoi : dans l'environnement actuel, cette table n'existe pas. Sans cette
   * vérification, chaque tentative sur un utilisateur absent déclenche un fallback
   * SQL inutile puis un warning parasite dans les logs.
   */
  private async hasLegacyUsersTable(): Promise<boolean> {
    if (this.legacyUsersTableExists !== null) {
      return this.legacyUsersTableExists
    }

    try {
      const result = await prisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'users'
        ) AS exists
      `

      this.legacyUsersTableExists = Boolean(result[0]?.exists)
      return this.legacyUsersTableExists
    } catch (error) {
      logger.warn('Impossible de vérifier la présence de la table legacy users, le fallback SQL reste autorisé', error)
      return true
    }
  }

  /**
   * Authentifier un utilisateur
   */
  async login(credentials: LoginCredentials): Promise<AuthUser | null> {
    try {
      const { email, password } = credentials
      const normalizedEmail = email.toLowerCase()
      logger.info(`Tentative de connexion pour: ${normalizedEmail}`)

      // 1) Schéma PostgreSQL actuellement observé dans l'environnement Docker
      //    (tables PascalCase, colonne password + fullName)
      try {
        const currentSchemaUsers = await prisma.$queryRaw<Array<{
          id: string
          email: string
          password: string
          fullName: string
          role: string
          isActive: boolean
        }>>`
          SELECT id, email, password, "fullName", role, "isActive"
          FROM "User"
          WHERE LOWER(email) = LOWER(${normalizedEmail})
            AND "isActive" = true
          LIMIT 1
        `

        const currentUser = currentSchemaUsers[0]
        if (currentUser) {
          const isPasswordValid = await bcrypt.compare(password, currentUser.password)
          if (!isPasswordValid) {
            logger.warn(`Mot de passe incorrect pour: ${normalizedEmail}`)
            return null
          }

          const [firstName, ...lastNameParts] = currentUser.fullName.split(' ')

          logger.info(`Connexion réussie pour: ${normalizedEmail} (schéma PostgreSQL actuel)`)
          return {
            id: currentUser.id,
            email: currentUser.email,
            firstName: firstName || currentUser.fullName,
            lastName: lastNameParts.join(' ') || null,
            role: currentUser.role,
            companyId: null,
          }
        }
      } catch (currentSchemaError) {
        if (isDatabaseUnavailableError(currentSchemaError)) {
          const fallbackUser = await this.tryDevelopmentFallback({ email: normalizedEmail, password }, currentSchemaError)
          if (fallbackUser) {
            return fallbackUser
          }
        }

        logger.warn('Schéma PostgreSQL actuel non disponible via Prisma raw query, tentative de fallback legacy', currentSchemaError)
      }

      // 2) Fallback vers l'ancien schéma Prisma/SQL.
      // On ne tente ce chemin que si la table legacy existe réellement.
      if (!(await this.hasLegacyUsersTable())) {
        logger.warn(`Utilisateur non trouvé: ${normalizedEmail}`)
        return null
      }

      try {
        const legacyUsers = await prisma.$queryRaw<Array<{
          id: string
          email: string
          passwordHash: string
          firstName: string | null
          lastName: string | null
          role: string
          companyId: string | null
        }>>`
          SELECT
            id,
            email,
            password_hash AS "passwordHash",
            first_name AS "firstName",
            last_name AS "lastName",
            role,
            company_id AS "companyId"
          FROM users
          WHERE LOWER(email) = LOWER(${normalizedEmail})
            AND is_active = true
          LIMIT 1
        `

        const legacyUser = legacyUsers[0]
        if (!legacyUser) {
          logger.warn(`Utilisateur non trouvé: ${normalizedEmail}`)
          return null
        }

        const isPasswordValid = await bcrypt.compare(password, legacyUser.passwordHash)
        if (!isPasswordValid) {
          logger.warn(`Mot de passe incorrect pour: ${normalizedEmail}`)
          return null
        }

        try {
          await prisma.$executeRaw`
            UPDATE users
            SET last_login_at = NOW()
            WHERE id = ${legacyUser.id}
          `
        } catch (updateError) {
          logger.warn('Impossible de mettre à jour last_login_at sur le schéma legacy:', updateError)
        }

        logger.info(`Connexion réussie pour: ${normalizedEmail} (schéma legacy)`)

        return {
          id: legacyUser.id,
          email: legacyUser.email,
          firstName: legacyUser.firstName,
          lastName: legacyUser.lastName,
          role: legacyUser.role,
          companyId: legacyUser.companyId,
        }
      } catch (legacySchemaError) {
        if (isDatabaseUnavailableError(legacySchemaError)) {
          const fallbackUser = await this.tryDevelopmentFallback({ email: normalizedEmail, password }, legacySchemaError)
          if (fallbackUser) {
            return fallbackUser
          }
        }

        if (!isMissingRelationError(legacySchemaError)) {
          throw legacySchemaError
        }

        logger.warn('Schéma legacy absent dans la base locale active, aucun fallback SQL supplémentaire disponible')
        return null
      }
    } catch (error) {
      logger.error('Erreur lors de l\'authentification:', error)

      throw new Error('Erreur d\'authentification')
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
      // Try with passwordHash first, fallback to password if column doesn't exist
      let user;
      try {
        user = await prisma.user.create({
          data: {
            email: email.toLowerCase(),
            passwordHash: hashedPassword,
            firstName,
            lastName,
            role,
            companyId
          }
        });
      } catch (error) {
        // If passwordHash column doesn't exist, try with password column
        if (error.message?.includes('passwordHash') && error.message?.includes('does not exist')) {
          logger.warn('passwordHash column missing, using password column');
          user = await prisma.user.create({
            data: {
              email: email.toLowerCase(),
              password: hashedPassword, // fallback to old column name
              firstName,
              lastName,
              role,
              companyId
            }
          });
        } else {
          throw error;
        }
      }

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
        data: { passwordHash: hashedPassword }
      })

      logger.info(`Mot de passe mis à jour pour l'utilisateur: ${userId}`)

    } catch (error) {
      logger.error('Erreur lors de la mise à jour du mot de passe:', error)
      throw error
    }
  }
}

