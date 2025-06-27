# =============================================================================
# DÉMARRAGE RAPIDE PHASE 5 - ANALYTICS
# Script optimisé pour un démarrage rapide
# =============================================================================

Write-Host "🚀 DÉMARRAGE RAPIDE PHASE 5 - ANALYTICS" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta

# Fonction de vérification rapide
function Quick-Check {
    param([string]$Service, [string]$Url, [int]$Timeout = 3)
    
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $Timeout
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ $Service" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "❌ $Service" -ForegroundColor Red
        return $false
    }
}

# 1. Vérifications rapides
Write-Host "`n1. VÉRIFICATIONS RAPIDES" -ForegroundColor Yellow
$dockerOK = Quick-Check "Docker Services" "http://localhost:5432" 1
$backendOK = Quick-Check "Backend API" "http://localhost:3001/health"
$frontendOK = Quick-Check "Frontend Next.js" "http://localhost:3003" 2

# 2. Démarrage conditionnel
Write-Host "`n2. DÉMARRAGE CONDITIONNEL" -ForegroundColor Yellow

if (-not $dockerOK) {
    Write-Host "⏳ Démarrage Docker..." -ForegroundColor Yellow
    docker-compose up -d
    Start-Sleep -Seconds 8
}

if (-not $backendOK) {
    Write-Host "⏳ Démarrage Backend..." -ForegroundColor Yellow
    Start-Process -FilePath "node" -ArgumentList "production-backend.js" -WindowStyle Hidden
    Start-Sleep -Seconds 5
}

# 3. Test rapide des Analytics
Write-Host "`n3. TEST RAPIDE ANALYTICS" -ForegroundColor Yellow

try {
    # Authentification rapide
    $loginBody = @{ email = "admin@demo-tpe.fr"; password = "demo123" } | ConvertTo-Json
    $authResponse = Invoke-WebRequest -Uri "http://localhost:3001/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
    $token = ($authResponse.Content | ConvertFrom-Json).data.token
    $headers = @{ Authorization = "Bearer $token" }
    
    # Test KPI
    $kpiOK = Quick-Check "KPI Analytics" "http://localhost:3001/analytics/kpi" 
    if ($kpiOK) {
        Write-Host "📊 Analytics Phase 5: OPÉRATIONNELS" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ Analytics: EN COURS DE DÉMARRAGE" -ForegroundColor Yellow
}

# 4. Démarrage Frontend
Write-Host "`n4. DÉMARRAGE FRONTEND" -ForegroundColor Yellow

if (-not $frontendOK) {
    Write-Host "⏳ Démarrage Next.js..." -ForegroundColor Yellow
    Set-Location "frontend-nextjs-production"
    
    # Démarrage en arrière-plan pour test
    $frontendJob = Start-Job -ScriptBlock {
        Set-Location $args[0]
        npm run dev
    } -ArgumentList (Get-Location).Path
    
    Start-Sleep -Seconds 10
    
    # Vérification
    if (Quick-Check "Frontend" "http://localhost:3003") {
        Write-Host "✅ Frontend démarré avec succès" -ForegroundColor Green
        Stop-Job $frontendJob
        Remove-Job $frontendJob
    }
}

# 5. Informations finales
Write-Host "`n🎉 PHASE 5 PRÊTE!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 ACCÈS ANALYTICS:" -ForegroundColor Magenta
Write-Host "   http://localhost:3003/analytics" -ForegroundColor White
Write-Host ""
Write-Host "🔑 CONNEXION:" -ForegroundColor Cyan
Write-Host "   admin@demo-tpe.fr / demo123" -ForegroundColor White
Write-Host ""
Write-Host "⚡ FONCTIONNALITÉS:" -ForegroundColor Yellow
Write-Host "   • KPI temps réel" -ForegroundColor Gray
Write-Host "   • Graphiques interactifs" -ForegroundColor Gray
Write-Host "   • Segmentation clients" -ForegroundColor Gray
Write-Host "   • Analytics produits" -ForegroundColor Gray
Write-Host ""

# Démarrage final du frontend en mode interactif
Write-Host "🚀 Démarrage final du frontend..." -ForegroundColor Magenta
Write-Host "Appuyez sur Ctrl+C pour arrêter" -ForegroundColor Gray
Write-Host ""

try {
    npm run dev
} catch {
    Write-Host "❌ Erreur de démarrage" -ForegroundColor Red
}

Write-Host "`n👋 Application arrêtée" -ForegroundColor Yellow
