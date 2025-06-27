#!/usr/bin/env pwsh

# Script de démarrage de l'application Gestion Commerciale
# Backend: TypeScript Fastify + Prisma (port 3001)
# Frontend: Next.js (port 3000)

Write-Host "🚀 Démarrage de l'application Gestion Commerciale" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Fonction pour vérifier si un port est libre
function Test-Port {
    param([int]$Port)
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
        $listener.Start()
        $listener.Stop()
        return $true
    }
    catch {
        return $false
    }
}

# Fonction pour arrêter les processus existants
function Stop-ExistingProcesses {
    Write-Host "🔍 Vérification des processus existants..." -ForegroundColor Yellow
    
    # Arrêter les processus Node.js sur les ports 3000 et 3001
    $processes = Get-NetTCPConnection -LocalPort 3000, 3001 -ErrorAction SilentlyContinue | 
                 ForEach-Object { Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue }
    
    if ($processes) {
        Write-Host "⚠️ Arrêt des processus existants..." -ForegroundColor Yellow
        $processes | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

# Fonction pour installer les dépendances
function Install-Dependencies {
    param([string]$Path, [string]$Name)
    
    Write-Host "📦 Installation des dépendances pour $Name..." -ForegroundColor Cyan
    Push-Location $Path
    
    if (Test-Path "package-lock.json") {
        npm ci
    } else {
        npm install
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de l'installation des dépendances pour $Name" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    Pop-Location
    Write-Host "✅ Dépendances installées pour $Name" -ForegroundColor Green
}

# Fonction pour initialiser la base de données
function Initialize-Database {
    Write-Host "🗄️ Initialisation de la base de données..." -ForegroundColor Cyan
    Push-Location "apps/backend"
    
    # Générer le client Prisma
    npx prisma generate
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de la génération du client Prisma" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    # Appliquer les migrations
    npx prisma db push
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de l'application des migrations" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    Pop-Location
    Write-Host "✅ Base de données initialisée" -ForegroundColor Green
}

# Arrêter les processus existants
Stop-ExistingProcesses

# Vérifier que les répertoires existent
if (-not (Test-Path "apps/backend")) {
    Write-Host "❌ Répertoire apps/backend introuvable" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "apps/frontend")) {
    Write-Host "❌ Répertoire apps/frontend introuvable" -ForegroundColor Red
    exit 1
}

# Installer les dépendances
Install-Dependencies "apps/backend" "Backend"
Install-Dependencies "apps/frontend" "Frontend"

# Initialiser la base de données
Initialize-Database

# Vérifier que les ports sont libres
if (-not (Test-Port 3001)) {
    Write-Host "❌ Le port 3001 (backend) est déjà utilisé" -ForegroundColor Red
    exit 1
}

if (-not (Test-Port 3000)) {
    Write-Host "❌ Le port 3000 (frontend) est déjà utilisé" -ForegroundColor Red
    exit 1
}

Write-Host "🎯 Démarrage des services..." -ForegroundColor Green

# Démarrer le backend en arrière-plan
Write-Host "🔧 Démarrage du backend (port 3001)..." -ForegroundColor Cyan
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    Set-Location "apps/backend"
    npm run dev
}

# Attendre un peu pour que le backend démarre
Start-Sleep -Seconds 5

# Vérifier que le backend a démarré
$backendStarted = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $backendStarted = $true
            break
        }
    }
    catch {
        # Continuer à attendre
    }
    Start-Sleep -Seconds 1
}

if (-not $backendStarted) {
    Write-Host "❌ Le backend n'a pas pu démarrer" -ForegroundColor Red
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "✅ Backend démarré avec succès" -ForegroundColor Green

# Démarrer le frontend en arrière-plan
Write-Host "🎨 Démarrage du frontend (port 3000)..." -ForegroundColor Cyan
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    Set-Location "apps/frontend"
    npm run dev
}

# Attendre un peu pour que le frontend démarre
Start-Sleep -Seconds 10

# Vérifier que le frontend a démarré
$frontendStarted = $false
for ($i = 0; $i -lt 60; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $frontendStarted = $true
            break
        }
    }
    catch {
        # Continuer à attendre
    }
    Start-Sleep -Seconds 1
}

if (-not $frontendStarted) {
    Write-Host "❌ Le frontend n'a pas pu démarrer" -ForegroundColor Red
    Stop-Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "✅ Frontend démarré avec succès" -ForegroundColor Green

# Afficher les informations de connexion
Write-Host ""
Write-Host "🎉 Application démarrée avec succès !" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host "🌐 Frontend:      http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔧 Backend API:   http://localhost:3001" -ForegroundColor Cyan
Write-Host "📚 Documentation: http://localhost:3001/docs" -ForegroundColor Cyan
Write-Host "🏥 Health Check:  http://localhost:3001/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔐 Comptes de test:" -ForegroundColor Yellow
Write-Host "   Email: admin@test.com" -ForegroundColor White
Write-Host "   Mot de passe: password123" -ForegroundColor White
Write-Host ""
Write-Host "⚠️ Appuyez sur Ctrl+C pour arrêter l'application" -ForegroundColor Yellow

# Garder le script actif et surveiller les jobs
try {
    while ($true) {
        # Vérifier l'état des jobs
        if ($backendJob.State -eq "Failed" -or $backendJob.State -eq "Stopped") {
            Write-Host "❌ Le backend s'est arrêté de manière inattendue" -ForegroundColor Red
            break
        }
        
        if ($frontendJob.State -eq "Failed" -or $frontendJob.State -eq "Stopped") {
            Write-Host "❌ Le frontend s'est arrêté de manière inattendue" -ForegroundColor Red
            break
        }
        
        Start-Sleep -Seconds 5
    }
}
catch {
    Write-Host "🛑 Arrêt de l'application..." -ForegroundColor Yellow
}
finally {
    # Nettoyer les jobs
    Stop-Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Write-Host "✅ Application arrêtée" -ForegroundColor Green
}
