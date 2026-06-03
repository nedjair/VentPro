# Dockerfile multi-stage pour le frontend NextJS
# ────────────────────────────────────────────────
# Contexte de build : la RACINE du monorepo (défini dans docker-compose.yml)
# Pourquoi : pnpm a besoin de pnpm-workspace.yaml + tous les package.json
# du workspace pour résoudre correctement l'arbre de dépendances.
FROM node:18-alpine AS base

# Installation des outils système essentiels
# - libc6-compat : compatibilité glibc pour certains binaires natifs
# - curl : utilisé par les health checks Docker
# - python3, make, g++ : nécessaires pour compiler des modules natifs (ex: bcrypt)
RUN apk add --no-cache libc6-compat curl python3 make g++
WORKDIR /app

# Installation de pnpm (même version que packageManager dans package.json racine)
RUN npm install -g pnpm@8.15.0

# ── Copie des fichiers de configuration du workspace ──
# pnpm-workspace.yaml est INDISPENSABLE pour que pnpm comprenne
# qu'il s'agit d'un monorepo et résolve les packages locaux.
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
# .npmrc peut contenir des réglages pnpm spécifiques au projet
COPY .npmrc* ./

# ── Copie de TOUS les package.json du workspace ──
# Même si le frontend n'importe pas @gestion/database directement,
# pnpm a besoin de tous les package.json pour construire l'arbre complet.
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

# Copie du code source complet
COPY packages/ packages/
COPY apps/frontend/ apps/frontend/
COPY tsconfig.json ./

# On relance l'installation maintenant que le code complet est là
# Nettoyage des résidus Windows
RUN rm -rf apps/frontend/.next \
    && rm -rf apps/frontend/node_modules \
    && rm -rf packages/database/node_modules \
    && rm -rf packages/database/generated \
    && rm -rf packages/shared/node_modules

# Invalidateur de cache pour forcer la copie complète
RUN pnpm install --no-frozen-lockfile

# ⚠️ CORRECTION ULTIME DES WORKSPACES PNPM POUR DOCKER ⚠️
RUN rm -rf node_modules/@gestion/database && ln -s /app/packages/database node_modules/@gestion/database
RUN rm -rf node_modules/@gestion/shared && ln -s /app/packages/shared node_modules/@gestion/shared

# Variables d'environnement de développement
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV INTERNAL_API_BASE_URL=http://backend:3001

# Port exposé
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# Commande de développement
CMD ["pnpm", "--filter", "@gestion/frontend", "dev"]

# ==========================
# Stage Build
# ==========================
FROM base AS build
WORKDIR /app

# Copie du code source complet
COPY packages/ packages/
COPY apps/frontend/ apps/frontend/
COPY tsconfig.json ./

# Build des dépendances partagées
RUN pnpm --filter "@gestion/shared" build

# Variables d'environnement pour le build
ARG INTERNAL_API_BASE_URL=http://backend:3001
ARG NEXT_PUBLIC_API_BASE_URL
ENV INTERNAL_API_BASE_URL=$INTERNAL_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build NextJS
RUN pnpm --filter "@gestion/frontend" build

# ==========================
# Stage Production
# ==========================
FROM node:18-alpine AS production

# Installation des outils nécessaires
RUN apk add --no-cache libc6-compat curl
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

WORKDIR /app

# Copie des fichiers NextJS buildés
COPY --from=build --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/frontend/public ./apps/frontend/public

# Variables d'environnement de production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV INTERNAL_API_BASE_URL=http://localhost:3001
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

USER nextjs

# Port exposé
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# Commande de production
CMD ["node", "apps/frontend/server.js"]