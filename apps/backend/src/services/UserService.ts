import { PrismaClient, User, UserRole, Prisma } from '@gestion/database';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: UserRole;
  companyId: string;
}

export interface UpdateUserData {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface UserFilters {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  companyId?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface UserStats {
  total: number;
  admins: number;
  managers: number;
  employees: number;
  active: number;
  inactive: number;
}

export class UserService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  private normalizeRole(role?: string): UserRole {
    const normalizedRole = (role || 'EMPLOYEE').toUpperCase() as UserRole;
    return ['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(normalizedRole) ? normalizedRole : 'EMPLOYEE';
  }

  private splitFullName(fullName?: string) {
    const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
    return {
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' '),
    };
  }

  private buildFullName(firstName?: string, lastName?: string): string {
    return [firstName, lastName].filter(Boolean).join(' ').trim();
  }

  private isLegacySchemaError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return /firstName|lastName|passwordHash|companyId|relation.*company|column.*company/i.test(message);
  }

  private mapLegacyUser(user: any): any {
    const name = this.splitFullName(user.fullName);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName || name.firstName,
      lastName: user.lastName || name.lastName,
      role: this.normalizeRole(user.role),
      isActive: user.isActive ?? true,
      companyId: user.companyId || '',
      company: user.companyId && user.companyName ? { id: user.companyId, name: user.companyName } : undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt || null,
    };
  }

  /**
   * Récupère la liste des utilisateurs avec pagination et filtres
   */
  async getUsers(
    filters: UserFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 10 }
  ): Promise<PaginatedResult<User & { company: { id: string; name: string } }>> {
    const { search, role, isActive, companyId } = filters;
    const page = Math.max(1, Number(pagination.page) || 1);
    const limit = Math.max(1, Number(pagination.limit) || 10);

    // Compatibilité avec le schéma PostgreSQL local actuellement observé :
    // table `User` avec `fullName` et sans relation `company`.
    try {
      const conditions: string[] = ['1=1'];
      const params: any[] = [];

      if (search) {
        params.push(`%${search}%`);
        const searchIndex = params.length;
        conditions.push(`(
          email ILIKE $${searchIndex}
          OR COALESCE("fullName", '') ILIKE $${searchIndex}
        )`);
      }

      if (role) {
        params.push(this.normalizeRole(role).toLowerCase());
        conditions.push(`LOWER(role) = $${params.length}`);
      }

      if (typeof isActive === 'boolean') {
        params.push(isActive);
        conditions.push(`COALESCE("isActive", true) = $${params.length}`);
      }

      // Le schéma local ne porte pas de rattachement société sur `User`.
      // On ignore donc `companyId` ici, et on laisse le fallback historique gérer
      // les anciens schémas quand cette colonne existe réellement.
      if (companyId) {
        const _ignoredCompanyId = companyId;
        void _ignoredCompanyId;
      }

      params.push(limit);
      const limitIndex = params.length;
      params.push((page - 1) * limit);
      const offsetIndex = params.length;

      const rows = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT
          id,
          email,
          "fullName",
          role,
          "isActive",
          "createdAt",
          "updatedAt",
          COUNT(*) OVER()::int AS "__total"
        FROM "User"
        WHERE ${conditions.join(' AND ')}
        ORDER BY "createdAt" DESC
        LIMIT $${limitIndex} OFFSET $${offsetIndex}
      `, ...params);

      const total = Number(rows[0]?.__total || 0);
      const totalPages = Math.ceil(total / limit);

      return {
        data: rows.map((row) => this.mapLegacyUser(row)) as any,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (currentSchemaError) {
      if (!this.isLegacySchemaError(currentSchemaError)) {
        // Si le SQL brut échoue pour une autre raison (connexion DB, syntaxe, etc.),
        // on laisse l'erreur remonter pour éviter de masquer un vrai incident.
        throw currentSchemaError;
      }
    }
    const where: Prisma.UserWhereInput = {};

    // Filtres de recherche
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    if (companyId) {
      where.companyId = companyId;
    }



    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          company: {
            select: { id: true, name: true }
          }
        },
        orderBy: [
          { createdAt: 'desc' }
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Récupère un utilisateur par son ID
   */
  async getUserById(id: string): Promise<(User & { company: { id: string; name: string } }) | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { id },
        include: {
          company: {
            select: { id: true, name: true }
          }
        }
      });
    } catch (error) {
      if (!this.isLegacySchemaError(error)) {
        throw error;
      }

      const rows = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT id, email, "fullName", role, "isActive", "createdAt", "updatedAt"
        FROM "User"
        WHERE id = $1
        LIMIT 1
      `, id);

      return rows[0] ? (this.mapLegacyUser(rows[0]) as any) : null;
    }
  }

  /**
   * Récupère un utilisateur par son email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { email }
      });
    } catch (error) {
      if (!this.isLegacySchemaError(error)) {
        throw error;
      }

      const rows = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT id, email, "fullName", role, "isActive", password, "createdAt", "updatedAt"
        FROM "User"
        WHERE email = $1
        LIMIT 1
      `, email);

      return (rows[0] || null) as User | null;
    }
  }

  /**
   * Crée un nouvel utilisateur
   */
  async createUser(data: CreateUserData): Promise<User & { company: { id: string; name: string } }> {
    const { email, firstName, lastName, password, role, companyId } = data;

    // Vérifier si l'email existe déjà
    const existingUser = await this.getUserByEmail(email);
    if (existingUser) {
      throw new Error('Un utilisateur avec cet email existe déjà');
    }

    // Hacher le mot de passe
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    try {
      // Vérifier que l'entreprise existe
      const company = await this.prisma.company.findUnique({
        where: { id: companyId }
      });
      if (!company) {
        throw new Error('Entreprise non trouvée');
      }

      // Créer l'utilisateur
      const user = await this.prisma.user.create({
        data: {
          id: uuidv4(),
          email,
          firstName,
          lastName,
          passwordHash: hashedPassword,
          role,
          companyId,
          isActive: true,
        },
        include: {
          company: {
            select: { id: true, name: true }
          }
        }
      });

      return user;
    } catch (error) {
      if (!this.isLegacySchemaError(error)) {
        throw error;
      }

      const id = uuidv4();
      const rows = await this.prisma.$queryRawUnsafe<any[]>(`
        INSERT INTO "User" (
          id,
          email,
          password,
          "fullName",
          role,
          "isActive",
          "createdAt",
          "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
        RETURNING id, email, "fullName", role, "isActive", "createdAt", "updatedAt"
      `, id, email, hashedPassword, this.buildFullName(firstName, lastName), this.normalizeRole(role).toLowerCase());

      return this.mapLegacyUser(rows[0]) as any;
    }
  }

  /**
   * Met à jour un utilisateur
   */
  async updateUser(
    id: string,
    data: UpdateUserData
  ): Promise<User & { company: { id: string; name: string } }> {
    // Vérifier que l'utilisateur existe
    const existingUser = await this.getUserById(id);
    if (!existingUser) {
      throw new Error('Utilisateur non trouvé');
    }

    // Si l'email est modifié, vérifier qu'il n'existe pas déjà
    if (data.email && data.email !== existingUser.email) {
      const emailExists = await this.getUserByEmail(data.email);
      if (emailExists) {
        throw new Error('Un utilisateur avec cet email existe déjà');
      }
    }

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
        include: {
          company: {
            select: { id: true, name: true }
          }
        }
      });

      return updatedUser;
    } catch (error) {
      if (!this.isLegacySchemaError(error)) {
        throw error;
      }

      const current = this.mapLegacyUser(existingUser);
      const updateClauses: string[] = ['"updatedAt" = NOW()'];
      const params: any[] = [id];

      if (data.email !== undefined) {
        params.push(data.email);
        updateClauses.push(`email = $${params.length}`);
      }

      if (data.role !== undefined) {
        params.push(this.normalizeRole(data.role).toLowerCase());
        updateClauses.push(`role = $${params.length}`);
      }

      if (typeof data.isActive === 'boolean') {
        params.push(data.isActive);
        updateClauses.push(`"isActive" = $${params.length}`);
      }

      const fullName = this.buildFullName(
        data.firstName ?? current.firstName,
        data.lastName ?? current.lastName
      );
      params.push(fullName);
      updateClauses.push(`"fullName" = $${params.length}`);

      const rows = await this.prisma.$queryRawUnsafe<any[]>(`
        UPDATE "User"
        SET ${updateClauses.join(', ')}
        WHERE id = $1
        RETURNING id, email, "fullName", role, "isActive", "createdAt", "updatedAt"
      `, ...params);

      return this.mapLegacyUser(rows[0]) as any;
    }
  }

  /**
   * Change le mot de passe d'un utilisateur
   */
  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
    isAdmin: boolean = false
  ): Promise<void> {
    let user = null as any;

    try {
      user = await this.prisma.user.findUnique({
        where: { id }
      });
    } catch (error) {
      if (!this.isLegacySchemaError(error)) {
        throw error;
      }

      const rows = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT id, password FROM "User" WHERE id = $1 LIMIT 1
      `, id);
      user = rows[0] || null;
    }

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    // Vérifier le mot de passe actuel (sauf si c'est un admin qui change le mot de passe)
    if (!isAdmin) {
      const passwordHash = user.passwordHash || user.password;
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, passwordHash);
      if (!isCurrentPasswordValid) {
        throw new Error('Mot de passe actuel incorrect');
      }
    }

    // Hacher le nouveau mot de passe
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    try {
      await this.prisma.user.update({
        where: { id },
        data: {
          passwordHash: hashedPassword,
          updatedAt: new Date(),
        }
      });
    } catch (error) {
      if (!this.isLegacySchemaError(error)) {
        throw error;
      }

      await this.prisma.$executeRawUnsafe(`
        UPDATE "User"
        SET password = $2, "updatedAt" = NOW()
        WHERE id = $1
      `, id, hashedPassword);
    }
  }

  /**
   * Active ou désactive un utilisateur
   */
  async toggleUserStatus(id: string): Promise<User & { company: { id: string; name: string } }> {
    const user = await this.getUserById(id);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: {
          isActive: !user.isActive,
          updatedAt: new Date(),
        },
        include: {
          company: {
            select: { id: true, name: true }
          }
        }
      });

      return updatedUser;
    } catch (error) {
      if (!this.isLegacySchemaError(error)) {
        throw error;
      }

      const rows = await this.prisma.$queryRawUnsafe<any[]>(`
        UPDATE "User"
        SET "isActive" = $2, "updatedAt" = NOW()
        WHERE id = $1
        RETURNING id, email, "fullName", role, "isActive", "createdAt", "updatedAt"
      `, id, !user.isActive);

      return this.mapLegacyUser(rows[0]) as any;
    }
  }

  /**
   * Supprime un utilisateur
   */
  async deleteUser(id: string): Promise<void> {
    const user = await this.getUserById(id);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    try {
      await this.prisma.user.delete({
        where: { id }
      });
    } catch (error) {
      if (!this.isLegacySchemaError(error)) {
        throw error;
      }

      await this.prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE id = $1`, id);
    }
  }

  /**
   * Met à jour la date de dernière connexion
   */
  async updateLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
      }
    });
  }

  /**
   * Récupère les statistiques des utilisateurs
   */
  async getUserStats(companyId?: string): Promise<UserStats> {
    const where: Prisma.UserWhereInput = companyId ? { companyId } : {};

    try {
      const [total, admins, managers, employees, active, inactive] = await Promise.all([
        this.prisma.user.count({ where }),
        this.prisma.user.count({ where: { ...where, role: 'ADMIN' } }),
        this.prisma.user.count({ where: { ...where, role: 'MANAGER' } }),
        this.prisma.user.count({ where: { ...where, role: 'EMPLOYEE' } }),
        this.prisma.user.count({ where: { ...where, isActive: true } }),
        this.prisma.user.count({ where: { ...where, isActive: false } }),
      ]);

      return {
        total,
        admins,
        managers,
        employees,
        active,
        inactive,
      };
    } catch (error) {
      if (!this.isLegacySchemaError(error)) {
        throw error;
      }

      const rows = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE LOWER(role) = 'admin')::int AS admins,
          COUNT(*) FILTER (WHERE LOWER(role) = 'manager')::int AS managers,
          COUNT(*) FILTER (WHERE LOWER(role) = 'employee')::int AS employees,
          COUNT(*) FILTER (WHERE COALESCE("isActive", true) = true)::int AS active,
          COUNT(*) FILTER (WHERE COALESCE("isActive", true) = false)::int AS inactive
        FROM "User"
      `);

      const stats = rows[0] || {};
      return {
        total: stats.total || 0,
        admins: stats.admins || 0,
        managers: stats.managers || 0,
        employees: stats.employees || 0,
        active: stats.active || 0,
        inactive: stats.inactive || 0,
      };
    }
  }

  /**
   * Valide un mot de passe
   */
  async validatePassword(userId: string, password: string): Promise<boolean> {
    let user = null as any;

    try {
      user = await this.prisma.user.findUnique({
        where: { id: userId }
      });
    } catch (error) {
      if (!this.isLegacySchemaError(error)) {
        throw error;
      }

      const rows = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT id, password FROM "User" WHERE id = $1 LIMIT 1
      `, userId);
      user = rows[0] || null;
    }

    if (!user) {
      return false;
    }

    return bcrypt.compare(password, user.passwordHash || user.password);
  }
}
