#!/usr/bin/env pwsh

Write-Host "Redemarrage du Frontend avec Corrections PWA" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Configuration
$FRONTEND_PORT = 3003
$FRONTEND_DIR = "frontend-nextjs-production"

# Fonction pour tuer les processus sur un port
function Stop-ProcessOnPort {
    param([int]$Port)
    
    Write-Host "🔍 Vérification du port $Port..." -ForegroundColor Yellow
    
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if ($connections) {
            foreach ($connection in $connections) {
                $processId = $connection.OwningProcess
                Write-Host "⚠️  Arrêt du processus $processId sur le port $Port..." -ForegroundColor Yellow
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            }
            Start-Sleep -Seconds 2
        } else {
            Write-Host "✅ Port $Port libre" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️  Impossible de vérifier le port $Port" -ForegroundColor Yellow
    }
}

# Arrêter les processus existants
Write-Host "`n🛑 Arrêt des processus existants..." -ForegroundColor Yellow
Stop-ProcessOnPort -Port $FRONTEND_PORT

# Vérifier que le backend est accessible
Write-Host "`n🔍 Vérification du backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend accessible sur le port 3001" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Backend répond mais avec le statut: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Backend non accessible sur le port 3001!" -ForegroundColor Red
    Write-Host "   Veuillez démarrer le backend avec: node production-backend.js" -ForegroundColor Yellow
    Write-Host "   Ou utilisez: powershell -ExecutionPolicy Bypass -File start-app-unified.ps1" -ForegroundColor Yellow
}

# Aller dans le répertoire frontend
if (Test-Path $FRONTEND_DIR) {
    Set-Location $FRONTEND_DIR
    Write-Host "✅ Répertoire frontend trouvé" -ForegroundColor Green
} else {
    Write-Host "❌ Répertoire frontend non trouvé: $FRONTEND_DIR" -ForegroundColor Red
    exit 1
}

# Nettoyer le cache Next.js
Write-Host "`n🧹 Nettoyage du cache Next.js..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
    Write-Host "✅ Cache Next.js nettoyé" -ForegroundColor Green
}

# Vérifier les dépendances
Write-Host "`n📦 Vérification des dépendances..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "✅ Dépendances installées" -ForegroundColor Green
} else {
    Write-Host "⚠️  Installation des dépendances..." -ForegroundColor Yellow
    npm install
}

# Démarrer le frontend
Write-Host "`n🚀 Démarrage du frontend sur le port $FRONTEND_PORT..." -ForegroundColor Green
Write-Host "   URL: http://localhost:$FRONTEND_PORT" -ForegroundColor Cyan
Write-Host "   Mode: Développement (PWA désactivé pour réduire les erreurs)" -ForegroundColor Cyan
Write-Host "`n📝 Corrections appliquées:" -ForegroundColor Yellow
Write-Host "   - PWA désactivé en mode développement" -ForegroundColor White
Write-Host "   - Vérification de connexion moins agressive" -ForegroundColor White
Write-Host "   - Suppression des PWAProvider dupliqués" -ForegroundColor White
Write-Host "   - Utilisation de navigator.onLine au lieu de requêtes répétées" -ForegroundColor White

Write-Host "`n⏳ Demarrage en cours..." -ForegroundColor Yellow

# Démarrer Next.js
npm run dev
