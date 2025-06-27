# Script de test automatise pour l'application Next.js
# Gestion Commerciale TPE - Tests Frontend et Backend

Write-Host "Tests automatises - Gestion Commerciale TPE (Next.js)" -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Green

# Fonction pour tester une URL
function Test-Url {
    param([string]$Url, [string]$Name)

    try {
        $response = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec 10 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "OK $Name (Status $($response.StatusCode))" -ForegroundColor Green
            return $true
        } else {
            Write-Host "WARN $Name Status $($response.StatusCode)" -ForegroundColor Yellow
            return $false
        }
    } catch {
        Write-Host "ERROR $Name - $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction pour tester une API JSON
function Test-ApiEndpoint {
    param([string]$Url, [string]$Name)

    try {
        $response = Invoke-RestMethod -Uri $Url -Method GET -TimeoutSec 10
        Write-Host "OK $Name" -ForegroundColor Green
        return $response
    } catch {
        Write-Host "ERROR $Name - $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

Write-Host "🔍 Phase 1: Tests de connectivité..." -ForegroundColor Cyan
Write-Host ""

# Test du backend
Write-Host "📡 Tests Backend (port 3001):" -ForegroundColor White
$backendOk = Test-Url -Url "http://localhost:3001/health" -Name "Health Check"
$metricsOk = Test-Url -Url "http://localhost:3001/metrics" -Name "Métriques"

Write-Host ""

# Test du frontend
Write-Host "🌐 Tests Frontend (port 3002):" -ForegroundColor White
$frontendOk = Test-Url -Url "http://localhost:3002" -Name "Page d'accueil"
$clientsPageOk = Test-Url -Url "http://localhost:3002/clients" -Name "Page Clients"
$productsPageOk = Test-Url -Url "http://localhost:3002/products" -Name "Page Produits"

Write-Host ""
Write-Host "🧪 Phase 2: Tests API..." -ForegroundColor Cyan
Write-Host ""

if ($backendOk) {
    Write-Host "📊 Tests des endpoints API:" -ForegroundColor White
    
    # Test Health
    $health = Test-ApiEndpoint -Url "http://localhost:3001/health" -Name "API Health"
    if ($health) {
        Write-Host "   Status: $($health.status)" -ForegroundColor Gray
        Write-Host "   Uptime: $($health.uptime)s" -ForegroundColor Gray
    }
    
    # Test Dashboard Stats
    $dashboardStats = Test-ApiEndpoint -Url "http://localhost:3001/dashboard/stats" -Name "API Dashboard Stats"
    if ($dashboardStats -and $dashboardStats.success) {
        Write-Host "   Clients: $($dashboardStats.data.clients.total)" -ForegroundColor Gray
        Write-Host "   Produits: $($dashboardStats.data.products.total)" -ForegroundColor Gray
    }
    
    # Test Clients
    $clients = Test-ApiEndpoint -Url "http://localhost:3001/clients" -Name "API Clients"
    if ($clients -and $clients.success) {
        Write-Host "   Clients trouvés: $($clients.data.data.Count)" -ForegroundColor Gray
    }
    
    # Test Products
    $products = Test-ApiEndpoint -Url "http://localhost:3001/products" -Name "API Produits"
    if ($products -and $products.success) {
        Write-Host "   Produits trouvés: $($products.data.data.Count)" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  Backend non accessible - Tests API ignorés" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 Phase 3: Résumé des tests..." -ForegroundColor Cyan
Write-Host ""

# Calcul du score
$totalTests = 5
$passedTests = 0

if ($backendOk) { $passedTests++ }
if ($frontendOk) { $passedTests++ }
if ($clientsPageOk) { $passedTests++ }
if ($productsPageOk) { $passedTests++ }
if ($metricsOk) { $passedTests++ }

$score = [math]::Round(($passedTests / $totalTests) * 100, 0)

Write-Host "🎯 Score global: $passedTests/$totalTests tests réussis ($score%)" -ForegroundColor $(if ($score -ge 80) { "Green" } elseif ($score -ge 60) { "Yellow" } else { "Red" })
Write-Host ""

# Détails des résultats
Write-Host "📊 Détails des résultats:" -ForegroundColor White
Write-Host "   Backend Health: $(if ($backendOk) { '✅ OK' } else { '❌ KO' })" -ForegroundColor $(if ($backendOk) { "Green" } else { "Red" })
Write-Host "   Frontend Home: $(if ($frontendOk) { '✅ OK' } else { '❌ KO' })" -ForegroundColor $(if ($frontendOk) { "Green" } else { "Red" })
Write-Host "   Page Clients: $(if ($clientsPageOk) { '✅ OK' } else { '❌ KO' })" -ForegroundColor $(if ($clientsPageOk) { "Green" } else { "Red" })
Write-Host "   Page Produits: $(if ($productsPageOk) { '✅ OK' } else { '❌ KO' })" -ForegroundColor $(if ($productsPageOk) { "Green" } else { "Red" })
Write-Host "   Métriques: $(if ($metricsOk) { '✅ OK' } else { '❌ KO' })" -ForegroundColor $(if ($metricsOk) { "Green" } else { "Red" })

Write-Host ""

# Recommandations
if ($score -lt 100) {
    Write-Host "💡 Recommandations:" -ForegroundColor Yellow
    
    if (-not $backendOk) {
        Write-Host "   • Vérifiez que le backend est démarré sur le port 3001" -ForegroundColor Gray
        Write-Host "   • Lancez: node minimal-backend.js" -ForegroundColor Gray
    }
    
    if (-not $frontendOk) {
        Write-Host "   • Vérifiez que Next.js est démarré sur le port 3002" -ForegroundColor Gray
        Write-Host "   • Lancez: npm run dev dans frontend-nextjs-production/" -ForegroundColor Gray
    }
    
    if (-not $clientsPageOk -or -not $productsPageOk) {
        Write-Host "   • Vérifiez les routes Next.js et les composants" -ForegroundColor Gray
    }
} else {
    Write-Host "🎉 Tous les tests sont réussis! L'application fonctionne parfaitement." -ForegroundColor Green
}

Write-Host ""
Write-Host "🔗 Liens utiles:" -ForegroundColor White
Write-Host "   • Frontend: http://localhost:3002" -ForegroundColor Cyan
Write-Host "   • Backend Health: http://localhost:3001/health" -ForegroundColor Cyan
Write-Host "   • Backend Metrics: http://localhost:3001/metrics" -ForegroundColor Cyan

Write-Host ""
Write-Host "✅ Tests terminés!" -ForegroundColor Green
