# Script de test du serveur API
Write-Host "Test du serveur API..." -ForegroundColor Green

# Test de health check
try {
    Write-Host "Test 1: Health check..." -ForegroundColor Yellow
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method Get -TimeoutSec 10
    Write-Host "✅ Health check réussi:" -ForegroundColor Green
    $healthResponse | ConvertTo-Json
} catch {
    Write-Host "❌ Health check échoué: $($_.Exception.Message)" -ForegroundColor Red
}

# Test de la documentation Swagger
try {
    Write-Host "`nTest 2: Documentation Swagger..." -ForegroundColor Yellow
    $docsResponse = Invoke-WebRequest -Uri "http://localhost:3001/docs" -Method Get -TimeoutSec 10
    Write-Host "✅ Documentation accessible - Status: $($docsResponse.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Documentation non accessible: $($_.Exception.Message)" -ForegroundColor Red
}

# Test de connexion
try {
    Write-Host "`nTest 3: Connexion utilisateur..." -ForegroundColor Yellow
    $loginData = @{
        email = "admin@test.com"
        password = "password123"
    } | ConvertTo-Json
    
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/login" -Method Post -Body $loginData -ContentType "application/json" -TimeoutSec 10
    Write-Host "✅ Connexion réussie:" -ForegroundColor Green
    Write-Host "User: $($loginResponse.data.user.firstName) $($loginResponse.data.user.lastName)"
    $accessToken = $loginResponse.data.tokens.accessToken
    Write-Host "Token obtenu ✓"
} catch {
    Write-Host "❌ Connexion échouée: $($_.Exception.Message)" -ForegroundColor Red
    $accessToken = $null
}

# Test de récupération des clients (si token obtenu)
if ($accessToken) {
    try {
        Write-Host "`nTest 4: Récupération des clients..." -ForegroundColor Yellow
        $headers = @{
            "Authorization" = "Bearer $accessToken"
        }
        $clientsResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/clients" -Method Get -Headers $headers -TimeoutSec 10
        Write-Host "✅ Récupération des clients réussie:" -ForegroundColor Green
        Write-Host "Nombre de clients: $($clientsResponse.data.Count)"
    } catch {
        Write-Host "❌ Récupération des clients échouée: $($_.Exception.Message)" -ForegroundColor Red
    }

    # Test de création d'un client
    try {
        Write-Host "`nTest 5: Création d'un client..." -ForegroundColor Yellow
        $clientData = @{
            type = "INDIVIDUAL"
            firstName = "Test"
            lastName = "Client"
            email = "test@client.com"
            phone = "0123456789"
            city = "Paris"
        } | ConvertTo-Json
        
        $createResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/clients" -Method Post -Body $clientData -ContentType "application/json" -Headers $headers -TimeoutSec 10
        Write-Host "✅ Création de client réussie:" -ForegroundColor Green
        Write-Host "Client créé: $($createResponse.data.firstName) $($createResponse.data.lastName)"
    } catch {
        Write-Host "❌ Création de client échouée: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n🎉 Tests terminés!" -ForegroundColor Green