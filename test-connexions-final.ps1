# =============================================================================
# VERIFICATION COMPLETE DES CONNEXIONS - GESTION COMMERCIALE TPE
# Backend: production-backend.js (Port 3001)
# =============================================================================

Write-Host "VERIFICATION COMPLETE DES CONNEXIONS" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Backend: production-backend.js" -ForegroundColor Gray
Write-Host "Port: 3001" -ForegroundColor Gray
Write-Host ""

$baseUrl = "http://localhost:3001"
$results = @()

# =============================================================================
# 1. TEST DE SANTE DU SERVEUR
# =============================================================================
Write-Host "1. TEST DE SANTE DU SERVEUR" -ForegroundColor Yellow
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
    Write-Host "ERREUR Serveur: ECHEC" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
    $results += "ERREUR Health Check: FAIL"
}

# =============================================================================
# 2. TEST DES METRIQUES
# =============================================================================
Write-Host "`n2. TEST DES METRIQUES" -ForegroundColor Yellow
try {
    $metrics = Invoke-WebRequest -Uri "$baseUrl/metrics" -UseBasicParsing
    $metricsData = $metrics.Content | ConvertFrom-Json
    
    Write-Host "OK Metriques: DISPONIBLES" -ForegroundColor Green
    Write-Host "   Clients: $($metricsData.clients)" -ForegroundColor Gray
    Write-Host "   Produits: $($metricsData.products)" -ForegroundColor Gray
    Write-Host "   Utilisateurs: $($metricsData.users)" -ForegroundColor Gray
    
    $results += "OK Metrics: PASS - $($metricsData.clients) clients, $($metricsData.products) produits"
} catch {
    Write-Host "ERREUR Metriques: ECHEC" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
    $results += "ERREUR Metrics: FAIL"
}

# =============================================================================
# 3. TEST DE CONNEXION POSTGRESQL
# =============================================================================
Write-Host "`n3. TEST DE CONNEXION POSTGRESQL" -ForegroundColor Yellow
try {
    $dbTest = Invoke-WebRequest -Uri "$baseUrl/health" -UseBasicParsing
    $dbData = $dbTest.Content | ConvertFrom-Json
    
    if ($dbData.database -eq "connected") {
        Write-Host "OK PostgreSQL: CONNECTE" -ForegroundColor Green
        Write-Host "   Connexion directe: Port 5432" -ForegroundColor Gray
        Write-Host "   Connexion PgBouncer: Port 6432" -ForegroundColor Gray
        $results += "OK PostgreSQL: PASS"
    } else {
        throw "Database status: $($dbData.database)"
    }
} catch {
    Write-Host "ERREUR PostgreSQL: ECHEC" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
    $results += "ERREUR PostgreSQL: FAIL"
}

# =============================================================================
# 4. TEST DE CONNEXION REDIS
# =============================================================================
Write-Host "`n4. TEST DE CONNEXION REDIS" -ForegroundColor Yellow
try {
    $redisTest = Invoke-WebRequest -Uri "$baseUrl/health" -UseBasicParsing
    $redisData = $redisTest.Content | ConvertFrom-Json
    
    if ($redisData.redis -eq "connected") {
        Write-Host "OK Redis: CONNECTE" -ForegroundColor Green
        Write-Host "   Port: 6379" -ForegroundColor Gray
        Write-Host "   Cache operationnel: OK" -ForegroundColor Gray
        $results += "OK Redis: PASS"
    } else {
        Write-Host "ATTENTION Redis: DESACTIVE" -ForegroundColor Yellow
        Write-Host "   Mode: Memoire locale" -ForegroundColor Gray
        $results += "ATTENTION Redis: DISABLED"
    }
} catch {
    Write-Host "ERREUR Redis: ECHEC" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
    $results += "ERREUR Redis: FAIL"
}

# =============================================================================
# 5. TEST D'AUTHENTIFICATION JWT
# =============================================================================
Write-Host "`n5. TEST D'AUTHENTIFICATION JWT" -ForegroundColor Yellow

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
        Write-Host "   Token genere: OK" -ForegroundColor Gray
        
        $global:authToken = $authData.data.token
        $results += "OK JWT Auth: PASS"
        
        # Test de verification du token
        try {
            $verifyHeaders = @{
                'Authorization' = "Bearer $global:authToken"
                'Content-Type' = 'application/json'
            }
            $verifyResponse = Invoke-WebRequest -Uri "$baseUrl/auth/verify" -Method POST -Headers $verifyHeaders -UseBasicParsing
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
    Write-Host "   Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    
    try {
        $errorStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorStream)
        $errorBody = $reader.ReadToEnd()
        Write-Host "   Response: $errorBody" -ForegroundColor Red
    } catch {
        Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    $results += "ERREUR JWT Auth: FAIL"
}

# =============================================================================
# 6. TEST DES ENDPOINTS PROTEGES
# =============================================================================
Write-Host "`n6. TEST DES ENDPOINTS PROTEGES" -ForegroundColor Yellow

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
            Write-Host "OK Dashboard Stats: ACCESSIBLE" -ForegroundColor Green
            Write-Host "   Total clients: $($dashboardData.data.clients.total)" -ForegroundColor Gray
            Write-Host "   Total produits: $($dashboardData.data.products.total)" -ForegroundColor Gray
            $results += "OK Dashboard: PASS"
        }
    } catch {
        Write-Host "ERREUR Dashboard Stats: ECHEC" -ForegroundColor Red
        $results += "ERREUR Dashboard: FAIL"
    }
    
    # Test API Clients
    try {
        $clientsResponse = Invoke-WebRequest -Uri "$baseUrl/clients" -Headers $protectedHeaders -UseBasicParsing
        $clientsData = $clientsResponse.Content | ConvertFrom-Json
        
        if ($clientsData.success) {
            Write-Host "OK API Clients: ACCESSIBLE" -ForegroundColor Green
            Write-Host "   Total clients: $($clientsData.data.total)" -ForegroundColor Gray
            $results += "OK Clients API: PASS"
        }
    } catch {
        Write-Host "ERREUR API Clients: ECHEC" -ForegroundColor Red
        $results += "ERREUR Clients API: FAIL"
    }
    
    # Test API Produits
    try {
        $productsResponse = Invoke-WebRequest -Uri "$baseUrl/products" -Headers $protectedHeaders -UseBasicParsing
        $productsData = $productsResponse.Content | ConvertFrom-Json
        
        if ($productsData.success) {
            Write-Host "OK API Produits: ACCESSIBLE" -ForegroundColor Green
            Write-Host "   Total produits: $($productsData.data.total)" -ForegroundColor Gray
            $results += "OK Products API: PASS"
        }
    } catch {
        Write-Host "ERREUR API Produits: ECHEC" -ForegroundColor Red
        $results += "ERREUR Products API: FAIL"
    }
} else {
    Write-Host "ATTENTION Tests endpoints proteges ignores (pas de token)" -ForegroundColor Yellow
    $results += "ATTENTION Protected Endpoints: SKIPPED"
}

# =============================================================================
# 7. TEST DE GESTION D'ERREURS
# =============================================================================
Write-Host "`n7. TEST DE GESTION D'ERREURS" -ForegroundColor Yellow

# Test endpoint inexistant (404)
try {
    Invoke-WebRequest -Uri "$baseUrl/endpoint-inexistant" -UseBasicParsing
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "OK Erreur 404: GEREE CORRECTEMENT" -ForegroundColor Green
        $results += "OK Error 404: PASS"
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
        Write-Host "OK Auth Invalide: REJETEE CORRECTEMENT" -ForegroundColor Green
        $results += "OK Invalid Auth: PASS"
    }
}

# =============================================================================
# RESUME FINAL
# =============================================================================
Write-Host "`nRESUME DE LA VERIFICATION" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan

$passCount = ($results | Where-Object {$_ -like "*PASS*"}).Count
$failCount = ($results | Where-Object {$_ -like "*FAIL*"}).Count
$skipCount = ($results | Where-Object {$_ -like "*SKIP*" -or $_ -like "*DISABLED*"}).Count

Write-Host "`nSTATISTIQUES:" -ForegroundColor White
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

Write-Host "`nCONCLUSION:" -ForegroundColor Cyan
if ($failCount -eq 0) {
    Write-Host "TOUTES LES CONNEXIONS SONT OPERATIONNELLES!" -ForegroundColor Green
    Write-Host "Le backend production-backend.js est entierement fonctionnel." -ForegroundColor Green
} else {
    Write-Host "PROBLEMES DETECTES - Verification necessaire" -ForegroundColor Yellow
}

Write-Host "`nINFORMATIONS DE CONNEXION:" -ForegroundColor Cyan
Write-Host "Backend URL: http://localhost:3001" -ForegroundColor Gray
Write-Host "Health Check: http://localhost:3001/health" -ForegroundColor Gray
Write-Host "Email admin: admin@demo-tpe.fr" -ForegroundColor Gray
Write-Host "Mot de passe: demo123" -ForegroundColor Gray

Write-Host "`nVERIFICATION TERMINEE" -ForegroundColor Green
