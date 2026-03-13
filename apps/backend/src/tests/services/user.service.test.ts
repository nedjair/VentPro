import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { UserService } from '../../services/user.service'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

// Mock Prisma
const mockPrisma = {
  user: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
} as unknown as PrismaClient

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}))

describe('UserService', () => {
  let userService: UserService

  beforeEach(() => {
    userService = new UserService(mockPrisma)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('getUsers', () => {
    it('should return paginated users with default parameters', async () => {
      const mockUsers = [
        {
          id: '1',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'EMPLOYEE',
          isActive: true,
          companyId: 'company1',
          createdAt: new Date(),
          updatedAt: new Date(),
          company: { id: 'company1', name: 'Test Company' }
        }
      ]

      mockPrisma.user.findMany.mockResolvedValue(mockUsers)
      mockPrisma.user.count.mockResolvedValue(1)

      const result = await userService.getUsers()

      expect(result.users).toEqual(mockUsers)
      expect(result.pagination.total).toBe(1)
      expect(result.pagination.page).toBe(1)
      expect(result.pagination.limit).toBe(10)
    })

    it('should apply search filter correctly', async () => {
      const searchTerm = 'john'
      await userService.getUsers({ page: 1, limit: 10 }, { search: searchTerm })

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { firstName: { contains: searchTerm, mode: 'insensitive' } },
              { lastName: { contains: searchTerm, mode: 'insensitive' } },
              { email: { contains: searchTerm, mode: 'insensitive' } }
            ])
          })
        })
      )
    })

    it('should apply role filter correctly', async () => {
      await userService.getUsers({ page: 1, limit: 10 }, { role: 'ADMIN' })

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: 'ADMIN'
          })
        })
      )
    })

    it('should apply status filter correctly', async () => {
      await userService.getUsers({ page: 1, limit: 10 }, { isActive: true })

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true
          })
        })
      )
    })
  })

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'EMPLOYEE',
        isActive: true,
        companyId: 'company1',
        createdAt: new Date(),
        updatedAt: new Date(),
        company: { id: 'company1', name: 'Test Company' }
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      const result = await userService.getUserById('1')

      expect(result).toEqual(mockUser)
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: { company: true }
      })
    })

    it('should return null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await userService.getUserById('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('createUser', () => {
    it('should create user with hashed password', async () => {
      const userData = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'Password123!',
        role: 'EMPLOYEE' as const,
        companyId: 'company1'
      }

      const hashedPassword = 'hashedPassword123'
      const mockCreatedUser = {
        id: '1',
        ...userData,
        passwordHash: hashedPassword,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        company: { id: 'company1', name: 'Test Company' }
      }

      vi.mocked(bcrypt.hash).mockResolvedValue(hashedPassword as never)
      mockPrisma.user.create.mockResolvedValue(mockCreatedUser)

      const result = await userService.createUser(userData)

      expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 12)
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          ...userData,
          passwordHash: hashedPassword,
          isActive: true
        },
        include: { company: true }
      })
      expect(result).toEqual(mockCreatedUser)
    })

    it('should throw error for invalid email format', async () => {
      const userData = {
        email: 'invalid-email',
        firstName: 'John',
        lastName: 'Doe',
        password: 'Password123!',
        role: 'EMPLOYEE' as const,
        companyId: 'company1'
      }

      await expect(userService.createUser(userData)).rejects.toThrow('Format d\'email invalide')
    })

    it('should throw error for weak password', async () => {
      const userData = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'weak',
        role: 'EMPLOYEE' as const,
        companyId: 'company1'
      }

      await expect(userService.createUser(userData)).rejects.toThrow('Le mot de passe doit contenir au moins 8 caractères')
    })
  })

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com'
      }

      const mockUpdatedUser = {
        id: '1',
        ...updateData,
        role: 'EMPLOYEE',
        isActive: true,
        companyId: 'company1',
        createdAt: new Date(),
        updatedAt: new Date(),
        company: { id: 'company1', name: 'Test Company' }
      }

      mockPrisma.user.update.mockResolvedValue(mockUpdatedUser)

      const result = await userService.updateUser('1', updateData)

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateData,
        include: { company: true }
      })
      expect(result).toEqual(mockUpdatedUser)
    })

    it('should throw error for invalid email format in update', async () => {
      const updateData = {
        email: 'invalid-email'
      }

      await expect(userService.updateUser('1', updateData)).rejects.toThrow('Format d\'email invalide')
    })
  })

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const mockUser = {
        id: '1',
        password: 'oldHashedPassword',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'EMPLOYEE',
        isActive: true,
        companyId: 'company1',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const passwordData = {
        currentPassword: 'oldPassword',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!'
      }

      const newHashedPassword = 'newHashedPassword'

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never)
      vi.mocked(bcrypt.hash).mockResolvedValue(newHashedPassword as never)
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, password: newHashedPassword })

      await userService.changePassword('1', passwordData)

      expect(bcrypt.compare).toHaveBeenCalledWith('oldPassword', 'oldHashedPassword')
      expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword123!', 12)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { password: newHashedPassword }
      })
    })

    it('should throw error for incorrect current password', async () => {
      const mockUser = {
        id: '1',
        password: 'oldHashedPassword',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'EMPLOYEE',
        isActive: true,
        companyId: 'company1',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const passwordData = {
        currentPassword: 'wrongPassword',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!'
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never)

      await expect(userService.changePassword('1', passwordData)).rejects.toThrow('Mot de passe actuel incorrect')
    })

    it('should throw error when passwords do not match', async () => {
      const passwordData = {
        currentPassword: 'oldPassword',
        newPassword: 'NewPassword123!',
        confirmPassword: 'DifferentPassword123!'
      }

      await expect(userService.changePassword('1', passwordData)).rejects.toThrow('Les mots de passe ne correspondent pas')
    })
  })

  describe('toggleUserStatus', () => {
    it('should toggle user status successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'EMPLOYEE',
        isActive: true,
        companyId: 'company1',
        createdAt: new Date(),
        updatedAt: new Date(),
        company: { id: 'company1', name: 'Test Company' }
      }

      mockPrisma.user.update.mockResolvedValue({ ...mockUser, isActive: false })

      const result = await userService.toggleUserStatus('1', false)

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isActive: false },
        include: { company: true }
      })
      expect(result.isActive).toBe(false)
    })
  })

  describe('hardDeleteUser', () => {
    it('should delete user successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'EMPLOYEE',
        isActive: true,
        companyId: 'company1',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.user.delete.mockResolvedValue(mockUser)

      await userService.hardDeleteUser('1')

      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: '1' }
      })
    })
  })
})
