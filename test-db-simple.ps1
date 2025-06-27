# Test Simple Application avec Base de Données
Write-Host "Test Application avec PostgreSQL..." -ForegroundColor Green
Write-Host ""

$tests = 0
$passed = 0

function Test-Service {
    param([string]$Url, [string]$Name)
    
    $global:tests++
    Write-Host "Test: $Name" -ForegroundColor Blue
    
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "  OK - $Name" -ForegroundColor Green
            $global:passed++
            return $response
        }
    }
    catch {
        Write-Host "  ECHEC - $Name" -ForegroundColor Red
        return $null
    }
}

Write-Host "=== TESTS INFRASTRUCTURE ===" -ForegroundColor Cyan

# Test PostgreSQL
Write-Host "Test PostgreSQL..." -ForegroundColor Blue
try {
    $pgResult = docker exec gestion-postgres psql -U gestion_user -d gestion_commerciale -c "SELECT COUNT(*) FROM users;" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK - PostgreSQL" -ForegroundColor Green
    } else {
        Write-Host "  ECHEC - PostgreSQL" -ForegroundColor Red
    }
}
catch {
    Write-Host "  ECHEC - PostgreSQL" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== TESTS API BACKEND ===" -ForegroundColor Cyan

# Tests des endpoints principaux
$healthResponse = Test-Service "http://localhost:3001/health" "Health Check"
if ($healthResponse) {
    $healthData = $healthResponse.Content | ConvertFrom-Json
    Write-Host "  Status: $($healthData.status)" -ForegroundColor White
}

$clientsResponse = Test-Service "http://localhost:3001/clients" "API Clients"
if ($clientsResponse) {
    $clientsData = $clientsResponse.Content | ConvertFrom-Json
    Write-Host "  Clients: $($clientsData.pagination.total)" -ForegroundColor White
}

$productsResponse = Test-Service "http://localhost:3001/products" "API Produits"
if ($productsResponse) {
    $productsData = $productsResponse.Content | ConvertFrom-Json
    Write-Host "  Produits: $($productsData.pagination.total)" -ForegroundColor White
}

Test-Service "http://localhost:3001/dashboard/stats" "Dashboard Stats"
Test-Service "http://localhost:3001/docs" "Documentation Swagger"

Write-Host ""
Write-Host "=== TEST AUTHENTIFICATION ===" -ForegroundColor Cyan

# Test authentification
Write-Host "Test: Authentification" -ForegroundColor Blue
try {
    $authBody = '{"email":"admin@demo-tpe.fr","password":"demo123"}'
    $authResponse = Invoke-WebRequest -Uri "http://localhost:3001/auth/login" -Method POST -ContentType "application/json" -Body $authBody -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    if ($authResponse.StatusCode -eq 200) {
        Write-Host "  OK - Authentification" -ForegroundColor Green
        $authData = $authResponse.Content | ConvertFrom-Json
        Write-Host "  Utilisateur: $($authData.data.user.firstName) $($authData.data.user.lastName)" -ForegroundColor White
        $tests++
        $passed++
    }
}
catch {
    Write-Host "  ECHEC - Authentification" -ForegroundColor Red
    $tests++
}

Write-Host ""
Write-Host "=== TESTS INTERFACE WEB ===" -ForegroundColor Cyan

Test-Service "http://localhost:3002" "Frontend Interface"

Write-Host ""
Write-Host "=== RESULTATS ===" -ForegroundColor Yellow
Write-Host "Tests reussis: $passed/$tests" -ForegroundColor White

if ($passed -eq $tests) {
    Write-Host "TOUS LES TESTS SONT PASSES !" -ForegroundColor Green
    Write-Host "Application avec PostgreSQL entierement fonctionnelle" -ForegroundColor Green
} else {
    Write-Host "Certains tests ont echoue" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== LIENS UTILES ===" -ForegroundColor Cyan
Write-Host "Frontend      : http://localhost:3002" -ForegroundColor White
Write-Host "API Backend   : http://localhost:3001" -ForegroundColor White
Write-Host "Documentation : http://localhost:3001/docs" -ForegroundColor White
Write-Host "Adminer       : http://localhost:8080" -ForegroundColor White
Write-Host ""

Write-Host "=== COMPTES UTILISATEURS ===" -ForegroundColor Cyan
Write-Host "admin@demo-tpe.fr / demo123 (ADMIN)" -ForegroundColor White
Write-Host "manager@demo-tpe.fr / demo123 (MANAGER)" -ForegroundColor White
Write-Host "employee@demo-tpe.fr / demo123 (EMPLOYEE)" -ForegroundColor White
Write-Host ""
