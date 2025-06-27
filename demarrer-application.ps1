#!/usr/bin/env pwsh

# =============================================================================
# 🚀 SCRIPT DE DÉMARRAGE - APPLICATION GESTION COMMERCIALE
# =============================================================================
# Ce script démarre l'application de gestion commerciale avec :
# - Backend TypeScript/Fastify sur le port 3001
# - Frontend Next.js sur le port 3000
# - Services Docker (PostgreSQL + Redis) si disponibles
# =============================================================================

param(
    [switch]$SkipDocker,
    [switch]$Force,
    [switch]$Verbose
)

# Couleurs pour l'affichage
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

# En-tête
Clear-Host
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║            GESTION COMMERCIALE TPE - DEMARRAGE                  ║" -ForegroundColor Cyan
Write-Host "║                     Application de Production                    ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Vérification des prérequis
Write-Status "Verification des prerequis..." "INFO"

try {
    $nodeVersion = node --version
    Write-Status "Node.js: $nodeVersion" "SUCCESS"
} catch {
    Write-Status "Node.js non trouve! Installez Node.js 20+" "ERROR"
    Write-Host "Telechargez depuis: https://nodejs.org/" -ForegroundColor Gray
    exit 1
}

try {
    $npmVersion = npm --version
    Write-Status "npm: v$npmVersion" "SUCCESS"
} catch {
    Write-Status "npm non trouve!" "ERROR"
    exit 1
}

# Vérifier Docker (optionnel)
if (-not $SkipDocker) {
    try {
        $dockerVersion = docker --version
        Write-Status "Docker: $dockerVersion" "SUCCESS"
        
        # Vérifier si Docker fonctionne
        docker ps | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Status "Docker non démarré - Continuons sans Docker" "WARNING"
            $SkipDocker = $true
        }
    } catch {
        Write-Status "Docker non trouvé - Continuons sans Docker" "WARNING"
        $SkipDocker = $true
    }
}

# Arrêter les processus existants si Force
if ($Force) {
    Write-Status "Arrêt des processus Node.js existants..." "WARNING"
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
}

# Démarrer Docker (si disponible)
if (-not $SkipDocker) {
    Write-Status "Vérification des services Docker..." "INFO"
    
    $runningContainers = docker ps --format "table {{.Names}}" | Select-String -Pattern "gestion-postgres|gestion-redis"
    if ($runningContainers) {
        Write-Status "Services Docker déjà actifs" "SUCCESS"
    } else {
        Write-Status "Démarrage des services Docker..." "INFO"
        try {
            docker-compose up -d
            Write-Status "Services Docker démarrés" "SUCCESS"
            Start-Sleep -Seconds 10
        } catch {
            Write-Status "Erreur Docker - Continuons sans Docker" "WARNING"
        }
    }
}

Write-Host ""
Write-Status "🔧 Préparation du backend..." "INFO"

# Aller dans le dossier backend
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

# Générer Prisma
Write-Status "Génération du client Prisma..." "INFO"
npm run prisma:generate | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Status "Échec de la génération Prisma" "ERROR"
    exit 1
}

Write-Status "Démarrage du backend..." "INFO"
# Démarrer le backend en arrière-plan
$backendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -WindowStyle Hidden
Write-Status "Backend démarré (PID: $($backendProcess.Id))" "SUCCESS"

# Retour au répertoire racine
Set-Location "../.."

Write-Host ""
Write-Status "🎨 Préparation du frontend..." "INFO"

# Aller dans le dossier frontend
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

# Créer/Mettre à jour .env.local
$envContent = @"
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
NODE_ENV=development
"@
$envContent | Out-File -FilePath ".env.local" -Encoding utf8
Write-Status "Configuration frontend mise à jour" "SUCCESS"

Write-Status "Démarrage du frontend..." "INFO"
# Démarrer le frontend en arrière-plan
$frontendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -WindowStyle Hidden
Write-Status "Frontend démarré (PID: $($frontendProcess.Id))" "SUCCESS"

# Retour au répertoire racine
Set-Location "../.."

Write-Host ""
Write-Status "⏳ Attente de l'initialisation des services..." "INFO"
Start-Sleep -Seconds 15

# Test de connectivité
Write-Status "Test de connectivité..." "INFO"

# Test du frontend
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Status "Frontend accessible sur http://localhost:3000" "SUCCESS"
    }
} catch {
    Write-Status "Frontend non accessible - Vérifiez les logs" "WARNING"
}

# Test du backend
try {
    $backendResponse = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 5
    if ($backendResponse.StatusCode -eq 200) {
        Write-Status "Backend accessible sur http://localhost:3001" "SUCCESS"
    }
} catch {
    Write-Status "Backend non accessible - Vérifiez les logs" "WARNING"
}

# Affichage final
Write-Host ""
Write-Host "🎉 DÉMARRAGE TERMINÉ" -ForegroundColor Green
Write-Host "===================" -ForegroundColor Green

Write-Host "`n🌐 URLs d'accès:" -ForegroundColor Yellow
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Backend API: http://localhost:3001" -ForegroundColor Cyan

if (-not $SkipDocker) {
    Write-Host "  Adminer (DB): http://localhost:8080" -ForegroundColor Cyan
}

Write-Host "`n🔐 Identifiants par défaut:" -ForegroundColor Yellow
Write-Host "  Email: admin@demo-tpe.fr" -ForegroundColor Cyan
Write-Host "  Mot de passe: demo123" -ForegroundColor Cyan

Write-Host "`n📊 Processus:" -ForegroundColor Yellow
Write-Host "  Backend PID: $($backendProcess.Id)" -ForegroundColor Cyan
Write-Host "  Frontend PID: $($frontendProcess.Id)" -ForegroundColor Cyan

Write-Host "`n⚠️ Pour arrêter l'application:" -ForegroundColor Yellow
Write-Host "  Utilisez Ctrl+C ou fermez cette fenêtre" -ForegroundColor Cyan

Write-Host "`n✅ Application prête!" -ForegroundColor Green
Write-Host "Ouvrez http://localhost:3000 dans votre navigateur" -ForegroundColor Green

# Ouvrir automatiquement le navigateur
try {
    Start-Process "http://localhost:3000"
    Write-Status "Navigateur ouvert automatiquement" "SUCCESS"
} catch {
    Write-Status "Impossible d'ouvrir le navigateur automatiquement" "WARNING"
}

Write-Host "`nAppuyez sur Ctrl+C pour arrêter l'application..." -ForegroundColor Yellow

# Garder le script actif
try {
    while ($true) {
        Start-Sleep -Seconds 30
        
        # Vérifier si les processus sont toujours actifs
        if (-not (Get-Process -Id $backendProcess.Id -ErrorAction SilentlyContinue)) {
            Write-Status "Backend arrêté de manière inattendue" "ERROR"
            break
        }
        
        if (-not (Get-Process -Id $frontendProcess.Id -ErrorAction SilentlyContinue)) {
            Write-Status "Frontend arrêté de manière inattendue" "ERROR"
            break
        }
    }
} catch {
    Write-Status "Arrêt de l'application..." "INFO"
} finally {
    # Nettoyer les processus
    if (Get-Process -Id $backendProcess.Id -ErrorAction SilentlyContinue) {
        Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if (Get-Process -Id $frontendProcess.Id -ErrorAction SilentlyContinue) {
        Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Status "Application arrêtée" "SUCCESS"
}
