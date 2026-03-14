# Dockerfile multi-stage pour le backend
# ──────────────────────────────────────
# Contexte de build : la RACINE du monorepo (défini dans docker-compose.yml)
# Pourquoi : pnpm a besoin de pnpm-workspace.yaml + tous les package.json
# du workspace pour résoudre les dépendances locales (@gestion/*).
FROM node:18-alpine AS base

# Installation des dépendances système
# - libc6-compat : compatibilité glibc pour certains binaires natifs (Prisma)
# - curl : utilisé par les health checks Docker
# - python3, make, g++ : nécessaires pour compiler bcrypt et autres modules natifs
RUN apk add --no-cache libc6-compat curl python3 make g++
WORKDIR /app

# Installation de pnpm (même version que packageManager dans package.json)
RUN npm install -g pnpm@8.15.0

# ── Copie des fichiers de configuration du workspace ──
# pnpm-workspace.yaml est INDISPENSABLE pour que pnpm comprenne
# qu'il s'agit d'un monorepo et résolve les packages locaux.
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
# .npmrc peut contenir des réglages pnpm spécifiques au projet
COPY .npmrc* ./

# ── Copie de TOUS les package.json du workspace ──
# pnpm doit connaître chaque package pour construire l'arbre de dépendances
COPY packages/shared/package.json packages/shared/
COPY packages/database/package.json packages/database/
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/

# Installation des dépendances
# --no-frozen-lockfile : tolère les écarts mineurs du lockfile
RUN pnpm install --no-frozen-lockfile

# ==========================
# Stage Development
# ==========================
FROM base AS development
WORKDIR /app

# On copie le code AVANT d'installer les dépendances pour éviter que pnpm
# ne crée des liens symboliques cassés.
COPY packages/ packages/
COPY apps/backend/ apps/backend/
COPY tsconfig.json ./

# On relance l'installation maintenant que le code complet est là
# Nettoyage des résidus Windows qui pourraient polluer le build Linux
RUN rm -rf apps/backend/prisma \
    && rm -rf apps/backend/node_modules \
    && rm -rf packages/database/node_modules \
    && rm -rf packages/database/generated \
    && rm -rf packages/shared/node_modules

# Invalidateur de cache: force la recopie compléte
RUN pnpm install --no-frozen-lockfile

# ⚠️ CORRECTION ULTIME DES WORKSPACES PNPM POUR DOCKER ⚠️
# Si pnpm ne crée pas les symlinks (à cause de packageImportMethod: copy), on les crée de force !
RUN rm -rf node_modules/@gestion/database && ln -s /app/packages/database node_modules/@gestion/database
RUN rm -rf node_modules/@gestion/shared && ln -s /app/packages/shared node_modules/@gestion/shared

# Génération du client Prisma AVANT le démarrage
RUN pnpm --filter "@gestion/database" exec prisma generate

# Variables d'environnement de développement
ENV NODE_ENV=development
ENV HOST=0.0.0.0
ENV PORT=3001

# Port exposé
EXPOSE 3001

# Commande de développement
CMD ["pnpm", "--filter", "@gestion/backend", "dev:skip-generate"]

# ==========================
# Stage Build
# ==========================
FROM base AS build
WORKDIR /app

# Copie du code source complet
COPY packages/ packages/
COPY apps/backend/ apps/backend/
COPY tsconfig.json ./

# Génération du client Prisma (nécessaire AVANT la compilation TypeScript)
# Pourquoi : le code backend importe @prisma/client qui est généré
# à partir du schema dans packages/database/schema.prisma
RUN pnpm --filter "@gestion/database" exec prisma generate

# Build des packages partagés dans l'ordre de dépendance
RUN pnpm --filter "@gestion/shared" build
RUN pnpm --filter "@gestion/database" build

# Build du backend (compilation TypeScript → dist/)
RUN pnpm --filter "@gestion/backend" build

# Nettoyage des devDependencies pour réduire la taille de l'image finale
RUN pnpm install --prod --no-frozen-lockfile

# ==========================
# Stage Production
# ==========================
FROM node:18-alpine AS production

# Installation des outils système nécessaires
RUN apk add --no-cache \
    libc6-compat \
    curl \
    dumb-init \
    && addgroup -g 1001 -S nodejs \
    && adduser -S backend -u 1001

WORKDIR /app

# Installation de pnpm
RUN npm install -g pnpm

# Copie des dépendances de production depuis le stage build
COPY --from=build --chown=backend:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=backend:nodejs /app/package.json ./package.json
COPY --from=build --chown=backend:nodejs /app/pnpm-lock.yaml ./pnpm-lock.yaml

# Copie du code buildé
COPY --from=build --chown=backend:nodejs /app/apps/backend/dist ./apps/backend/dist
COPY --from=build --chown=backend:nodejs /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=build --chown=backend:nodejs /app/packages ./packages

# Copie des fichiers Prisma
COPY --from=build --chown=backend:nodejs /app/packages/database/prisma ./packages/database/prisma

# Création des répertoires nécessaires
RUN mkdir -p /app/logs /app/uploads && \
    chown -R backend:nodejs /app/logs /app/uploads

# Variables d'environnement de production
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001

# Utilisateur non-root
USER backend

# Port exposé
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Commande de production avec dumb-init pour la gestion des signaux
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/backend/dist/index.js"]