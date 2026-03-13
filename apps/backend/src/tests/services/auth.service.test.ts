import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPrisma, mockLogger, mockBcrypt } = vi.hoisted(() => ({
  mockPrisma: {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
  mockLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  mockBcrypt: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}))

vi.mock('../../lib/database', () => ({
  prisma: mockPrisma,
}))

vi.mock('../../utils/logger', () => ({
  logger: mockLogger,
}))

vi.mock('bcryptjs', () => ({
  default: mockBcrypt,
}))

import { AuthService } from '../../services/auth.service'

describe('AuthService.login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('skips the legacy users fallback when the legacy table is absent', async () => {
    const authService = new AuthService()

    // 1) Requête schéma actuel : aucun utilisateur trouvé.
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([])
      // 2) Vérification information_schema : pas de table public.users.
      .mockResolvedValueOnce([{ exists: false }])

    const result = await authService.login({
      email: 'missing@example.com',
      password: 'secret',
    })

    expect(result).toBeNull()
    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(2)
    expect(mockLogger.warn).toHaveBeenCalledWith('Utilisateur non trouvé: missing@example.com')
  })

  it('keeps the legacy fallback available when the legacy table exists', async () => {
    const authService = new AuthService()

    mockPrisma.$queryRaw
      // 1) Schéma actuel : aucun utilisateur trouvé.
      .mockResolvedValueOnce([])
      // 2) La table legacy existe.
      .mockResolvedValueOnce([{ exists: true }])
      // 3) Le fallback legacy retrouve un utilisateur.
      .mockResolvedValueOnce([{
        id: 'legacy-user-1',
        email: 'legacy@example.com',
        passwordHash: 'hashed-password',
        firstName: 'Legacy',
        lastName: 'User',
        role: 'admin',
        companyId: null,
      }])

    mockBcrypt.compare.mockResolvedValue(true)

    const result = await authService.login({
      email: 'legacy@example.com',
      password: 'secret',
    })

    expect(result).toMatchObject({
      id: 'legacy-user-1',
      email: 'legacy@example.com',
      firstName: 'Legacy',
      lastName: 'User',
      role: 'admin',
      companyId: null,
    })
    expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1)
  })
})