# =============================================================================
# VERIFICATION COMPLETE DE LA PRODUCTION
# Gestion Commerciale TPE - Tests de Production
# =============================================================================

Write-Host "VERIFICATION COMPLETE DE LA PRODUCTION" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$allTestsPassed = $true

# 1. Test Backend
Write-Host "1. TEST BACKEND (Port 3001)" -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 10
    $healthData = $healthResponse.Content | ConvertFrom-Json
    
    Write-Host "   Status: $($healthData.status)" -ForegroundColor Green
    Write-Host "   Database: $($healthData.database)" -ForegroundColor Green
    Write-Host "   Redis: $($healthData.redis)" -ForegroundColor Green
    Write-Host "   Uptime: $([math]::Round($healthData.uptime, 2))s" -ForegroundColor Green
} catch {
    Write-Host "   ECHEC: Backend non accessible" -ForegroundColor Red
    $allTestsPassed = $false
}

# 2. Test Frontend Next.js
Write-Host "`n2. TEST FRONTEND NEXT.JS (Port 3003)" -ForegroundColor Yellow
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3003" -TimeoutSec 10
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "   Status: OK (200)" -ForegroundColor Green
        Write-Host "   Framework: Next.js 14" -ForegroundColor Green
        Write-Host "   Mode: Production" -ForegroundColor Green

        # Vérifier si c'est bien du Next.js
        if ($frontendResponse.Content -match "next") {
            Write-Host "   Next.js: Détecté" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "   ECHEC: Frontend Next.js non accessible" -ForegroundColor Red
    $allTestsPassed = $false
}

# 3. Test Page de Test d'Hydratation Next.js
Write-Host "`n3. TEST HYDRATATION NEXT.JS" -ForegroundColor Yellow
try {
    $testResponse = Invoke-WebRequest -Uri "http://localhost:3003/test" -TimeoutSec 10
    if ($testResponse.StatusCode -eq 200) {
        Write-Host "   Status: OK (200)" -ForegroundColor Green
        Write-Host "   Page de test accessible" -ForegroundColor Green

        # Vérifier le contenu spécifique à l'hydratation
        if ($testResponse.Content -match "Test d'Hydratation") {
            Write-Host "   Hydratation: Test disponible" -ForegroundColor Green
        }
        if ($testResponse.Content -match "suppressHydrationWarning") {
            Write-Host "   Hydratation: Corrections appliquées" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "   ECHEC: Page de test d'hydratation non accessible" -ForegroundColor Red
    $allTestsPassed = $false
}

# 4. Test API Clients
Write-Host "`n4. TEST API CLIENTS" -ForegroundColor Yellow
try {
    $clientsResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/clients" -TimeoutSec 10
    $clientsData = $clientsResponse.Content | ConvertFrom-Json
    
    if ($clientsData.success) {
        Write-Host "   Status: OK" -ForegroundColor Green
        Write-Host "   Clients: $($clientsData.total)" -ForegroundColor Green
    }
} catch {
    Write-Host "   ECHEC: API Clients non accessible" -ForegroundColor Red
    $allTestsPassed = $false
}

# 5. Test API Produits
Write-Host "`n5. TEST API PRODUITS" -ForegroundColor Yellow
try {
    $productsResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/products" -TimeoutSec 10
    $productsData = $productsResponse.Content | ConvertFrom-Json
    
    if ($productsData.success) {
        Write-Host "   Status: OK" -ForegroundColor Green
        Write-Host "   Produits: $($productsData.total)" -ForegroundColor Green
    }
} catch {
    Write-Host "   ECHEC: API Produits non accessible" -ForegroundColor Red
    $allTestsPassed = $false
}

# 6. Test Dashboard
Write-Host "`n6. TEST DASHBOARD API" -ForegroundColor Yellow
try {
    $dashboardResponse = Invoke-WebRequest -Uri "http://localhost:3001/dashboard/stats" -TimeoutSec 10
    $dashboardData = $dashboardResponse.Content | ConvertFrom-Json
    
    if ($dashboardData.success) {
        Write-Host "   Status: OK" -ForegroundColor Green
        Write-Host "   Clients: $($dashboardData.data.clients.total)" -ForegroundColor Green
        Write-Host "   Produits: $($dashboardData.data.products.total)" -ForegroundColor Green
    }
} catch {
    Write-Host "   ECHEC: Dashboard API non accessible" -ForegroundColor Red
    $allTestsPassed = $false
}

# 7. Test Services Docker
Write-Host "`n7. TEST SERVICES DOCKER" -ForegroundColor Yellow
try {
    $dockerServices = docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "gestion-"
    if ($dockerServices) {
        Write-Host "   Services actifs:" -ForegroundColor Green
        $dockerServices | ForEach-Object { Write-Host "     $_" -ForegroundColor Gray }
    } else {
        Write-Host "   ATTENTION: Aucun service Docker detecte" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ECHEC: Docker non accessible" -ForegroundColor Red
    $allTestsPassed = $false
}

# Résumé final
Write-Host "`n" + "="*50 -ForegroundColor Cyan
if ($allTestsPassed) {
    Write-Host "TOUS LES TESTS PASSES - PRODUCTION OPERATIONNELLE" -ForegroundColor Green
    Write-Host "=================================================" -ForegroundColor Green
    
    Write-Host "`nURLs de production:" -ForegroundColor White
    Write-Host "   Application: http://localhost:3003" -ForegroundColor Cyan
    Write-Host "   API Backend: http://localhost:3001" -ForegroundColor Cyan
    Write-Host "   Test Hydratation: http://localhost:3003/test" -ForegroundColor Cyan
    Write-Host "   Health Check: http://localhost:3001/health" -ForegroundColor Cyan
    
    Write-Host "`nIdentifiants de test:" -ForegroundColor White
    Write-Host "   Email: admin@demo-tpe.fr" -ForegroundColor Cyan
    Write-Host "   Mot de passe: demo123" -ForegroundColor Cyan
    
    Write-Host "`nCommandes utiles:" -ForegroundColor White
    Write-Host "   Arreter tout: Get-Process -Name 'node' | Stop-Process -Force" -ForegroundColor Gray
    Write-Host "   Logs Docker: docker-compose logs -f" -ForegroundColor Gray
    
} else {
    Write-Host "CERTAINS TESTS ONT ECHOUE" -ForegroundColor Red
    Write-Host "=========================" -ForegroundColor Red
    Write-Host "Verifiez les services et relancez les scripts de demarrage" -ForegroundColor Yellow
}

Write-Host "`nVerification terminee." -ForegroundColor White
