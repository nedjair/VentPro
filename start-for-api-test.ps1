#!/usr/bin/env pwsh

# Script de démarrage pour les tests API
# Backend sur port 3001, Frontend sur port 3000

param(
    [switch]$Force
)

Write-Host "🚀 DÉMARRAGE POUR TESTS API" -ForegroundColor Green
Write-Host "Backend: Port 3001" -ForegroundColor Cyan
Write-Host "Frontend: Port 3000" -ForegroundColor Cyan
Write-Host ""

# Fonction de logging
function Write-Status {
    param([string]$Message, [string]$Type = "INFO")
    $timestamp = Get-Date -Format "HH:mm:ss"
    switch ($Type) {
        "SUCCESS" { Write-Host "[$timestamp] ✅ $Message" -ForegroundColor Green }
        "ERROR"   { Write-Host "[$timestamp] ❌ $Message" -ForegroundColor Red }
        "WARNING" { Write-Host "[$timestamp] ⚠️ $Message" -ForegroundColor Yellow }
        default   { Write-Host "[$timestamp] INFO $Message" -ForegroundColor Cyan }
    }
}

# Arrêter les processus existants si Force
if ($Force) {
    Write-Status "Arrêt des processus existants..." "WARNING"
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 2
}

# Vérifier Node.js
try {
    $nodeVersion = node --version
    Write-Status "Node.js: $nodeVersion" "SUCCESS"
} catch {
    Write-Status "Node.js non trouvé!" "ERROR"
    exit 1
}

# Démarrer le backend
Write-Status "Démarrage du backend..."

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

# Démarrer le backend en arrière-plan
Write-Status "Lancement du serveur backend..."
$backendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -NoNewWindow
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

# Retour au répertoire racine
Set-Location "../.."

# Démarrer le frontend
Write-Status "Démarrage du frontend..."

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

# Vérifier/créer le fichier .env.local
$envContent = @"
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
NODE_ENV=development
"@

$envContent | Out-File -FilePath ".env.local" -Encoding UTF8
Write-Status "Configuration frontend mise a jour" "SUCCESS"

# Démarrer le frontend en arrière-plan
Write-Status "Lancement du serveur frontend..."
$frontendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -NoNewWindow

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
Set-Location "../.."

# Affichage final
Write-Host "`n🎉 APPLICATIONS DÉMARRÉES" -ForegroundColor Green
Write-Host "========================" -ForegroundColor Green

Write-Host "`n🌐 URLs d'accès:" -ForegroundColor Yellow
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Backend API: http://localhost:3001" -ForegroundColor Cyan
Write-Host "  Health Check: http://localhost:3001/health" -ForegroundColor Cyan

Write-Host "`n🔐 Identifiants de test:" -ForegroundColor Yellow
Write-Host "  Email: admin@gctpe.dz" -ForegroundColor Cyan
Write-Host "  Mot de passe: admin123" -ForegroundColor Cyan

Write-Host "`n📊 Processus:" -ForegroundColor Yellow
Write-Host "  Backend PID: $($backendProcess.Id)" -ForegroundColor Cyan
if ($frontendProcess) {
    Write-Host "  Frontend PID: $($frontendProcess.Id)" -ForegroundColor Cyan
}

Write-Host "`n⚠️ Pour arrêter:" -ForegroundColor Yellow
Write-Host "  Ctrl+C ou Get-Process -Name 'node' | Stop-Process -Force" -ForegroundColor Cyan

Write-Host "`n✅ Prêt pour les tests API!" -ForegroundColor Green

# Attendre l'arrêt manuel
Write-Host "`nAppuyez sur Ctrl+C pour arrêter les applications..." -ForegroundColor Yellow
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} catch {
    Write-Host "`n🛑 Arrêt des applications..." -ForegroundColor Yellow
    if ($backendProcess -and !$backendProcess.HasExited) {
        $backendProcess.Kill()
    }
    if ($frontendProcess -and !$frontendProcess.HasExited) {
        $frontendProcess.Kill()
    }
    Write-Host "Applications arrêtées." -ForegroundColor Green
}
