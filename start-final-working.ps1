# =============================================================================
# Script de Démarrage Final Fonctionnel - Gestion Commerciale TPE
# =============================================================================
Write-Host "🚀 DEMARRAGE FINAL APPLICATION GESTION COMMERCIALE TPE" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""

# Fonction pour afficher les étapes
function Write-Step {
    param([string]$Message)
    Write-Host "▶️  $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# Vérification des prérequis
Write-Step "Vérification des prérequis..."

# Docker
try {
    docker --version | Out-Null
    Write-Success "Docker disponible"
}
catch {
    Write-Error "Docker requis mais non trouvé"
    exit 1
}

# Node.js
try {
    node --version | Out-Null
    Write-Success "Node.js disponible"
}
catch {
    Write-Error "Node.js requis mais non trouvé"
    exit 1
}

Write-Host ""

# Nettoyer les processus existants
Write-Step "Nettoyage des processus existants..."
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Créer le dossier logs
if (!(Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
}

# 1. Démarrer Docker Compose
Write-Step "Démarrage des services Docker (PostgreSQL, Redis, PgBouncer)..."
docker-compose down 2>$null | Out-Null
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Error "Échec du démarrage des services Docker"
    exit 1
}
Write-Success "Services Docker démarrés"

# Attendre PostgreSQL
Write-Host "   ⏳ Attente de PostgreSQL (10s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 2. Démarrer le backend complet Fastify
Write-Step "Démarrage du backend Fastify complet (port 3001)..."
$backendProcess = Start-Process -FilePath "node" -ArgumentList "backend-complete.js" -RedirectStandardOutput "logs\backend-final.log" -RedirectStandardError "logs\backend-final-error.log" -PassThru -WindowStyle Hidden
$backendProcess.Id | Out-File -FilePath ".backend-final.pid"

# Attendre que le backend soit prêt
Write-Host "   ⏳ Attente du backend..." -ForegroundColor Yellow
$backendReady = $false
for ($i = 1; $i -le 20; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 3 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Success "Backend Fastify prêt sur http://localhost:3001"
            $backendReady = $true
            break
        }
    }
    catch {
        Start-Sleep -Seconds 3
    }
}

if (-not $backendReady) {
    Write-Error "Le backend ne répond pas"
    exit 1
}

# 3. Démarrer le frontend simple (port 3000)
Write-Step "Démarrage du frontend simple (port 3000)..."
$frontendProcess = Start-Process -FilePath "node" -ArgumentList "simple-frontend.js" -RedirectStandardOutput "logs\frontend-final.log" -RedirectStandardError "logs\frontend-final-error.log" -PassThru -WindowStyle Hidden
$frontendProcess.Id | Out-File -FilePath ".frontend-final.pid"

# Attendre que le frontend soit prêt
Write-Host "   ⏳ Attente du frontend..." -ForegroundColor Yellow
$frontendReady = $false
for ($i = 1; $i -le 10; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3002" -TimeoutSec 3 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Success "Frontend simple prêt sur http://localhost:3002"
            $frontendReady = $true
            break
        }
    }
    catch {
        Start-Sleep -Seconds 2
    }
}

if (-not $frontendReady) {
    Write-Host "⚠️  Frontend ne répond pas encore" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 APPLICATION FINALE DEMARREE AVEC SUCCES !" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""

# Afficher les informations d'accès
Write-Host "🌐 ACCES A L'APPLICATION :" -ForegroundColor Cyan
Write-Host "  📱 Frontend Interface   : http://localhost:3002" -ForegroundColor White
Write-Host "  🔌 API Backend Fastify  : http://localhost:3001" -ForegroundColor White
Write-Host "  📚 Documentation API    : http://localhost:3001/docs" -ForegroundColor White
Write-Host "  🏥 Health Check         : http://localhost:3001/health" -ForegroundColor White
Write-Host "  📊 Métriques            : http://localhost:3001/metrics" -ForegroundColor White
Write-Host ""

Write-Host "🗄️  SERVICES DE DONNEES :" -ForegroundColor Cyan
Write-Host "  🐘 PostgreSQL           : localhost:5432" -ForegroundColor White
Write-Host "  🔄 PgBouncer            : localhost:6432" -ForegroundColor White
Write-Host "  🗃️  Redis                : localhost:6379" -ForegroundColor White
Write-Host "  🌐 Adminer (DB)         : http://localhost:8080" -ForegroundColor White
Write-Host "  🌐 Redis Commander      : http://localhost:8081" -ForegroundColor White
Write-Host ""

Write-Host "🔐 INFORMATIONS DE CONNEXION :" -ForegroundColor Cyan
Write-Host "  📊 Base de données      : gestion_commerciale" -ForegroundColor White
Write-Host "  👤 Utilisateur DB       : gestion_user" -ForegroundColor White
Write-Host "  🔑 Mot de passe DB      : gestion_password_secure_2024" -ForegroundColor White
Write-Host "  🔑 Mot de passe Redis   : redis_password_secure_2024" -ForegroundColor White
Write-Host ""

Write-Host "📊 ENDPOINTS API DISPONIBLES :" -ForegroundColor Cyan
Write-Host "  GET  /health           - Status du serveur" -ForegroundColor White
Write-Host "  GET  /metrics          - Métriques système" -ForegroundColor White
Write-Host "  POST /auth/login       - Authentification" -ForegroundColor White
Write-Host "  GET  /clients          - Liste des clients" -ForegroundColor White
Write-Host "  GET  /products         - Liste des produits" -ForegroundColor White
Write-Host "  GET  /dashboard/stats  - Statistiques dashboard" -ForegroundColor White
Write-Host ""

Write-Host "🧪 TESTS RAPIDES :" -ForegroundColor Cyan
Write-Host "  curl http://localhost:3001/health" -ForegroundColor White
Write-Host "  curl http://localhost:3001/clients" -ForegroundColor White
Write-Host "  curl http://localhost:3001/products" -ForegroundColor White
Write-Host "  curl http://localhost:3001/dashboard/stats" -ForegroundColor White
Write-Host ""

Write-Host "📝 LOGS :" -ForegroundColor Cyan
Write-Host "  Backend  : Get-Content logs\backend-final.log -Wait" -ForegroundColor White
Write-Host "  Frontend : Get-Content logs\frontend-final.log -Wait" -ForegroundColor White
Write-Host "  Docker   : docker-compose logs -f" -ForegroundColor White
Write-Host ""

Write-Host "🛑 ARRET :" -ForegroundColor Cyan
Write-Host "  Ctrl+C ou executez : .\stop-final-working.ps1" -ForegroundColor White
Write-Host ""

# Ouvrir les navigateurs
Write-Host "🌐 Ouverture des navigateurs..." -ForegroundColor Blue
Start-Process "http://localhost:3002"
Start-Sleep -Seconds 2
Start-Process "http://localhost:3001/docs"

Write-Host "✨ Application finale prête ! Appuyez sur Ctrl+C pour arrêter..." -ForegroundColor Yellow

# Attendre l'arrêt manuel
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
}
catch {
    Write-Host ""
    Write-Host "🛑 Arrêt en cours..." -ForegroundColor Red
    
    # Arrêter les processus
    if (Test-Path ".backend-final.pid") {
        $backendPid = Get-Content ".backend-final.pid"
        Stop-Process -Id $backendPid -Force -ErrorAction SilentlyContinue
        Remove-Item ".backend-final.pid" -ErrorAction SilentlyContinue
    }
    
    if (Test-Path ".frontend-final.pid") {
        $frontendPid = Get-Content ".frontend-final.pid"
        Stop-Process -Id $frontendPid -Force -ErrorAction SilentlyContinue
        Remove-Item ".frontend-final.pid" -ErrorAction SilentlyContinue
    }
    
    # Arrêter Docker Compose
    docker-compose down
    
    Write-Host "✅ Application finale arrêtée" -ForegroundColor Green
}
