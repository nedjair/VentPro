# Script PowerShell pour tester la connectivité de l'application
Write-Host "🔍 TEST DE CONNECTIVITÉ - GESTION COMMERCIALE TPE" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

# Configuration
$frontendUrl = "http://localhost:3000"
$backendUrl = "http://localhost:3001"

# Fonction pour tester une URL
function Test-Url {
    param(
        [string]$Url,
        [string]$Name,
        [int]$TimeoutSeconds = 5
    )
    
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec $TimeoutSeconds -UseBasicParsing -ErrorAction Stop
        Write-Host "✅ $Name`: $($response.StatusCode) $($response.StatusDescription)" -ForegroundColor Green
        return $true
    }
    catch {
        if ($_.Exception.Response.StatusCode -eq 401) {
            Write-Host "🔐 $Name`: 401 Unauthorized (Auth requise - Normal)" -ForegroundColor Yellow
            return $true
        }
        elseif ($_.Exception.Response.StatusCode -eq 404) {
            Write-Host "⚠️ $Name`: 404 Not Found" -ForegroundColor Yellow
            return $false
        }
        elseif ($_.Exception.Response.StatusCode -eq 302 -or $_.Exception.Response.StatusCode -eq 307) {
            Write-Host "🔄 $Name`: Redirection (Normal si auth requise)" -ForegroundColor Yellow
            return $true
        }
        else {
            Write-Host "❌ $Name`: $($_.Exception.Message)" -ForegroundColor Red
            return $false
        }
    }
}

# Test des serveurs principaux
Write-Host "`n1️⃣ Test des serveurs principaux..." -ForegroundColor White
$frontendOk = Test-Url -Url $frontendUrl -Name "Frontend (Next.js)"
$backendOk = Test-Url -Url "$backendUrl/api" -Name "Backend (Fastify)"

# Test des pages frontend principales
Write-Host "`n2️⃣ Test des pages frontend..." -ForegroundColor White
$frontendPages = @(
    @{ Name = "Accueil"; Url = "/" },
    @{ Name = "Connexion"; Url = "/auth/login" },
    @{ Name = "Inscription"; Url = "/auth/register" },
    @{ Name = "Dashboard"; Url = "/dashboard" },
    @{ Name = "Clients"; Url = "/clients" },
    @{ Name = "Produits"; Url = "/products" },
    @{ Name = "Nouveau Produit"; Url = "/products/new" },
    @{ Name = "Stocks"; Url = "/stocks" },
    @{ Name = "Nouveau Stock"; Url = "/stocks/new" },
    @{ Name = "Test Stock Simple"; Url = "/stocks-simple" }
)

$frontendSuccessCount = 0
foreach ($page in $frontendPages) {
    $success = Test-Url -Url "$frontendUrl$($page.Url)" -Name $page.Name
    if ($success) { $frontendSuccessCount++ }
}

# Test des endpoints API
Write-Host "`n3️⃣ Test des endpoints API..." -ForegroundColor White
$apiEndpoints = @(
    @{ Name = "API Info"; Url = "/api" },
    @{ Name = "Documentation"; Url = "/docs" },
    @{ Name = "Companies API"; Url = "/api/v1/companies" },
    @{ Name = "Users API"; Url = "/api/v1/users" },
    @{ Name = "Clients API"; Url = "/api/v1/clients" },
    @{ Name = "Products API"; Url = "/api/v1/products" },
    @{ Name = "Categories API"; Url = "/api/v1/categories" },
    @{ Name = "Stock API"; Url = "/api/v1/stock" },
    @{ Name = "Stock Movements API"; Url = "/api/v1/stock/movements" },
    @{ Name = "Suppliers API"; Url = "/api/v1/suppliers" },
    @{ Name = "Analytics API"; Url = "/api/v1/analytics/dashboard" }
)

$apiSuccessCount = 0
foreach ($endpoint in $apiEndpoints) {
    $success = Test-Url -Url "$backendUrl$($endpoint.Url)" -Name $endpoint.Name
    if ($success) { $apiSuccessCount++ }
}

# Résumé final
Write-Host "`n4️⃣ RÉSUMÉ FINAL" -ForegroundColor White
Write-Host "=" * 40 -ForegroundColor White

$frontendPercentage = [math]::Round(($frontendSuccessCount / $frontendPages.Count) * 100)
$apiPercentage = [math]::Round(($apiSuccessCount / $apiEndpoints.Count) * 100)

Write-Host "📊 Pages Frontend: $frontendSuccessCount/$($frontendPages.Count) ($frontendPercentage%)" -ForegroundColor Cyan
Write-Host "🔌 Endpoints API: $apiSuccessCount/$($apiEndpoints.Count) ($apiPercentage%)" -ForegroundColor Cyan

if ($frontendPercentage -ge 80 -and $apiPercentage -ge 80) {
    Write-Host "`n🎉 APPLICATION FONCTIONNELLE !" -ForegroundColor Green
    Write-Host "💡 La plupart des connexions sont opérationnelles" -ForegroundColor Green
}
elseif ($frontendOk -and $backendOk) {
    Write-Host "`n⚠️ PROBLÈMES PARTIELS DÉTECTÉS" -ForegroundColor Yellow
    Write-Host "💡 Les serveurs principaux fonctionnent, mais certaines pages ont des problèmes" -ForegroundColor Yellow
}
else {
    Write-Host "`n❌ PROBLÈMES CRITIQUES DÉTECTÉS" -ForegroundColor Red
    Write-Host "💡 Vérifiez que les serveurs sont démarrés:" -ForegroundColor Red
    Write-Host "   → Frontend: cd apps/frontend && npm run dev" -ForegroundColor Red
    Write-Host "   → Backend: cd apps/backend && npm run dev" -ForegroundColor Red
}

Write-Host "`n🔗 URLs de test:" -ForegroundColor White
Write-Host "   Frontend: $frontendUrl" -ForegroundColor Gray
Write-Host "   Backend: $backendUrl/api" -ForegroundColor Gray
Write-Host "   Test Manuel: file:///d:/Gestion%20Commerciale/test-pages-manual.html" -ForegroundColor Gray

Write-Host "`nAppuyez sur une touche pour continuer..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
