# =============================================================================
# SCRIPT DE DÉMARRAGE RAPIDE - GESTION COMMERCIALE TPE
# Version: 4.0 - Avec Next.js Production
# 
# DESCRIPTION:
# Démarrage rapide pour usage quotidien avec Next.js en production
# - Backend Fastify (production-backend.js sur port 3001)
# - Frontend Next.js (frontend-nextjs-production sur port 3003)
# - Vérifications minimales pour un démarrage rapide
# 
# USAGE:
# .\start-quick-nextjs.ps1                 # Démarrage rapide complet
# .\start-quick-nextjs.ps1 -SkipBuild      # Sans rebuild du frontend
# .\start-quick-nextjs.ps1 -Verbose        # Affichage détaillé
# =============================================================================

param(
    [switch]$SkipBuild,       # Ignorer le rebuild du frontend
    [switch]$Verbose,         # Affichage détaillé
    [switch]$Force            # Forcer le redémarrage
)

# Configuration
$BackendPort = 3001
$FrontendPort = 3003
$BackendFile = "production-backend.js"
$FrontendDir = "frontend-nextjs-production"

function Write-Status {
    param([string]$Message, [string]$Type = "INFO")
    $colors = @{ "SUCCESS" = "Green"; "ERROR" = "Red"; "WARNING" = "Yellow"; "INFO" = "Cyan"; "LOADING" = "Yellow" }
    $icons = @{ "SUCCESS" = "✅"; "ERROR" = "❌"; "WARNING" = "⚠️"; "INFO" = "ℹ️"; "LOADING" = "⏳" }
    Write-Host "$($icons[$Type]) $Message" -ForegroundColor $colors[$Type]
}

function Test-ServicePort {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    } catch {
        return $false
    }
}

# En-tête
Clear-Host
Write-Host "🚀 DÉMARRAGE RAPIDE - GESTION COMMERCIALE TPE" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Arrêter les services existants si demandé
if ($Force) {
    Write-Status "Arrêt des services existants..." "LOADING"
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
    Write-Status "Services arrêtés" "SUCCESS"
}

# 1. Vérifier et démarrer le backend
Write-Host "1. BACKEND DE PRODUCTION" -ForegroundColor Yellow
if (Test-ServicePort $BackendPort) {
    try {
        $healthResponse = Invoke-WebRequest -Uri "http://localhost:$BackendPort/health" -UseBasicParsing -TimeoutSec 3
        if ($healthResponse.StatusCode -eq 200) {
            Write-Status "Backend déjà opérationnel" "SUCCESS"
        }
    } catch {
        Write-Status "Redémarrage du backend..." "LOADING"
        Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        
        $backendProcess = Start-Process -FilePath "node" -ArgumentList $BackendFile -PassThru -WindowStyle Hidden
        Write-Status "Backend redémarré: PID $($backendProcess.Id)" "SUCCESS"
        Start-Sleep -Seconds 5
    }
} else {
    Write-Status "Démarrage du backend..." "LOADING"
    $backendProcess = Start-Process -FilePath "node" -ArgumentList $BackendFile -PassThru -WindowStyle Hidden
    Write-Status "Backend démarré: PID $($backendProcess.Id)" "SUCCESS"
    Start-Sleep -Seconds 5
}

# Vérifier que le backend répond
$backendReady = $false
for ($i = 1; $i -le 10; $i++) {
    try {
        $healthResponse = Invoke-WebRequest -Uri "http://localhost:$BackendPort/health" -UseBasicParsing -TimeoutSec 3
        if ($healthResponse.StatusCode -eq 200) {
            $backendReady = $true
            Write-Status "Backend opérationnel" "SUCCESS"
            break
        }
    } catch {
        if ($Verbose) { Write-Host "   Tentative $i/10..." -ForegroundColor Gray }
        Start-Sleep -Seconds 2
    }
}

if (-not $backendReady) {
    Write-Status "Échec du démarrage du backend" "ERROR"
    exit 1
}

# 2. Vérifier et démarrer le frontend Next.js
Write-Host "`n2. FRONTEND NEXT.JS" -ForegroundColor Yellow
if (Test-ServicePort $FrontendPort) {
    try {
        $frontendResponse = Invoke-WebRequest -Uri "http://localhost:$FrontendPort" -UseBasicParsing -TimeoutSec 3
        if ($frontendResponse.StatusCode -eq 200) {
            Write-Status "Frontend déjà opérationnel" "SUCCESS"
        }
    } catch {
        Write-Status "Redémarrage du frontend..." "LOADING"
        $processId = (Get-NetTCPConnection -LocalPort $FrontendPort -ErrorAction SilentlyContinue).OwningProcess
        if ($processId) {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
        }
    }
}

if (-not (Test-ServicePort $FrontendPort)) {
    Set-Location $FrontendDir
    
    # Configuration d'environnement
    $envContent = @"
NEXT_PUBLIC_API_BASE_URL=http://localhost:$BackendPort
NEXT_PUBLIC_API_URL=http://localhost:$BackendPort
NODE_ENV=production
"@
    $envContent | Out-File -FilePath ".env.local" -Encoding UTF8
    
    # Build si nécessaire
    if (-not $SkipBuild -or -not (Test-Path ".next")) {
        Write-Status "Build de production Next.js..." "LOADING"
        $env:NODE_ENV = "production"
        npm run build | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Status "Build terminé" "SUCCESS"
        } else {
            Write-Status "Échec du build" "ERROR"
            Set-Location ..
            exit 1
        }
    }
    
    # Démarrer le serveur de production
    Write-Status "Démarrage du serveur Next.js..." "LOADING"
    $frontendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "start" -PassThru -WindowStyle Hidden
    Write-Status "Frontend démarré: PID $($frontendProcess.Id)" "SUCCESS"
    
    Set-Location ..
    
    # Attendre que le frontend soit prêt
    $frontendReady = $false
    for ($i = 1; $i -le 15; $i++) {
        try {
            $frontendResponse = Invoke-WebRequest -Uri "http://localhost:$FrontendPort" -UseBasicParsing -TimeoutSec 3
            if ($frontendResponse.StatusCode -eq 200) {
                $frontendReady = $true
                Write-Status "Frontend opérationnel" "SUCCESS"
                break
            }
        } catch {
            if ($Verbose) { Write-Host "   Tentative $i/15..." -ForegroundColor Gray }
            Start-Sleep -Seconds 2
        }
    }
    
    if (-not $frontendReady) {
        Write-Status "Frontend en cours de démarrage..." "WARNING"
    }
}

# 3. Tests rapides
Write-Host "`n3. VÉRIFICATIONS RAPIDES" -ForegroundColor Yellow

# Test page d'accueil
try {
    $homeResponse = Invoke-WebRequest -Uri "http://localhost:$FrontendPort" -UseBasicParsing -TimeoutSec 5
    Write-Status "Page d'accueil: Accessible" "SUCCESS"
} catch {
    Write-Status "Page d'accueil: Problème" "WARNING"
}

# Test page d'hydratation
try {
    $testResponse = Invoke-WebRequest -Uri "http://localhost:$FrontendPort/test" -UseBasicParsing -TimeoutSec 5
    Write-Status "Test d'hydratation: Accessible" "SUCCESS"
} catch {
    Write-Status "Test d'hydratation: Problème" "WARNING"
}

# Résumé final
Write-Host "`n" + "="*50 -ForegroundColor Cyan
Write-Host "🎉 DÉMARRAGE RAPIDE TERMINÉ" -ForegroundColor Green
Write-Host ""
Write-Host "URLS DISPONIBLES:" -ForegroundColor Cyan
Write-Host "   🌐 Application: http://localhost:$FrontendPort" -ForegroundColor White
Write-Host "   🔧 Backend API: http://localhost:$BackendPort" -ForegroundColor White
Write-Host "   🧪 Test Hydratation: http://localhost:$FrontendPort/test" -ForegroundColor White
Write-Host ""
Write-Host "IDENTIFIANTS:" -ForegroundColor Cyan
Write-Host "   📧 Email: admin@demo-tpe.fr" -ForegroundColor White
Write-Host "   🔑 Mot de passe: demo123" -ForegroundColor White
Write-Host ""
Write-Host "COMMANDES UTILES:" -ForegroundColor Yellow
Write-Host "   🛑 Arrêter: Get-Process -Name 'node' | Stop-Process -Force" -ForegroundColor Gray
Write-Host "   📊 Vérifier: .\verification-production-complete.ps1" -ForegroundColor Gray
Write-Host ""

# Ouvrir le navigateur
Write-Status "Ouverture du navigateur..." "LOADING"
Start-Process "http://localhost:$FrontendPort"

Write-Host "✨ APPLICATION PRÊTE!" -ForegroundColor Green
