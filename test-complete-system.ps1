Write-Host "🔍 Test complet du système Gestion Commerciale TPE" -ForegroundColor Yellow

# 1. Démarrer les services Docker
Write-Host "1. Démarrage des services Docker..." -ForegroundColor Cyan
docker-compose up -d postgres redis
Start-Sleep -Seconds 15

# 2. Vérifier que PostgreSQL est prêt
Write-Host "2. Vérification de PostgreSQL..." -ForegroundColor Cyan
$pgReady = $false
$attempts = 0
while (-not $pgReady -and $attempts -lt 10) {
    try {
        $result = docker exec gestion-postgres pg_isready -U gestion_user -d gestion_commerciale
        if ($result -like "*accepting connections*") {
            $pgReady = $true
            Write-Host "✅ PostgreSQL est prêt" -ForegroundColor Green
        }
    } catch {
        Write-Host "⏳ PostgreSQL pas encore prêt, tentative $($attempts + 1)/10..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
        $attempts++
    }
}

if (-not $pgReady) {
    Write-Host "❌ PostgreSQL n'est pas prêt après 10 tentatives" -ForegroundColor Red
    exit 1
}

# 3. Démarrer le backend
Write-Host "3. Démarrage du backend..." -ForegroundColor Cyan
Start-Process -FilePath "node" -ArgumentList "production-backend.js" -WindowStyle Hidden
Start-Sleep -Seconds 10

# 4. Tester l'API backend
Write-Host "4. Test de l'API backend..." -ForegroundColor Cyan
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:3001/health" -Method GET
    if ($healthResponse.StatusCode -eq 200) {
        Write-Host "✅ Backend fonctionne" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Backend ne répond pas" -ForegroundColor Red
}

# 5. Test d'authentification
Write-Host "5. Test d'authentification..." -ForegroundColor Cyan
try {
    $loginBody = @{
        email = "admin@demo-tpe.fr"
        password = "demo123"
    } | ConvertTo-Json
    
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $loginData = $loginResponse.Content | ConvertFrom-Json
    
    if ($loginData.success) {
        Write-Host "✅ Authentification réussie" -ForegroundColor Green
        $token = $loginData.data.token
        
        # 6. Test route clients
        Write-Host "6. Test route /api/clients..." -ForegroundColor Cyan
        $headers = @{
            "Authorization" = "Bearer $token"
        }
        
        $clientsResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/clients" -Method GET -Headers $headers
        $clientsData = $clientsResponse.Content | ConvertFrom-Json
        
        if ($clientsData.success) {
            Write-Host "✅ Route /api/clients fonctionne" -ForegroundColor Green
            Write-Host "📊 Nombre de clients: $($clientsData.data.Count)" -ForegroundColor Gray
        } else {
            Write-Host "❌ Erreur route /api/clients" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "❌ Erreur lors des tests API: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "🎉 Tests terminés !" -ForegroundColor Green
Write-Host "🌐 Frontend: http://localhost:3003" -ForegroundColor Cyan
Write-Host "🔧 Backend: http://localhost:3001" -ForegroundColor Cyan
