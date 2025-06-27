#!/usr/bin/env pwsh

# Script de démarrage du Frontend de Production UNIQUE
# Gestion Commerciale TPE - Next.js Production (Port 3003)

param(
    [switch]$Force,
    [switch]$Build,
    [switch]$Verbose
)

Write-Host "🚀 Démarrage Frontend de Production - Next.js" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host "Port: 3003 | Répertoire: frontend-nextjs-production" -ForegroundColor Cyan

$FrontendDir = "frontend-nextjs-production"
$Port = 3003

# Vérifier que le répertoire existe
if (-not (Test-Path $FrontendDir)) {
    Write-Host "❌ Répertoire $FrontendDir non trouvé!" -ForegroundColor Red
    exit 1
}

# Vérifier si le port est libre
$portCheck = netstat -ano | Select-String ":$Port"
if ($portCheck) {
    if ($Force) {
        Write-Host "⚠️ Port $Port occupé, arrêt forcé..." -ForegroundColor Yellow
        $pid = ($portCheck -split '\s+')[-1]
        try {
            taskkill /PID $pid /F | Out-Null
            Write-Host "✅ Processus arrêté" -ForegroundColor Green
            Start-Sleep -Seconds 2
        } catch {
            Write-Host "❌ Impossible d'arrêter le processus" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Port $Port déjà utilisé. Utilisez -Force pour arrêter." -ForegroundColor Red
        exit 1
    }
}

# Vérifier la connectivité backend
Write-Host "`n🔍 Vérification du backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend accessible" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Backend répond avec le code: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Backend non accessible!" -ForegroundColor Red
    Write-Host "   Démarrez d'abord: node production-backend.js" -ForegroundColor Yellow
}

# Aller dans le répertoire frontend
Set-Location $FrontendDir

# Vérifier les dépendances
if (-not (Test-Path "node_modules")) {
    Write-Host "`n📦 Installation des dépendances..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Échec de l'installation" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Dépendances installées" -ForegroundColor Green
}

# Build si demandé
if ($Build) {
    Write-Host "`n🔨 Build de production..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Échec du build" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Build réussi" -ForegroundColor Green
}

# Nettoyer le cache
if (Test-Path ".next") {
    Write-Host "`n🧹 Nettoyage du cache..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
    Write-Host "✅ Cache nettoyé" -ForegroundColor Green
}

# Démarrer Next.js
Write-Host "`n🚀 Démarrage de Next.js..." -ForegroundColor Green
Write-Host "   URL: http://localhost:$Port" -ForegroundColor Cyan
Write-Host "   Appuyez sur Ctrl+C pour arrêter" -ForegroundColor Yellow

try {
    if ($Verbose) {
        npx next dev -p $Port
    } else {
        npx next dev -p $Port 2>$null
    }
} catch {
    Write-Host "`n❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    
    # Tentative de récupération
    Write-Host "`n🔧 Tentative de récupération..." -ForegroundColor Yellow
    
    # Réinstaller les dépendances
    Write-Host "Réinstallation des dépendances..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
    npm install --force
    
    # Nouvelle tentative
    Write-Host "Nouvelle tentative..." -ForegroundColor Yellow
    npx next dev -p $Port
}
