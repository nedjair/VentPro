import { describe, expect, it, vi } from 'vitest'

import { UserService } from '../../services/UserService'

describe('UserService.getUsers', () => {
  it('maps the current local schema via raw SQL without crashing', async () => {
    const mockPrisma = {
      $queryRawUnsafe: vi.fn().mockResolvedValue([
        {
          id: 'user-1',
          email: 'admin@example.com',
          fullName: 'Admin User',
          role: 'admin',
          isActive: true,
          createdAt: new Date('2026-03-07T08:00:00.000Z'),
          updatedAt: new Date('2026-03-07T08:00:00.000Z'),
          __total: 1,
        },
      ]),
      user: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
    } as any

    const service = new UserService(mockPrisma)
    const result = await service.getUsers({}, { page: 1, limit: 10 })

    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled()
    expect(mockPrisma.user.findMany).not.toHaveBeenCalled()
    expect(result.pagination).toMatchObject({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    })
    expect(result.data[0]).toMatchObject({
      id: 'user-1',
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isActive: true,
    })
  })
})