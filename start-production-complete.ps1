#!/usr/bin/env pwsh

# Script de démarrage complet - PRODUCTION UNIQUEMENT
# Gestion Commerciale TPE
# Backend + Frontend de Production UNIQUEMENT

param(
    [switch]$Force,
    [switch]$SkipDocker,
    [switch]$Verbose
)

Write-Host "🚀 DÉMARRAGE PRODUCTION COMPLET" -ForegroundColor Green
Write-Host "===============================" -ForegroundColor Green
Write-Host "Backend: production-backend.js (Port 3001)" -ForegroundColor Cyan
Write-Host "Frontend: frontend-nextjs-production (Port 3003)" -ForegroundColor Cyan

# Fonction de logging
function Write-Status {
    param([string]$Message, [string]$Type = "INFO")
    $timestamp = Get-Date -Format "HH:mm:ss"
    switch ($Type) {
        "SUCCESS" { Write-Host "[$timestamp] ✅ $Message" -ForegroundColor Green }
        "ERROR"   { Write-Host "[$timestamp] ❌ $Message" -ForegroundColor Red }
        "WARNING" { Write-Host "[$timestamp] ⚠️ $Message" -ForegroundColor Yellow }
        default   { Write-Host "[$timestamp] ℹ️ $Message" -ForegroundColor Cyan }
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

# 2. Démarrer Docker (si nécessaire)
if (-not $SkipDocker) {
    Write-Status "Démarrage des services Docker..."
    try {
        docker-compose up -d
        Write-Status "Services Docker démarrés" "SUCCESS"
        Start-Sleep -Seconds 5
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

# 4. Démarrer le backend
Write-Status "Démarrage du backend de production..."

$backendProcess = Start-Process -FilePath "node" -ArgumentList "production-backend.js" -PassThru -NoNewWindow
if ($backendProcess) {
    Write-Status "Backend démarré (PID: $($backendProcess.Id))" "SUCCESS"
    
    # Attendre que le backend soit prêt
    $attempts = 0
    $maxAttempts = 20
    do {
        Start-Sleep -Seconds 2
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

# 5. Démarrer le frontend de production
Write-Status "Démarrage du frontend de production..."

Set-Location "frontend-nextjs-production"

# Vérifier les dépendances
if (-not (Test-Path "node_modules")) {
    Write-Status "Installation des dépendances frontend..." "INFO"
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Status "Échec de l'installation des dépendances" "ERROR"
        exit 1
    }
}

# Nettoyer le cache
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
}

# Démarrer Next.js en arrière-plan
Write-Status "Lancement de Next.js..." "INFO"
$frontendProcess = Start-Process -FilePath "npx" -ArgumentList "next", "dev", "-p", "3003" -PassThru -NoNewWindow

if ($frontendProcess) {
    Write-Status "Frontend démarré (PID: $($frontendProcess.Id))" "SUCCESS"
    
    # Attendre que le frontend soit prêt
    $attempts = 0
    $maxAttempts = 30
    do {
        Start-Sleep -Seconds 3
        $attempts++
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3003" -TimeoutSec 3
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
Set-Location ..

# 6. Affichage final
Write-Host "`n🎉 DÉMARRAGE TERMINÉ" -ForegroundColor Green
Write-Host "===================" -ForegroundColor Green

Write-Host "`n🌐 URLs d'accès:" -ForegroundColor Yellow
Write-Host "  Frontend: http://localhost:3003" -ForegroundColor Cyan
Write-Host "  Backend API: http://localhost:3001" -ForegroundColor Cyan
Write-Host "  Health Check: http://localhost:3001/health" -ForegroundColor Cyan

Write-Host "`n🔐 Identifiants:" -ForegroundColor Yellow
Write-Host "  Email: admin@demo-tpe.fr" -ForegroundColor Cyan
Write-Host "  Mot de passe: demo123" -ForegroundColor Cyan

Write-Host "`n📊 Processus:" -ForegroundColor Yellow
Write-Host "  Backend PID: $($backendProcess.Id)" -ForegroundColor Cyan
if ($frontendProcess) {
    Write-Host "  Frontend PID: $($frontendProcess.Id)" -ForegroundColor Cyan
}

Write-Host "`n⚠️ Pour arrêter l'application:" -ForegroundColor Yellow
Write-Host "  Ctrl+C ou .\stop-production-complete.ps1" -ForegroundColor Cyan

Write-Host "`n✅ Application de production prête!" -ForegroundColor Green
