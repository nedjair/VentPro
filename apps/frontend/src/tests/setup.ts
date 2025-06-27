/**
 * Configuration globale pour les tests Jest du frontend
 */

import '@testing-library/jest-dom'
import { jest } from '@jest/globals'

// Configuration globale des timeouts
jest.setTimeout(10000)

// Mock des variables d'environnement pour les tests
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001'

// Mock de Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/test-path',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock de localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock de sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
})

// Mock de window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock de IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null
  }
  disconnect() {
    return null
  }
  unobserve() {
    return null
  }
}

// Mock de ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null
  }
  disconnect() {
    return null
  }
  unobserve() {
    return null
  }
}

// Mock de fetch pour les tests
global.fetch = jest.fn()

// Utilitaires de test
export const createMockClient = (overrides = {}) => ({
  id: 'test-client-id',
  type: 'INDIVIDUAL' as const,
  firstName: 'Ahmed',
  lastName: 'Benali',
  email: 'ahmed@example.dz',
  phone: '+213 555 123 456',
  city: 'Alger',
  country: 'Algérie',
  createdAt: '2025-06-22T10:00:00Z',
  updatedAt: '2025-06-22T10:00:00Z',
  ...overrides,
})

export const createMockProduct = (overrides = {}) => ({
  id: 'test-product-id',
  name: 'Produit Test',
  reference: 'REF-001',
  price: 1500.00,
  category: 'Électronique',
  stock: 10,
  minStock: 5,
  trackStock: true,
  unit: 'pièce',
  createdAt: '2025-06-22T10:00:00Z',
  updatedAt: '2025-06-22T10:00:00Z',
  ...overrides,
})

export const createMockApiResponse = (data: any, success = true) => ({
  success,
  data,
  message: success ? 'Opération réussie' : 'Erreur',
  timestamp: new Date().toISOString(),
})

export const mockApiCall = (response: any, delay = 0) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(response), delay)
  })
}

// Helper pour nettoyer les mocks après chaque test
afterEach(() => {
  jest.clearAllMocks()
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()
  sessionStorageMock.getItem.mockClear()
  sessionStorageMock.setItem.mockClear()
  sessionStorageMock.removeItem.mockClear()
  sessionStorageMock.clear.mockClear()
})
