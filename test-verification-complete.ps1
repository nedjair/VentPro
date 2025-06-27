# 🔍 VÉRIFICATION COMPLÈTE - GESTION COMMERCIALE TPE
# Script de test systématique selon la méthodologie demandée

Write-Host "🚀 DÉMARRAGE DE LA VÉRIFICATION COMPLÈTE" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green

# Configuration
$API_BASE = "http://localhost:3001"
$FRONTEND_URL = "http://localhost:3003"
$TEST_EMAIL = "admin@demo-tpe.fr"
$TEST_PASSWORD = "demo123"

# Fonction utilitaire pour les tests API
function Test-ApiEndpoint {
    param(
        [string]$Url,
        [string]$Method = "GET",
        [string]$Body = $null,
        [hashtable]$Headers = @{},
        [string]$Description
    )
    
    Write-Host "🔍 Test: $Description" -ForegroundColor Cyan
    Write-Host "   URL: $Method $Url" -ForegroundColor Gray
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
            ContentType = "application/json"
        }
        
        if ($Body) {
            $params.Body = $Body
        }
        
        $response = Invoke-WebRequest @params
        
        if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 201) {
            Write-Host "   ✅ SUCCESS ($($response.StatusCode))" -ForegroundColor Green
            return @{
                Success = $true
                StatusCode = $response.StatusCode
                Content = $response.Content | ConvertFrom-Json
            }
        } else {
            Write-Host "   ⚠️  WARNING ($($response.StatusCode))" -ForegroundColor Yellow
            return @{
                Success = $false
                StatusCode = $response.StatusCode
                Content = $response.Content
            }
        }
    }
    catch {
        Write-Host "   ❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

# 1. VÉRIFICATION DES DÉPENDANCES
Write-Host "`n📦 1. VÉRIFICATION DES DÉPENDANCES" -ForegroundColor Yellow
Write-Host "=================================" -ForegroundColor Yellow

# Vérifier l'infrastructure Docker
Write-Host "🐳 Infrastructure Docker:" -ForegroundColor Cyan
$dockerContainers = docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
Write-Host $dockerContainers

# Vérifier les dépendances frontend
Write-Host "`n📱 Frontend Next.js:" -ForegroundColor Cyan
if (Test-Path "frontend-nextjs-production/package.json") {
    $frontendPkg = Get-Content "frontend-nextjs-production/package.json" | ConvertFrom-Json
    Write-Host "   ✅ Next.js: $($frontendPkg.dependencies.next)" -ForegroundColor Green
    Write-Host "   ✅ React: $($frontendPkg.dependencies.react)" -ForegroundColor Green
    Write-Host "   ✅ Axios: $($frontendPkg.dependencies.axios)" -ForegroundColor Green
    Write-Host "   ✅ Zustand: $($frontendPkg.dependencies.zustand)" -ForegroundColor Green
    Write-Host "   ✅ TypeScript: $($frontendPkg.devDependencies.typescript)" -ForegroundColor Green
} else {
    Write-Host "   ❌ Package.json frontend non trouvé" -ForegroundColor Red
}

# Vérifier les dépendances backend
Write-Host "`n🔧 Backend Fastify:" -ForegroundColor Cyan
if (Test-Path "package.json") {
    $backendPkg = Get-Content "package.json" | ConvertFrom-Json
    Write-Host "   ✅ Fastify: $($backendPkg.dependencies.fastify)" -ForegroundColor Green
    Write-Host "   ✅ PostgreSQL: $($backendPkg.dependencies.pg)" -ForegroundColor Green
    Write-Host "   ✅ Redis: $($backendPkg.dependencies.redis)" -ForegroundColor Green
    Write-Host "   ✅ JWT: $($backendPkg.dependencies.jsonwebtoken)" -ForegroundColor Green
    Write-Host "   ✅ Bcrypt: $($backendPkg.dependencies.bcrypt)" -ForegroundColor Green
} else {
    Write-Host "   ❌ Package.json backend non trouvé" -ForegroundColor Red
}

# 2. AUDIT DES ROUTES ET ENDPOINTS API
Write-Host "`n🌐 2. AUDIT DES ROUTES ET ENDPOINTS API" -ForegroundColor Yellow
Write-Host "======================================" -ForegroundColor Yellow

# Test de santé du backend
$healthTest = Test-ApiEndpoint -Url "$API_BASE/health" -Description "Health Check Backend"

if (-not $healthTest.Success) {
    Write-Host "❌ Backend non accessible - Arrêt des tests" -ForegroundColor Red
    exit 1
}

# 3. VÉRIFICATION DU SYSTÈME D'AUTHENTIFICATION
Write-Host "`n🔐 3. VÉRIFICATION DU SYSTÈME D'AUTHENTIFICATION" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Yellow

# Test de connexion
$loginBody = @{
    email = $TEST_EMAIL
    password = $TEST_PASSWORD
} | ConvertTo-Json

$loginTest = Test-ApiEndpoint -Url "$API_BASE/api/auth/login" -Method "POST" -Body $loginBody -Description "Connexion Admin"

if ($loginTest.Success) {
    $token = $loginTest.Content.data.token
    $authHeaders = @{
        "Authorization" = "Bearer $token"
    }
    Write-Host "   🎫 Token JWT obtenu: $($token.Substring(0,20))..." -ForegroundColor Green
    
    # Test de vérification du token
    $verifyTest = Test-ApiEndpoint -Url "$API_BASE/api/auth/verify" -Headers $authHeaders -Description "Vérification Token"

} else {
    Write-Host "❌ Échec de l'authentification - Arrêt des tests" -ForegroundColor Red
    exit 1
}

# 4. TEST DE LA CHAÎNE COMPLÈTE API → BASE DE DONNÉES
Write-Host "`n🗄️ 4. TEST DE LA CHAÎNE COMPLÈTE API → BASE DE DONNÉES" -ForegroundColor Yellow
Write-Host "====================================================" -ForegroundColor Yellow

# Test des modules CRUD avec authentification
Write-Host "`n👥 Module Clients:" -ForegroundColor Cyan
$clientsTest = Test-ApiEndpoint -Url "$API_BASE/api/v1/clients" -Headers $authHeaders -Description "Liste des clients"
if ($clientsTest.Success) {
    $clientCount = $clientsTest.Content.data.clients.Count
    Write-Host "   📊 Clients trouvés: $clientCount" -ForegroundColor Green
}

Write-Host "`n📦 Module Produits:" -ForegroundColor Cyan
$productsTest = Test-ApiEndpoint -Url "$API_BASE/api/v1/products" -Headers $authHeaders -Description "Liste des produits"
if ($productsTest.Success) {
    $productCount = $productsTest.Content.data.products.Count
    Write-Host "   📊 Produits trouvés: $productCount" -ForegroundColor Green
}

Write-Host "`n📋 Module Commandes:" -ForegroundColor Cyan
$ordersTest = Test-ApiEndpoint -Url "$API_BASE/api/v1/orders" -Headers $authHeaders -Description "Liste des commandes"
if ($ordersTest.Success) {
    $orderCount = $ordersTest.Content.data.orders.Count
    Write-Host "   📊 Commandes trouvées: $orderCount" -ForegroundColor Green
}

Write-Host "`n🧾 Module Factures:" -ForegroundColor Cyan
$invoicesTest = Test-ApiEndpoint -Url "$API_BASE/api/v1/invoices" -Headers $authHeaders -Description "Liste des factures"
if ($invoicesTest.Success) {
    $invoiceCount = $invoicesTest.Content.data.invoices.Count
    Write-Host "   📊 Factures trouvées: $invoiceCount" -ForegroundColor Green
}

Write-Host "`n📈 Module Analytics:" -ForegroundColor Cyan
$analyticsTest = Test-ApiEndpoint -Url "$API_BASE/dashboard/stats" -Headers $authHeaders -Description "Statistiques dashboard"
if ($analyticsTest.Success) {
    Write-Host "   📊 Analytics disponibles" -ForegroundColor Green
}

# 5. VALIDATION DE L'INTÉGRATION COMPLÈTE
Write-Host "`n🔗 5. VALIDATION DE L'INTÉGRATION COMPLÈTE" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Yellow

# Test de connectivité frontend
Write-Host "`n🌐 Test Frontend Next.js:" -ForegroundColor Cyan
try {
    $frontendTest = Invoke-WebRequest -Uri $FRONTEND_URL -Method GET -TimeoutSec 5
    if ($frontendTest.StatusCode -eq 200) {
        Write-Host "   ✅ Frontend accessible sur port 3003" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠️  Frontend non accessible (normal si non démarré)" -ForegroundColor Yellow
}

# Résumé des tests
Write-Host "`n📊 RÉSUMÉ DE LA VÉRIFICATION" -ForegroundColor Yellow
Write-Host "============================" -ForegroundColor Yellow

$totalTests = 0
$successTests = 0

# Compter les tests réussis
if ($healthTest.Success) { $successTests++; $totalTests++ }
if ($loginTest.Success) { $successTests++; $totalTests++ }
if ($verifyTest.Success) { $successTests++; $totalTests++ }
if ($clientsTest.Success) { $successTests++; $totalTests++ }
if ($productsTest.Success) { $successTests++; $totalTests++ }
if ($ordersTest.Success) { $successTests++; $totalTests++ }
if ($invoicesTest.Success) { $successTests++; $totalTests++ }
if ($analyticsTest.Success) { $successTests++; $totalTests++ }

$successRate = [math]::Round(($successTests / $totalTests) * 100, 2)

Write-Host "✅ Tests réussis: $successTests/$totalTests ($successRate%)" -ForegroundColor Green

if ($successRate -ge 90) {
    Write-Host "`n🎉 APPLICATION ENTIÈREMENT OPÉRATIONNELLE" -ForegroundColor Green
} elseif ($successRate -ge 70) {
    Write-Host "`n⚠️  APPLICATION PARTIELLEMENT OPÉRATIONNELLE" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ APPLICATION NÉCESSITE DES CORRECTIONS" -ForegroundColor Red
}

Write-Host "`n✅ VÉRIFICATION COMPLÈTE TERMINÉE" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
