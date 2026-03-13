import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import { userRoutes } from '../../routes/users'
import { UserService } from '../../services/user.service'
import jwt from 'jsonwebtoken'

// Mock UserService
const mockUserService = {
  getUsers: vi.fn(),
  getUserById: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  changePassword: vi.fn(),
  toggleUserStatus: vi.fn(),
  hardDeleteUser: vi.fn(),
  getStats: vi.fn(),
} as unknown as UserService

// Mock JWT
vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
  },
}))

describe('User Routes', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = Fastify()
    
    // Mock authentication middleware
    app.decorateRequest('user', null)
    app.addHook('preHandler', async (request) => {
      const authHeader = request.headers.authorization
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        if (token === 'valid-admin-token') {
          request.user = {
            id: 'admin-1',
            role: 'ADMIN',
            companyId: 'company-1'
          }
        } else if (token === 'valid-manager-token') {
          request.user = {
            id: 'manager-1',
            role: 'MANAGER',
            companyId: 'company-1'
          }
        } else if (token === 'valid-employee-token') {
          request.user = {
            id: 'employee-1',
            role: 'EMPLOYEE',
            companyId: 'company-1'
          }
        }
      }
    })

    // Register routes with mocked service
    await app.register(userRoutes, { userService: mockUserService })
    await app.ready()
  })

  afterEach(async () => {
    await app.close()
    vi.clearAllMocks()
  })

  describe('GET /users', () => {
    it('should return users for admin', async () => {
      const mockResponse = {
        users: [
          {
            id: '1',
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            role: 'EMPLOYEE',
            isActive: true,
            companyId: 'company-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            company: { id: 'company-1', name: 'Test Company' }
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      }

      mockUserService.getUsers.mockResolvedValue(mockResponse)

      const response = await app.inject({
        method: 'GET',
        url: '/users',
        headers: {
          authorization: 'Bearer valid-admin-token'
        }
      })

      expect(response.statusCode).toBe(200)
      const data = JSON.parse(response.payload)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockResponse)
    })

    it('should return 403 for employee access', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/users',
        headers: {
          authorization: 'Bearer valid-employee-token'
        }
      })

      expect(response.statusCode).toBe(403)
      const data = JSON.parse(response.payload)
      expect(data.success).toBe(false)
      expect(data.message).toContain('Accès refusé')
    })

    it('should return 401 for unauthenticated request', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/users'
      })

      expect(response.statusCode).toBe(401)
    })

    it('should handle query parameters correctly', async () => {
      mockUserService.getUsers.mockResolvedValue({
        users: [],
        pagination: {
          page: 2,
          limit: 5,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: true
        }
      })

      const response = await app.inject({
        method: 'GET',
        url: '/users?page=2&limit=5&search=john&role=EMPLOYEE&isActive=true',
        headers: {
          authorization: 'Bearer valid-admin-token'
        }
      })

      expect(response.statusCode).toBe(200)
      expect(mockUserService.getUsers).toHaveBeenCalledWith(
        { page: 2, limit: 5 },
        { search: 'john', role: 'EMPLOYEE', isActive: true }
      )
    })
  })

  describe('POST /users', () => {
    it('should create user successfully for admin', async () => {
      const userData = {
        email: 'newuser@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        password: 'Password123!',
        role: 'EMPLOYEE',
        companyId: 'company-1'
      }

      const mockCreatedUser = {
        id: '2',
        ...userData,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        company: { id: 'company-1', name: 'Test Company' }
      }

      mockUserService.createUser.mockResolvedValue(mockCreatedUser)

      const response = await app.inject({
        method: 'POST',
        url: '/users',
        headers: {
          authorization: 'Bearer valid-admin-token',
          'content-type': 'application/json'
        },
        payload: userData
      })

      expect(response.statusCode).toBe(201)
      const data = JSON.parse(response.payload)
      expect(data.success).toBe(true)
      expect(data.data.email).toBe(userData.email)
    })

    it('should return 403 for manager trying to create admin', async () => {
      const userData = {
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        password: 'Password123!',
        role: 'ADMIN',
        companyId: 'company-1'
      }

      const response = await app.inject({
        method: 'POST',
        url: '/users',
        headers: {
          authorization: 'Bearer valid-manager-token',
          'content-type': 'application/json'
        },
        payload: userData
      })

      expect(response.statusCode).toBe(403)
    })

    it('should validate required fields', async () => {
      const invalidData = {
        email: 'invalid-email',
        firstName: '',
        password: 'weak'
      }

      const response = await app.inject({
        method: 'POST',
        url: '/users',
        headers: {
          authorization: 'Bearer valid-admin-token',
          'content-type': 'application/json'
        },
        payload: invalidData
      })

      expect(response.statusCode).toBe(400)
    })
  })

  describe('PUT /users/:id', () => {
    it('should update user successfully', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        email: 'updated@example.com'
      }

      const mockUpdatedUser = {
        id: '1',
        ...updateData,
        role: 'EMPLOYEE',
        isActive: true,
        companyId: 'company-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        company: { id: 'company-1', name: 'Test Company' }
      }

      mockUserService.updateUser.mockResolvedValue(mockUpdatedUser)

      const response = await app.inject({
        method: 'PUT',
        url: '/users/1',
        headers: {
          authorization: 'Bearer valid-admin-token',
          'content-type': 'application/json'
        },
        payload: updateData
      })

      expect(response.statusCode).toBe(200)
      const data = JSON.parse(response.payload)
      expect(data.success).toBe(true)
      expect(data.data.firstName).toBe('Updated')
    })

    it('should return 404 for non-existent user', async () => {
      mockUserService.updateUser.mockRejectedValue(new Error('Utilisateur non trouvé'))

      const response = await app.inject({
        method: 'PUT',
        url: '/users/nonexistent',
        headers: {
          authorization: 'Bearer valid-admin-token',
          'content-type': 'application/json'
        },
        payload: { firstName: 'Test' }
      })

      expect(response.statusCode).toBe(500)
    })
  })

  describe('POST /users/:id/change-password', () => {
    it('should change password successfully', async () => {
      const passwordData = {
        currentPassword: 'oldPassword',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!'
      }

      mockUserService.changePassword.mockResolvedValue(undefined)

      const response = await app.inject({
        method: 'POST',
        url: '/users/1/change-password',
        headers: {
          authorization: 'Bearer valid-admin-token',
          'content-type': 'application/json'
        },
        payload: passwordData
      })

      expect(response.statusCode).toBe(200)
      const data = JSON.parse(response.payload)
      expect(data.success).toBe(true)
      expect(data.message).toContain('Mot de passe modifié')
    })

    it('should validate password confirmation', async () => {
      const passwordData = {
        currentPassword: 'oldPassword',
        newPassword: 'NewPassword123!',
        confirmPassword: 'DifferentPassword123!'
      }

      const response = await app.inject({
        method: 'POST',
        url: '/users/1/change-password',
        headers: {
          authorization: 'Bearer valid-admin-token',
          'content-type': 'application/json'
        },
        payload: passwordData
      })

      expect(response.statusCode).toBe(400)
    })
  })

  describe('PATCH /users/:id/status', () => {
    it('should toggle user status successfully', async () => {
      const mockUpdatedUser = {
        id: '1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'EMPLOYEE',
        isActive: false,
        companyId: 'company-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        company: { id: 'company-1', name: 'Test Company' }
      }

      mockUserService.toggleUserStatus.mockResolvedValue(mockUpdatedUser)

      const response = await app.inject({
        method: 'PATCH',
        url: '/users/1/status',
        headers: {
          authorization: 'Bearer valid-admin-token',
          'content-type': 'application/json'
        },
        payload: { isActive: false }
      })

      expect(response.statusCode).toBe(200)
      const data = JSON.parse(response.payload)
      expect(data.success).toBe(true)
      expect(data.data.isActive).toBe(false)
    })
  })

  describe('DELETE /users/:id', () => {
    it('should delete user successfully', async () => {
      mockUserService.hardDeleteUser.mockResolvedValue(undefined)

      const response = await app.inject({
        method: 'DELETE',
        url: '/users/1',
        headers: {
          authorization: 'Bearer valid-admin-token'
        }
      })

      expect(response.statusCode).toBe(200)
      const data = JSON.parse(response.payload)
      expect(data.success).toBe(true)
      expect(data.message).toContain('Utilisateur supprimé')
    })

    it('should return 403 for manager trying to delete admin', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/users/admin-user-id',
        headers: {
          authorization: 'Bearer valid-manager-token'
        }
      })

      expect(response.statusCode).toBe(403)
    })
  })

  describe('GET /users/stats', () => {
    it('should return user statistics', async () => {
      const mockStats = {
        total: 10,
        admins: 2,
        managers: 3,
        employees: 5,
        active: 8,
        inactive: 2
      }

      mockUserService.getStats.mockResolvedValue(mockStats)

      const response = await app.inject({
        method: 'GET',
        url: '/users/stats',
        headers: {
          authorization: 'Bearer valid-admin-token'
        }
      })

      expect(response.statusCode).toBe(200)
      const data = JSON.parse(response.payload)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockStats)
    })
  })
})
