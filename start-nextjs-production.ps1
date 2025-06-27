# =============================================================================
# SCRIPT DE DÉMARRAGE - FRONTEND NEXT.JS EN PRODUCTION
# Gestion Commerciale TPE - Mode Production
# =============================================================================

Write-Host "🚀 DÉMARRAGE FRONTEND NEXT.JS EN PRODUCTION" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Frontend: Next.js (Port 3003)" -ForegroundColor Gray
Write-Host ""

# Vérifier les prérequis
Write-Host "1. VÉRIFICATION DES PRÉREQUIS" -ForegroundColor Yellow

# Vérifier Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js non installé" -ForegroundColor Red
    exit 1
}

# Vérifier que le backend fonctionne
Write-Host "`n2. VÉRIFICATION DU BACKEND" -ForegroundColor Yellow
try {
    $backendResponse = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 5
    if ($backendResponse.StatusCode -eq 200) {
        Write-Host "✅ Backend opérationnel sur le port 3001" -ForegroundColor Green
    } else {
        Write-Host "❌ Backend non accessible" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Backend non accessible - Démarrez d'abord le backend" -ForegroundColor Red
    Write-Host "   Commande: .\start-production-backend.ps1" -ForegroundColor Yellow
    exit 1
}

# Aller dans le répertoire frontend
Write-Host "`n3. PRÉPARATION DU FRONTEND" -ForegroundColor Yellow
Set-Location "frontend-nextjs-production"

# Vérifier les dépendances
if (Test-Path "node_modules") {
    Write-Host "✅ Dépendances installées" -ForegroundColor Green
} else {
    Write-Host "📦 Installation des dépendances..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Échec de l'installation des dépendances" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Dépendances installées" -ForegroundColor Green
}

# Build de production
Write-Host "`n4. BUILD DE PRODUCTION" -ForegroundColor Yellow
if (Test-Path ".next") {
    Write-Host "🔄 Nettoyage du build précédent..." -ForegroundColor Blue
    Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
}

Write-Host "🏗️ Création du build de production..." -ForegroundColor Blue
$env:NODE_ENV = "production"
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Échec du build de production" -ForegroundColor Red
    Set-Location ".."
    exit 1
}
Write-Host "✅ Build de production créé" -ForegroundColor Green

# Démarrage en mode production
Write-Host "`n5. DÉMARRAGE EN MODE PRODUCTION" -ForegroundColor Yellow
Write-Host "🚀 Démarrage du serveur Next.js en production..." -ForegroundColor Blue

# Démarrer le serveur de production
$process = Start-Process -FilePath "npm" -ArgumentList "run", "start" -PassThru -WindowStyle Hidden

Write-Host "✅ Serveur démarré: PID $($process.Id)" -ForegroundColor Green
Write-Host "   Port: 3003" -ForegroundColor Gray
Write-Host "   Mode: Production" -ForegroundColor Gray
Write-Host "   PID: $($process.Id)" -ForegroundColor Gray

# Attendre que le serveur soit prêt
Write-Host "`nAttente du démarrage du serveur..." -ForegroundColor Yellow
$maxAttempts = 15
$attempt = 0
$serverReady = $false

while ($attempt -lt $maxAttempts -and -not $serverReady) {
    $attempt++
    Start-Sleep -Seconds 2
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3003" -TimeoutSec 3 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            $serverReady = $true
            Write-Host "✅ Serveur prêt" -ForegroundColor Green
        }
    } catch {
        Write-Host "   Tentative $attempt/$maxAttempts..." -ForegroundColor Gray
    }
}

# Retour au répertoire racine
Set-Location ".."

if ($serverReady) {
    Write-Host "`n6. FRONTEND NEXT.JS EN PRODUCTION OPÉRATIONNEL" -ForegroundColor Green
    Write-Host "===============================================" -ForegroundColor Green
    
    Write-Host "URLs disponibles:" -ForegroundColor White
    Write-Host "   Application: http://localhost:3003" -ForegroundColor Cyan
    Write-Host "   Page de test: http://localhost:3003/test" -ForegroundColor Cyan
    Write-Host "   Backend API: http://localhost:3001" -ForegroundColor Cyan
    
    Write-Host "`nIdentifiants de test:" -ForegroundColor White
    Write-Host "   Email: admin@demo-tpe.fr" -ForegroundColor Cyan
    Write-Host "   Mot de passe: demo123" -ForegroundColor Cyan
    
    Write-Host "`nPour arrêter le frontend:" -ForegroundColor White
    Write-Host "   Get-Process -Id $($process.Id) | Stop-Process -Force" -ForegroundColor Gray
    
    Write-Host "`n🎉 FRONTEND NEXT.JS EN PRODUCTION PRÊT!" -ForegroundColor Green
    
    # Ouvrir le navigateur
    Write-Host "`nOuverture du navigateur..." -ForegroundColor Blue
    Start-Process "http://localhost:3003"
    
} else {
    Write-Host "`n❌ ÉCHEC DU DÉMARRAGE DU SERVEUR" -ForegroundColor Red
    Write-Host "Vérifiez les logs et les dépendances" -ForegroundColor Red
    
    # Arrêter le processus si échec
    if ($process -and -not $process.HasExited) {
        $process.Kill()
    }
    exit 1
}
