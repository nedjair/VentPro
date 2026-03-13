/**
 * Configuration globale pour les tests Vitest du frontend.
 */

import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'

// Mock des variables d'environnement pour les tests
process.env.NODE_ENV = 'test'
delete process.env.NEXT_PUBLIC_API_URL
delete process.env.NEXT_PUBLIC_API_BASE_URL

// Mock de Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/test-path',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock de localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock de sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
})

// Mock de window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
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
vi.stubGlobal('fetch', vi.fn())

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
  vi.clearAllMocks()
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()
  sessionStorageMock.getItem.mockClear()
  sessionStorageMock.setItem.mockClear()
  sessionStorageMock.removeItem.mockClear()
  sessionStorageMock.clear.mockClear()
})
