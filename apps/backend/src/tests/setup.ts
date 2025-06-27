/**
 * Configuration globale pour les tests Jest
 */

import { jest } from '@jest/globals'

// Configuration globale des timeouts
jest.setTimeout(10000)

// Mock des variables d'environnement pour les tests
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only'
process.env.JWT_EXPIRES_IN = '1h'
process.env.CORS_ORIGIN = 'http://localhost:3000'

// Mock console pour réduire le bruit dans les tests
const originalConsole = console
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Restaurer console après les tests si nécessaire
afterAll(() => {
  global.console = originalConsole
})

// Mock des modules externes si nécessaire
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    client: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    company: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  })),
}))

// Utilitaires de test
export const createMockClient = (overrides = {}) => ({
  id: 'test-client-id',
  type: 'INDIVIDUAL',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.dz',
  phone: '+213 555 123 456',
  city: 'Alger',
  country: 'Algérie',
  companyId: 'test-company-id',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const createMockCompany = (overrides = {}) => ({
  id: 'test-company-id',
  name: 'Test Company',
  city: 'Alger',
  country: 'Algérie',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'admin@test.com',
  firstName: 'Admin',
  lastName: 'User',
  role: 'ADMIN',
  companyId: 'test-company-id',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})
