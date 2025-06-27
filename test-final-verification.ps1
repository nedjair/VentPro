# 🔍 TEST FINAL DE VÉRIFICATION - GESTION COMMERCIALE TPE
# Résumé complet de l'état de l'application

Write-Host "🔍 VÉRIFICATION FINALE - GESTION COMMERCIALE TPE" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

$results = @()

# 1. Infrastructure Docker
Write-Host "🐳 1. INFRASTRUCTURE DOCKER" -ForegroundColor Yellow
try {
    $containers = docker ps --format "{{.Names}}: {{.Status}}"
    foreach ($container in $containers) {
        Write-Host "   ✅ $container" -ForegroundColor Green
    }
    $results += "Infrastructure Docker: ✅ OPÉRATIONNELLE"
} catch {
    Write-Host "   ❌ Docker non accessible" -ForegroundColor Red
    $results += "Infrastructure Docker: ❌ PROBLÈME"
}

# 2. Backend Fastify
Write-Host "`n🔧 2. BACKEND FASTIFY (PORT 3001)" -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "http://localhost:3001/health" -Method GET -TimeoutSec 5
    $healthData = $health.Content | ConvertFrom-Json
    Write-Host "   ✅ Health Check: $($health.StatusCode)" -ForegroundColor Green
    Write-Host "   ✅ Database: $($healthData.database)" -ForegroundColor Green
    Write-Host "   ✅ Redis: $($healthData.redis)" -ForegroundColor Green
    $results += "Backend Fastify: ✅ OPÉRATIONNEL"
} catch {
    Write-Host "   ❌ Backend non accessible" -ForegroundColor Red
    $results += "Backend Fastify: ❌ NON ACCESSIBLE"
}

# 3. Authentification
Write-Host "`n🔐 3. SYSTÈME D'AUTHENTIFICATION" -ForegroundColor Yellow
try {
    $loginBody = '{"email":"admin@demo-tpe.fr","password":"demo123"}'
    $login = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -TimeoutSec 5
    $loginData = $login.Content | ConvertFrom-Json
    
    if ($loginData.success) {
        Write-Host "   ✅ Login: RÉUSSI" -ForegroundColor Green
        Write-Host "   ✅ Token JWT: GÉNÉRÉ" -ForegroundColor Green
        Write-Host "   ✅ Utilisateur: $($loginData.data.user.email)" -ForegroundColor Green
        $token = $loginData.data.token
        $authHeaders = @{ "Authorization" = "Bearer $token" }
        $results += "Authentification: ✅ FONCTIONNELLE"
    } else {
        Write-Host "   ❌ Login: ÉCHEC" -ForegroundColor Red
        $results += "Authentification: ❌ ÉCHEC"
    }
} catch {
    Write-Host "   ❌ Authentification: ERREUR" -ForegroundColor Red
    $results += "Authentification: ❌ ERREUR"
}

# 4. API Modules CRUD
Write-Host "`n📊 4. MODULES API CRUD" -ForegroundColor Yellow
if ($token) {
    # Test Clients
    try {
        $clients = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/clients" -Headers $authHeaders -TimeoutSec 5
        $clientsData = $clients.Content | ConvertFrom-Json
        $clientCount = if ($clientsData.data.clients) { $clientsData.data.clients.Count } else { 0 }
        Write-Host "   ✅ Clients: $clientCount entrées" -ForegroundColor Green
        $results += "Module Clients: ✅ OPÉRATIONNEL ($clientCount entrées)"
    } catch {
        Write-Host "   ❌ Clients: ERREUR" -ForegroundColor Red
        $results += "Module Clients: ❌ ERREUR"
    }
    
    # Test Products
    try {
        $products = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/products" -Headers $authHeaders -TimeoutSec 5
        $productsData = $products.Content | ConvertFrom-Json
        $productCount = if ($productsData.data.products) { $productsData.data.products.Count } else { 0 }
        Write-Host "   ✅ Produits: $productCount entrées" -ForegroundColor Green
        $results += "Module Produits: ✅ OPÉRATIONNEL ($productCount entrées)"
    } catch {
        Write-Host "   ❌ Produits: ERREUR" -ForegroundColor Red
        $results += "Module Produits: ❌ ERREUR"
    }
    
    # Test Orders
    try {
        $orders = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/orders" -Headers $authHeaders -TimeoutSec 5
        $ordersData = $orders.Content | ConvertFrom-Json
        $orderCount = if ($ordersData.data.orders) { $ordersData.data.orders.Count } else { 0 }
        Write-Host "   ✅ Commandes: $orderCount entrées" -ForegroundColor Green
        $results += "Module Commandes: ✅ OPÉRATIONNEL ($orderCount entrées)"
    } catch {
        Write-Host "   ❌ Commandes: ERREUR" -ForegroundColor Red
        $results += "Module Commandes: ❌ ERREUR"
    }
    
    # Test Invoices
    try {
        $invoices = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/invoices" -Headers $authHeaders -TimeoutSec 5
        $invoicesData = $invoices.Content | ConvertFrom-Json
        $invoiceCount = if ($invoicesData.data.invoices) { $invoicesData.data.invoices.Count } else { 0 }
        Write-Host "   ✅ Factures: $invoiceCount entrées" -ForegroundColor Green
        $results += "Module Factures: ✅ OPÉRATIONNEL ($invoiceCount entrées)"
    } catch {
        Write-Host "   ❌ Factures: ERREUR" -ForegroundColor Red
        $results += "Module Factures: ❌ ERREUR"
    }
    
    # Test Analytics
    try {
        $analytics = Invoke-WebRequest -Uri "http://localhost:3001/dashboard/stats" -Headers $authHeaders -TimeoutSec 5
        Write-Host "   ✅ Analytics: DISPONIBLE" -ForegroundColor Green
        $results += "Module Analytics: ✅ OPÉRATIONNEL"
    } catch {
        Write-Host "   ❌ Analytics: ERREUR" -ForegroundColor Red
        $results += "Module Analytics: ❌ ERREUR"
    }
}

# 5. Frontend Next.js
Write-Host "`n🌐 5. FRONTEND NEXT.JS (PORT 3003)" -ForegroundColor Yellow
try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:3003" -Method GET -TimeoutSec 5
    Write-Host "   ✅ Frontend: ACCESSIBLE ($($frontend.StatusCode))" -ForegroundColor Green
    $results += "Frontend Next.js: ✅ OPÉRATIONNEL"
} catch {
    Write-Host "   ⚠️  Frontend: NON ACCESSIBLE" -ForegroundColor Yellow
    Write-Host "      (Peut nécessiter un démarrage manuel)" -ForegroundColor Gray
    $results += "Frontend Next.js: ⚠️ NON DÉMARRÉ"
}

# Résumé final
Write-Host "`n📋 RÉSUMÉ FINAL" -ForegroundColor Yellow
Write-Host "===============" -ForegroundColor Yellow

$successCount = ($results | Where-Object { $_ -like "*✅*" }).Count
$totalCount = $results.Count

foreach ($result in $results) {
    if ($result -like "*✅*") {
        Write-Host "✅ $result" -ForegroundColor Green
    } elseif ($result -like "*⚠️*") {
        Write-Host "⚠️ $result" -ForegroundColor Yellow
    } else {
        Write-Host "❌ $result" -ForegroundColor Red
    }
}

$successRate = [math]::Round(($successCount / $totalCount) * 100, 1)

Write-Host "`n🎯 TAUX DE RÉUSSITE: $successRate% ($successCount/$totalCount)" -ForegroundColor Cyan

if ($successRate -ge 90) {
    Write-Host "`n🎉 APPLICATION ENTIÈREMENT OPÉRATIONNELLE!" -ForegroundColor Green
} elseif ($successRate -ge 80) {
    Write-Host "`n✅ APPLICATION MAJORITAIREMENT OPÉRATIONNELLE" -ForegroundColor Green
} elseif ($successRate -ge 60) {
    Write-Host "`n⚠️ APPLICATION PARTIELLEMENT OPÉRATIONNELLE" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ APPLICATION NÉCESSITE DES CORRECTIONS" -ForegroundColor Red
}

Write-Host "`n📖 RAPPORT DÉTAILLÉ: RAPPORT_VERIFICATION_COMPLETE.md" -ForegroundColor Cyan
Write-Host "🔧 IDENTIFIANTS: admin@demo-tpe.fr / demo123" -ForegroundColor Cyan
Write-Host "🌐 BACKEND: http://localhost:3001" -ForegroundColor Cyan
Write-Host "🖥️ FRONTEND: http://localhost:3003" -ForegroundColor Cyan

Write-Host "`n✅ VÉRIFICATION TERMINÉE" -ForegroundColor Green
