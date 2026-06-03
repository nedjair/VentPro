export type UserRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE'

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
  createdAt: string
  updatedAt: string
  lastLoginAt?: string | null
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

export interface PaginationResult {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface UsersResponse {
  users: User[]
  pagination: PaginationResult
}

export interface PasswordChangeData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface UserStats {
  total: number
  active: number
  inactive: number
  admins: number
  managers: number
  employees: number
  byRole?: {
    ADMIN?: number
    MANAGER?: number
    EMPLOYEE?: number
  }
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
}
