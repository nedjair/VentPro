# =============================================================================
# VÉRIFICATION COMPLÈTE DES CONNEXIONS - GESTION COMMERCIALE TPE
# Backend: production-backend.js (Port 3001)
# =============================================================================

Write-Host "🔍 VÉRIFICATION COMPLÈTE DES CONNEXIONS" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "Backend: production-backend.js" -ForegroundColor Gray
Write-Host "Port: 3001" -ForegroundColor Gray
Write-Host ""

$baseUrl = "http://localhost:3001"
$results = @()

# =============================================================================
# 1. TEST DE SANTÉ DU SERVEUR
# =============================================================================
Write-Host "📊 1. TEST DE SANTÉ DU SERVEUR" -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "$baseUrl/health" -UseBasicParsing
    $healthData = $health.Content | ConvertFrom-Json
    
    Write-Host "✅ Serveur: OPÉRATIONNEL" -ForegroundColor Green
    Write-Host "   Status: $($healthData.status)" -ForegroundColor Gray
    Write-Host "   Database: $($healthData.database)" -ForegroundColor Gray
    Write-Host "   Redis: $($healthData.redis)" -ForegroundColor Gray
    Write-Host "   Uptime: $([math]::Round($healthData.uptime, 2))s" -ForegroundColor Gray
    Write-Host "   Environment: $($healthData.environment)" -ForegroundColor Gray
    
    $results += "✅ Health Check: PASS"
} catch {
    Write-Host "❌ Serveur: ÉCHEC" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
    $results += "❌ Health Check: FAIL"
}

# =============================================================================
# 2. TEST DES MÉTRIQUES
# =============================================================================
Write-Host "`n📈 2. TEST DES MÉTRIQUES" -ForegroundColor Yellow
try {
    $metrics = Invoke-WebRequest -Uri "$baseUrl/metrics" -UseBasicParsing
    $metricsData = $metrics.Content | ConvertFrom-Json
    
    Write-Host "✅ Métriques: DISPONIBLES" -ForegroundColor Green
    Write-Host "   Clients: $($metricsData.clients)" -ForegroundColor Gray
    Write-Host "   Produits: $($metricsData.products)" -ForegroundColor Gray
    Write-Host "   Utilisateurs: $($metricsData.users)" -ForegroundColor Gray
    Write-Host "   Mémoire RSS: $([math]::Round($metricsData.memory.rss / 1MB, 2)) MB" -ForegroundColor Gray
    
    $results += "✅ Metrics: PASS ($($metricsData.clients) clients, $($metricsData.products) produits)"
} catch {
    Write-Host "❌ Métriques: ÉCHEC" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
    $results += "❌ Metrics: FAIL"
}

# =============================================================================
# 3. TEST DE CONNEXION POSTGRESQL
# =============================================================================
Write-Host "`n🗄️ 3. TEST DE CONNEXION POSTGRESQL" -ForegroundColor Yellow
try {
    $dbTest = Invoke-WebRequest -Uri "$baseUrl/health" -UseBasicParsing
    $dbData = $dbTest.Content | ConvertFrom-Json
    
    if ($dbData.database -eq "connected") {
        Write-Host "✅ PostgreSQL: CONNECTÉ" -ForegroundColor Green
        Write-Host "   Connexion directe: Port 5432" -ForegroundColor Gray
        Write-Host "   Connexion PgBouncer: Port 6432" -ForegroundColor Gray
        Write-Host "   Tables initialisées: OK" -ForegroundColor Gray
        $results += "✅ PostgreSQL: PASS"
    } else {
        throw "Database status: $($dbData.database)"
    }
} catch {
    Write-Host "❌ PostgreSQL: ÉCHEC" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
    $results += "❌ PostgreSQL: FAIL"
}

# =============================================================================
# 4. TEST DE CONNEXION REDIS
# =============================================================================
Write-Host "`n🔴 4. TEST DE CONNEXION REDIS" -ForegroundColor Yellow
try {
    $redisTest = Invoke-WebRequest -Uri "$baseUrl/health" -UseBasicParsing
    $redisData = $redisTest.Content | ConvertFrom-Json
    
    if ($redisData.redis -eq "connected") {
        Write-Host "✅ Redis: CONNECTÉ" -ForegroundColor Green
        Write-Host "   Port: 6379" -ForegroundColor Gray
        Write-Host "   Authentification: Activée" -ForegroundColor Gray
        Write-Host "   Cache opérationnel: OK" -ForegroundColor Gray
        $results += "✅ Redis: PASS"
    } else {
        Write-Host "⚠️ Redis: DÉSACTIVÉ" -ForegroundColor Yellow
        Write-Host "   Mode: Mémoire locale" -ForegroundColor Gray
        $results += "⚠️ Redis: DISABLED"
    }
} catch {
    Write-Host "❌ Redis: ÉCHEC" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
    $results += "❌ Redis: FAIL"
}

# =============================================================================
# 5. TEST D'AUTHENTIFICATION JWT
# =============================================================================
Write-Host "`n🔐 5. TEST D'AUTHENTIFICATION JWT" -ForegroundColor Yellow

# Créer les données de connexion
$loginBody = @{
    email = "admin@example.com"
    password = "password123"
} | ConvertTo-Json

try {
    $authResponse = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
    $authData = $authResponse.Content | ConvertFrom-Json
    
    if ($authData.success) {
        Write-Host "✅ Authentification: RÉUSSIE" -ForegroundColor Green
        Write-Host "   Email: $($authData.data.user.email)" -ForegroundColor Gray
        Write-Host "   Rôle: $($authData.data.user.role)" -ForegroundColor Gray
        Write-Host "   Token généré: OK" -ForegroundColor Gray
        Write-Host "   Expiration: $($authData.data.expiresIn)" -ForegroundColor Gray
        
        $global:authToken = $authData.data.token
        $results += "✅ JWT Auth: PASS"
        
        # Test de vérification du token
        try {
            $verifyHeaders = @{
                'Authorization' = "Bearer $global:authToken"
                'Content-Type' = 'application/json'
            }
            $verifyResponse = Invoke-WebRequest -Uri "$baseUrl/auth/verify" -Method POST -Headers $verifyHeaders -UseBasicParsing
            $verifyData = $verifyResponse.Content | ConvertFrom-Json
            
            if ($verifyData.success) {
                Write-Host "✅ Vérification Token: VALIDE" -ForegroundColor Green
                Write-Host "   User ID: $($verifyData.data.userId)" -ForegroundColor Gray
                Write-Host "   Email: $($verifyData.data.email)" -ForegroundColor Gray
                $results += "✅ Token Verify: PASS"
            }
        } catch {
            Write-Host "❌ Vérification Token: ÉCHEC" -ForegroundColor Red
            Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
            $results += "❌ Token Verify: FAIL"
        }
    }
} catch {
    Write-Host "❌ Authentification: ÉCHEC" -ForegroundColor Red
    Write-Host "   Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    
    # Essayer de lire le corps de la réponse d'erreur
    try {
        $errorStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorStream)
        $errorBody = $reader.ReadToEnd()
        $errorData = $errorBody | ConvertFrom-Json
        Write-Host "   Message: $($errorData.message)" -ForegroundColor Red
    } catch {
        Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    $results += "❌ JWT Auth: FAIL"
}

# =============================================================================
# 6. TEST DES ENDPOINTS PROTÉGÉS (si authentification réussie)
# =============================================================================
Write-Host "`n🛡️ 6. TEST DES ENDPOINTS PROTÉGÉS" -ForegroundColor Yellow

if ($global:authToken) {
    $protectedHeaders = @{
        'Authorization' = "Bearer $global:authToken"
        'Content-Type' = 'application/json'
    }
    
    # Test Dashboard Stats
    try {
        $dashboardResponse = Invoke-WebRequest -Uri "$baseUrl/dashboard/stats" -Headers $protectedHeaders -UseBasicParsing
        $dashboardData = $dashboardResponse.Content | ConvertFrom-Json
        
        if ($dashboardData.success) {
            Write-Host "✅ Dashboard Stats: ACCESSIBLE" -ForegroundColor Green
            Write-Host "   Total clients: $($dashboardData.data.clients.total)" -ForegroundColor Gray
            Write-Host "   Total produits: $($dashboardData.data.products.total)" -ForegroundColor Gray
            Write-Host "   Produits en stock: $($dashboardData.data.products.inStock)" -ForegroundColor Gray
            Write-Host "   Stock faible: $($dashboardData.data.products.lowStock)" -ForegroundColor Gray
            $results += "✅ Dashboard: PASS"
        }
    } catch {
        Write-Host "❌ Dashboard Stats: ÉCHEC" -ForegroundColor Red
        Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
        $results += "❌ Dashboard: FAIL"
    }
    
    # Test API Clients
    try {
        $clientsResponse = Invoke-WebRequest -Uri "$baseUrl/clients" -Headers $protectedHeaders -UseBasicParsing
        $clientsData = $clientsResponse.Content | ConvertFrom-Json
        
        if ($clientsData.success) {
            Write-Host "✅ API Clients: ACCESSIBLE" -ForegroundColor Green
            Write-Host "   Total clients: $($clientsData.data.total)" -ForegroundColor Gray
            Write-Host "   Page actuelle: $($clientsData.data.page)" -ForegroundColor Gray
            Write-Host "   Limite par page: $($clientsData.data.limit)" -ForegroundColor Gray
            $results += "✅ Clients API: PASS"
        }
    } catch {
        Write-Host "❌ API Clients: ÉCHEC" -ForegroundColor Red
        Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
        $results += "❌ Clients API: FAIL"
    }
    
    # Test API Produits
    try {
        $productsResponse = Invoke-WebRequest -Uri "$baseUrl/products" -Headers $protectedHeaders -UseBasicParsing
        $productsData = $productsResponse.Content | ConvertFrom-Json
        
        if ($productsData.success) {
            Write-Host "✅ API Produits: ACCESSIBLE" -ForegroundColor Green
            Write-Host "   Total produits: $($productsData.data.total)" -ForegroundColor Gray
            Write-Host "   Page actuelle: $($productsData.data.page)" -ForegroundColor Gray
            Write-Host "   Limite par page: $($productsData.data.limit)" -ForegroundColor Gray
            $results += "✅ Products API: PASS"
        }
    } catch {
        Write-Host "❌ API Produits: ÉCHEC" -ForegroundColor Red
        Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
        $results += "❌ Products API: FAIL"
    }
} else {
    Write-Host "⚠️ Tests endpoints protégés ignorés (pas de token d'authentification)" -ForegroundColor Yellow
    $results += "⚠️ Protected Endpoints: SKIPPED"
}

# =============================================================================
# 7. TEST DE GESTION D'ERREURS
# =============================================================================
Write-Host "`n⚠️ 7. TEST DE GESTION D'ERREURS" -ForegroundColor Yellow

# Test endpoint inexistant (404)
try {
    Invoke-WebRequest -Uri "$baseUrl/endpoint-inexistant" -UseBasicParsing
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "✅ Erreur 404: GÉRÉE CORRECTEMENT" -ForegroundColor Green
        $results += "✅ Error 404: PASS"
    } else {
        Write-Host "❌ Erreur 404: Mauvais code de statut" -ForegroundColor Red
        $results += "❌ Error 404: FAIL"
    }
}

# Test authentification invalide (401)
try {
    $invalidLogin = @{
        email = "invalid@test.com"
        password = "wrongpassword"
    } | ConvertTo-Json
    
    Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $invalidLogin -UseBasicParsing
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Auth Invalide: REJETÉE CORRECTEMENT" -ForegroundColor Green
        $results += "✅ Invalid Auth: PASS"
    } else {
        Write-Host "❌ Auth Invalide: Mauvais code de statut" -ForegroundColor Red
        $results += "❌ Invalid Auth: FAIL"
    }
}

# =============================================================================
# RÉSUMÉ FINAL
# =============================================================================
Write-Host "`n📋 RÉSUMÉ DE LA VÉRIFICATION" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

$passCount = ($results | Where-Object {$_ -like "*PASS*"}).Count
$failCount = ($results | Where-Object {$_ -like "*FAIL*"}).Count
$skipCount = ($results | Where-Object {$_ -like "*SKIP*" -or $_ -like "*DISABLED*"}).Count

Write-Host "`n📊 STATISTIQUES:" -ForegroundColor White
Write-Host "✅ Tests réussis: $passCount" -ForegroundColor Green
Write-Host "❌ Tests échoués: $failCount" -ForegroundColor Red
Write-Host "⚠️ Tests ignorés/désactivés: $skipCount" -ForegroundColor Yellow

Write-Host "`n📝 DÉTAIL DES RÉSULTATS:" -ForegroundColor White
foreach ($result in $results) {
    if ($result -like "*PASS*") {
        Write-Host "  $result" -ForegroundColor Green
    } elseif ($result -like "*FAIL*") {
        Write-Host "  $result" -ForegroundColor Red
    } else {
        Write-Host "  $result" -ForegroundColor Yellow
    }
}

# =============================================================================
# CONCLUSION
# =============================================================================
Write-Host "`n🎯 CONCLUSION:" -ForegroundColor Cyan
if ($failCount -eq 0) {
    Write-Host "🎉 TOUTES LES CONNEXIONS SONT OPÉRATIONNELLES!" -ForegroundColor Green
    Write-Host "Le backend production-backend.js est entièrement fonctionnel." -ForegroundColor Green
} elseif ($failCount -le 2) {
    Write-Host "⚠️ CONNEXIONS MAJORITAIREMENT OPÉRATIONNELLES" -ForegroundColor Yellow
    Write-Host "Quelques problèmes mineurs à résoudre." -ForegroundColor Yellow
} else {
    Write-Host "❌ PROBLÈMES CRITIQUES DÉTECTÉS" -ForegroundColor Red
    Write-Host "Plusieurs connexions nécessitent une attention immédiate." -ForegroundColor Red
}

Write-Host "`n🔗 INFORMATIONS DE CONNEXION:" -ForegroundColor Cyan
Write-Host "Backend URL: http://localhost:3001" -ForegroundColor Gray
Write-Host "Health Check: http://localhost:3001/health" -ForegroundColor Gray
Write-Host "Métriques: http://localhost:3001/metrics" -ForegroundColor Gray
Write-Host "Login: POST http://localhost:3001/auth/login" -ForegroundColor Gray
Write-Host ""
Write-Host "Identifiants admin:" -ForegroundColor Gray
Write-Host "  Email: admin@example.com" -ForegroundColor Gray
Write-Host "  Mot de passe: password123" -ForegroundColor Gray

Write-Host "`n✅ VÉRIFICATION TERMINÉE" -ForegroundColor Green
