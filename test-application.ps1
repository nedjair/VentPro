# =============================================================================
# Script de Test Complet - Gestion Commerciale TPE
# =============================================================================
Write-Host "🧪 TESTS COMPLETS APPLICATION GESTION COMMERCIALE TPE" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
Write-Host ""

function Test-Endpoint {
    param(
        [string]$Url,
        [string]$Name,
        [string]$ExpectedContent = ""
    )

    try {
        Write-Host "🔍 Test: $Name" -ForegroundColor Blue
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop

        if ($response.StatusCode -eq 200) {
            Write-Host "   ✅ $Name - OK (Status: $($response.StatusCode))" -ForegroundColor Green

            if ($ExpectedContent -and $response.Content -like "*$ExpectedContent*") {
                Write-Host "   ✅ Contenu attendu trouvé" -ForegroundColor Green
            }

            return $true
        } else {
            Write-Host "   ❌ $Name - Erreur (Status: $($response.StatusCode))" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "   ❌ $Name - Échec: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-Port {
    param(
        [int]$Port,
        [string]$Service
    )
    
    try {
        $connection = Test-NetConnection -ComputerName "localhost" -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
        if ($connection) {
            Write-Host "   ✅ Port $Port ($Service) - Accessible" -ForegroundColor Green
            return $true
        } else {
            Write-Host "   ❌ Port $Port ($Service) - Non accessible" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "   ❌ Port $Port ($Service) - Erreur de test" -ForegroundColor Red
        return $false
    }
}

# Variables de test
$baseUrl = "http://localhost:3001"
$frontendUrl = "http://localhost:3002"
$testResults = @()

Write-Host "📊 PHASE 1: TESTS DES PORTS" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan

$portTests = @(
    @{ Port = 3001; Service = "Backend API" },
    @{ Port = 3002; Service = "Frontend" },
    @{ Port = 5432; Service = "PostgreSQL" },
    @{ Port = 6379; Service = "Redis" },
    @{ Port = 6432; Service = "PgBouncer" }
)

foreach ($test in $portTests) {
    $result = Test-Port -Port $test.Port -Service $test.Service
    $testResults += @{ Test = "Port $($test.Port)"; Result = $result }
}

Write-Host ""
Write-Host "🔌 PHASE 2: TESTS DES ENDPOINTS API" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

$apiTests = @(
    @{ Url = "$baseUrl/health"; Name = "Health Check"; Expected = "ok" },
    @{ Url = "$baseUrl/metrics"; Name = "Métriques"; Expected = "memory" },
    @{ Url = "$baseUrl/clients"; Name = "Liste Clients"; Expected = "success" },
    @{ Url = "$baseUrl/products"; Name = "Liste Produits"; Expected = "success" },
    @{ Url = "$baseUrl/dashboard/stats"; Name = "Stats Dashboard"; Expected = "clients" }
)

foreach ($test in $apiTests) {
    $result = Test-Endpoint -Url $test.Url -Name $test.Name -ExpectedContent $test.Expected
    $testResults += @{ Test = $test.Name; Result = $result }
}

Write-Host ""
Write-Host "🌐 PHASE 3: TESTS DES INTERFACES WEB" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

$webTests = @(
    @{ Url = $frontendUrl; Name = "Frontend Principal"; Expected = "Gestion Commerciale TPE" },
    @{ Url = "$baseUrl/docs"; Name = "Documentation Swagger"; Expected = "swagger" }
)

foreach ($test in $webTests) {
    $result = Test-Endpoint -Url $test.Url -Name $test.Name -ExpectedContent $test.Expected
    $testResults += @{ Test = $test.Name; Result = $result }
}

Write-Host ""
Write-Host "🧪 PHASE 4: TESTS AVANCÉS API" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

# Test avec paramètres
Write-Host "🔍 Test: API Clients avec paramètres" -ForegroundColor Blue
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/clients?page=1&limit=2" -UseBasicParsing -ErrorAction Stop
    if ($response.StatusCode -eq 200 -and $response.Content -like "*pagination*") {
        Write-Host "   ✅ API Clients avec pagination - OK" -ForegroundColor Green
        $testResults += @{ Test = "API Pagination"; Result = $true }
    } else {
        Write-Host "   ❌ API Clients avec pagination - Erreur" -ForegroundColor Red
        $testResults += @{ Test = "API Pagination"; Result = $false }
    }
}
catch {
    Write-Host "   ❌ API Clients avec pagination - Échec" -ForegroundColor Red
    $testResults += @{ Test = "API Pagination"; Result = $false }
}

# Test de recherche
Write-Host "🔍 Test: API Recherche Clients" -ForegroundColor Blue
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/clients?search=jean" -UseBasicParsing -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ API Recherche - OK" -ForegroundColor Green
        $testResults += @{ Test = "API Recherche"; Result = $true }
    } else {
        Write-Host "   ❌ API Recherche - Erreur" -ForegroundColor Red
        $testResults += @{ Test = "API Recherche"; Result = $false }
    }
}
catch {
    Write-Host "   ❌ API Recherche - Échec" -ForegroundColor Red
    $testResults += @{ Test = "API Recherche"; Result = $false }
}

Write-Host ""
Write-Host "🐳 PHASE 5: TESTS DOCKER" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan

# Test Docker containers
Write-Host "🔍 Test: Conteneurs Docker" -ForegroundColor Blue
try {
    $containers = docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "gestion-"
    if ($containers.Count -ge 3) {
        Write-Host "   ✅ Conteneurs Docker - OK ($($containers.Count) conteneurs actifs)" -ForegroundColor Green
        $testResults += @{ Test = "Docker Containers"; Result = $true }
    } else {
        Write-Host "   ❌ Conteneurs Docker - Insuffisants" -ForegroundColor Red
        $testResults += @{ Test = "Docker Containers"; Result = $false }
    }
}
catch {
    Write-Host "   ❌ Conteneurs Docker - Erreur" -ForegroundColor Red
    $testResults += @{ Test = "Docker Containers"; Result = $false }
}

Write-Host ""
Write-Host "📊 RÉSULTATS DES TESTS" -ForegroundColor Yellow
Write-Host "======================" -ForegroundColor Yellow

$totalTests = $testResults.Count
$passedTests = ($testResults | Where-Object { $_.Result -eq $true }).Count
$failedTests = $totalTests - $passedTests

Write-Host ""
Write-Host "📈 STATISTIQUES:" -ForegroundColor White
Write-Host "  Total des tests    : $totalTests" -ForegroundColor White
Write-Host "  Tests réussis      : $passedTests" -ForegroundColor Green
Write-Host "  Tests échoués      : $failedTests" -ForegroundColor Red
Write-Host "  Taux de réussite   : $([math]::Round(($passedTests / $totalTests) * 100, 1))%" -ForegroundColor White

Write-Host ""
if ($failedTests -eq 0) {
    Write-Host "🎉 TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS !" -ForegroundColor Green
    Write-Host "✅ L'application est entièrement fonctionnelle" -ForegroundColor Green
} else {
    Write-Host "⚠️  CERTAINS TESTS ONT ÉCHOUÉ" -ForegroundColor Yellow
    Write-Host "📋 Détails des échecs:" -ForegroundColor Yellow
    
    $failedTests = $testResults | Where-Object { $_.Result -eq $false }
    foreach ($failed in $failedTests) {
        Write-Host "   ❌ $($failed.Test)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🔗 LIENS RAPIDES:" -ForegroundColor Cyan
Write-Host "  Frontend      : http://localhost:3002" -ForegroundColor White
Write-Host "  API Backend   : http://localhost:3001" -ForegroundColor White
Write-Host "  Documentation : http://localhost:3001/docs" -ForegroundColor White
Write-Host "  Adminer       : http://localhost:8080" -ForegroundColor White
Write-Host ""
