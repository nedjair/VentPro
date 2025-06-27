# Demarrage du backend en mode production
Write-Host "Demarrage du backend en production" -ForegroundColor Green
Write-Host "=" * 40

$ErrorActionPreference = "Stop"

try {
    # Chargement des variables d'environnement
    if (Test-Path ".env.production") {
        Get-Content ".env.production" | ForEach-Object {
            if ($_ -match "^([^#][^=]+)=(.*)$") {
                [Environment]::SetEnvironmentVariable($matches[1], $matches[2].Trim('"'), "Process")
            }
        }
        Write-Host "Variables d'environnement chargees" -ForegroundColor Green
    }

    # Verification que PostgreSQL et Redis sont actifs
    Write-Host "Verification des services..." -ForegroundColor Yellow
    
    $pgStatus = docker ps --filter "name=gestion-postgres-prod" --format "{{.Status}}"
    $redisStatus = docker ps --filter "name=gestion-redis-prod" --format "{{.Status}}"
    
    if ($pgStatus -notlike "*healthy*") {
        throw "PostgreSQL n'est pas pret. Demarrez-le d'abord avec Docker."
    }
    
    if ($redisStatus -notlike "*healthy*") {
        throw "Redis n'est pas pret. Demarrez-le d'abord avec Docker."
    }
    
    Write-Host "PostgreSQL: OK" -ForegroundColor Green
    Write-Host "Redis: OK" -ForegroundColor Green

    # Aller dans le repertoire backend
    Set-Location "apps/backend"
    
    # Installer les dependances si necessaire
    if (-not (Test-Path "node_modules/@prisma/client")) {
        Write-Host "Installation des dependances backend..." -ForegroundColor Yellow
        npm install
        if ($LASTEXITCODE -ne 0) { throw "Erreur installation dependances" }
    }

    # Generation du client Prisma
    Write-Host "Generation du client Prisma..." -ForegroundColor Yellow
    npx prisma generate --schema=../../packages/database/schema.prisma
    if ($LASTEXITCODE -ne 0) { throw "Erreur generation Prisma" }

    # Test de connexion DB
    Write-Host "Test de connexion a la base..." -ForegroundColor Yellow
    npx prisma db pull --schema=../../packages/database/schema.prisma --print 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Connexion DB: OK" -ForegroundColor Green
    } else {
        Write-Host "Attention: Connexion DB echouee, utilisation des mocks" -ForegroundColor Yellow
    }

    # Demarrage du serveur
    Write-Host "Demarrage du serveur backend..." -ForegroundColor Yellow
    Write-Host "URL: http://localhost:3001" -ForegroundColor Cyan
    Write-Host "API Docs: http://localhost:3001/docs" -ForegroundColor Cyan
    Write-Host "Health: http://localhost:3001/health" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Appuyez sur Ctrl+C pour arreter" -ForegroundColor Yellow
    Write-Host ""
    
    # Utilisation du serveur principal avec fallback sur le serveur simple
    if (Test-Path "src/index.ts") {
        npx tsx src/index.ts
    } else {
        npx tsx src/server-simple.ts
    }

} catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Set-Location "../../"
}