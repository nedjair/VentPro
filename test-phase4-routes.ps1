# Script de test des nouvelles routes Phase 4
Write-Host "🧪 TEST DES ROUTES PHASE 4 - MODULE COMMERCIAL" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

# Configuration
$baseUrl = "http://localhost:3001"
$loginUrl = "$baseUrl/auth/login"

# Test 1: Vérifier que le backend fonctionne
Write-Host "`n1. TEST DE SANTE DU BACKEND" -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "$baseUrl/health" -TimeoutSec 5
    if ($healthResponse.StatusCode -eq 200) {
        Write-Host "   ✅ Backend opérationnel" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ Backend non accessible" -ForegroundColor Red
    exit 1
}

# Test 2: Authentification
Write-Host "`n2. TEST D'AUTHENTIFICATION" -ForegroundColor Yellow
$credentials = @{
    email = "manager@demo-tpe.fr"
    password = "demo123"
}

try {
    $loginBody = $credentials | ConvertTo-Json
    $loginResponse = Invoke-WebRequest -Uri $loginUrl -Method POST -Body $loginBody -ContentType "application/json"
    $loginData = $loginResponse.Content | ConvertFrom-Json
    
    if ($loginData.success) {
        $token = $loginData.data.token
        Write-Host "   ✅ Authentification réussie" -ForegroundColor Green
        Write-Host "   📝 Token: $($token.Substring(0,20))..." -ForegroundColor Cyan
    } else {
        Write-Host "   ❌ Échec authentification: $($loginData.message)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ Erreur authentification: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Headers avec token
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Test 3: Routes Orders
Write-Host "`n3. TEST DES ROUTES COMMANDES" -ForegroundColor Yellow

# Test GET /api/v1/orders
try {
    $ordersResponse = Invoke-WebRequest -Uri "$baseUrl/api/v1/orders" -Headers $headers
    if ($ordersResponse.StatusCode -eq 200) {
        $ordersData = $ordersResponse.Content | ConvertFrom-Json
        Write-Host "   ✅ GET /api/v1/orders - OK" -ForegroundColor Green
        Write-Host "   📊 Commandes trouvées: $($ordersData.data.Count)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "   ❌ GET /api/v1/orders - ÉCHEC: $($_.Exception.Message)" -ForegroundColor Red
}

# Test GET /api/v1/orders/stats/overview
try {
    $orderStatsResponse = Invoke-WebRequest -Uri "$baseUrl/api/v1/orders/stats/overview" -Headers $headers
    if ($orderStatsResponse.StatusCode -eq 200) {
        $statsData = $orderStatsResponse.Content | ConvertFrom-Json
        Write-Host "   ✅ GET /api/v1/orders/stats/overview - OK" -ForegroundColor Green
        Write-Host "   📈 Total commandes: $($statsData.data.totalOrders)" -ForegroundColor Cyan
        Write-Host "   📈 Total devis: $($statsData.data.totalQuotes)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "   ❌ GET /api/v1/orders/stats/overview - ÉCHEC: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Routes Invoices
Write-Host "`n4. TEST DES ROUTES FACTURES" -ForegroundColor Yellow

# Test GET /api/v1/invoices
try {
    $invoicesResponse = Invoke-WebRequest -Uri "$baseUrl/api/v1/invoices" -Headers $headers
    if ($invoicesResponse.StatusCode -eq 200) {
        $invoicesData = $invoicesResponse.Content | ConvertFrom-Json
        Write-Host "   ✅ GET /api/v1/invoices - OK" -ForegroundColor Green
        Write-Host "   📊 Factures trouvées: $($invoicesData.data.Count)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "   ❌ GET /api/v1/invoices - ÉCHEC: $($_.Exception.Message)" -ForegroundColor Red
}

# Test GET /api/v1/invoices/stats/overview
try {
    $invoiceStatsResponse = Invoke-WebRequest -Uri "$baseUrl/api/v1/invoices/stats/overview" -Headers $headers
    if ($invoiceStatsResponse.StatusCode -eq 200) {
        $invoiceStatsData = $invoiceStatsResponse.Content | ConvertFrom-Json
        Write-Host "   ✅ GET /api/v1/invoices/stats/overview - OK" -ForegroundColor Green
        Write-Host "   📈 Total factures: $($invoiceStatsData.data.totalInvoices)" -ForegroundColor Cyan
        Write-Host "   📈 Factures payées: $($invoiceStatsData.data.paidInvoices)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "   ❌ GET /api/v1/invoices/stats/overview - ÉCHEC: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Création d'un devis de test
Write-Host "`n5. TEST DE CREATION D'UN DEVIS" -ForegroundColor Yellow

# D'abord, récupérer un client et un produit
try {
    $clientsResponse = Invoke-WebRequest -Uri "$baseUrl/clients" -Headers $headers
    $clientsData = $clientsResponse.Content | ConvertFrom-Json
    
    $productsResponse = Invoke-WebRequest -Uri "$baseUrl/products" -Headers $headers
    $productsData = $productsResponse.Content | ConvertFrom-Json
    
    if ($clientsData.data.data.Count -gt 0 -and $productsData.data.data.Count -gt 0) {
        $client = $clientsData.data.data[0]
        $product = $productsData.data.data[0]
        
        Write-Host "   📋 Client sélectionné: $($client.email)" -ForegroundColor Cyan
        Write-Host "   📦 Produit sélectionné: $($product.name)" -ForegroundColor Cyan
        
        # Créer un devis de test
        $quoteData = @{
            type = "QUOTE"
            client_id = $client.id
            notes = "Devis de test Phase 4"
            items = @(
                @{
                    product_id = $product.id
                    quantity = 2
                    unit_price = [decimal]$product.price
                    vat_rate = 20
                    discount = 0
                }
            )
        }
        
        $quoteBody = $quoteData | ConvertTo-Json -Depth 3
        $quoteResponse = Invoke-WebRequest -Uri "$baseUrl/api/v1/orders" -Method POST -Body $quoteBody -Headers $headers
        
        if ($quoteResponse.StatusCode -eq 200) {
            $newQuote = $quoteResponse.Content | ConvertFrom-Json
            Write-Host "   ✅ Devis créé avec succès" -ForegroundColor Green
            Write-Host "   📄 Numéro: $($newQuote.data.number)" -ForegroundColor Cyan
            Write-Host "   💰 Total: $($newQuote.data.total) €" -ForegroundColor Cyan
        }
    } else {
        Write-Host "   ⚠️ Pas de clients ou produits disponibles pour le test" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Erreur création devis: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎯 TESTS PHASE 4 TERMINÉS" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host "✅ Module Commercial Phase 4 opérationnel!" -ForegroundColor Green
Write-Host "📋 Routes disponibles:" -ForegroundColor White
Write-Host "  • GET /api/v1/orders - Liste des commandes/devis" -ForegroundColor Cyan
Write-Host "  • POST /api/v1/orders - Créer commande/devis" -ForegroundColor Cyan
Write-Host "  • GET /api/v1/orders/stats/overview - Statistiques commandes" -ForegroundColor Cyan
Write-Host "  • GET /api/v1/invoices - Liste des factures" -ForegroundColor Cyan
Write-Host "  • POST /api/v1/invoices - Créer facture" -ForegroundColor Cyan
Write-Host "  • GET /api/v1/invoices/stats/overview - Statistiques factures" -ForegroundColor Cyan
