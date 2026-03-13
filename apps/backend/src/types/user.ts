import { User as PrismaUser, UserRole } from '@gestion/database';

// Types de base
export { UserRole } from '@gestion/database';

export interface User extends PrismaUser {
  company?: {
    id: string;
    name: string;
  };
}

// Types pour les requêtes API
export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: UserRole;
  companyId?: string;
}

export interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword?: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ToggleStatusRequest {
  isActive: boolean;
}

// Types pour les filtres et pagination
export interface UserFilters {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  companyId?: string;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// Types pour les statistiques
export interface UserStats {
  total: number;
  admins: number;
  managers: number;
  employees: number;
  active: number;
  inactive: number;
}

// Types pour les réponses API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface UserResponse extends ApiResponse<User> {}
export interface UsersResponse extends ApiResponse<PaginatedResponse<User>> {}
export interface UserStatsResponse extends ApiResponse<UserStats> {}

// Types pour l'authentification
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  companyId: string;
  isActive: boolean;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  companyId: string;
  iat?: number;
  exp?: number;
}

// Types pour les permissions
export type Permission = 
  | 'users:read'
  | 'users:create'
  | 'users:update'
  | 'users:delete'
  | 'users:manage_roles'
  | 'users:change_password'
  | 'users:toggle_status'
  | 'users:view_stats';

export interface RolePermissions {
  [key: string]: Permission[];
}

// Constantes pour les rôles et permissions
export const ROLE_PERMISSIONS: RolePermissions = {
  ADMIN: [
    'users:read',
    'users:create',
    'users:update',
    'users:delete',
    'users:manage_roles',
    'users:change_password',
    'users:toggle_status',
    'users:view_stats'
  ],
  MANAGER: [
    'users:read',
    'users:create',
    'users:update',
    'users:change_password',
    'users:toggle_status',
    'users:view_stats'
  ],
  EMPLOYEE: [
    'users:read'
  ]
};

// Types pour la validation
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Types pour les logs d'audit
export interface AuditLogData {
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// Types pour les erreurs
export class UserNotFoundError extends Error {
  constructor(id: string) {
    super(`Utilisateur avec l'ID ${id} non trouvé`);
    this.name = 'UserNotFoundError';
  }
}

export class EmailAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`Un utilisateur avec l'email ${email} existe déjà`);
    this.name = 'EmailAlreadyExistsError';
  }
}

export class InvalidPasswordError extends Error {
  constructor() {
    super('Mot de passe invalide');
    this.name = 'InvalidPasswordError';
  }
}

export class InsufficientPermissionsError extends Error {
  constructor(action: string) {
    super(`Permissions insuffisantes pour l'action: ${action}`);
    this.name = 'InsufficientPermissionsError';
  }
}

// Types pour les hooks et événements
export interface UserEvent {
  type: 'created' | 'updated' | 'deleted' | 'activated' | 'deactivated' | 'password_changed';
  userId: string;
  user: User;
  timestamp: Date;
  triggeredBy: string;
}

export type UserEventHandler = (event: UserEvent) => void | Promise<void>;

// Types pour les requêtes de recherche
export interface SearchUsersQuery {
  q?: string;
  role?: UserRole;
  status?: 'active' | 'inactive' | 'all';
  company?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'email' | 'role' | 'createdAt' | 'lastLoginAt';
  sortOrder?: 'asc' | 'desc';
}

// Types pour l'export de données
export interface ExportUsersOptions {
  format: 'csv' | 'xlsx' | 'json';
  filters?: UserFilters;
  fields?: string[];
  includeInactive?: boolean;
}

export interface ExportResult {
  filename: string;
  data: Buffer;
  mimeType: string;
}
