#!/usr/bin/env pwsh

# Script de démarrage PRODUCTION - Architecture apps/
# Gestion Commerciale TPE
# Backend: apps/backend (TypeScript Fastify + Prisma) - Port 3001
# Frontend: apps/frontend (Next.js) - Port 3000

param(
    [switch]$Force,
    [switch]$SkipDocker,
    [switch]$Verbose
)

Write-Host "🚀 DÉMARRAGE PRODUCTION - ARCHITECTURE APPS" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host "Backend: apps/backend (TypeScript Fastify + Prisma) - Port 3001" -ForegroundColor Cyan
Write-Host "Frontend: apps/frontend (Next.js) - Port 3000" -ForegroundColor Cyan
Write-Host "Base de données: PostgreSQL via Docker - Port 5432" -ForegroundColor Cyan

# Fonction de logging
function Write-Status {
    param([string]$Message, [string]$Type = "INFO")
    $timestamp = Get-Date -Format "HH:mm:ss"
    switch ($Type) {
        "SUCCESS" { Write-Host "[$timestamp] [OK] $Message" -ForegroundColor Green }
        "ERROR"   { Write-Host "[$timestamp] [ERR] $Message" -ForegroundColor Red }
        "WARNING" { Write-Host "[$timestamp] [WARN] $Message" -ForegroundColor Yellow }
        default   { Write-Host "[$timestamp] [INFO] $Message" -ForegroundColor Cyan }
    }
}

# 1. Vérifier les prérequis
Write-Status "Vérification des prérequis..."

try {
    $nodeVersion = node --version
    Write-Status "Node.js: $nodeVersion" "SUCCESS"
} catch {
    Write-Status "Node.js non trouvé!" "ERROR"
    exit 1
}

try {
    $dockerVersion = docker --version
    Write-Status "Docker: $dockerVersion" "SUCCESS"
} catch {
    if (-not $SkipDocker) {
        Write-Status "Docker non trouvé!" "ERROR"
        exit 1
    }
}

# Vérifier la structure des apps
if (-not (Test-Path "apps/backend")) {
    Write-Status "Répertoire apps/backend non trouvé!" "ERROR"
    exit 1
}

if (-not (Test-Path "apps/frontend")) {
    Write-Status "Répertoire apps/frontend non trouvé!" "ERROR"
    exit 1
}

Write-Status "Structure des applications vérifiée" "SUCCESS"

# 2. Démarrer l'infrastructure Docker (PostgreSQL + Redis)
if (-not $SkipDocker) {
    Write-Status "Démarrage de l'infrastructure Docker (PostgreSQL + Redis)..."
    try {
        # Démarrer seulement PostgreSQL et Redis
        docker-compose up -d postgres redis
        Write-Status "Infrastructure Docker démarrée" "SUCCESS"
        
        # Attendre que PostgreSQL soit prêt
        Write-Status "Attente de PostgreSQL..."
        $attempts = 0
        $maxAttempts = 30
        do {
            Start-Sleep -Seconds 2
            $attempts++
            try {
                $pgReady = docker-compose exec -T postgres pg_isready -U gestion_user -d gestion_commerciale
                if ($LASTEXITCODE -eq 0) {
                    Write-Status "PostgreSQL opérationnel" "SUCCESS"
                    break
                }
            } catch {
                if ($attempts -eq $maxAttempts) {
                    Write-Status "PostgreSQL non accessible après $maxAttempts tentatives" "ERROR"
                    exit 1
                }
            }
        } while ($attempts -lt $maxAttempts)
        
    } catch {
        Write-Status "Erreur Docker: $($_.Exception.Message)" "ERROR"
        exit 1
    }
}

# 3. Arrêter les processus existants si Force
if ($Force) {
    Write-Status "Arrêt des processus existants..." "WARNING"
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 2
}

# 4. Préparer et démarrer le backend
Write-Status "Préparation du backend..."

Set-Location "apps/backend"

# Installer les dépendances si nécessaire
if (-not (Test-Path "node_modules")) {
    Write-Status "Installation des dépendances backend..." "INFO"
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Status "Échec de l'installation des dépendances backend" "ERROR"
        exit 1
    }
}

# Générer le client Prisma et appliquer les migrations
Write-Status "Configuration de la base de données..."
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Status "Échec de la génération du client Prisma" "ERROR"
    exit 1
}

npx prisma db push
if ($LASTEXITCODE -ne 0) {
    Write-Status "Échec de l'application des migrations" "ERROR"
    exit 1
}

Write-Status "Base de données configurée" "SUCCESS"

# Démarrer le backend en mode production
Write-Status "Démarrage du backend..."
$backendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "start" -PassThru -NoNewWindow

if ($backendProcess) {
    Write-Status "Backend démarré (PID: $($backendProcess.Id))" "SUCCESS"
    
    # Attendre que le backend soit prêt
    $attempts = 0
    $maxAttempts = 30
    do {
        Start-Sleep -Seconds 3
        $attempts++
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 3
            if ($response.StatusCode -eq 200) {
                Write-Status "Backend opérationnel" "SUCCESS"
                break
            }
        } catch {
            if ($attempts -eq $maxAttempts) {
                Write-Status "Backend non accessible après $maxAttempts tentatives" "ERROR"
                exit 1
            }
        }
    } while ($attempts -lt $maxAttempts)
} else {
    Write-Status "Échec du démarrage du backend" "ERROR"
    exit 1
}

# Retour au répertoire racine
Set-Location ../..

# 5. Préparer et démarrer le frontend
Write-Status "Préparation du frontend..."

Set-Location "apps/frontend"

# Installer les dépendances si nécessaire
if (-not (Test-Path "node_modules")) {
    Write-Status "Installation des dépendances frontend..." "INFO"
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Status "Échec de l'installation des dépendances frontend" "ERROR"
        exit 1
    }
}

# Nettoyer le cache Next.js
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
}

# Construire l'application pour la production
Write-Status "Construction de l'application frontend pour la production..."
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Status "Échec de la construction de l'application" "ERROR"
    exit 1
}

# Démarrer Next.js en mode production
Write-Status "Démarrage du frontend en mode production..."
$frontendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "start" -PassThru -NoNewWindow

if ($frontendProcess) {
    Write-Status "Frontend démarré (PID: $($frontendProcess.Id))" "SUCCESS"
    
    # Attendre que le frontend soit prêt
    $attempts = 0
    $maxAttempts = 30
    do {
        Start-Sleep -Seconds 3
        $attempts++
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 3
            if ($response.StatusCode -eq 200) {
                Write-Status "Frontend opérationnel" "SUCCESS"
                break
            }
        } catch {
            if ($attempts -eq $maxAttempts) {
                Write-Status "Frontend non accessible après $maxAttempts tentatives" "WARNING"
                break
            }
        }
    } while ($attempts -lt $maxAttempts)
} else {
    Write-Status "Échec du démarrage du frontend" "ERROR"
}

# Retour au répertoire racine
Set-Location ../..

# 6. Affichage final
Write-Host "`n🎉 DÉMARRAGE PRODUCTION TERMINÉ" -ForegroundColor Green
Write-Host "===============================" -ForegroundColor Green

Write-Host "`n🌐 URLs d'accès:" -ForegroundColor Yellow
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Backend API: http://localhost:3001" -ForegroundColor Cyan
Write-Host "  Health Check: http://localhost:3001/health" -ForegroundColor Cyan
Write-Host "  Documentation API: http://localhost:3001/docs" -ForegroundColor Cyan

Write-Host "`n🗄️ Base de données:" -ForegroundColor Yellow
Write-Host "  PostgreSQL: localhost:5432" -ForegroundColor Cyan
Write-Host "  Base: gestion_commerciale" -ForegroundColor Cyan
Write-Host "  Utilisateur: gestion_user" -ForegroundColor Cyan

Write-Host "`n🔐 Identifiants de test:" -ForegroundColor Yellow
Write-Host "  Email: admin@test.com" -ForegroundColor Cyan
Write-Host "  Mot de passe: password123" -ForegroundColor Cyan

Write-Host "`n📊 Processus:" -ForegroundColor Yellow
Write-Host "  Backend PID: $($backendProcess.Id)" -ForegroundColor Cyan
if ($frontendProcess) {
    Write-Host "  Frontend PID: $($frontendProcess.Id)" -ForegroundColor Cyan
}

Write-Host "`n⚠️ Pour arrêter l'application:" -ForegroundColor Yellow
Write-Host "  Ctrl+C dans chaque terminal ou arrêter les processus manuellement" -ForegroundColor Cyan

Write-Host "`n✅ Application de production prête!" -ForegroundColor Green
Write-Host "L'application utilise l'architecture TypeScript + Prisma + Next.js" -ForegroundColor Magenta
