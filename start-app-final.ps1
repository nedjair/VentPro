# Script de démarrage final avec gestion des ports
Write-Host "=== DEMARRAGE FINAL APPLICATION GESTION COMMERCIALE TPE ===" -ForegroundColor Green
Write-Host ""

# Arrêter tous les processus Node.js existants
Write-Host "Nettoyage des processus existants..." -ForegroundColor Blue
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Créer le dossier logs
if (!(Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
}

# 1. Démarrer le backend sur le port 3003
Write-Host "1. Demarrage du backend API (port 3003)..." -ForegroundColor Blue
Start-Process -FilePath "node" -ArgumentList "minimal-backend-3003.js" -RedirectStandardOutput "logs\backend-3003.log" -RedirectStandardError "logs\backend-3003-error.log" -PassThru -WindowStyle Hidden | ForEach-Object { $_.Id | Out-File -FilePath ".backend-3003.pid" }

# Attendre que le backend soit prêt
Write-Host "   Attente du backend..." -ForegroundColor Yellow
$backendReady = $false
for ($i = 1; $i -le 10; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3003/health" -TimeoutSec 3 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Backend API pret sur port 3003 !" -ForegroundColor Green
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

# 2. Le frontend Next.js est déjà démarré sur le port 3001
Write-Host "2. Frontend Next.js deja demarre sur port 3001" -ForegroundColor Green

# Vérifier que le frontend répond
Write-Host "   Verification du frontend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001" -TimeoutSec 5 -UseBasicParsing -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Frontend Next.js pret sur port 3001 !" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Frontend repond mais status: $($response.StatusCode)" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "⚠️  Frontend ne repond pas sur le port 3001" -ForegroundColor Yellow
    Write-Host "   Assurez-vous qu'il est demarre avec: yarn dev" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=== APPLICATION PRETE ===" -ForegroundColor Green
Write-Host ""

# Afficher les informations d'accès
Write-Host "🌐 ACCES A L'APPLICATION :" -ForegroundColor Cyan
Write-Host "  Frontend Next.js    : http://localhost:3001" -ForegroundColor White
Write-Host "  Backend API         : http://localhost:3003" -ForegroundColor White
Write-Host "  Health Check        : http://localhost:3003/health" -ForegroundColor White
Write-Host "  Metriques           : http://localhost:3003/metrics" -ForegroundColor White
Write-Host ""

Write-Host "🗄️  SERVICES DOCKER :" -ForegroundColor Cyan
Write-Host "  Base de donnees     : http://localhost:8080 (Adminer)" -ForegroundColor White
Write-Host "  Cache Redis         : http://localhost:8081 (Redis Commander)" -ForegroundColor White
Write-Host ""

Write-Host "📊 ENDPOINTS API DISPONIBLES :" -ForegroundColor Cyan
Write-Host "  GET  /health           - Status du serveur" -ForegroundColor White
Write-Host "  GET  /metrics          - Metriques systeme" -ForegroundColor White
Write-Host "  POST /auth/login       - Authentification" -ForegroundColor White
Write-Host "  GET  /clients          - Liste des clients" -ForegroundColor White
Write-Host "  GET  /products         - Liste des produits" -ForegroundColor White
Write-Host "  GET  /dashboard/stats  - Statistiques dashboard" -ForegroundColor White
Write-Host ""

Write-Host "🧪 TESTS RAPIDES :" -ForegroundColor Cyan
Write-Host "  curl http://localhost:3003/health" -ForegroundColor White
Write-Host "  curl http://localhost:3003/clients" -ForegroundColor White
Write-Host "  curl http://localhost:3003/products" -ForegroundColor White
Write-Host ""

Write-Host "📝 LOGS :" -ForegroundColor Cyan
Write-Host "  Backend  : Get-Content logs\backend-3003.log -Wait" -ForegroundColor White
Write-Host "  Frontend : Voir le terminal ou yarn dev est lance" -ForegroundColor White
Write-Host ""

Write-Host "🛑 ARRET :" -ForegroundColor Cyan
Write-Host "  Backend  : Get-Process -Id (Get-Content .backend-3003.pid) | Stop-Process" -ForegroundColor White
Write-Host "  Frontend : Ctrl+C dans le terminal yarn dev" -ForegroundColor White
Write-Host ""

# Ouvrir le navigateur sur le frontend
Write-Host "Ouverture du navigateur sur le frontend..." -ForegroundColor Blue
Start-Process "http://localhost:3001"

Write-Host "🎉 Application prete ! Frontend sur :3001, Backend API sur :3003" -ForegroundColor Green
Write-Host ""
