# Guide de Tests - Module Fournisseurs

## 🎯 Vue d'ensemble

Ce guide présente les tests recommandés pour le module Fournisseurs de l'application de gestion commerciale.

## 🧪 Tests Backend (API)

### Tests Unitaires - Service Fournisseurs

```typescript
// apps/backend/src/services/__tests__/suppliers.service.test.ts

import { SuppliersService } from '../suppliers.service'
import { prisma } from '../../lib/database'

describe('SuppliersService', () => {
  let service: SuppliersService
  
  beforeEach(() => {
    service = new SuppliersService()
  })

  describe('getSuppliers', () => {
    it('should return paginated suppliers', async () => {
      // Test de pagination
    })
    
    it('should filter suppliers by search term', async () => {
      // Test de recherche
    })
    
    it('should filter suppliers by type', async () => {
      // Test de filtrage par type
    })
  })

  describe('createSupplier', () => {
    it('should create a new supplier with valid data', async () => {
      // Test de création valide
    })
    
    it('should reject duplicate SIRET', async () => {
      // Test d'unicité SIRET
    })
    
    it('should reject duplicate email', async () => {
      // Test d'unicité email
    })
  })

  describe('updateSupplier', () => {
    it('should update supplier data', async () => {
      // Test de mise à jour
    })
    
    it('should reject invalid supplier ID', async () => {
      // Test ID invalide
    })
  })

  describe('deleteSupplier', () => {
    it('should delete supplier without products', async () => {
      // Test de suppression
    })
    
    it('should reject deletion of supplier with products', async () => {
      // Test de protection
    })
  })
})
```

### Tests d'Intégration - Routes API

```typescript
// apps/backend/src/routes/__tests__/suppliers.test.ts

import { createServer } from '../../server'
import { FastifyInstance } from 'fastify'

describe('Suppliers Routes', () => {
  let server: FastifyInstance
  let authToken: string

  beforeAll(async () => {
    server = await createServer()
    // Authentification pour les tests
  })

  afterAll(async () => {
    await server.close()
  })

  describe('GET /api/v1/suppliers', () => {
    it('should return suppliers list', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/suppliers',
        headers: { authorization: `Bearer ${authToken}` }
      })
      
      expect(response.statusCode).toBe(200)
      expect(response.json().success).toBe(true)
    })
  })

  describe('POST /api/v1/suppliers', () => {
    it('should create a new supplier', async () => {
      const supplierData = {
        name: 'Test Supplier',
        type: 'COMPANY',
        email: 'test@supplier.com'
      }
      
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/suppliers',
        headers: { authorization: `Bearer ${authToken}` },
        payload: supplierData
      })
      
      expect(response.statusCode).toBe(201)
      expect(response.json().success).toBe(true)
    })
  })
})
```

## 🎨 Tests Frontend (React)

### Tests Unitaires - Composants

```typescript
// apps/frontend/src/components/pages/__tests__/suppliers.test.tsx

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SuppliersPage } from '../suppliers'
import { api } from '../../../lib/api'

// Mock de l'API
jest.mock('../../../lib/api')
const mockApi = api as jest.Mocked<typeof api>

describe('SuppliersPage', () => {
  beforeEach(() => {
    mockApi.get.mockClear()
  })

  it('should render suppliers list', async () => {
    const mockSuppliers = [
      {
        id: '1',
        name: 'Test Supplier',
        type: 'COMPANY',
        isActive: true,
        isPreferred: false
      }
    ]

    mockApi.get.mockResolvedValue({
      success: true,
      data: { data: mockSuppliers }
    })

    render(<SuppliersPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Supplier')).toBeInTheDocument()
    })
  })

  it('should filter suppliers by search term', async () => {
    // Test de recherche
  })

  it('should handle create supplier action', async () => {
    // Test de création
  })
})
```

### Tests d'Intégration - Formulaires

```typescript
// apps/frontend/src/components/pages/suppliers/__tests__/supplier-form.test.tsx

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SupplierFormPage } from '../supplier-form'

describe('SupplierFormPage', () => {
  it('should validate required fields', async () => {
    render(<SupplierFormPage mode="create" />)
    
    const submitButton = screen.getByText('Sauvegarder')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Le nom du fournisseur est requis')).toBeInTheDocument()
    })
  })

  it('should validate email format', async () => {
    // Test de validation email
  })

  it('should submit form with valid data', async () => {
    // Test de soumission
  })
})
```

## 🔗 Tests d'Intégration

### Test de l'intégration Produits-Fournisseurs

```typescript
// apps/frontend/src/components/pages/products/__tests__/product-supplier-integration.test.tsx

describe('Product-Supplier Integration', () => {
  it('should load suppliers in product form', async () => {
    // Test du chargement des fournisseurs dans le formulaire produit
  })

  it('should save product with supplier', async () => {
    // Test de sauvegarde produit avec fournisseur
  })
})
```

## 🚀 Tests End-to-End (E2E)

### Cypress Tests

```typescript
// cypress/e2e/suppliers.cy.ts

describe('Suppliers Module', () => {
  beforeEach(() => {
    cy.login() // Commande personnalisée pour l'authentification
  })

  it('should create, edit and delete a supplier', () => {
    // Navigation vers les fournisseurs
    cy.visit('/suppliers')
    cy.contains('Fournisseurs').should('be.visible')

    // Création d'un fournisseur
    cy.contains('Nouveau fournisseur').click()
    cy.get('[data-testid="supplier-name"]').type('Test E2E Supplier')
    cy.get('[data-testid="supplier-email"]').type('e2e@test.com')
    cy.contains('Sauvegarder').click()

    // Vérification de la création
    cy.contains('Test E2E Supplier').should('be.visible')

    // Modification
    cy.get('[data-testid="edit-supplier"]').first().click()
    cy.get('[data-testid="supplier-name"]').clear().type('Test E2E Supplier - Modifié')
    cy.contains('Sauvegarder').click()

    // Suppression
    cy.get('[data-testid="delete-supplier"]').first().click()
    cy.contains('Confirmer').click()
    cy.contains('Test E2E Supplier - Modifié').should('not.exist')
  })

  it('should integrate with products', () => {
    // Test d'intégration avec les produits
    cy.visit('/products/new')
    cy.get('[data-testid="supplier-select"]').should('be.visible')
    // ... autres tests d'intégration
  })
})
```

## 📊 Tests de Performance

### Test de charge des API

```javascript
// k6-load-test.js

import http from 'k6/http'
import { check } from 'k6'

export let options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 }
  ]
}

export default function() {
  const response = http.get('http://localhost:3001/api/v1/suppliers', {
    headers: { Authorization: 'Bearer YOUR_TOKEN' }
  })
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500
  })
}
```

## 🛡️ Tests de Sécurité

### Tests d'authentification et d'autorisation

```typescript
describe('Security Tests', () => {
  it('should reject unauthenticated requests', async () => {
    const response = await request(app)
      .get('/api/v1/suppliers')
      .expect(401)
  })

  it('should validate input data', async () => {
    const maliciousData = {
      name: '<script>alert("xss")</script>',
      email: 'not-an-email'
    }
    
    const response = await request(app)
      .post('/api/v1/suppliers')
      .set('Authorization', `Bearer ${token}`)
      .send(maliciousData)
      .expect(400)
  })
})
```

## 🎯 Couverture de Tests Recommandée

- **Backend**: 90%+ de couverture de code
- **Frontend**: 80%+ de couverture des composants
- **E2E**: Couverture des parcours utilisateur critiques

## 🚀 Commandes de Test

```bash
# Tests backend
cd apps/backend
npm test
npm run test:coverage

# Tests frontend
cd apps/frontend
npm test
npm run test:coverage

# Tests E2E
npm run cypress:run

# Tests de charge
k6 run k6-load-test.js

# Test d'intégration complet
node test-suppliers-module.js
```

## 📝 Checklist de Tests

### Avant la mise en production

- [ ] Tous les tests unitaires passent
- [ ] Tests d'intégration validés
- [ ] Tests E2E exécutés avec succès
- [ ] Tests de performance satisfaisants
- [ ] Tests de sécurité validés
- [ ] Couverture de code suffisante
- [ ] Tests manuels effectués
- [ ] Documentation à jour

### Tests de régression

- [ ] Fonctionnalités existantes non impactées
- [ ] Intégration avec les autres modules
- [ ] Performance globale maintenue
- [ ] Sécurité non compromise
