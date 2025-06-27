#!/usr/bin/env pwsh

# Script de demarrage PRODUCTION - Architecture apps/
# Gestion Commerciale TPE
# Backend: apps/backend (TypeScript Fastify + Prisma) - Port 3001
# Frontend: apps/frontend (Next.js) - Port 3000

Write-Host "DEMARRAGE PRODUCTION - ARCHITECTURE APPS" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host "Backend: apps/backend (TypeScript Fastify + Prisma) - Port 3001" -ForegroundColor Cyan
Write-Host "Frontend: apps/frontend (Next.js) - Port 3000" -ForegroundColor Cyan
Write-Host "Base de donnees: PostgreSQL via Docker - Port 5432" -ForegroundColor Cyan

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

# 1. Verifier les prerequis
Write-Status "Verification des prerequis..."

try {
    $nodeVersion = node --version
    Write-Status "Node.js: $nodeVersion" "SUCCESS"
} catch {
    Write-Status "Node.js non trouve!" "ERROR"
    exit 1
}

try {
    $dockerVersion = docker --version
    Write-Status "Docker: $dockerVersion" "SUCCESS"
} catch {
    Write-Status "Docker non trouve!" "ERROR"
    exit 1
}

# Verifier la structure des apps
if (-not (Test-Path "apps/backend")) {
    Write-Status "Repertoire apps/backend non trouve!" "ERROR"
    exit 1
}

if (-not (Test-Path "apps/frontend")) {
    Write-Status "Repertoire apps/frontend non trouve!" "ERROR"
    exit 1
}

Write-Status "Structure des applications verifiee" "SUCCESS"

# 2. Demarrer l'infrastructure Docker (PostgreSQL + Redis)
Write-Status "Demarrage de l'infrastructure Docker (PostgreSQL + Redis)..."
try {
    # Demarrer seulement PostgreSQL et Redis
    docker-compose up -d postgres redis
    Write-Status "Infrastructure Docker demarree" "SUCCESS"
    
    # Attendre que PostgreSQL soit pret
    Write-Status "Attente de PostgreSQL..."
    $attempts = 0
    $maxAttempts = 30
    do {
        Start-Sleep -Seconds 2
        $attempts++
        try {
            $pgReady = docker-compose exec -T postgres pg_isready -U gestion_user -d gestion_commerciale
            if ($LASTEXITCODE -eq 0) {
                Write-Status "PostgreSQL operationnel" "SUCCESS"
                break
            }
        } catch {
            if ($attempts -eq $maxAttempts) {
                Write-Status "PostgreSQL non accessible apres $maxAttempts tentatives" "ERROR"
                exit 1
            }
        }
    } while ($attempts -lt $maxAttempts)
    
} catch {
    Write-Status "Erreur Docker: $($_.Exception.Message)" "ERROR"
    exit 1
}

# 3. Preparer et demarrer le backend
Write-Status "Preparation du backend..."

Set-Location "apps/backend"

# Installer les dependances si necessaire
if (-not (Test-Path "node_modules")) {
    Write-Status "Installation des dependances backend..." "INFO"
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Status "Echec de l'installation des dependances backend" "ERROR"
        exit 1
    }
}

# Generer le client Prisma et appliquer les migrations
Write-Status "Configuration de la base de donnees..."
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Status "Echec de la generation du client Prisma" "ERROR"
    exit 1
}

npx prisma db push
if ($LASTEXITCODE -ne 0) {
    Write-Status "Echec de l'application des migrations" "ERROR"
    exit 1
}

Write-Status "Base de donnees configuree" "SUCCESS"

# Demarrer le backend en mode developpement
Write-Status "Demarrage du backend..."
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    Set-Location "apps/backend"
    npm run dev
}

if ($backendJob) {
    Write-Status "Backend demarre (Job ID: $($backendJob.Id))" "SUCCESS"
    
    # Attendre que le backend soit pret
    $attempts = 0
    $maxAttempts = 30
    do {
        Start-Sleep -Seconds 3
        $attempts++
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 3
            if ($response.StatusCode -eq 200) {
                Write-Status "Backend operationnel" "SUCCESS"
                break
            }
        } catch {
            if ($attempts -eq $maxAttempts) {
                Write-Status "Backend non accessible apres $maxAttempts tentatives" "ERROR"
                exit 1
            }
        }
    } while ($attempts -lt $maxAttempts)
} else {
    Write-Status "Echec du demarrage du backend" "ERROR"
    exit 1
}

# Retour au repertoire racine
Set-Location ../..

# 4. Preparer et demarrer le frontend
Write-Status "Preparation du frontend..."

Set-Location "apps/frontend"

# Installer les dependances si necessaire
if (-not (Test-Path "node_modules")) {
    Write-Status "Installation des dependances frontend..." "INFO"
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Status "Echec de l'installation des dependances frontend" "ERROR"
        exit 1
    }
}

# Nettoyer le cache Next.js
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
}

# Demarrer Next.js en mode developpement
Write-Status "Demarrage du frontend..."
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    Set-Location "apps/frontend"
    npm run dev
}

if ($frontendJob) {
    Write-Status "Frontend demarre (Job ID: $($frontendJob.Id))" "SUCCESS"
    
    # Attendre que le frontend soit pret
    $attempts = 0
    $maxAttempts = 30
    do {
        Start-Sleep -Seconds 3
        $attempts++
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 3
            if ($response.StatusCode -eq 200) {
                Write-Status "Frontend operationnel" "SUCCESS"
                break
            }
        } catch {
            if ($attempts -eq $maxAttempts) {
                Write-Status "Frontend non accessible apres $maxAttempts tentatives" "WARNING"
                break
            }
        }
    } while ($attempts -lt $maxAttempts)
} else {
    Write-Status "Echec du demarrage du frontend" "ERROR"
}

# Retour au repertoire racine
Set-Location ../..

# 5. Affichage final
Write-Host ""
Write-Host "DEMARRAGE PRODUCTION TERMINE" -ForegroundColor Green
Write-Host "============================" -ForegroundColor Green

Write-Host ""
Write-Host "URLs d'acces:" -ForegroundColor Yellow
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Backend API: http://localhost:3001" -ForegroundColor Cyan
Write-Host "  Health Check: http://localhost:3001/health" -ForegroundColor Cyan

Write-Host ""
Write-Host "Base de donnees:" -ForegroundColor Yellow
Write-Host "  PostgreSQL: localhost:5432" -ForegroundColor Cyan
Write-Host "  Base: gestion_commerciale" -ForegroundColor Cyan
Write-Host "  Utilisateur: gestion_user" -ForegroundColor Cyan

Write-Host ""
Write-Host "Identifiants de test:" -ForegroundColor Yellow
Write-Host "  Email: admin@test.com" -ForegroundColor Cyan
Write-Host "  Mot de passe: password123" -ForegroundColor Cyan

Write-Host ""
Write-Host "Application de production prete!" -ForegroundColor Green
Write-Host "Architecture TypeScript + Prisma + Next.js" -ForegroundColor Magenta

# Garder le script actif et surveiller les jobs
try {
    while ($true) {
        # Verifier l'etat des jobs
        if ($backendJob.State -eq "Failed" -or $backendJob.State -eq "Stopped") {
            Write-Status "Le backend s'est arrete de maniere inattendue" "ERROR"
            break
        }
        
        if ($frontendJob.State -eq "Failed" -or $frontendJob.State -eq "Stopped") {
            Write-Status "Le frontend s'est arrete de maniere inattendue" "ERROR"
            break
        }
        
        Start-Sleep -Seconds 5
    }
}
catch {
    Write-Status "Arret de l'application..." "WARNING"
}
finally {
    # Nettoyer les jobs
    Stop-Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Write-Status "Application arretee" "SUCCESS"
}
