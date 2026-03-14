# Plan d'Analyse Docker - Gestion Commerciale

## Résumé de l'Analyse

### Fichiers Analysés

1. **docker-compose.yml** - Configuration principale (développement)
2. **docker-compose.prod.yml** - Configuration production
3. **docker-compose-db-only.yml** - Base de données uniquement
4. **apps/backend/Dockerfile** - Backend Fastify
5. **apps/frontend/Dockerfile** - Frontend Next.js
6. **packages/shared/package.json** - Package partagé
7. **packages/database/package.json** - Package base de données
8. **.dockerignore** - Fichiers exclus du build

---

## Problèmes Identifiés

### 🔴 Problème 1: Chemins de fichiers incorrects dans le Dockerfile backend

**Localisation:** `apps/backend/Dockerfile` lignes 16-18

**Problème:**
```dockerfile
COPY packages/shared/ packages/shared/
COPY packages/database/ packages/database/
COPY apps/backend/package.json apps/backend/
```

Ces chemins sont relatifs au contexte de build défini dans docker-compose.yml:
```yaml
build:
  context: .
  dockerfile: apps/backend/Dockerfile
```

Le contexte Docker est la racine du projet, donc les chemins devraient fonctionner. Cependant, il y a un problème potentiel avec la copie du package.json.

**Solution:** Vérifier que tous les fichiers nécessaires sont copiés dans le bon ordre.

---

### 🔴 Problème 2: Génération Prisma dans le Dockerfile

**Localisation:** `apps/backend/Dockerfile` ligne 32

**Problème:**
```dockerfile
RUN pnpm --filter "@gestion/backend" prisma:generate
```

Le schéma Prisma est dans `packages/database/schema.prisma`, pas dans `apps/backend/`. Le script `prisma:generate` dans backend/package.json pointe vers:
```json
"prisma:generate": "prisma generate --schema=../../packages/database/schema.prisma"
```

Cela devrait fonctionner si le fichier schema.prisma est correctement copié.

**Risque potentiel:** Le fichier schema.prisma ou le client généré pourrait ne pas être trouvé.

---

### 🟡 Problème 3: Variables d'environnement manquantes

**Localisation:** `docker-compose.yml`

**Problème:** Le fichier docker-compose.yml utilise des variables d'environnement qui doivent être définies:
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `REDIS_PASSWORD`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`

Ces variables ne sont pas définies par défaut et le fichier `.env` n'est pas créé automatiquement.

**Solution:** Créer un fichier `.env` avec les valeurs par défaut ou modifier docker-compose.yml pour avoir des valeurs par défaut.

---

### 🟡 Problème 4: Le healthcheck du backend

**Localisation:** `docker-compose.yml` ligne 150

**Problème:** Le healthcheck utilise `/health` mais nous devons vérifier que cette route existe dans le backend.

---

### 🟢 Problème 5: Configuration pnpm dans Docker

**Observation:** Le projet utilise pnpm avec des configurations spécifiques pour Windows dans `pnpm-workspace.yaml`:
- `nodeLinker: hoisted`
- `symlink: false`
- `packageImportMethod: copy`

Ces paramètres sont nécessaires pour Windows mais peuvent causer des problèmes dans Docker. Le Dockerfile installe pnpm globalement avec `npm install -g pnpm`.

**Vérification nécessaire:** Les installations dans Docker devraient fonctionner correctement.

---

## Solutions Proposées

### Solution 1: Créer un fichier .env pour Docker

Créer un fichier `.env` avec les valeurs par défaut pour le développement Docker.

### Solution 2: Vérifier et corriger les Dockerfiles

- S'assurer que tous les fichiers nécessaires sont copiés
- Vérifier l'ordre des opérations de build
- Tester la génération Prisma

### Solution 3: Tester le build

Exécuter les commandes de build pour vérifier que tout fonctionne.

---

## Ordre d'Exécution Suggéré

1. Créer le fichier `.env` avec les variables nécessaires
2. Exécuter `docker-compose build` pour tester le build des images
3. Si des erreurs, analyser et corriger
4. Exécuter `docker-compose up -d` pour démarrer les conteneurs
5. Vérifier les logs et la santé des services

---

## Commandes à Exécuter

```bash
# Créer le fichier .env
cp .env.example .env

# Build des images
docker-compose build

# Démarrer les services
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter les services
docker-compose down
```
