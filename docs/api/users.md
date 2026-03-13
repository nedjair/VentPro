# API Documentation - Module Utilisateurs

## Vue d'ensemble

Le module utilisateurs fournit une API complète pour la gestion des utilisateurs dans l'application de gestion commerciale. Il inclut l'authentification, l'autorisation basée sur les rôles, et toutes les opérations CRUD pour les utilisateurs.

## Base URL

```
http://localhost:3001/api/users
```

## Authentification

Toutes les routes nécessitent un token JWT valide dans l'en-tête Authorization :

```
Authorization: Bearer <token>
```

## Rôles et Permissions

- **ADMIN** : Accès complet à toutes les fonctionnalités
- **MANAGER** : Peut gérer les employés de son entreprise
- **EMPLOYEE** : Accès en lecture seule à ses propres informations

## Endpoints

### 1. Récupérer la liste des utilisateurs

```http
GET /api/users
```

**Paramètres de requête :**
- `page` (optionnel) : Numéro de page (défaut: 1)
- `limit` (optionnel) : Nombre d'éléments par page (défaut: 10)
- `search` (optionnel) : Recherche par nom, prénom ou email
- `role` (optionnel) : Filtrer par rôle (ADMIN, MANAGER, EMPLOYEE)
- `isActive` (optionnel) : Filtrer par statut (true/false)
- `companyId` (optionnel) : Filtrer par entreprise

**Permissions :** ADMIN, MANAGER

**Réponse :**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "role": "EMPLOYEE",
        "isActive": true,
        "companyId": "company-uuid",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z",
        "lastLoginAt": "2024-01-02T00:00:00Z",
        "company": {
          "id": "company-uuid",
          "name": "Entreprise Test"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### 2. Récupérer un utilisateur par ID

```http
GET /api/users/:id
```

**Permissions :** ADMIN, MANAGER (même entreprise), utilisateur lui-même

**Réponse :**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "EMPLOYEE",
    "isActive": true,
    "companyId": "company-uuid",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "lastLoginAt": "2024-01-02T00:00:00Z",
    "company": {
      "id": "company-uuid",
      "name": "Entreprise Test"
    }
  }
}
```

### 3. Créer un nouvel utilisateur

```http
POST /api/users
```

**Permissions :** ADMIN, MANAGER (pour créer des employés)

**Corps de la requête :**
```json
{
  "email": "newuser@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "password": "Password123!",
  "role": "EMPLOYEE",
  "companyId": "company-uuid"
}
```

**Validation :**
- `email` : Format email valide, unique
- `firstName` : Requis, 2-50 caractères
- `lastName` : Requis, 2-50 caractères
- `password` : Minimum 8 caractères, au moins une majuscule, une minuscule et un chiffre
- `role` : ADMIN, MANAGER, ou EMPLOYEE
- `companyId` : UUID valide d'une entreprise existante

**Réponse :**
```json
{
  "success": true,
  "data": {
    "id": "new-uuid",
    "email": "newuser@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "EMPLOYEE",
    "isActive": true,
    "companyId": "company-uuid",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "company": {
      "id": "company-uuid",
      "name": "Entreprise Test"
    }
  }
}
```

### 4. Mettre à jour un utilisateur

```http
PUT /api/users/:id
```

**Permissions :** ADMIN, MANAGER (même entreprise), utilisateur lui-même (données limitées)

**Corps de la requête :**
```json
{
  "firstName": "Jane Updated",
  "lastName": "Smith Updated",
  "email": "updated@example.com",
  "role": "MANAGER"
}
```

**Note :** Les employés ne peuvent modifier que leurs `firstName`, `lastName` et `email`.

**Réponse :**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "updated@example.com",
    "firstName": "Jane Updated",
    "lastName": "Smith Updated",
    "role": "MANAGER",
    "isActive": true,
    "companyId": "company-uuid",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T12:00:00Z",
    "company": {
      "id": "company-uuid",
      "name": "Entreprise Test"
    }
  }
}
```

### 5. Changer le mot de passe

```http
POST /api/users/:id/change-password
```

**Permissions :** ADMIN, utilisateur lui-même

**Corps de la requête :**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!",
  "confirmPassword": "NewPassword123!"
}
```

**Validation :**
- `currentPassword` : Requis (sauf pour les admins changeant le mot de passe d'autres utilisateurs)
- `newPassword` : Même validation que lors de la création
- `confirmPassword` : Doit correspondre à `newPassword`

**Réponse :**
```json
{
  "success": true,
  "message": "Mot de passe modifié avec succès"
}
```

### 6. Activer/Désactiver un utilisateur

```http
PATCH /api/users/:id/status
```

**Permissions :** ADMIN, MANAGER (même entreprise)

**Corps de la requête :**
```json
{
  "isActive": false
}
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "EMPLOYEE",
    "isActive": false,
    "companyId": "company-uuid",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T12:00:00Z",
    "company": {
      "id": "company-uuid",
      "name": "Entreprise Test"
    }
  }
}
```

### 7. Supprimer un utilisateur

```http
DELETE /api/users/:id
```

**Permissions :** ADMIN uniquement

**Réponse :**
```json
{
  "success": true,
  "message": "Utilisateur supprimé avec succès"
}
```

### 8. Statistiques des utilisateurs

```http
GET /api/users/stats
```

**Permissions :** ADMIN, MANAGER

**Réponse :**
```json
{
  "success": true,
  "data": {
    "total": 50,
    "admins": 2,
    "managers": 8,
    "employees": 40,
    "active": 45,
    "inactive": 5
  }
}
```

## Codes d'erreur

- `400` : Données de requête invalides
- `401` : Token d'authentification manquant ou invalide
- `403` : Permissions insuffisantes
- `404` : Utilisateur non trouvé
- `409` : Conflit (ex: email déjà utilisé)
- `500` : Erreur serveur interne

## Exemples d'erreurs

```json
{
  "success": false,
  "message": "Format d'email invalide",
  "errors": [
    {
      "field": "email",
      "message": "L'email doit être au format valide"
    }
  ]
}
```

## Audit et Logs

Toutes les opérations sur les utilisateurs sont automatiquement enregistrées dans les logs d'audit avec :
- L'utilisateur qui effectue l'action
- Le type d'action (CREATE, UPDATE, DELETE, etc.)
- Les données avant/après modification
- L'horodatage de l'action
- L'adresse IP de l'utilisateur
