# Test d'authentification et des routes API

Write-Host "Test d'authentification et des routes API" -ForegroundColor Green

# 1. Test de connexion
Write-Host "`n1. Test de connexion..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@demo-tpe.fr"
    password = "demo123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:3001/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $loginData = $loginResponse.Content | ConvertFrom-Json
    
    if ($loginData.success) {
        $token = $loginData.data.tokens.accessToken
        Write-Host "✅ Connexion réussie" -ForegroundColor Green
        Write-Host "Token: $($token.Substring(0, 20))..." -ForegroundColor Cyan
        
        # 2. Test des routes dashboard
        Write-Host "`n2. Test route dashboard..." -ForegroundColor Yellow
        $headers = @{
            "Authorization" = "Bearer $token"
            "Content-Type" = "application/json"
        }
        
        try {
            $dashboardResponse = Invoke-WebRequest -Uri "http://localhost:3001/dashboard/stats" -Headers $headers
            Write-Host "✅ Dashboard accessible" -ForegroundColor Green
        } catch {
            Write-Host "❌ Dashboard inaccessible: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        # 3. Test des routes analytics
        Write-Host "`n3. Test route analytics KPI..." -ForegroundColor Yellow
        try {
            $kpiResponse = Invoke-WebRequest -Uri "http://localhost:3001/analytics/kpi" -Headers $headers
            Write-Host "✅ Analytics KPI accessible" -ForegroundColor Green
        } catch {
            Write-Host "❌ Analytics KPI inaccessible: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        # 4. Test des routes clients
        Write-Host "`n4. Test route clients..." -ForegroundColor Yellow
        try {
            $clientsResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/clients" -Headers $headers
            Write-Host "✅ Clients accessible" -ForegroundColor Green
        } catch {
            Write-Host "❌ Clients inaccessible: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        # 5. Test des routes produits
        Write-Host "`n5. Test route produits..." -ForegroundColor Yellow
        try {
            $productsResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/products" -Headers $headers
            Write-Host "✅ Produits accessible" -ForegroundColor Green
        } catch {
            Write-Host "❌ Produits inaccessible: $($_.Exception.Message)" -ForegroundColor Red
        }
        
    } else {
        Write-Host "❌ Échec de la connexion: $($loginData.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erreur de connexion: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nTest terminé" -ForegroundColor Green
