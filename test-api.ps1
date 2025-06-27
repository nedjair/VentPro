# Script de test de l'API
Write-Host "🧪 Test de l'API backend..." -ForegroundColor Green

$baseUrl = "http://127.0.0.1:3001"

# Test 1: Health check
Write-Host "`n1️⃣ Test Health Check..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get -TimeoutSec 10
    Write-Host "✅ Health check réussi:" -ForegroundColor Green
    Write-Host ($healthResponse | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "❌ Health check échoué: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "ℹ️ Assurez-vous que le serveur est démarré avec .\start-server.ps1" -ForegroundColor Cyan
    exit 1
}

# Test 2: Documentation Swagger
Write-Host "`n2️⃣ Test Documentation..." -ForegroundColor Yellow
try {
    $docsResponse = Invoke-WebRequest -Uri "$baseUrl/docs" -Method Get -TimeoutSec 10
    Write-Host "✅ Documentation accessible - Status: $($docsResponse.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Documentation non accessible: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Login
Write-Host "`n3️⃣ Test Login..." -ForegroundColor Yellow
try {
    $loginData = @{
        email = "admin@test.com"
        password = "password123"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" -Method Post -Body $loginData -ContentType "application/json" -TimeoutSec 10
    Write-Host "✅ Login réussi:" -ForegroundColor Green
    Write-Host "👤 Utilisateur: $($loginResponse.data.user.firstName) $($loginResponse.data.user.lastName)" -ForegroundColor Cyan
    Write-Host "🔑 Token obtenu" -ForegroundColor Cyan
    
    $accessToken = $loginResponse.data.tokens.accessToken
} catch {
    Write-Host "❌ Login échoué: $($_.Exception.Message)" -ForegroundColor Red
    $accessToken = $null
}

# Test 4: API protégée (clients)
if ($accessToken) {
    Write-Host "`n4️⃣ Test API Clients..." -ForegroundColor Yellow
    try {
        $headers = @{
            "Authorization" = "Bearer $accessToken"
            "Content-Type" = "application/json"
        }
        
        $clientsResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/clients" -Method Get -Headers $headers -TimeoutSec 10
        Write-Host "✅ Récupération des clients réussie:" -ForegroundColor Green
        Write-Host "📊 Nombre de clients: $($clientsResponse.data.data.Count)" -ForegroundColor Cyan
        
        # Afficher les clients
        if ($clientsResponse.data.data.Count -gt 0) {
            Write-Host "👥 Clients:" -ForegroundColor Cyan
            foreach ($client in $clientsResponse.data.data) {
                Write-Host "  • $($client.firstName) $($client.lastName) - $($client.email)" -ForegroundColor White
            }
        }
    } catch {
        Write-Host "❌ Récupération des clients échouée: $($_.Exception.Message)" -ForegroundColor Red
    }

    # Test 5: Création d'un client
    Write-Host "`n5️⃣ Test Création Client..." -ForegroundColor Yellow
    try {
        $newClientData = @{
            type = "INDIVIDUAL"
            firstName = "Test"
            lastName = "Utilisateur"
            email = "test.user$((Get-Random -Maximum 9999))@example.com"
            phone = "0123456789"
            city = "Paris"
        } | ConvertTo-Json

        $createResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/clients" -Method Post -Body $newClientData -Headers $headers -TimeoutSec 10
        Write-Host "✅ Création de client réussie:" -ForegroundColor Green
        Write-Host "🆔 ID: $($createResponse.data.id)" -ForegroundColor Cyan
        Write-Host "👤 Nom: $($createResponse.data.firstName) $($createResponse.data.lastName)" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ Création de client échouée: $($_.Exception.Message)" -ForegroundColor Red
    }

    # Test 6: Dashboard stats
    Write-Host "`n6️⃣ Test Dashboard..." -ForegroundColor Yellow
    try {
        $dashboardResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/dashboard/stats" -Method Get -Headers $headers -TimeoutSec 10
        Write-Host "✅ Dashboard accessible:" -ForegroundColor Green
        Write-Host "📈 Total clients: $($dashboardResponse.data.totalClients)" -ForegroundColor Cyan
        Write-Host "💰 Chiffre d'affaires: $($dashboardResponse.data.totalRevenue) €" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ Dashboard échoué: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n🎉 Tests terminés!" -ForegroundColor Green
Write-Host "💡 Pour arrêter le serveur, utilisez Ctrl+C dans la fenêtre du serveur" -ForegroundColor Cyan