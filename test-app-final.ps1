# Script de Test Final - Gestion Commerciale TPE
Write-Host "🧪 TESTS FINAUX APPLICATION GESTION COMMERCIALE TPE" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
Write-Host ""

$tests = 0
$passed = 0

function Test-Service {
    param([string]$Url, [string]$Name)
    
    $global:tests++
    Write-Host "🔍 Test: $Name" -ForegroundColor Blue
    
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "   ✅ $Name - OK" -ForegroundColor Green
            $global:passed++
            return $true
        }
    }
    catch {
        Write-Host "   ❌ $Name - Échec" -ForegroundColor Red
        return $false
    }
}

Write-Host "📊 TESTS DES SERVICES" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan

# Tests des services principaux
Test-Service "http://localhost:3001/health" "Backend API Health"
Test-Service "http://localhost:3001/clients" "API Clients"
Test-Service "http://localhost:3001/products" "API Produits"
Test-Service "http://localhost:3001/dashboard/stats" "API Dashboard"
Test-Service "http://localhost:3001/docs" "Documentation Swagger"
Test-Service "http://localhost:3002" "Frontend Interface"

Write-Host ""
Write-Host "📈 RÉSULTATS" -ForegroundColor Yellow
Write-Host "============" -ForegroundColor Yellow
Write-Host "Tests réussis: $passed/$tests" -ForegroundColor White

if ($passed -eq $tests) {
    Write-Host "TOUS LES TESTS SONT PASSES !" -ForegroundColor Green
    Write-Host "Application entierement fonctionnelle" -ForegroundColor Green
} else {
    Write-Host "Certains tests ont echoue" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔗 LIENS UTILES:" -ForegroundColor Cyan
Write-Host "  Frontend      : http://localhost:3002" -ForegroundColor White
Write-Host "  API Backend   : http://localhost:3001" -ForegroundColor White
Write-Host "  Documentation : http://localhost:3001/docs" -ForegroundColor White
Write-Host "  Adminer       : http://localhost:8080" -ForegroundColor White
Write-Host ""
