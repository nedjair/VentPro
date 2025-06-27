# Script de démarrage de l'application complète fonctionnelle
Write-Host "=== DEMARRAGE APPLICATION GESTION COMMERCIALE TPE ===" -ForegroundColor Green
Write-Host ""

# Vérifier les prérequis
Write-Host "Verification des prerequis..." -ForegroundColor Blue

# Docker
try {
    docker --version | Out-Null
    Write-Host "✅ Docker OK" -ForegroundColor Green
}
catch {
    Write-Host "❌ Docker requis" -ForegroundColor Red
    exit 1
}

# Node.js
try {
    node --version | Out-Null
    Write-Host "✅ Node.js OK" -ForegroundColor Green
}
catch {
    Write-Host "❌ Node.js requis" -ForegroundColor Red
    exit 1
}

# Yarn
try {
    yarn --version | Out-Null
    Write-Host "✅ Yarn OK" -ForegroundColor Green
}
catch {
    Write-Host "❌ Yarn requis" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Créer le dossier logs
if (!(Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
}

# 1. Démarrer Docker Compose
Write-Host "1. Demarrage des services Docker..." -ForegroundColor Blue
docker-compose down 2>$null | Out-Null
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Echec Docker Compose" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Services Docker demarres" -ForegroundColor Green

# Attendre PostgreSQL
Write-Host "   Attente PostgreSQL (10s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 2. Démarrer le backend sur port 3003
Write-Host "2. Demarrage du backend (port 3003)..." -ForegroundColor Blue
Start-Process -FilePath "node" -ArgumentList "minimal-backend-3003.js" -RedirectStandardOutput "logs\backend-working.log" -RedirectStandardError "logs\backend-working-error.log" -PassThru -WindowStyle Hidden | ForEach-Object { $_.Id | Out-File -FilePath ".backend-working.pid" }

# Attendre que le backend soit prêt
Write-Host "   Attente du backend..." -ForegroundColor Yellow
$backendReady = $false
for ($i = 1; $i -le 15; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3003/health" -TimeoutSec 3 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Backend pret sur port 3003 !" -ForegroundColor Green
            $backendReady = $true
            break
        }
    }
    catch {
        Start-Sleep -Seconds 2
    }
}

if (-not $backendReady) {
    Write-Host "❌ Backend ne repond pas" -ForegroundColor Red
    exit 1
}

# 3. Démarrer le frontend Next.js sur port 3002
Write-Host "3. Demarrage du frontend Next.js (port 3002)..." -ForegroundColor Blue
Set-Location "frontend-production"
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -RedirectStandardOutput "..\logs\frontend-working.log" -RedirectStandardError "..\logs\frontend-working-error.log" -PassThru -WindowStyle Hidden | ForEach-Object { $_.Id | Out-File -FilePath "..\frontend-working.pid" }
Set-Location ".."

# Attendre que le frontend soit prêt
Write-Host "   Attente du frontend..." -ForegroundColor Yellow
$frontendReady = $false
for ($i = 1; $i -le 20; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3002" -TimeoutSec 3 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Frontend pret sur port 3002 !" -ForegroundColor Green
            $frontendReady = $true
            break
        }
    }
    catch {
        Start-Sleep -Seconds 3
    }
}

if (-not $frontendReady) {
    Write-Host "⚠️  Frontend ne repond pas encore (peut prendre plus de temps)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== APPLICATION DEMARREE AVEC SUCCES ===" -ForegroundColor Green
Write-Host ""

# Afficher les informations d'accès
Write-Host "🌐 ACCES A L'APPLICATION :" -ForegroundColor Cyan
Write-Host "  Application Frontend : http://localhost:3002" -ForegroundColor White
Write-Host "  API Backend         : http://localhost:3003" -ForegroundColor White
Write-Host "  Health Check        : http://localhost:3003/health" -ForegroundColor White
Write-Host "  Metriques           : http://localhost:3003/metrics" -ForegroundColor White
Write-Host ""

Write-Host "🗄️  SERVICES DE DONNEES :" -ForegroundColor Cyan
Write-Host "  Base de donnees     : http://localhost:8080 (Adminer)" -ForegroundColor White
Write-Host "  Cache Redis         : http://localhost:8081 (Redis Commander)" -ForegroundColor White
Write-Host ""

Write-Host "🔐 COMPTES DE TEST :" -ForegroundColor Cyan
Write-Host "  Admin    : admin@demo-tpe.fr / demo123" -ForegroundColor White
Write-Host "  Manager  : manager@demo-tpe.fr / demo123" -ForegroundColor White
Write-Host "  Employe  : employee@demo-tpe.fr / demo123" -ForegroundColor White
Write-Host ""

Write-Host "📊 ENDPOINTS API DISPONIBLES :" -ForegroundColor Cyan
Write-Host "  GET  /health           - Status du serveur" -ForegroundColor White
Write-Host "  GET  /metrics          - Metriques systeme" -ForegroundColor White
Write-Host "  POST /auth/login       - Authentification" -ForegroundColor White
Write-Host "  GET  /clients          - Liste des clients" -ForegroundColor White
Write-Host "  GET  /products         - Liste des produits" -ForegroundColor White
Write-Host "  GET  /dashboard/stats  - Statistiques dashboard" -ForegroundColor White
Write-Host ""

Write-Host "📝 LOGS :" -ForegroundColor Cyan
Write-Host "  Backend  : Get-Content logs\backend-working.log -Wait" -ForegroundColor White
Write-Host "  Frontend : Get-Content logs\frontend-working.log -Wait" -ForegroundColor White
Write-Host "  Docker   : docker-compose logs -f" -ForegroundColor White
Write-Host ""

Write-Host "🛑 ARRET :" -ForegroundColor Cyan
Write-Host "  Ctrl+C ou executez : .\stop-app-working.ps1" -ForegroundColor White
Write-Host ""

# Ouvrir le navigateur
Write-Host "Ouverture du navigateur..." -ForegroundColor Blue
Start-Process "http://localhost:3002"

Write-Host "Application prete ! Appuyez sur Ctrl+C pour arreter..." -ForegroundColor Yellow

# Attendre l'arrêt manuel
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
}
catch {
    Write-Host "Arret en cours..." -ForegroundColor Red
}
