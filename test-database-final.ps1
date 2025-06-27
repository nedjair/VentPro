# =============================================================================
# Test Final Application avec Base de Données PostgreSQL
# =============================================================================
Write-Host "🧪 TESTS FINAUX APPLICATION AVEC BASE DE DONNEES POSTGRESQL" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""

$tests = 0
$passed = 0

function Test-Endpoint {
    param([string]$Url, [string]$Name, [string]$Method = "GET", [string]$Body = "")
    
    $global:tests++
    Write-Host "🔍 Test: $Name" -ForegroundColor Blue
    
    try {
        if ($Method -eq "POST" -and $Body) {
            $response = Invoke-WebRequest -Uri $Url -Method $Method -ContentType "application/json" -Body $Body -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
        } else {
            $response = Invoke-WebRequest -Uri $Url -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
        }
        
        if ($response.StatusCode -eq 200) {
            Write-Host "   ✅ $Name - OK (Status: $($response.StatusCode))" -ForegroundColor Green
            $global:passed++
            return $response
        } else {
            Write-Host "   ❌ $Name - Erreur (Status: $($response.StatusCode))" -ForegroundColor Red
            return $null
        }
    }
    catch {
        Write-Host "   ❌ $Name - Échec: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

Write-Host "📊 PHASE 1: TESTS INFRASTRUCTURE" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Test Docker containers
Write-Host "🐳 Vérification des conteneurs Docker..." -ForegroundColor Blue
$containers = docker ps --format "{{.Names}}" | Where-Object { $_ -like "gestion-*" }
Write-Host "   Conteneurs actifs: $($containers -join ', ')" -ForegroundColor White

# Test PostgreSQL
Write-Host "🐘 Test PostgreSQL..." -ForegroundColor Blue
try {
    $pgResult = docker exec gestion-postgres psql -U gestion_user -d gestion_commerciale -c "SELECT COUNT(*) FROM users;" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ PostgreSQL - OK" -ForegroundColor Green
    } else {
        Write-Host "   ❌ PostgreSQL - Erreur" -ForegroundColor Red
    }
}
catch {
    Write-Host "   ❌ PostgreSQL - Échec" -ForegroundColor Red
}

Write-Host ""
Write-Host "🔌 PHASE 2: TESTS API BACKEND AVEC BASE DE DONNEES" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# Test Health Check avec DB
$healthResponse = Test-Endpoint "http://localhost:3001/health" "Health Check avec PostgreSQL"
if ($healthResponse) {
    $healthData = $healthResponse.Content | ConvertFrom-Json
    Write-Host "   📊 Status: $($healthData.status)" -ForegroundColor White
    Write-Host "   📊 Version: $($healthData.version)" -ForegroundColor White
    if ($healthData.database) {
        Write-Host "   📊 DB Users: $($healthData.database.users)" -ForegroundColor White
    }
}

# Test Métriques avec DB
$metricsResponse = Test-Endpoint "http://localhost:3001/metrics" "Métriques avec PostgreSQL"
if ($metricsResponse) {
    $metricsData = $metricsResponse.Content | ConvertFrom-Json
    Write-Host "   📊 Clients en DB: $($metricsData.database.clients)" -ForegroundColor White
    Write-Host "   📊 Produits en DB: $($metricsData.database.products)" -ForegroundColor White
    Write-Host "   📊 Utilisateurs en DB: $($metricsData.database.users)" -ForegroundColor White
}

# Test Authentification avec DB
$authResponse = Test-Endpoint "http://localhost:3001/auth/login" "Authentification PostgreSQL" "POST" '{"email":"admin@demo-tpe.fr","password":"demo123"}'
if ($authResponse) {
    $authData = $authResponse.Content | ConvertFrom-Json
    Write-Host "   👤 Utilisateur: $($authData.data.user.firstName) $($authData.data.user.lastName)" -ForegroundColor White
    Write-Host "   🔑 Rôle: $($authData.data.user.role)" -ForegroundColor White
}

# Test Clients depuis PostgreSQL
$clientsResponse = Test-Endpoint "http://localhost:3001/clients" "Clients depuis PostgreSQL"
if ($clientsResponse) {
    $clientsData = $clientsResponse.Content | ConvertFrom-Json
    Write-Host "   👥 Nombre de clients: $($clientsData.data.Count)" -ForegroundColor White
    Write-Host "   👥 Total en DB: $($clientsData.pagination.total)" -ForegroundColor White
}

# Test Produits depuis PostgreSQL
$productsResponse = Test-Endpoint "http://localhost:3001/products" "Produits depuis PostgreSQL"
if ($productsResponse) {
    $productsData = $productsResponse.Content | ConvertFrom-Json
    Write-Host "   📦 Nombre de produits: $($productsData.data.Count)" -ForegroundColor White
    Write-Host "   📦 Total en DB: $($productsData.pagination.total)" -ForegroundColor White
}

# Test Dashboard avec vraies stats
$dashboardResponse = Test-Endpoint "http://localhost:3001/dashboard/stats" "Dashboard avec PostgreSQL"
if ($dashboardResponse) {
    $dashboardData = $dashboardResponse.Content | ConvertFrom-Json
    Write-Host "   📈 Clients totaux: $($dashboardData.data.clients.total)" -ForegroundColor White
    Write-Host "   📈 Produits totaux: $($dashboardData.data.products.total)" -ForegroundColor White
    Write-Host "   📈 Utilisateurs: $($dashboardData.data.users.total)" -ForegroundColor White
}

Write-Host ""
Write-Host "🌐 PHASE 3: TESTS INTERFACE WEB" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan

# Test Frontend
Test-Endpoint "http://localhost:3002" "Frontend Interface"

# Test Documentation Swagger
Test-Endpoint "http://localhost:3001/docs" "Documentation Swagger"

Write-Host ""
Write-Host "🧪 PHASE 4: TESTS AVANCES AVEC PARAMETRES" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Test recherche clients
$searchResponse = Test-Endpoint "http://localhost:3001/clients?search=jean" "Recherche Clients"
if ($searchResponse) {
    $searchData = $searchResponse.Content | ConvertFrom-Json
    Write-Host "   🔍 Résultats recherche: $($searchData.data.Count)" -ForegroundColor White
}

# Test pagination clients
$paginationResponse = Test-Endpoint "http://localhost:3001/clients?page=1&limit=2" "Pagination Clients"
if ($paginationResponse) {
    $paginationData = $paginationResponse.Content | ConvertFrom-Json
    Write-Host "   📄 Page: $($paginationData.pagination.page)" -ForegroundColor White
    Write-Host "   📄 Limite: $($paginationData.pagination.limit)" -ForegroundColor White
}

# Test filtrage produits
$filterResponse = Test-Endpoint "http://localhost:3001/products?category=Informatique" "Filtrage Produits"
if ($filterResponse) {
    $filterData = $filterResponse.Content | ConvertFrom-Json
    Write-Host "   🏷️  Produits Informatique: $($filterData.data.Count)" -ForegroundColor White
}

Write-Host ""
Write-Host "📊 RESULTATS FINAUX" -ForegroundColor Yellow
Write-Host "===================" -ForegroundColor Yellow

Write-Host ""
Write-Host "📈 STATISTIQUES:" -ForegroundColor White
Write-Host "  Total des tests    : $tests" -ForegroundColor White
Write-Host "  Tests réussis      : $passed" -ForegroundColor Green
Write-Host "  Tests échoués      : $($tests - $passed)" -ForegroundColor Red
Write-Host "  Taux de réussite   : $([math]::Round(($passed / $tests) * 100, 1))%" -ForegroundColor White

Write-Host ""
if ($passed -eq $tests) {
    Write-Host "🎉 TOUS LES TESTS SONT PASSES AVEC SUCCES !" -ForegroundColor Green
    Write-Host "✅ L'application avec PostgreSQL est entièrement fonctionnelle" -ForegroundColor Green
} else {
    Write-Host "⚠️  Certains tests ont échoué" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔗 LIENS RAPIDES:" -ForegroundColor Cyan
Write-Host "  Frontend           : http://localhost:3002" -ForegroundColor White
Write-Host "  API Backend        : http://localhost:3001" -ForegroundColor White
Write-Host "  Documentation      : http://localhost:3001/docs" -ForegroundColor White
Write-Host "  Adminer (DB)       : http://localhost:8080" -ForegroundColor White
Write-Host "  Redis Commander    : http://localhost:8081" -ForegroundColor White
Write-Host ""

Write-Host "🗄️  INFORMATIONS BASE DE DONNEES:" -ForegroundColor Cyan
Write-Host "  Base               : gestion_commerciale" -ForegroundColor White
Write-Host "  Utilisateur        : gestion_user" -ForegroundColor White
Write-Host "  Mot de passe       : gestion_password_secure_2024" -ForegroundColor White
Write-Host "  Port               : 5432" -ForegroundColor White
Write-Host ""

Write-Host "👥 COMPTES UTILISATEURS:" -ForegroundColor Cyan
Write-Host "  admin@demo-tpe.fr    / demo123 (ADMIN)" -ForegroundColor White
Write-Host "  manager@demo-tpe.fr  / demo123 (MANAGER)" -ForegroundColor White
Write-Host "  employee@demo-tpe.fr / demo123 (EMPLOYEE)" -ForegroundColor White
Write-Host ""

Write-Host "🧪 COMMANDES DE TEST RAPIDES:" -ForegroundColor Cyan
Write-Host "  curl http://localhost:3001/health" -ForegroundColor White
Write-Host "  curl http://localhost:3001/clients" -ForegroundColor White
Write-Host "  curl http://localhost:3001/products" -ForegroundColor White
Write-Host "  curl -X POST http://localhost:3001/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"admin@demo-tpe.fr\",\"password\":\"demo123\"}'" -ForegroundColor White
Write-Host ""
