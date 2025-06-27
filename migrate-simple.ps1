# Script de migration simple vers Docker Production
param(
    [switch]$Force = $false
)

Write-Host "🚀 Migration simple vers Docker Production" -ForegroundColor Green
Write-Host "=" * 50

$ErrorActionPreference = "Stop"
$ProjectRoot = "d:/Gestion Commerciale"

try {
    Set-Location $ProjectRoot

    # 1. Création de la structure apps/
    Write-Host "📁 Création de la structure apps/..." -ForegroundColor Yellow
    
    $appsDirs = @(
        "apps/frontend/src",
        "apps/backend/src"
    )
    
    foreach ($dir in $appsDirs) {
        if (-not (Test-Path $dir)) {
            New-Item -Path $dir -ItemType Directory -Force | Out-Null
            Write-Host "  ✅ Créé: $dir" -ForegroundColor Green
        }
    }

    # 2. Migration du Frontend
    Write-Host "🌐 Migration du Frontend..." -ForegroundColor Yellow
    
    if (Test-Path "frontend-nextjs-production") {
        # Copier le code source
        if (Test-Path "frontend-nextjs-production/src") {
            Copy-Item -Path "frontend-nextjs-production/src" -Destination "apps/frontend/" -Recurse -Force
            Write-Host "  ✅ Code source copié" -ForegroundColor Green
        }
        
        # Copier les fichiers de config
        $frontendFiles = @("package.json", "next.config.mjs", "tailwind.config.ts", "tsconfig.json")
        foreach ($file in $frontendFiles) {
            if (Test-Path "frontend-nextjs-production/$file") {
                Copy-Item -Path "frontend-nextjs-production/$file" -Destination "apps/frontend/" -Force
                Write-Host "  ✅ Copié: $file" -ForegroundColor Green
            }
        }
        
        # Créer le Dockerfile du frontend
        $frontendDockerfile = @'
FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat curl
WORKDIR /app
RUN npm install -g pnpm

FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY apps/frontend/package.json apps/frontend/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY apps/frontend/ apps/frontend/

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN cd apps/frontend && pnpm build

FROM base AS production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/public ./apps/frontend/public

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

CMD ["node", "apps/frontend/server.js"]
'@
        Set-Content -Path "apps/frontend/Dockerfile" -Value $frontendDockerfile
        Write-Host "  ✅ Dockerfile frontend créé" -ForegroundColor Green
        
        # Adapter le next.config.mjs
        $nextConfig = @'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  output: 'standalone',
  
  images: {
    unoptimized: true,
  },

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
'@
        Set-Content -Path "apps/frontend/next.config.mjs" -Value $nextConfig
        Write-Host "  ✅ next.config.mjs adapté" -ForegroundColor Green
        
        # Adapter le package.json
        if (Test-Path "apps/frontend/package.json") {
            $pkg = Get-Content "apps/frontend/package.json" -Raw | ConvertFrom-Json
            $pkg.name = "@gestion/frontend"
            $pkg.scripts.dev = "next dev -p 3000"
            $pkg.scripts.start = "next start -p 3000"
            $pkg | ConvertTo-Json -Depth 10 | Set-Content "apps/frontend/package.json"
            Write-Host "  ✅ package.json adapté" -ForegroundColor Green
        }
    }

    # 3. Migration du Backend
    Write-Host "⚙️ Migration du Backend..." -ForegroundColor Yellow
    
    # Créer la structure backend
    $backendDirs = @("src/routes", "src/middleware", "src/services", "src/utils")
    foreach ($dir in $backendDirs) {
        if (-not (Test-Path "apps/backend/$dir")) {
            New-Item -Path "apps/backend/$dir" -ItemType Directory -Force | Out-Null
        }
    }
    
    # Créer le package.json du backend
    $backendPkg = @{
        name = "@gestion/backend"
        version = "1.0.0"
        description = "API Backend pour l'application de gestion commerciale"
        private = $true
        type = "module"
        main = "dist/index.js"
        scripts = @{
            dev = "tsx watch src/index.ts"
            build = "tsc"
            start = "node dist/index.js"
            test = "jest"
        }
        dependencies = @{
            fastify = "^4.28.1"
            "@fastify/cors" = "^9.0.1"
            "@fastify/swagger" = "^8.14.0"
            "@fastify/swagger-ui" = "^4.0.0"
            bcrypt = "^5.1.1"
            pg = "^8.12.0"
            redis = "^4.6.14"
            jsonwebtoken = "^9.0.2"
            dotenv = "^16.4.5"
        }
        devDependencies = @{
            "@types/node" = "^20.14.0"
            "@types/bcrypt" = "^5.0.2"
            "@types/pg" = "^8.11.6"
            "@types/jsonwebtoken" = "^9.0.6"
            typescript = "^5.4.5"
            tsx = "^4.15.0"
        }
    }
    
    $backendPkg | ConvertTo-Json -Depth 10 | Set-Content "apps/backend/package.json"
    Write-Host "  ✅ package.json backend créé" -ForegroundColor Green
    
    # Créer un index.ts de base
    $backendIndex = @'
import Fastify from 'fastify';

const fastify = Fastify({
  logger: true
});

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// CORS
await fastify.register(import('@fastify/cors'), {
  origin: true,
  credentials: true
});

// Health check
fastify.get('/health', async (request, reply) => {
  return { 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  };
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log('Server started on http://' + HOST + ':' + PORT);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
'@
    Set-Content -Path "apps/backend/src/index.ts" -Value $backendIndex
    Write-Host "  ✅ index.ts backend créé" -ForegroundColor Green
    
    # Créer tsconfig.json
    $tsConfig = @{
        compilerOptions = @{
            target = "ES2022"
            module = "ESNext"
            moduleResolution = "node"
            esModuleInterop = $true
            allowSyntheticDefaultImports = $true
            strict = $true
            skipLibCheck = $true
            outDir = "./dist"
            rootDir = "./src"
        }
        include = @("src/**/*")
        exclude = @("node_modules", "dist")
    }
    
    $tsConfig | ConvertTo-Json -Depth 10 | Set-Content "apps/backend/tsconfig.json"
    Write-Host "  ✅ tsconfig.json créé" -ForegroundColor Green

    # 4. Mise à jour des variables d'environnement
    Write-Host "🔧 Mise à jour .env.production..." -ForegroundColor Yellow
    
    if (Test-Path ".env.production") {
        $envContent = Get-Content ".env.production"
        $envContent = $envContent -replace "FRONTEND_URL=.*", "FRONTEND_URL=http://localhost:3000"
        $envContent = $envContent -replace "CORS_ORIGIN=.*", "CORS_ORIGIN=http://localhost:3000"
        $envContent = $envContent -replace "NEXT_PUBLIC_API_URL=.*", "NEXT_PUBLIC_API_URL=http://localhost:3001"
        Set-Content -Path ".env.production" -Value $envContent
        Write-Host "  ✅ .env.production mis à jour" -ForegroundColor Green
    }

    # 5. Créer/Mettre à jour pnpm-workspace.yaml
    $workspace = @'
packages:
  - 'packages/*'
  - 'apps/*'
'@
    Set-Content -Path "pnpm-workspace.yaml" -Value $workspace
    Write-Host "  ✅ pnpm-workspace.yaml créé" -ForegroundColor Green

    Write-Host ""
    Write-Host "🎉 MIGRATION TERMINÉE!" -ForegroundColor Green
    Write-Host "=" * 25
    Write-Host ""
    Write-Host "📋 Prochaines étapes:" -ForegroundColor Cyan
    Write-Host "  1. pnpm install" -ForegroundColor White
    Write-Host "  2. .\scripts\start-production.ps1 -Build -Detached" -ForegroundColor White
    Write-Host ""
    Write-Host "🌐 URLs après démarrage:" -ForegroundColor Cyan
    Write-Host "  • Frontend: http://localhost:3000" -ForegroundColor White
    Write-Host "  • Backend:  http://localhost:3001" -ForegroundColor White

} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Set-Location $ProjectRoot
}