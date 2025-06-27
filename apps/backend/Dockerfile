# Dockerfile multi-stage pour le backend
FROM node:18-alpine AS base

# Installation des dépendances système
RUN apk add --no-cache libc6-compat curl
WORKDIR /app

# Installation des dépendances pnpm
RUN npm install -g pnpm

# Copie des fichiers de package
COPY package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY packages/database/package.json packages/database/
COPY apps/backend/package.json apps/backend/

# Installation des dépendances
RUN pnpm install --no-frozen-lockfile

# ==========================
# Stage Development
# ==========================
FROM base AS development
WORKDIR /app

# Copie du code source
COPY packages/ packages/
COPY apps/backend/ apps/backend/

# Variables d'environnement de développement
ENV NODE_ENV=development
ENV HOST=0.0.0.0
ENV PORT=3001

# Port exposé
EXPOSE 3001

# Commande de développement
CMD ["pnpm", "--filter", "backend", "dev"]

# ==========================
# Stage Build
# ==========================
FROM base AS build
WORKDIR /app

# Copie du code source
COPY packages/ packages/
COPY apps/backend/ apps/backend/
COPY tsconfig.json ./

# Build des packages partagés
RUN pnpm --filter "@gestion/shared" build
RUN pnpm --filter "@gestion/database" build

# Build du backend
RUN pnpm --filter "backend" build

# Nettoyage des dev dependencies
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