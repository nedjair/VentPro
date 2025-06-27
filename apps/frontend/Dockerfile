# Dockerfile multi-stage pour le frontend NextJS
FROM node:18-alpine AS base

# Installation des outils système essentiels
RUN apk add --no-cache libc6-compat curl
WORKDIR /app

# Installation de pnpm
RUN npm install -g pnpm

# Copie des fichiers de configuration
COPY package.json pnpm-lock.yaml* ./
COPY apps/frontend/package.json apps/frontend/

# Installation des dépendances
RUN pnpm install --no-frozen-lockfile

# ==========================
# Stage Development
# ==========================
FROM base AS development
WORKDIR /app

# Copie du code source
COPY apps/frontend/ apps/frontend/

# Variables d'environnement de développement
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

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
COPY apps/frontend/ apps/frontend/

# Variables d'environnement pour le build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build NextJS
RUN cd apps/frontend && pnpm build

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