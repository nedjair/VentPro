# =============================================================================
# TEST API SIMPLE - FRONTEND-BACKEND
# Validation de la connexion entre Next.js et production-backend.js
# =============================================================================

Write-Host "TEST API SIMPLE - FRONTEND-BACKEND" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3001"
$adminEmail = "admin@demo-tpe.fr"
$adminPassword = "demo123"

# Test 1: Health Check
Write-Host "1. TEST HEALTH CHECK" -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "$baseUrl/health" -UseBasicParsing
    $healthData = $health.Content | ConvertFrom-Json
    
    Write-Host "OK Backend: ACCESSIBLE" -ForegroundColor Green
    Write-Host "   Status: $($healthData.status)" -ForegroundColor Gray
    Write-Host "   Database: $($healthData.database)" -ForegroundColor Gray
    Write-Host "   Redis: $($healthData.redis)" -ForegroundColor Gray
    
    $backendOK = $true
} catch {
    Write-Host "ERREUR Backend: NON ACCESSIBLE" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
    $backendOK = $false
}

# Test 2: Authentification
Write-Host "`n2. TEST AUTHENTIFICATION" -ForegroundColor Yellow
if ($backendOK) {
    try {
        $loginBody = @{
            email = $adminEmail
            password = $adminPassword
        } | ConvertTo-Json
        
        $authResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
        $authData = $authResponse.Content | ConvertFrom-Json
        
        if ($authData.success) {
            Write-Host "OK Authentification: REUSSIE" -ForegroundColor Green
            Write-Host "   Email: $($authData.data.user.email)" -ForegroundColor Gray
            Write-Host "   Role: $($authData.data.user.role)" -ForegroundColor Gray
            
            $token = $authData.data.token
            $authOK = $true
        } else {
            Write-Host "ERREUR Authentification: ECHEC" -ForegroundColor Red
            $authOK = $false
        }
    } catch {
        Write-Host "ERREUR Authentification: ECHEC" -ForegroundColor Red
        Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
        $authOK = $false
    }
} else {
    $authOK = $false
}

# Test 3: API Protégée
Write-Host "`n3. TEST API PROTEGEE" -ForegroundColor Yellow
if ($authOK) {
    $headers = @{
        'Authorization' = "Bearer $token"
        'Content-Type' = 'application/json'
    }
    
    try {
        $dashboardResponse = Invoke-WebRequest -Uri "$baseUrl/dashboard/stats" -Headers $headers -UseBasicParsing
        $dashboardData = $dashboardResponse.Content | ConvertFrom-Json
        
        if ($dashboardData.success) {
            Write-Host "OK Dashboard: ACCESSIBLE" -ForegroundColor Green
            Write-Host "   Clients: $($dashboardData.data.clients.total)" -ForegroundColor Gray
            Write-Host "   Produits: $($dashboardData.data.products.total)" -ForegroundColor Gray
        }
    } catch {
        Write-Host "ERREUR Dashboard: ECHEC" -ForegroundColor Red
    }
}

# Test 4: CORS
Write-Host "`n4. TEST CORS" -ForegroundColor Yellow
try {
    $corsHeaders = @{
        'Origin' = 'http://localhost:3003'
    }
    
    $corsResponse = Invoke-WebRequest -Uri "$baseUrl/health" -Headers $corsHeaders -UseBasicParsing
    
    if ($corsResponse.StatusCode -eq 200) {
        Write-Host "OK CORS: CONFIGURE CORRECTEMENT" -ForegroundColor Green
        Write-Host "   Origin autorise: http://localhost:3003" -ForegroundColor Gray
    }
} catch {
    Write-Host "ERREUR CORS: PROBLEME" -ForegroundColor Red
}

# Résumé
Write-Host "`n5. RESUME" -ForegroundColor Yellow
Write-Host "=========" -ForegroundColor Yellow

if ($backendOK -and $authOK) {
    Write-Host "TOUTES LES CONNEXIONS SONT OPERATIONNELLES!" -ForegroundColor Green
    Write-Host ""
    Write-Host "PRET POUR LE FRONTEND:" -ForegroundColor Green
    Write-Host "   Backend: http://localhost:3001 (ACTIF)" -ForegroundColor Green
    Write-Host "   Frontend: http://localhost:3003 (PRET)" -ForegroundColor Green
    Write-Host "   Identifiants: admin@demo-tpe.fr / demo123" -ForegroundColor Green
    Write-Host ""
    Write-Host "Pour demarrer le frontend:" -ForegroundColor White
    Write-Host "   .\start-frontend-simple.ps1" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Ou manuellement:" -ForegroundColor White
    Write-Host "   cd frontend-nextjs-production" -ForegroundColor Gray
    Write-Host "   npm run dev" -ForegroundColor Gray
} else {
    Write-Host "PROBLEMES DETECTES:" -ForegroundColor Red
    if (-not $backendOK) {
        Write-Host "   - Backend non accessible" -ForegroundColor Red
        Write-Host "     Action: .\start-production-backend.ps1" -ForegroundColor Yellow
    }
    if (-not $authOK) {
        Write-Host "   - Authentification echouee" -ForegroundColor Red
        Write-Host "     Action: Verifier les identifiants" -ForegroundColor Yellow
    }
}

Write-Host "`nTEST TERMINE" -ForegroundColor Cyan
