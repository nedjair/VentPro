import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, Permission, ROLE_PERMISSIONS } from '../types/user.js';

function normalizeRole(role?: string): UserRole {
  const normalizedRole = (role || 'EMPLOYEE').toUpperCase() as UserRole;
  return ROLE_PERMISSIONS[normalizedRole] ? normalizedRole : 'EMPLOYEE';
}

/**
 * Vérifie si un rôle a une permission spécifique
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[normalizeRole(role)];
  return rolePermissions ? rolePermissions.includes(permission) : false;
}

/**
 * Vérifie si un utilisateur peut accéder à une ressource d'un autre utilisateur
 */
export function canAccessUser(
  currentUserRole: UserRole,
  currentUserCompanyId: string,
  targetUserCompanyId: string,
  targetUserId?: string,
  currentUserId?: string
): boolean {
  const normalizedRole = normalizeRole(currentUserRole);

  // Les admins peuvent accéder à tous les utilisateurs
  if (normalizedRole === 'ADMIN') {
    return true;
  }

  // Les managers peuvent accéder aux utilisateurs de leur entreprise
  if (normalizedRole === 'MANAGER' && currentUserCompanyId === targetUserCompanyId) {
    return true;
  }

  // Les employés peuvent seulement accéder à leurs propres données
  if (normalizedRole === 'EMPLOYEE' && currentUserId === targetUserId) {
    return true;
  }

  return false;
}

/**
 * Middleware pour vérifier les permissions
 */
export function requirePermission(permission: Permission) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        message: 'Authentification requise'
      });
    }

    if (!hasPermission(request.user.role, permission)) {
      return reply.status(403).send({
        success: false,
        message: 'Permissions insuffisantes'
      });
    }
  };
}

/**
 * Middleware pour vérifier l'accès à un utilisateur spécifique
 */
export function requireUserAccess() {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        message: 'Authentification requise'
      });
    }

    const targetUserId = (request.params as any).id;
    
    if (!targetUserId) {
      return reply.status(400).send({
        success: false,
        message: 'ID utilisateur manquant'
      });
    }

    // Pour les opérations sur un utilisateur spécifique, on doit vérifier l'accès
    // Cette vérification sera complétée dans les handlers avec les données de l'utilisateur cible
  };
}

/**
 * Middleware pour les administrateurs uniquement
 */
export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.user) {
    return reply.status(401).send({
      success: false,
      message: 'Authentification requise'
    });
  }

  if (normalizeRole(request.user.role) !== 'ADMIN') {
    return reply.status(403).send({
      success: false,
      message: 'Accès réservé aux administrateurs'
    });
  }
}

/**
 * Middleware pour les administrateurs et managers
 */
export async function requireAdminOrManager(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.user) {
    return reply.status(401).send({
      success: false,
      message: 'Authentification requise'
    });
  }

  if (!['ADMIN', 'MANAGER'].includes(normalizeRole(request.user.role))) {
    return reply.status(403).send({
      success: false,
      message: 'Accès réservé aux administrateurs et managers'
    });
  }
}

/**
 * Middleware pour vérifier l'accès aux données d'entreprise
 */
export function requireCompanyAccess() {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        message: 'Authentification requise'
      });
    }

    // Les admins peuvent accéder à toutes les entreprises
    if (normalizeRole(request.user.role) === 'ADMIN') {
      return;
    }

    const companyId = (request.query as any).companyId || (request.body as any)?.companyId;
    
    // Si aucune entreprise spécifiée, utiliser celle de l'utilisateur
    if (!companyId) {
      return;
    }

    // Vérifier que l'utilisateur appartient à l'entreprise demandée
    if (request.user.companyId !== companyId) {
      return reply.status(403).send({
        success: false,
        message: 'Accès refusé à cette entreprise'
      });
    }
  };
}

/**
 * Utilitaire pour filtrer les données selon les permissions
 */
export function filterUserData(user: any, currentUserRole: UserRole, isOwnData: boolean = false) {
  const normalizedRole = normalizeRole(currentUserRole);

  // Les employés ne peuvent voir que certains champs des autres utilisateurs
  if (normalizedRole === 'EMPLOYEE' && !isOwnData) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      company: user.company
    };
  }

  // Les managers et admins peuvent voir tous les champs (sauf le mot de passe)
  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Middleware pour valider les rôles lors de la création/modification
 */
export function validateRoleAssignment() {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        message: 'Authentification requise'
      });
    }

    const targetRole = normalizeRole((request.body as any)?.role);
    
    if (!targetRole) {
      return; // Pas de rôle à assigner
    }

    // Seuls les admins peuvent créer d'autres admins
    if (targetRole === 'ADMIN' && normalizeRole(request.user.role) !== 'ADMIN') {
      return reply.status(403).send({
        success: false,
        message: 'Seuls les administrateurs peuvent créer des comptes administrateur'
      });
    }

    // Les managers peuvent créer des comptes manager et employé
    // Seuls les admins peuvent créer des comptes admin
    if (targetRole === 'ADMIN' && normalizeRole(request.user.role) !== 'ADMIN') {
      return reply.status(403).send({
        success: false,
        message: 'Seuls les administrateurs peuvent créer des comptes administrateur'
      });
    }
  };
}

/**
 * Utilitaire pour obtenir les permissions d'un rôle
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Utilitaire pour vérifier plusieurs permissions
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role];
  if (!rolePermissions) return false;
  
  return permissions.some(permission => rolePermissions.includes(permission));
}

/**
 * Utilitaire pour vérifier toutes les permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role];
  if (!rolePermissions) return false;
  
  return permissions.every(permission => rolePermissions.includes(permission));
}

/**
 * Middleware générique pour vérifier plusieurs conditions
 */
export function requireConditions(conditions: {
  permissions?: Permission[];
  roles?: UserRole[];
  requireAll?: boolean;
}) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        message: 'Authentification requise'
      });
    }

    const { permissions = [], roles = [], requireAll = false } = conditions;

    // Vérifier les rôles
    if (roles.length > 0 && !roles.includes(request.user.role)) {
      return reply.status(403).send({
        success: false,
        message: 'Rôle insuffisant'
      });
    }

    // Vérifier les permissions
    if (permissions.length > 0) {
      const hasPerms = requireAll 
        ? hasAllPermissions(request.user.role, permissions)
        : hasAnyPermission(request.user.role, permissions);

      if (!hasPerms) {
        return reply.status(403).send({
          success: false,
          message: 'Permissions insuffisantes'
        });
      }
    }
  };
}
