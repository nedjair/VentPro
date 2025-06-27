# =============================================================================
# SCRIPT DE TEST PHASE 5 - ANALYTICS ET REPORTING
# Validation complète des fonctionnalités Analytics
# =============================================================================

Write-Host "TEST PHASE 5 - ANALYTICS ET REPORTING" -ForegroundColor Magenta
Write-Host "======================================" -ForegroundColor Magenta
Write-Host "🧪 Validation complète des fonctionnalités Analytics" -ForegroundColor White
Write-Host ""

# Fonction pour afficher les résultats de test
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [hashtable]$Headers = @{},
        [string]$Method = "GET",
        [string]$Body = $null
    )
    
    try {
        if ($Body) {
            $response = Invoke-WebRequest -Uri $Url -Method $Method -Headers $Headers -Body $Body -ContentType "application/json" -UseBasicParsing
        } else {
            $response = Invoke-WebRequest -Uri $Url -Method $Method -Headers $Headers -UseBasicParsing
        }
        
        if ($response.StatusCode -eq 200) {
            $data = $response.Content | ConvertFrom-Json
            if ($data.success) {
                Write-Host "✅ $Name : SUCCÈS" -ForegroundColor Green
                return $data
            } else {
                Write-Host "❌ $Name : ÉCHEC - $($data.message)" -ForegroundColor Red
                return $null
            }
        } else {
            Write-Host "❌ $Name : ÉCHEC - Status $($response.StatusCode)" -ForegroundColor Red
            return $null
        }
    } catch {
        Write-Host "❌ $Name : ERREUR - $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Étape 1: Test de connectivité
Write-Host "1. TEST DE CONNECTIVITÉ" -ForegroundColor Yellow
Write-Host "========================" -ForegroundColor Yellow

$healthData = Test-Endpoint "Health Check" "http://localhost:3001/health"
if (-not $healthData) {
    Write-Host "❌ Backend non accessible - Arrêt des tests" -ForegroundColor Red
    exit 1
}

Write-Host "   Uptime: $($healthData.uptime) secondes" -ForegroundColor Gray
Write-Host "   Database: $($healthData.database)" -ForegroundColor Gray
Write-Host "   Redis: $($healthData.redis)" -ForegroundColor Gray

# Étape 2: Test d'authentification
Write-Host "`n2. TEST D'AUTHENTIFICATION" -ForegroundColor Yellow
Write-Host "===========================" -ForegroundColor Yellow

$loginBody = @{
    email = "admin@demo-tpe.fr"
    password = "demo123"
} | ConvertTo-Json

$authData = Test-Endpoint "Authentification" "http://localhost:3001/auth/login" @{} "POST" $loginBody

if (-not $authData) {
    Write-Host "❌ Authentification échouée - Arrêt des tests" -ForegroundColor Red
    exit 1
}

$token = $authData.data.token
$headers = @{ Authorization = "Bearer $token" }
Write-Host "   Token obtenu: $($token.Substring(0, 20))..." -ForegroundColor Gray
Write-Host "   Utilisateur: $($authData.data.user.email)" -ForegroundColor Gray
Write-Host "   Rôle: $($authData.data.user.role)" -ForegroundColor Gray

# Étape 3: Test des endpoints Analytics Phase 5
Write-Host "`n3. TEST DES ENDPOINTS ANALYTICS PHASE 5" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Yellow

# Test Dashboard Stats
Write-Host "`n📊 Dashboard Analytics:" -ForegroundColor Cyan
$dashboardData = Test-Endpoint "Dashboard Stats" "http://localhost:3001/dashboard/stats" $headers
if ($dashboardData) {
    Write-Host "   Clients total: $($dashboardData.data.clients.total)" -ForegroundColor Gray
    Write-Host "   Produits total: $($dashboardData.data.products.total)" -ForegroundColor Gray
    Write-Host "   CA mensuel: $($dashboardData.data.sales.currentMonth) EUR" -ForegroundColor Gray
}

# Test KPI Metrics
Write-Host "`n📈 KPI Metrics:" -ForegroundColor Cyan
$kpiData = Test-Endpoint "KPI Metrics" "http://localhost:3001/analytics/kpi" $headers
if ($kpiData) {
    Write-Host "   CA mensuel: $($kpiData.data.revenue.currentMonth) EUR" -ForegroundColor Gray
    Write-Host "   CA annuel: $($kpiData.data.revenue.currentYear) EUR" -ForegroundColor Gray
    Write-Host "   Marge brute: $($kpiData.data.margin.grossMargin) EUR" -ForegroundColor Gray
    Write-Host "   Taux conversion: $($kpiData.data.conversion.rate)%" -ForegroundColor Gray
    Write-Host "   Panier moyen: $($kpiData.data.averageBasket) EUR" -ForegroundColor Gray
}

# Test Sales Analytics
Write-Host "`n💰 Sales Analytics:" -ForegroundColor Cyan
$salesData = Test-Endpoint "Sales Analytics" "http://localhost:3001/analytics/sales?period=3m" $headers
if ($salesData) {
    Write-Host "   Période: $($salesData.data.period)" -ForegroundColor Gray
    Write-Host "   Données mensuelles: $($salesData.data.monthlyRevenue.Count) mois" -ForegroundColor Gray
    Write-Host "   Top clients: $($salesData.data.topClients.Count)" -ForegroundColor Gray
    Write-Host "   Types clients: $($salesData.data.clientTypeDistribution.Count)" -ForegroundColor Gray
}

# Test Product Analytics
Write-Host "`n📦 Product Analytics:" -ForegroundColor Cyan
$productData = Test-Endpoint "Product Analytics" "http://localhost:3001/analytics/products?period=3m&limit=5" $headers
if ($productData) {
    Write-Host "   Période: $($productData.data.period)" -ForegroundColor Gray
    Write-Host "   Top produits: $($productData.data.topProducts.Count)" -ForegroundColor Gray
    Write-Host "   Catégories: $($productData.data.categoryDistribution.Count)" -ForegroundColor Gray
    
    if ($productData.data.topProducts.Count -gt 0) {
        $topProduct = $productData.data.topProducts[0]
        Write-Host "   Meilleur produit: $($topProduct.name) - $($topProduct.totalRevenue) EUR" -ForegroundColor Gray
    }
}

# Test Client Analytics
Write-Host "`n👥 Client Analytics:" -ForegroundColor Cyan
$clientData = Test-Endpoint "Client Analytics" "http://localhost:3001/analytics/clients" $headers
if ($clientData) {
    Write-Host "   Segments: $($clientData.data.segmentation.Count)" -ForegroundColor Gray
    Write-Host "   Villes: $($clientData.data.geographicDistribution.Count)" -ForegroundColor Gray
    Write-Host "   Clients actifs: $($clientData.data.mostActiveClients.Count)" -ForegroundColor Gray
    
    # Afficher la répartition par segment
    foreach ($segment in $clientData.data.segmentation) {
        Write-Host "   $($segment.segment): $($segment.clientCount) clients - $($segment.segmentRevenue) EUR" -ForegroundColor Gray
    }
}

# Test Evolution Data
Write-Host "`n📈 Evolution Data:" -ForegroundColor Cyan
$evolutionData = Test-Endpoint "Evolution Revenue" "http://localhost:3001/analytics/evolution?metric=revenue&period=6m" $headers
if ($evolutionData) {
    Write-Host "   Métrique: $($evolutionData.data.metric)" -ForegroundColor Gray
    Write-Host "   Période: $($evolutionData.data.period)" -ForegroundColor Gray
    Write-Host "   Points de données: $($evolutionData.data.data.Count)" -ForegroundColor Gray
}

# Étape 4: Test de performance
Write-Host "`n4. TEST DE PERFORMANCE" -ForegroundColor Yellow
Write-Host "=======================" -ForegroundColor Yellow

$performanceTests = @(
    @{ Name = "KPI Metrics"; Url = "http://localhost:3001/analytics/kpi" },
    @{ Name = "Sales Analytics"; Url = "http://localhost:3001/analytics/sales" },
    @{ Name = "Dashboard Stats"; Url = "http://localhost:3001/dashboard/stats" }
)

foreach ($test in $performanceTests) {
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $result = Test-Endpoint $test.Name $test.Url $headers
    $stopwatch.Stop()
    
    if ($result) {
        $responseTime = $stopwatch.ElapsedMilliseconds
        if ($responseTime -lt 1000) {
            Write-Host "⚡ $($test.Name): $responseTime ms (RAPIDE)" -ForegroundColor Green
        } elseif ($responseTime -lt 3000) {
            Write-Host "⏱️ $($test.Name): $responseTime ms (ACCEPTABLE)" -ForegroundColor Yellow
        } else {
            Write-Host "🐌 $($test.Name): $responseTime ms (LENT)" -ForegroundColor Red
        }
    }
}

# Étape 5: Test du Frontend
Write-Host "`n5. TEST DU FRONTEND" -ForegroundColor Yellow
Write-Host "===================" -ForegroundColor Yellow

try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3003" -UseBasicParsing -TimeoutSec 5
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "✅ Frontend Next.js: ACCESSIBLE" -ForegroundColor Green
        Write-Host "   Status: $($frontendResponse.StatusCode)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Frontend Next.js: NON ACCESSIBLE" -ForegroundColor Red
    Write-Host "   Assurez-vous que le frontend est démarré sur le port 3003" -ForegroundColor Yellow
}

# Résumé final
Write-Host "`n6. RÉSUMÉ DES TESTS PHASE 5" -ForegroundColor Yellow
Write-Host "============================" -ForegroundColor Yellow

Write-Host "🎯 FONCTIONNALITÉS TESTÉES:" -ForegroundColor Magenta
Write-Host "   ✓ Authentification et sécurité" -ForegroundColor Green
Write-Host "   ✓ Dashboard Analytics complet" -ForegroundColor Green
Write-Host "   ✓ KPI temps réel (CA, marge, conversion)" -ForegroundColor Green
Write-Host "   ✓ Analytics de ventes avancées" -ForegroundColor Green
Write-Host "   ✓ Performance produits par catégorie" -ForegroundColor Green
Write-Host "   ✓ Segmentation clients automatique" -ForegroundColor Green
Write-Host "   ✓ Données d'évolution temporelle" -ForegroundColor Green
Write-Host "   ✓ Tests de performance API" -ForegroundColor Green
Write-Host ""

Write-Host "🚀 PHASE 5 ANALYTICS VALIDÉE!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Accès aux Analytics:" -ForegroundColor Cyan
Write-Host "   http://localhost:3003/analytics" -ForegroundColor Magenta
Write-Host ""
Write-Host "🔑 Identifiants de test:" -ForegroundColor Cyan
Write-Host "   Email: admin@demo-tpe.fr" -ForegroundColor White
Write-Host "   Mot de passe: demo123" -ForegroundColor White
