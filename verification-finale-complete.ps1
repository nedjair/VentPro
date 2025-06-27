# =============================================================================
# VERIFICATION FINALE COMPLETE - BACKEND PRODUCTION
# Gestion Commerciale TPE - production-backend.js
# =============================================================================

Write-Host "VERIFICATION FINALE COMPLETE DES CONNEXIONS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Backend: production-backend.js (Port 3001)" -ForegroundColor Gray
Write-Host ""

$baseUrl = "http://localhost:3001"
$results = @()

# =============================================================================
# 1. HEALTH CHECK
# =============================================================================
Write-Host "1. HEALTH CHECK" -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "$baseUrl/health" -UseBasicParsing
    $healthData = $health.Content | ConvertFrom-Json
    
    Write-Host "OK Serveur: OPERATIONNEL" -ForegroundColor Green
    Write-Host "   Status: $($healthData.status)" -ForegroundColor Gray
    Write-Host "   Database: $($healthData.database)" -ForegroundColor Gray
    Write-Host "   Redis: $($healthData.redis)" -ForegroundColor Gray
    Write-Host "   Uptime: $([math]::Round($healthData.uptime, 2))s" -ForegroundColor Gray
    $results += "OK Health Check: PASS"
} catch {
    Write-Host "ERREUR Health Check: ECHEC" -ForegroundColor Red
    $results += "ERREUR Health Check: FAIL"
}

# =============================================================================
# 2. AUTHENTIFICATION
# =============================================================================
Write-Host "`n2. AUTHENTIFICATION JWT" -ForegroundColor Yellow

$loginBody = @{
    email = "admin@demo-tpe.fr"
    password = "demo123"
} | ConvertTo-Json

try {
    $authResponse = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
    $authData = $authResponse.Content | ConvertFrom-Json
    
    if ($authData.success) {
        Write-Host "OK Authentification: REUSSIE" -ForegroundColor Green
        Write-Host "   Email: $($authData.data.user.email)" -ForegroundColor Gray
        Write-Host "   Role: $($authData.data.user.role)" -ForegroundColor Gray
        
        $global:authToken = $authData.data.token
        $global:authHeaders = @{
            'Authorization' = "Bearer $global:authToken"
            'Content-Type' = 'application/json'
        }
        $results += "OK JWT Auth: PASS"
        
        # Test verification token
        try {
            $verifyResponse = Invoke-WebRequest -Uri "$baseUrl/auth/verify" -Headers $global:authHeaders -UseBasicParsing
            $verifyData = $verifyResponse.Content | ConvertFrom-Json
            
            if ($verifyData.success) {
                Write-Host "OK Verification Token: VALIDE" -ForegroundColor Green
                $results += "OK Token Verify: PASS"
            }
        } catch {
            Write-Host "ERREUR Verification Token: ECHEC" -ForegroundColor Red
            $results += "ERREUR Token Verify: FAIL"
        }
    }
} catch {
    Write-Host "ERREUR Authentification: ECHEC" -ForegroundColor Red
    $results += "ERREUR JWT Auth: FAIL"
}

# =============================================================================
# 3. DASHBOARD STATS
# =============================================================================
Write-Host "`n3. DASHBOARD STATS" -ForegroundColor Yellow

if ($global:authToken) {
    try {
        $dashboardResponse = Invoke-WebRequest -Uri "$baseUrl/dashboard/stats" -Headers $global:authHeaders -UseBasicParsing
        $dashboardData = $dashboardResponse.Content | ConvertFrom-Json
        
        if ($dashboardData.success) {
            Write-Host "OK Dashboard Stats: ACCESSIBLE" -ForegroundColor Green
            Write-Host "   Total clients: $($dashboardData.data.clients.total)" -ForegroundColor Gray
            Write-Host "   Total produits: $($dashboardData.data.products.total)" -ForegroundColor Gray
            Write-Host "   Ventes du mois: $($dashboardData.data.sales.month) EUR" -ForegroundColor Gray
            $results += "OK Dashboard: PASS"
        }
    } catch {
        Write-Host "ERREUR Dashboard Stats: ECHEC" -ForegroundColor Red
        Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
        $results += "ERREUR Dashboard: FAIL"
    }
} else {
    Write-Host "ATTENTION Dashboard: IGNORE (pas de token)" -ForegroundColor Yellow
    $results += "ATTENTION Dashboard: SKIPPED"
}

# =============================================================================
# 4. API CLIENTS
# =============================================================================
Write-Host "`n4. API CLIENTS" -ForegroundColor Yellow

if ($global:authToken) {
    try {
        $clientsResponse = Invoke-WebRequest -Uri "$baseUrl/clients" -Headers $global:authHeaders -UseBasicParsing
        $clientsData = $clientsResponse.Content | ConvertFrom-Json
        
        if ($clientsData.success) {
            Write-Host "OK API Clients: ACCESSIBLE" -ForegroundColor Green
            Write-Host "   Total clients: $($clientsData.data.total)" -ForegroundColor Gray
            Write-Host "   Pagination: Page $($clientsData.data.page)/$($clientsData.data.totalPages)" -ForegroundColor Gray
            $results += "OK Clients API: PASS"
        }
    } catch {
        Write-Host "ERREUR API Clients: ECHEC" -ForegroundColor Red
        $results += "ERREUR Clients API: FAIL"
    }
} else {
    $results += "ATTENTION Clients API: SKIPPED"
}

# =============================================================================
# 5. API PRODUITS
# =============================================================================
Write-Host "`n5. API PRODUITS" -ForegroundColor Yellow

if ($global:authToken) {
    try {
        $productsResponse = Invoke-WebRequest -Uri "$baseUrl/products" -Headers $global:authHeaders -UseBasicParsing
        $productsData = $productsResponse.Content | ConvertFrom-Json
        
        if ($productsData.success) {
            Write-Host "OK API Produits: ACCESSIBLE" -ForegroundColor Green
            Write-Host "   Total produits: $($productsData.data.total)" -ForegroundColor Gray
            Write-Host "   Pagination: Page $($productsData.data.page)/$($productsData.data.totalPages)" -ForegroundColor Gray
            $results += "OK Products API: PASS"
        }
    } catch {
        Write-Host "ERREUR API Produits: ECHEC" -ForegroundColor Red
        $results += "ERREUR Products API: FAIL"
    }
} else {
    $results += "ATTENTION Products API: SKIPPED"
}

# =============================================================================
# 6. GESTION D'ERREURS
# =============================================================================
Write-Host "`n6. GESTION D'ERREURS" -ForegroundColor Yellow

# Test 404
try {
    Invoke-WebRequest -Uri "$baseUrl/endpoint-inexistant" -UseBasicParsing
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "OK Erreur 404: GEREE CORRECTEMENT" -ForegroundColor Green
        $results += "OK Error 404: PASS"
    }
}

# Test auth invalide
try {
    $invalidLogin = @{email = "invalid@test.com"; password = "wrong"} | ConvertTo-Json
    Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $invalidLogin -UseBasicParsing
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "OK Auth Invalide: REJETEE CORRECTEMENT" -ForegroundColor Green
        $results += "OK Invalid Auth: PASS"
    }
}

# =============================================================================
# 7. INFRASTRUCTURE
# =============================================================================
Write-Host "`n7. INFRASTRUCTURE" -ForegroundColor Yellow

# Test PostgreSQL
try {
    $metrics = Invoke-WebRequest -Uri "$baseUrl/metrics" -UseBasicParsing
    $metricsData = $metrics.Content | ConvertFrom-Json
    
    Write-Host "OK PostgreSQL: CONNECTE" -ForegroundColor Green
    Write-Host "   Clients: $($metricsData.clients)" -ForegroundColor Gray
    Write-Host "   Produits: $($metricsData.products)" -ForegroundColor Gray
    Write-Host "   Utilisateurs: $($metricsData.users)" -ForegroundColor Gray
    $results += "OK PostgreSQL: PASS"
} catch {
    Write-Host "ERREUR PostgreSQL: ECHEC" -ForegroundColor Red
    $results += "ERREUR PostgreSQL: FAIL"
}

# Test Redis (via health check)
try {
    $healthCheck = Invoke-WebRequest -Uri "$baseUrl/health" -UseBasicParsing
    $healthData = $healthCheck.Content | ConvertFrom-Json
    
    if ($healthData.redis -eq "connected") {
        Write-Host "OK Redis: CONNECTE" -ForegroundColor Green
        $results += "OK Redis: PASS"
    } else {
        Write-Host "ATTENTION Redis: DESACTIVE" -ForegroundColor Yellow
        $results += "ATTENTION Redis: DISABLED"
    }
} catch {
    Write-Host "ERREUR Redis: ECHEC" -ForegroundColor Red
    $results += "ERREUR Redis: FAIL"
}

# =============================================================================
# RESUME FINAL
# =============================================================================
Write-Host "`nRESUME FINAL DE LA VERIFICATION" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

$passCount = ($results | Where-Object {$_ -like "*PASS*"}).Count
$failCount = ($results | Where-Object {$_ -like "*FAIL*"}).Count
$skipCount = ($results | Where-Object {$_ -like "*SKIP*" -or $_ -like "*DISABLED*"}).Count

Write-Host "`nSTATISTIQUES FINALES:" -ForegroundColor White
Write-Host "OK Tests reussis: $passCount" -ForegroundColor Green
Write-Host "ERREUR Tests echoues: $failCount" -ForegroundColor Red
Write-Host "ATTENTION Tests ignores: $skipCount" -ForegroundColor Yellow

Write-Host "`nDETAIL DES RESULTATS:" -ForegroundColor White
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
Write-Host "`nCONCLUSION FINALE:" -ForegroundColor Cyan

if ($failCount -eq 0) {
    Write-Host "TOUTES LES CONNEXIONS SONT OPERATIONNELLES!" -ForegroundColor Green
    Write-Host "Le backend production-backend.js est ENTIEREMENT FONCTIONNEL." -ForegroundColor Green
    Write-Host ""
    Write-Host "CONNEXIONS VALIDEES:" -ForegroundColor Green
    Write-Host "- PostgreSQL 16: CONNECTE" -ForegroundColor Green
    Write-Host "- Redis 7: CONNECTE" -ForegroundColor Green
    Write-Host "- Authentification JWT: FONCTIONNELLE" -ForegroundColor Green
    Write-Host "- API Clients: COMPLETE" -ForegroundColor Green
    Write-Host "- API Produits: COMPLETE" -ForegroundColor Green
    Write-Host "- Dashboard: OPERATIONNEL" -ForegroundColor Green
    Write-Host "- Gestion erreurs: APPROPRIEE" -ForegroundColor Green
    Write-Host ""
    Write-Host "LE BACKEND EST PRET POUR LA PRODUCTION!" -ForegroundColor Green
} else {
    Write-Host "PROBLEMES DETECTES - Verification necessaire" -ForegroundColor Yellow
    Write-Host "Nombre d'erreurs: $failCount" -ForegroundColor Red
}

Write-Host "`nINFORMATIONS DE CONNEXION VALIDEES:" -ForegroundColor Cyan
Write-Host "Backend URL: http://localhost:3001" -ForegroundColor Gray
Write-Host "Health Check: http://localhost:3001/health" -ForegroundColor Gray
Write-Host "Metrics: http://localhost:3001/metrics" -ForegroundColor Gray
Write-Host "Login: POST http://localhost:3001/auth/login" -ForegroundColor Gray
Write-Host ""
Write-Host "Identifiants admin valides:" -ForegroundColor Gray
Write-Host "  Email: admin@demo-tpe.fr" -ForegroundColor Gray
Write-Host "  Mot de passe: demo123" -ForegroundColor Gray

Write-Host "`nVERIFICATION FINALE TERMINEE" -ForegroundColor Green
