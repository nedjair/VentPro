Write-Host "🔗 Test de Connexion Frontend-Backend" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

# Configuration
$backendUrl = "http://localhost:3001"
$frontendUrl = "http://localhost:3003"

# Test 1: Backend Health Check
Write-Host "`n1. Test Backend Health Check" -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "$backendUrl/health" -TimeoutSec 5
    if ($healthResponse.StatusCode -eq 200) {
        $healthData = $healthResponse.Content | ConvertFrom-Json
        Write-Host "✅ Backend operationnel" -ForegroundColor Green
        Write-Host "   Status: $($healthData.status)" -ForegroundColor Cyan
        Write-Host "   Database: $($healthData.database)" -ForegroundColor Cyan
        Write-Host "   Redis: $($healthData.redis)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Backend non accessible: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Frontend Accessibility
Write-Host "`n2. Test Frontend Accessibility" -ForegroundColor Yellow
try {
    $frontendResponse = Invoke-WebRequest -Uri $frontendUrl -TimeoutSec 5
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "✅ Frontend accessible" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Frontend non accessible: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Authentication
Write-Host "`n3. Test Authentication" -ForegroundColor Yellow
try {
    $loginBody = @{
        email = "admin@demo-tpe.fr"
        password = "demo123"
    } | ConvertTo-Json

    $loginResponse = Invoke-WebRequest -Uri "$backendUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -TimeoutSec 5
    
    if ($loginResponse.StatusCode -eq 200) {
        $loginData = $loginResponse.Content | ConvertFrom-Json
        Write-Host "✅ Authentification reussie" -ForegroundColor Green
        Write-Host "   Utilisateur: $($loginData.data.user.email)" -ForegroundColor Cyan
        Write-Host "   Role: $($loginData.data.user.role)" -ForegroundColor Cyan
        
        # Extraire le token
        $token = $loginData.data.token
        Write-Host "   Token: $($token.Substring(0, 20))..." -ForegroundColor Cyan
        
        # Test 4: API protégée avec token
        Write-Host "`n4. Test API protegee avec token" -ForegroundColor Yellow
        try {
            $headers = @{
                "Authorization" = "Bearer $token"
                "Content-Type" = "application/json"
            }
            
            $statsResponse = Invoke-WebRequest -Uri "$backendUrl/dashboard/stats" -Headers $headers -TimeoutSec 5
            
            if ($statsResponse.StatusCode -eq 200) {
                Write-Host "✅ API protegee accessible avec token" -ForegroundColor Green
                $statsData = $statsResponse.Content | ConvertFrom-Json
                Write-Host "   Clients: $($statsData.data.clients)" -ForegroundColor Cyan
                Write-Host "   Produits: $($statsData.data.products)" -ForegroundColor Cyan
            }
        } catch {
            Write-Host "❌ API protegee non accessible: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "❌ Authentification echouee: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Routes API disponibles
Write-Host "`n5. Test Routes API disponibles" -ForegroundColor Yellow
$routes = @(
    "/api/v1/clients",
    "/api/v1/products", 
    "/api/v1/orders",
    "/api/v1/invoices"
)

foreach ($route in $routes) {
    try {
        $response = Invoke-WebRequest -Uri "$backendUrl$route" -TimeoutSec 3
        if ($response.StatusCode -eq 401) {
            Write-Host "✅ $route (protege - 401 attendu)" -ForegroundColor Green
        } elseif ($response.StatusCode -eq 200) {
            Write-Host "✅ $route (accessible)" -ForegroundColor Green
        }
    } catch {
        if ($_.Exception.Response.StatusCode -eq 401) {
            Write-Host "✅ $route (protege - 401 attendu)" -ForegroundColor Green
        } else {
            Write-Host "❌ $route (erreur: $($_.Exception.Message))" -ForegroundColor Red
        }
    }
}

# Résumé et instructions
Write-Host "`n📋 Resume" -ForegroundColor Yellow
Write-Host "=========" -ForegroundColor Yellow

Write-Host "`n✅ Services operationnels:" -ForegroundColor Green
Write-Host "   - Backend: $backendUrl" -ForegroundColor Cyan
Write-Host "   - Frontend: $frontendUrl" -ForegroundColor Cyan

Write-Host "`n🔐 Identifiants de connexion:" -ForegroundColor Yellow
Write-Host "   Email: admin@demo-tpe.fr" -ForegroundColor Cyan
Write-Host "   Mot de passe: demo123" -ForegroundColor Cyan

Write-Host "`n📱 URLs d'acces:" -ForegroundColor Yellow
Write-Host "   Frontend: $frontendUrl" -ForegroundColor Cyan
Write-Host "   Page de login: $frontendUrl/login" -ForegroundColor Cyan
Write-Host "   Dashboard: $frontendUrl/dashboard" -ForegroundColor Cyan

Write-Host "`n🎯 Prochaines etapes:" -ForegroundColor Yellow
Write-Host "   1. Ouvrir $frontendUrl/login" -ForegroundColor Cyan
Write-Host "   2. Se connecter avec les identifiants ci-dessus" -ForegroundColor Cyan
Write-Host "   3. Acceder au dashboard" -ForegroundColor Cyan

Write-Host "`n✅ Test de connexion termine!" -ForegroundColor Green
