# Vérification finale simple
Write-Host "VERIFICATION FINALE - GESTION COMMERCIALE TPE" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

$API_BASE = "http://localhost:3001"
$FRONTEND_URL = "http://localhost:3003"

# 1. Test Backend
Write-Host "`n1. Backend Fastify (Port 3001):" -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "$API_BASE/health" -Method GET -TimeoutSec 5
    Write-Host "   ✅ OPÉRATIONNEL" -ForegroundColor Green
    $healthData = $health.Content | ConvertFrom-Json
    Write-Host "   Database: $($healthData.database)" -ForegroundColor Gray
    Write-Host "   Redis: $($healthData.redis)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ NON ACCESSIBLE" -ForegroundColor Red
}

# 2. Test Authentification
Write-Host "`n2. Authentification:" -ForegroundColor Yellow
try {
    $body = @{
        email = "admin@demo-tpe.fr"
        password = "demo123"
    } | ConvertTo-Json
    
    $auth = Invoke-WebRequest -Uri "$API_BASE/api/auth/login" -Method POST -ContentType "application/json" -Body $body -TimeoutSec 5
    Write-Host "   ✅ FONCTIONNELLE" -ForegroundColor Green
    
    $authData = $auth.Content | ConvertFrom-Json
    $token = $authData.data.token
    Write-Host "   Token généré: OK" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ ÉCHEC" -ForegroundColor Red
}

# 3. Test API avec token
if ($token) {
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    Write-Host "`n3. Modules API:" -ForegroundColor Yellow
    
    # Clients
    try {
        $clients = Invoke-WebRequest -Uri "$API_BASE/api/v1/clients" -Headers $headers -TimeoutSec 5
        $clientsData = $clients.Content | ConvertFrom-Json
        $count = if ($clientsData.data.clients) { $clientsData.data.clients.Count } else { 0 }
        Write-Host "   ✅ Clients: $count entrées" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Clients: ERREUR" -ForegroundColor Red
    }
    
    # Produits
    try {
        $products = Invoke-WebRequest -Uri "$API_BASE/api/v1/products" -Headers $headers -TimeoutSec 5
        $productsData = $products.Content | ConvertFrom-Json
        $count = if ($productsData.data.products) { $productsData.data.products.Count } else { 0 }
        Write-Host "   ✅ Produits: $count entrées" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Produits: ERREUR" -ForegroundColor Red
    }
    
    # Analytics
    try {
        $stats = Invoke-WebRequest -Uri "$API_BASE/dashboard/stats" -Headers $headers -TimeoutSec 5
        Write-Host "   ✅ Analytics: DISPONIBLE" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Analytics: ERREUR" -ForegroundColor Red
    }
}

# 4. Test Frontend
Write-Host "`n4. Frontend Next.js (Port 3003):" -ForegroundColor Yellow
try {
    $frontend = Invoke-WebRequest -Uri $FRONTEND_URL -Method GET -TimeoutSec 5
    Write-Host "   ✅ ACCESSIBLE" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  NON ACCESSIBLE (à démarrer)" -ForegroundColor Yellow
}

# 5. Infrastructure Docker
Write-Host "`n5. Infrastructure Docker:" -ForegroundColor Yellow
try {
    $containers = docker ps --format "{{.Names}}: {{.Status}}"
    foreach ($container in $containers) {
        Write-Host "   ✅ $container" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ Docker non accessible" -ForegroundColor Red
}

Write-Host "`n=============================================" -ForegroundColor Green
Write-Host "RÉSUMÉ:" -ForegroundColor Cyan
Write-Host "• Backend: http://localhost:3001" -ForegroundColor Gray
Write-Host "• Frontend: http://localhost:3003" -ForegroundColor Gray
Write-Host "• Identifiants: admin@demo-tpe.fr / demo123" -ForegroundColor Gray
Write-Host "• Rapport: RAPPORT_VERIFICATION_COMPLETE.md" -ForegroundColor Gray
Write-Host "=============================================" -ForegroundColor Green
