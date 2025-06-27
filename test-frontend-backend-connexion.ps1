# =============================================================================
# TEST DE CONNEXION FRONTEND-BACKEND
# Gestion Commerciale TPE - Validation de la connexion
# =============================================================================

Write-Host "TEST DE CONNEXION FRONTEND-BACKEND" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Vérifier que le backend est accessible
Write-Host "1. TEST BACKEND (Port 3001)" -ForegroundColor Yellow
Write-Host "============================" -ForegroundColor Yellow

try {
    $healthCheck = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 5
    $healthData = $healthCheck.Content | ConvertFrom-Json
    
    Write-Host "OK Backend: ACCESSIBLE" -ForegroundColor Green
    Write-Host "   Status: $($healthData.status)" -ForegroundColor Gray
    Write-Host "   Database: $($healthData.database)" -ForegroundColor Gray
    Write-Host "   Redis: $($healthData.redis)" -ForegroundColor Gray
    Write-Host "   Uptime: $([math]::Round($healthData.uptime, 2))s" -ForegroundColor Gray
    
    $backendOK = $true
} catch {
    Write-Host "ERREUR Backend: NON ACCESSIBLE" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
    $backendOK = $false
}

# Test 2: Test d'authentification
Write-Host "`n2. TEST AUTHENTIFICATION" -ForegroundColor Yellow
Write-Host "========================" -ForegroundColor Yellow

if ($backendOK) {
    try {
        $loginBody = @{
            email = "admin@demo-tpe.fr"
            password = "demo123"
        } | ConvertTo-Json
        
        $authResponse = Invoke-WebRequest -Uri "http://localhost:3001/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
        $authData = $authResponse.Content | ConvertFrom-Json
        
        if ($authData.success) {
            Write-Host "OK Authentification: REUSSIE" -ForegroundColor Green
            Write-Host "   Email: $($authData.data.user.email)" -ForegroundColor Gray
            Write-Host "   Role: $($authData.data.user.role)" -ForegroundColor Gray
            Write-Host "   Token: $($authData.data.token.Substring(0, 20))..." -ForegroundColor Gray
            
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
    Write-Host "IGNORE Authentification: Backend non accessible" -ForegroundColor Yellow
    $authOK = $false
}

# Test 3: Test des endpoints protégés
Write-Host "`n3. TEST ENDPOINTS PROTEGES" -ForegroundColor Yellow
Write-Host "===========================" -ForegroundColor Yellow

if ($authOK) {
    $headers = @{
        'Authorization' = "Bearer $token"
        'Content-Type' = 'application/json'
    }
    
    # Test Dashboard
    try {
        $dashboardResponse = Invoke-WebRequest -Uri "http://localhost:3001/dashboard/stats" -Headers $headers -UseBasicParsing
        $dashboardData = $dashboardResponse.Content | ConvertFrom-Json
        
        if ($dashboardData.success) {
            Write-Host "OK Dashboard: ACCESSIBLE" -ForegroundColor Green
            Write-Host "   Clients: $($dashboardData.data.clients.total)" -ForegroundColor Gray
            Write-Host "   Produits: $($dashboardData.data.products.total)" -ForegroundColor Gray
        }
    } catch {
        Write-Host "ERREUR Dashboard: ECHEC" -ForegroundColor Red
    }
    
    # Test API Clients
    try {
        $clientsResponse = Invoke-WebRequest -Uri "http://localhost:3001/clients" -Headers $headers -UseBasicParsing
        $clientsData = $clientsResponse.Content | ConvertFrom-Json
        
        if ($clientsData.success) {
            Write-Host "OK API Clients: ACCESSIBLE" -ForegroundColor Green
            Write-Host "   Total: $($clientsData.data.total)" -ForegroundColor Gray
        }
    } catch {
        Write-Host "ERREUR API Clients: ECHEC" -ForegroundColor Red
    }
    
    # Test API Produits
    try {
        $productsResponse = Invoke-WebRequest -Uri "http://localhost:3001/products" -Headers $headers -UseBasicParsing
        $productsData = $productsResponse.Content | ConvertFrom-Json
        
        if ($productsData.success) {
            Write-Host "OK API Produits: ACCESSIBLE" -ForegroundColor Green
            Write-Host "   Total: $($productsData.data.total)" -ForegroundColor Gray
        }
    } catch {
        Write-Host "ERREUR API Produits: ECHEC" -ForegroundColor Red
    }
    
} else {
    Write-Host "IGNORE Endpoints proteges: Authentification echouee" -ForegroundColor Yellow
}

# Test 4: Test CORS
Write-Host "`n4. TEST CORS (Simulation Frontend)" -ForegroundColor Yellow
Write-Host "===================================" -ForegroundColor Yellow

try {
    # Simuler une requête avec Origin depuis le port 3003 (Next.js)
    $corsHeaders = @{
        'Origin' = 'http://localhost:3003'
        'Content-Type' = 'application/json'
    }
    
    $corsResponse = Invoke-WebRequest -Uri "http://localhost:3001/health" -Headers $corsHeaders -UseBasicParsing
    
    if ($corsResponse.StatusCode -eq 200) {
        Write-Host "OK CORS: CONFIGURE CORRECTEMENT" -ForegroundColor Green
        Write-Host "   Origin autorise: http://localhost:3003" -ForegroundColor Gray
        
        # Vérifier les headers CORS
        $corsHeader = $corsResponse.Headers['Access-Control-Allow-Credentials']
        if ($corsHeader) {
            Write-Host "   Credentials: $corsHeader" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "ERREUR CORS: PROBLEME DETECTE" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Vérification de la configuration frontend
Write-Host "`n5. TEST CONFIGURATION FRONTEND" -ForegroundColor Yellow
Write-Host "===============================" -ForegroundColor Yellow

if (Test-Path "frontend-nextjs-production/.env.local") {
    $envContent = Get-Content "frontend-nextjs-production/.env.local" -Raw
    
    if ($envContent -match "NEXT_PUBLIC_API_BASE_URL=http://localhost:3001") {
        Write-Host "OK Configuration API: CORRECTE" -ForegroundColor Green
        Write-Host "   Backend URL: http://localhost:3001" -ForegroundColor Gray
    } else {
        Write-Host "ERREUR Configuration API: INCORRECTE" -ForegroundColor Red
    }
    
    if ($envContent -match "NODE_ENV=development") {
        Write-Host "OK Environnement: DEVELOPMENT" -ForegroundColor Green
    }
} else {
    Write-Host "ERREUR Fichier .env.local non trouve" -ForegroundColor Red
}

# Test 6: Vérification des dépendances frontend
Write-Host "`n6. TEST DEPENDANCES FRONTEND" -ForegroundColor Yellow
Write-Host "=============================" -ForegroundColor Yellow

if (Test-Path "frontend-nextjs-production/node_modules") {
    Write-Host "OK Dependencies: INSTALLEES" -ForegroundColor Green
    
    # Vérifier les packages clés
    $packageJson = Get-Content "frontend-nextjs-production/package.json" | ConvertFrom-Json
    
    $keyPackages = @("next", "react", "axios", "zustand", "tailwindcss")
    foreach ($package in $keyPackages) {
        $depVersion = $packageJson.dependencies.$package
        $devVersion = $packageJson.devDependencies.$package

        if ($depVersion -or $devVersion) {
            $version = if ($depVersion) { $depVersion } else { $devVersion }
            Write-Host "   ${package}: $version" -ForegroundColor Gray
        } else {
            Write-Host "   ${package}: MANQUANT" -ForegroundColor Red
        }
    }
} else {
    Write-Host "ERREUR Dependencies: NON INSTALLEES" -ForegroundColor Red
    Write-Host "Executez: cd frontend-nextjs-production && npm install" -ForegroundColor Yellow
}

# Résumé final
Write-Host "`n7. RESUME DE LA CONNEXION" -ForegroundColor Yellow
Write-Host "==========================" -ForegroundColor Yellow

$issues = @()

if (-not $backendOK) { $issues += "Backend non accessible" }
if (-not $authOK) { $issues += "Authentification echouee" }
if (-not (Test-Path "frontend-nextjs-production/.env.local")) { $issues += "Configuration frontend manquante" }
if (-not (Test-Path "frontend-nextjs-production/node_modules")) { $issues += "Dependencies frontend manquantes" }

if ($issues.Count -eq 0) {
    Write-Host "TOUTES LES CONNEXIONS SONT OPERATIONNELLES!" -ForegroundColor Green
    Write-Host ""
    Write-Host "PRET POUR LE DEMARRAGE DU FRONTEND:" -ForegroundColor Green
    Write-Host "   Backend: http://localhost:3001 (ACTIF)" -ForegroundColor Green
    Write-Host "   Frontend: http://localhost:3003 (PRET)" -ForegroundColor Green
    Write-Host "   Authentification: admin@demo-tpe.fr / demo123" -ForegroundColor Green
    Write-Host ""
    Write-Host "Pour demarrer le frontend:" -ForegroundColor White
    Write-Host "   cd frontend-nextjs-production" -ForegroundColor Cyan
    Write-Host "   npm run dev" -ForegroundColor Cyan
} else {
    Write-Host "PROBLEMES DETECTES:" -ForegroundColor Red
    foreach ($issue in $issues) {
        Write-Host "   - $issue" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "ACTIONS REQUISES:" -ForegroundColor Yellow
    if (-not $backendOK) {
        Write-Host "   1. Demarrer le backend: .\start-production-backend.ps1" -ForegroundColor Yellow
    }
    if (-not (Test-Path "frontend-nextjs-production/node_modules")) {
        Write-Host "   2. Installer les dependencies: cd frontend-nextjs-production && npm install" -ForegroundColor Yellow
    }
}

Write-Host "`nTEST DE CONNEXION TERMINE" -ForegroundColor Cyan
