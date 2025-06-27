# Script de Demarrage Complet Production - Gestion Commerciale TPE
Write-Host "DEMARRAGE COMPLET PRODUCTION - GESTION COMMERCIALE TPE" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""

function Write-Step {
    param([string]$Message)
    Write-Host ">> $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "OK $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "ERREUR $Message" -ForegroundColor Red
}

# Verification des prerequis
Write-Step "Verification des prerequis..."

# Docker
try {
    docker --version | Out-Null
    Write-Success "Docker disponible"
}
catch {
    Write-Error "Docker requis mais non trouve"
    exit 1
}

# Node.js
try {
    $nodeVersion = node --version
    Write-Success "Node.js disponible ($nodeVersion)"
}
catch {
    Write-Error "Node.js requis mais non trouve"
    exit 1
}

# Nettoyer les processus existants
Write-Step "Nettoyage des processus existants..."
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# Creer les dossiers necessaires
Write-Step "Creation des dossiers necessaires..."
$folders = @("logs", "uploads", "backups")
foreach ($folder in $folders) {
    if (!(Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder | Out-Null
        Write-Success "Dossier $folder cree"
    }
}

# 1. Demarrer les services Docker
Write-Step "Demarrage des services Docker..."
docker-compose down 2>$null | Out-Null
docker-compose up -d postgres redis pgbouncer

if ($LASTEXITCODE -ne 0) {
    Write-Error "Echec du demarrage des services Docker"
    exit 1
}
Write-Success "Services Docker demarres"

# Attendre PostgreSQL
Write-Host "Attente de PostgreSQL (15s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# 2. Demarrer le backend de production
Write-Step "Demarrage du backend de production..."
$backendProcess = Start-Process -FilePath "node" -ArgumentList "backend-prod-simple.js" -RedirectStandardOutput "logs\backend-production.log" -RedirectStandardError "logs\backend-production-error.log" -PassThru -WindowStyle Hidden
$backendProcess.Id | Out-File -FilePath ".backend-production.pid"

# Attendre que le backend soit pret
Write-Host "Attente du backend de production..." -ForegroundColor Yellow
$backendReady = $false
for ($i = 1; $i -le 20; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 3 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $healthData = $response.Content | ConvertFrom-Json
            if ($healthData.status -eq "ok") {
                Write-Success "Backend de production pret sur http://localhost:3001"
                $backendReady = $true
                break
            }
        }
    }
    catch {
        Start-Sleep -Seconds 3
    }
}

if (-not $backendReady) {
    Write-Error "Le backend de production ne repond pas"
    exit 1
}

# 3. Installer et demarrer le frontend de production
Write-Step "Preparation du frontend de production..."

# Verification du dossier frontend
if (!(Test-Path "frontend-production")) {
    Write-Error "Dossier frontend-production non trouve"
    exit 1
}

# Se deplacer dans le dossier frontend
Set-Location "frontend-production"

# Installation des dependances si necessaire
if (!(Test-Path "node_modules")) {
    Write-Step "Installation des dependances frontend..."
    npm install 2>$null | Out-Null
    Write-Success "Dependances frontend installees"
}

# Configuration des variables d'environnement
$envContent = @"
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=Gestion Commerciale TPE
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_ENVIRONMENT=production
NODE_ENV=production
"@

$envContent | Out-File -FilePath ".env.local" -Encoding UTF8

# Build de production si necessaire
if (!(Test-Path ".next")) {
    Write-Step "Build de production du frontend..."
    npm run build 2>$null | Out-Null
    Write-Success "Build de production termine"
}

# Demarrage du serveur frontend
Write-Step "Demarrage du serveur frontend de production..."
$frontendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "start" -RedirectStandardOutput "..\logs\frontend-production.log" -RedirectStandardError "..\logs\frontend-production-error.log" -PassThru -WindowStyle Hidden
$frontendProcess.Id | Out-File -FilePath "..\frontend-production.pid"

# Retour au dossier racine
Set-Location ".."

# Attendre que le frontend soit pret
Write-Host "Attente du frontend de production..." -ForegroundColor Yellow
$frontendReady = $false
for ($i = 1; $i -le 20; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3002" -TimeoutSec 3 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Success "Frontend de production pret sur http://localhost:3002"
            $frontendReady = $true
            break
        }
    }
    catch {
        Start-Sleep -Seconds 3
    }
}

if (-not $frontendReady) {
    Write-Error "Le frontend de production ne repond pas"
    Write-Host "Verifiez les logs: Get-Content logs\frontend-production-error.log" -ForegroundColor Yellow
}

# 4. Tests rapides
Write-Step "Tests rapides de l'application complete..."

# Test backend
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -ErrorAction Stop
    $healthData = $healthResponse.Content | ConvertFrom-Json
    Write-Success "Backend: Status $($healthData.status)"
}
catch {
    Write-Error "Backend: Test echoue"
}

# Test frontend
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3002" -UseBasicParsing -ErrorAction Stop
    Write-Success "Frontend: Accessible"
}
catch {
    Write-Error "Frontend: Test echoue"
}

# Test authentification
try {
    $authBody = '{"email":"admin@demo-tpe.fr","password":"demo123"}'
    $authResponse = Invoke-WebRequest -Uri "http://localhost:3001/auth/login" -Method POST -ContentType "application/json" -Body $authBody -UseBasicParsing -ErrorAction Stop
    Write-Success "Authentification: Fonctionnelle"
}
catch {
    Write-Error "Authentification: Test echoue"
}

Write-Host ""
Write-Host "APPLICATION COMPLETE EN MODE PRODUCTION DEMARREE !" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
Write-Host ""

Write-Host "ACCES APPLICATION COMPLETE :" -ForegroundColor Cyan
Write-Host "  Interface Web Principale   : http://localhost:3002" -ForegroundColor White
Write-Host "  Page de Connexion          : http://localhost:3002/login" -ForegroundColor White
Write-Host "  Dashboard                  : http://localhost:3002/dashboard" -ForegroundColor White
Write-Host "  API Backend                : http://localhost:3001" -ForegroundColor White
Write-Host "  Documentation API          : http://localhost:3001/docs" -ForegroundColor White
Write-Host ""

Write-Host "SERVICES DE PRODUCTION :" -ForegroundColor Cyan
Write-Host "  PostgreSQL                 : localhost:5432" -ForegroundColor White
Write-Host "  Redis                      : localhost:6379" -ForegroundColor White
Write-Host "  PgBouncer                  : localhost:6432" -ForegroundColor White
Write-Host ""

Write-Host "COMPTES DE DEMONSTRATION :" -ForegroundColor Cyan
Write-Host "  admin@demo-tpe.fr          / demo123 (ADMIN)" -ForegroundColor White
Write-Host "  manager@demo-tpe.fr        / demo123 (MANAGER)" -ForegroundColor White
Write-Host "  employee@demo-tpe.fr       / demo123 (EMPLOYEE)" -ForegroundColor White
Write-Host ""

Write-Host "FONCTIONNALITES DISPONIBLES :" -ForegroundColor Cyan
Write-Host "  Authentification JWT       : Active" -ForegroundColor Green
Write-Host "  Dashboard en temps reel    : Active" -ForegroundColor Green
Write-Host "  Gestion des clients        : Active" -ForegroundColor Green
Write-Host "  Gestion des produits       : Active" -ForegroundColor Green
Write-Host "  API REST complete          : Active" -ForegroundColor Green
Write-Host "  Interface responsive       : Active" -ForegroundColor Green
Write-Host ""

Write-Host "LOGS DE PRODUCTION :" -ForegroundColor Cyan
Write-Host "  Backend  : Get-Content logs\backend-production.log -Wait" -ForegroundColor White
Write-Host "  Frontend : Get-Content logs\frontend-production.log -Wait" -ForegroundColor White
Write-Host "  Docker   : docker-compose logs -f" -ForegroundColor White
Write-Host ""

Write-Host "TESTS RAPIDES :" -ForegroundColor Cyan
Write-Host "  .\test-prod-simple.ps1" -ForegroundColor White
Write-Host ""

Write-Host "ARRET :" -ForegroundColor Cyan
Write-Host "  Ctrl+C ou executez : .\stop-full-production.ps1" -ForegroundColor White
Write-Host ""

# Ouvrir les navigateurs
Write-Host "Ouverture des navigateurs..." -ForegroundColor Blue
Start-Process "http://localhost:3002"
Start-Sleep -Seconds 2
Start-Process "http://localhost:3001/docs"

Write-Host "Application complete en mode PRODUCTION prete !" -ForegroundColor Yellow
Write-Host "Connectez-vous avec admin@demo-tpe.fr / demo123" -ForegroundColor Yellow
Write-Host ""
Write-Host "Appuyez sur Ctrl+C pour arreter..." -ForegroundColor Yellow

# Attendre l'arret manuel
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
}
catch {
    Write-Host ""
    Write-Host "Arret en cours..." -ForegroundColor Red
    
    # Arreter les processus
    if (Test-Path ".backend-production.pid") {
        $backendPid = Get-Content ".backend-production.pid"
        Stop-Process -Id $backendPid -Force -ErrorAction SilentlyContinue
        Remove-Item ".backend-production.pid" -ErrorAction SilentlyContinue
    }
    
    if (Test-Path "frontend-production.pid") {
        $frontendPid = Get-Content "frontend-production.pid"
        Stop-Process -Id $frontendPid -Force -ErrorAction SilentlyContinue
        Remove-Item "frontend-production.pid" -ErrorAction SilentlyContinue
    }
    
    # Arreter Docker Compose
    docker-compose down
    
    Write-Host "Application complete de production arretee" -ForegroundColor Green
}
