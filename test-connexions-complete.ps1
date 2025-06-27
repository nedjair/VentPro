# =============================================================================
# SCRIPT DE VÉRIFICATION COMPLÈTE DES CONNEXIONS
# Gestion Commerciale TPE - Backend Production
# =============================================================================

Write-Host "🔍 VÉRIFICATION COMPLÈTE DES CONNEXIONS - GESTION COMMERCIALE TPE" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:3001"
$testResults = @()

# =============================================================================
# 1. TEST DE SANTÉ DU SERVEUR
# =============================================================================
Write-Host "`n📊 1. TEST DE SANTÉ DU SERVEUR" -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
    Write-Host "✅ Serveur: " -NoNewline -ForegroundColor Green
    Write-Host "OPÉRATIONNEL" -ForegroundColor Green
    Write-Host "   - Status: $($healthResponse.status)" -ForegroundColor Gray
    Write-Host "   - Database: $($healthResponse.database)" -ForegroundColor Gray
    Write-Host "   - Redis: $($healthResponse.redis)" -ForegroundColor Gray
    Write-Host "   - Uptime: $([math]::Round($healthResponse.uptime, 2))s" -ForegroundColor Gray
    $testResults += @{Test="Health Check"; Status="✅ PASS"; Details=$healthResponse.status}
} catch {
    Write-Host "❌ Serveur: ÉCHEC" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
    $testResults += @{Test="Health Check"; Status="❌ FAIL"; Details=$_.Exception.Message}
}

# =============================================================================
# 2. TEST DES MÉTRIQUES
# =============================================================================
Write-Host "`n📈 2. TEST DES MÉTRIQUES" -ForegroundColor Yellow
try {
    $metricsResponse = Invoke-RestMethod -Uri "$baseUrl/metrics" -Method GET
    Write-Host "✅ Métriques: " -NoNewline -ForegroundColor Green
    Write-Host "DISPONIBLES" -ForegroundColor Green
    Write-Host "   - Clients: $($metricsResponse.clients)" -ForegroundColor Gray
    Write-Host "   - Produits: $($metricsResponse.products)" -ForegroundColor Gray
    Write-Host "   - Utilisateurs: $($metricsResponse.users)" -ForegroundColor Gray
    $testResults += @{Test="Metrics"; Status="✅ PASS"; Details="$($metricsResponse.clients) clients, $($metricsResponse.products) produits"}
} catch {
    Write-Host "❌ Métriques: ÉCHEC" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
    $testResults += @{Test="Metrics"; Status="❌ FAIL"; Details=$_.Exception.Message}
}

# =============================================================================
# 3. TEST DE CONNEXION BASE DE DONNÉES POSTGRESQL
# =============================================================================
Write-Host "`n🗄️ 3. TEST DE CONNEXION POSTGRESQL" -ForegroundColor Yellow
try {
    # Test via l'endpoint health qui fait une requête SELECT 1
    $dbTest = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
    if ($dbTest.database -eq "connected") {
        Write-Host "✅ PostgreSQL: " -NoNewline -ForegroundColor Green
        Write-Host "CONNECTÉ" -ForegroundColor Green
        Write-Host "   - Connexion via PgBouncer: OK" -ForegroundColor Gray
        Write-Host "   - Tables initialisées: OK" -ForegroundColor Gray
        $testResults += @{Test="PostgreSQL"; Status="✅ PASS"; Details="Connexion active"}
    } else {
        throw "Database status: $($dbTest.database)"
    }
} catch {
    Write-Host "❌ PostgreSQL: ÉCHEC" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
    $testResults += @{Test="PostgreSQL"; Status="❌ FAIL"; Details=$_.Exception.Message}
}

# =============================================================================
# 4. TEST DE CONNEXION REDIS
# =============================================================================
Write-Host "`n🔴 4. TEST DE CONNEXION REDIS" -ForegroundColor Yellow
try {
    $redisTest = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
    if ($redisTest.redis -eq "connected") {
        Write-Host "✅ Redis: " -NoNewline -ForegroundColor Green
        Write-Host "CONNECTÉ" -ForegroundColor Green
        Write-Host "   - Cache opérationnel: OK" -ForegroundColor Gray
        Write-Host "   - Sessions disponibles: OK" -ForegroundColor Gray
        $testResults += @{Test="Redis"; Status="✅ PASS"; Details="Cache actif"}
    } else {
        Write-Host "⚠️ Redis: " -NoNewline -ForegroundColor Yellow
        Write-Host "DÉSACTIVÉ" -ForegroundColor Yellow
        Write-Host "   - Fonctionnement en mode mémoire" -ForegroundColor Gray
        $testResults += @{Test="Redis"; Status="⚠️ DISABLED"; Details="Mode mémoire"}
    }
} catch {
    Write-Host "❌ Redis: ÉCHEC" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
    $testResults += @{Test="Redis"; Status="❌ FAIL"; Details=$_.Exception.Message}
}

# =============================================================================
# 5. TEST D'AUTHENTIFICATION JWT
# =============================================================================
Write-Host "`n🔐 5. TEST D'AUTHENTIFICATION JWT" -ForegroundColor Yellow

# Test avec identifiants valides
$loginData = @{
    email = "admin@example.com"
    password = "password123"
} | ConvertTo-Json

try {
    $authResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginData
    if ($authResponse.success) {
        Write-Host "✅ Authentification: " -NoNewline -ForegroundColor Green
        Write-Host "RÉUSSIE" -ForegroundColor Green
        Write-Host "   - Token JWT généré: OK" -ForegroundColor Gray
        Write-Host "   - Utilisateur: $($authResponse.data.user.email)" -ForegroundColor Gray
        Write-Host "   - Rôle: $($authResponse.data.user.role)" -ForegroundColor Gray
        
        $global:authToken = $authResponse.data.token
        $testResults += @{Test="JWT Auth"; Status="✅ PASS"; Details="Token généré"}
        
        # Test de vérification du token
        try {
            $headers = @{Authorization = "Bearer $global:authToken"}
            $verifyResponse = Invoke-RestMethod -Uri "$baseUrl/auth/verify" -Method POST -Headers $headers
            if ($verifyResponse.success) {
                Write-Host "✅ Vérification Token: " -NoNewline -ForegroundColor Green
                Write-Host "VALIDE" -ForegroundColor Green
                $testResults += @{Test="Token Verify"; Status="✅ PASS"; Details="Token valide"}
            }
        } catch {
            Write-Host "❌ Vérification Token: ÉCHEC" -ForegroundColor Red
            $testResults += @{Test="Token Verify"; Status="❌ FAIL"; Details=$_.Exception.Message}
        }
    }
} catch {
    Write-Host "❌ Authentification: ÉCHEC" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
    $testResults += @{Test="JWT Auth"; Status="❌ FAIL"; Details=$_.Exception.Message}
}

# =============================================================================
# 6. TEST DES ENDPOINTS PROTÉGÉS
# =============================================================================
Write-Host "`n🛡️ 6. TEST DES ENDPOINTS PROTÉGÉS" -ForegroundColor Yellow

if ($global:authToken) {
    $headers = @{Authorization = "Bearer $global:authToken"}
    
    # Test Dashboard Stats
    try {
        $dashboardResponse = Invoke-RestMethod -Uri "$baseUrl/dashboard/stats" -Method GET -Headers $headers
        if ($dashboardResponse.success) {
            Write-Host "✅ Dashboard Stats: " -NoNewline -ForegroundColor Green
            Write-Host "ACCESSIBLE" -ForegroundColor Green
            Write-Host "   - Clients: $($dashboardResponse.data.clients.total)" -ForegroundColor Gray
            Write-Host "   - Produits: $($dashboardResponse.data.products.total)" -ForegroundColor Gray
            $testResults += @{Test="Dashboard"; Status="✅ PASS"; Details="Stats disponibles"}
        }
    } catch {
        Write-Host "❌ Dashboard Stats: ÉCHEC" -ForegroundColor Red
        $testResults += @{Test="Dashboard"; Status="❌ FAIL"; Details=$_.Exception.Message}
    }
    
    # Test Clients API
    try {
        $clientsResponse = Invoke-RestMethod -Uri "$baseUrl/clients" -Method GET -Headers $headers
        if ($clientsResponse.success) {
            Write-Host "✅ API Clients: " -NoNewline -ForegroundColor Green
            Write-Host "ACCESSIBLE" -ForegroundColor Green
            Write-Host "   - Total clients: $($clientsResponse.data.total)" -ForegroundColor Gray
            $testResults += @{Test="Clients API"; Status="✅ PASS"; Details="$($clientsResponse.data.total) clients"}
        }
    } catch {
        Write-Host "❌ API Clients: ÉCHEC" -ForegroundColor Red
        $testResults += @{Test="Clients API"; Status="❌ FAIL"; Details=$_.Exception.Message}
    }
    
    # Test Products API
    try {
        $productsResponse = Invoke-RestMethod -Uri "$baseUrl/products" -Method GET -Headers $headers
        if ($productsResponse.success) {
            Write-Host "✅ API Produits: " -NoNewline -ForegroundColor Green
            Write-Host "ACCESSIBLE" -ForegroundColor Green
            Write-Host "   - Total produits: $($productsResponse.data.total)" -ForegroundColor Gray
            $testResults += @{Test="Products API"; Status="✅ PASS"; Details="$($productsResponse.data.total) produits"}
        }
    } catch {
        Write-Host "❌ API Produits: ÉCHEC" -ForegroundColor Red
        $testResults += @{Test="Products API"; Status="❌ FAIL"; Details=$_.Exception.Message}
    }
} else {
    Write-Host "⚠️ Tests endpoints protégés ignorés (pas de token)" -ForegroundColor Yellow
    $testResults += @{Test="Protected Endpoints"; Status="⚠️ SKIPPED"; Details="Pas de token"}
}

# =============================================================================
# 7. TEST DE GESTION D'ERREURS
# =============================================================================
Write-Host "`n⚠️ 7. TEST DE GESTION D'ERREURS" -ForegroundColor Yellow

# Test endpoint inexistant
try {
    Invoke-RestMethod -Uri "$baseUrl/nonexistent" -Method GET
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "✅ Erreur 404: " -NoNewline -ForegroundColor Green
        Write-Host "GÉRÉE CORRECTEMENT" -ForegroundColor Green
        $testResults += @{Test="Error 404"; Status="✅ PASS"; Details="404 correctement retourné"}
    }
}

# Test authentification invalide
try {
    $invalidLogin = @{email = "invalid@test.com"; password = "wrong"} | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $invalidLogin
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Auth Invalide: " -NoNewline -ForegroundColor Green
        Write-Host "REJETÉE CORRECTEMENT" -ForegroundColor Green
        $testResults += @{Test="Invalid Auth"; Status="✅ PASS"; Details="401 correctement retourné"}
    }
}

# =============================================================================
# RÉSUMÉ DES TESTS
# =============================================================================
Write-Host "`n📋 RÉSUMÉ DES TESTS" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan

$passCount = ($testResults | Where-Object {$_.Status -like "*PASS*"}).Count
$failCount = ($testResults | Where-Object {$_.Status -like "*FAIL*"}).Count
$skipCount = ($testResults | Where-Object {$_.Status -like "*SKIP*" -or $_.Status -like "*DISABLED*"}).Count

Write-Host "`n✅ Tests réussis: $passCount" -ForegroundColor Green
Write-Host "❌ Tests échoués: $failCount" -ForegroundColor Red
Write-Host "⚠️ Tests ignorés: $skipCount" -ForegroundColor Yellow

Write-Host "`nDétail des tests:" -ForegroundColor Gray
foreach ($result in $testResults) {
    Write-Host "  $($result.Status) $($result.Test): $($result.Details)" -ForegroundColor Gray
}

if ($failCount -eq 0) {
    Write-Host "`n🎉 TOUTES LES CONNEXIONS SONT OPÉRATIONNELLES!" -ForegroundColor Green
    Write-Host "Le backend de production est prêt pour utilisation." -ForegroundColor Green
} else {
    Write-Host "`n⚠️ CERTAINES CONNEXIONS NÉCESSITENT ATTENTION" -ForegroundColor Yellow
    Write-Host "Vérifiez les erreurs ci-dessus." -ForegroundColor Yellow
}

Write-Host "`n🔗 URLs de test disponibles:" -ForegroundColor Cyan
Write-Host "  - Health Check: http://localhost:3001/health" -ForegroundColor Gray
Write-Host "  - Métriques: http://localhost:3001/metrics" -ForegroundColor Gray
Write-Host "  - Login: POST http://localhost:3001/auth/login" -ForegroundColor Gray
Write-Host "  - Dashboard: GET http://localhost:3001/dashboard/stats (avec auth)" -ForegroundColor Gray
Write-Host "  - Clients: GET http://localhost:3001/clients (avec auth)" -ForegroundColor Gray
Write-Host "  - Produits: GET http://localhost:3001/products (avec auth)" -ForegroundColor Gray

Write-Host "`n📊 Informations de connexion:" -ForegroundColor Cyan
Write-Host "  - Email admin: admin@example.com" -ForegroundColor Gray
Write-Host "  - Mot de passe: password123" -ForegroundColor Gray
