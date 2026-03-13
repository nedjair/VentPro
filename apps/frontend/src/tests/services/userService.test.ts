import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { userService } from '../../services/userService'
import { User, CreateUserData, UpdateUserData, ChangePasswordData } from '../../types/user'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

describe('UserService', () => {
  const mockToken = 'mock-jwt-token'
  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'EMPLOYEE',
    isActive: true,
    companyId: 'company-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    company: {
      id: 'company-1',
      name: 'Test Company'
    }
  }

  beforeEach(() => {
    mockLocalStorage.getItem.mockReturnValue(mockToken)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('getUsers', () => {
    it('should fetch users successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          users: [mockUser],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await userService.getUsers()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/users?page=1&limit=10'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`,
            'Content-Type': 'application/json',
          }),
        })
      )
      expect(result).toEqual(mockResponse.data)
    })

    it('should handle pagination parameters', async () => {
      const mockResponse = {
        success: true,
        data: {
          users: [],
          pagination: {
            page: 2,
            limit: 5,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: true
          }
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      await userService.getUsers({ page: 2, limit: 5 })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2&limit=5'),
        expect.any(Object)
      )
    })

    it('should handle filters', async () => {
      const mockResponse = {
        success: true,
        data: {
          users: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      await userService.getUsers(
        { page: 1, limit: 10 },
        { search: 'john', role: 'EMPLOYEE', isActive: true }
      )

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('search=john&role=EMPLOYEE&isActive=true'),
        expect.any(Object)
      )
    })

    it('should throw error on failed request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ success: false, message: 'Server error' }),
      })

      await expect(userService.getUsers()).rejects.toThrow('Erreur lors de la récupération des utilisateurs')
    })
  })

  describe('getUserById', () => {
    it('should fetch user by id successfully', async () => {
      const mockResponse = {
        success: true,
        data: mockUser
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await userService.getUserById('1')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/users/1'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`,
          }),
        })
      )
      expect(result).toEqual(mockUser)
    })

    it('should throw error when user not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ success: false, message: 'User not found' }),
      })

      await expect(userService.getUserById('nonexistent')).rejects.toThrow('Erreur lors de la récupération de l\'utilisateur')
    })
  })

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const createData: CreateUserData = {
        email: 'newuser@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        password: 'Password123!',
        role: 'EMPLOYEE',
        companyId: 'company-1'
      }

      const mockResponse = {
        success: true,
        data: { ...mockUser, ...createData, id: '2' }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await userService.createUser(createData)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/users'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`,
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(createData),
        })
      )
      expect(result.email).toBe(createData.email)
    })

    it('should throw error on validation failure', async () => {
      const invalidData: CreateUserData = {
        email: 'invalid-email',
        firstName: '',
        lastName: 'Smith',
        password: 'weak',
        role: 'EMPLOYEE',
        companyId: 'company-1'
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ success: false, message: 'Validation error' }),
      })

      await expect(userService.createUser(invalidData)).rejects.toThrow('Erreur lors de la création de l\'utilisateur')
    })
  })

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const updateData: UpdateUserData = {
        firstName: 'Updated',
        lastName: 'Name',
        email: 'updated@example.com'
      }

      const mockResponse = {
        success: true,
        data: { ...mockUser, ...updateData }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await userService.updateUser('1', updateData)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/users/1'),
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`,
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(updateData),
        })
      )
      expect(result.firstName).toBe('Updated')
    })
  })

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const passwordData: ChangePasswordData = {
        currentPassword: 'oldPassword',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!'
      }

      const mockResponse = {
        success: true,
        message: 'Mot de passe modifié avec succès'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      await userService.changePassword('1', passwordData)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/users/1/change-password'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`,
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(passwordData),
        })
      )
    })

    it('should throw error when passwords do not match', async () => {
      const passwordData: ChangePasswordData = {
        currentPassword: 'oldPassword',
        newPassword: 'NewPassword123!',
        confirmPassword: 'DifferentPassword123!'
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ success: false, message: 'Passwords do not match' }),
      })

      await expect(userService.changePassword('1', passwordData)).rejects.toThrow('Erreur lors du changement de mot de passe')
    })
  })

  describe('toggleStatus', () => {
    it('should toggle user status successfully', async () => {
      const mockResponse = {
        success: true,
        data: { ...mockUser, isActive: false }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await userService.toggleStatus('1', false)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/users/1/status'),
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`,
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ isActive: false }),
        })
      )
      expect(result.isActive).toBe(false)
    })
  })

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Utilisateur supprimé avec succès'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      await userService.deleteUser('1')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/users/1'),
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`,
          }),
        })
      )
    })
  })

  describe('getStats', () => {
    it('should fetch user statistics successfully', async () => {
      const mockStats = {
        total: 10,
        admins: 2,
        managers: 3,
        employees: 5,
        active: 8,
        inactive: 2
      }

      const mockResponse = {
        success: true,
        data: mockStats
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await userService.getStats()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/users/stats'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`,
          }),
        })
      )
      expect(result).toEqual(mockStats)
    })
  })

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(userService.getUsers()).rejects.toThrow('Erreur lors de la récupération des utilisateurs')
    })

    it('should handle missing token', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      await expect(userService.getUsers()).rejects.toThrow('Token d\'authentification manquant')
    })
  })
})
