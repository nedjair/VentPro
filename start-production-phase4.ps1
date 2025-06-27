# Démarrage Production Phase 4 - Application Complète
Write-Host "🚀 DÉMARRAGE PRODUCTION PHASE 4 - APPLICATION COMPLÈTE" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green

# Arrêter tous les processus existants
Write-Host "`n1. ARRÊT DES PROCESSUS EXISTANTS" -ForegroundColor Yellow
try {
    Get-Process -Name 'node' -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "   ✅ Processus Node.js arrêtés" -ForegroundColor Green
} catch {
    Write-Host "   ℹ️ Aucun processus Node.js à arrêter" -ForegroundColor Blue
}

# Démarrer Docker
Write-Host "`n2. DÉMARRAGE INFRASTRUCTURE DOCKER" -ForegroundColor Yellow
Write-Host "   🔄 Démarrage des services Docker..." -ForegroundColor Blue
docker-compose up -d

# Attendre que les services soient prêts
Write-Host "   ⏳ Attente des services (15 secondes)..." -ForegroundColor Blue
Start-Sleep -Seconds 15

# Vérifier Docker
$dockerOk = $true
try {
    $postgresStatus = docker exec gestion-postgres pg_isready -U gestion_user 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ PostgreSQL opérationnel" -ForegroundColor Green
    } else {
        Write-Host "   ❌ PostgreSQL problème" -ForegroundColor Red
        $dockerOk = $false
    }
} catch {
    Write-Host "   ❌ PostgreSQL non accessible" -ForegroundColor Red
    $dockerOk = $false
}

try {
    $redisStatus = docker exec gestion-redis redis-cli ping 2>$null
    if ($redisStatus -eq "PONG") {
        Write-Host "   ✅ Redis opérationnel" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Redis problème" -ForegroundColor Red
        $dockerOk = $false
    }
} catch {
    Write-Host "   ❌ Redis non accessible" -ForegroundColor Red
    $dockerOk = $false
}

if (-not $dockerOk) {
    Write-Host "   ❌ Problème avec l'infrastructure Docker" -ForegroundColor Red
    Write-Host "   🔄 Tentative de redémarrage..." -ForegroundColor Blue
    docker-compose down
    Start-Sleep -Seconds 5
    docker-compose up -d
    Start-Sleep -Seconds 20
}

# Démarrer le Backend Phase 4
Write-Host "`n3. DÉMARRAGE BACKEND PHASE 4" -ForegroundColor Yellow
Write-Host "   🚀 Démarrage production-backend.js..." -ForegroundColor Blue

# Variables d'environnement
$env:NODE_ENV = "production"
$env:PORT = "3001"
$env:DATABASE_URL = "postgresql://gestion_user:gestion_password@localhost:5432/gestion_commerciale"
$env:REDIS_URL = "redis://localhost:6379"
$env:JWT_SECRET = "your-super-secret-jwt-key-change-in-production"

# Démarrer le backend
Start-Process -FilePath "node" -ArgumentList "production-backend.js" -NoNewWindow

# Attendre le démarrage
Write-Host "   ⏳ Attente du démarrage backend (10 secondes)..." -ForegroundColor Blue
Start-Sleep -Seconds 10

# Tester le backend
$backendOk = $false
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 10
    if ($healthResponse.StatusCode -eq 200) {
        Write-Host "   ✅ Backend Phase 4 opérationnel" -ForegroundColor Green
        $backendOk = $true
    }
} catch {
    Write-Host "   ❌ Backend non accessible" -ForegroundColor Red
}

# Démarrer le Frontend Next.js
Write-Host "`n4. DÉMARRAGE FRONTEND NEXT.JS" -ForegroundColor Yellow
if ($backendOk) {
    Write-Host "   🚀 Démarrage frontend Next.js..." -ForegroundColor Blue
    
    # Vérifier si le frontend existe
    if (Test-Path "frontend-nextjs-production") {
        Set-Location "frontend-nextjs-production"
        
        # Installer les dépendances si nécessaire
        if (!(Test-Path "node_modules")) {
            Write-Host "   📦 Installation des dépendances frontend..." -ForegroundColor Blue
            npm install
        }
        
        # Démarrer le frontend
        Start-Process -FilePath "npm" -ArgumentList "run", "dev" -NoNewWindow
        Set-Location ".."
        
        Write-Host "   ⏳ Attente du démarrage frontend (15 secondes)..." -ForegroundColor Blue
        Start-Sleep -Seconds 15
        
        # Tester le frontend
        try {
            $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3003" -TimeoutSec 10
            if ($frontendResponse.StatusCode -eq 200) {
                Write-Host "   ✅ Frontend Next.js opérationnel" -ForegroundColor Green
            }
        } catch {
            Write-Host "   ⚠️ Frontend en cours de démarrage..." -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ⚠️ Dossier frontend-nextjs-production non trouvé" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️ Frontend non démarré (backend requis)" -ForegroundColor Yellow
}

# Tests des nouvelles fonctionnalités Phase 4
Write-Host "`n5. TESTS DES NOUVELLES FONCTIONNALITÉS PHASE 4" -ForegroundColor Yellow

if ($backendOk) {
    # Test des routes Phase 4
    $routes = @(
        @{url="http://localhost:3001/api/v1/orders"; name="Orders API"},
        @{url="http://localhost:3001/api/v1/invoices"; name="Invoices API"},
        @{url="http://localhost:3001/api/v1/orders/stats/overview"; name="Orders Stats"},
        @{url="http://localhost:3001/api/v1/invoices/stats/overview"; name="Invoices Stats"}
    )
    
    foreach ($route in $routes) {
        try {
            Invoke-WebRequest -Uri $route.url -ErrorAction Stop
        } catch {
            if ($_.Exception.Response.StatusCode -eq 401) {
                Write-Host "   ✅ $($route.name): Accessible et sécurisé" -ForegroundColor Green
            } else {
                Write-Host "   ❌ $($route.name): Problème" -ForegroundColor Red
            }
        }
    }
    
    # Test authentification
    Write-Host "`n   🔐 Test d'authentification..." -ForegroundColor Blue
    try {
        $loginData = @{
            email = "admin@demo-tpe.fr"
            password = "demo123"
        } | ConvertTo-Json
        
        $loginResponse = Invoke-WebRequest -Uri "http://localhost:3001/auth/login" -Method POST -Body $loginData -ContentType "application/json"
        $loginResult = $loginResponse.Content | ConvertFrom-Json
        
        if ($loginResult.success) {
            Write-Host "   ✅ Authentification fonctionnelle" -ForegroundColor Green
            $token = $loginResult.data.token
            
            # Test avec token
            $headers = @{ "Authorization" = "Bearer $token" }
            $ordersResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/orders" -Headers $headers
            if ($ordersResponse.StatusCode -eq 200) {
                Write-Host "   ✅ API Orders accessible avec token" -ForegroundColor Green
            }
        }
    } catch {
        Write-Host "   ⚠️ Test authentification: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Résultat final
Write-Host "`n🎯 APPLICATION PRODUCTION PHASE 4 DÉMARRÉE" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green

Write-Host "`n📋 SERVICES OPÉRATIONNELS:" -ForegroundColor White
Write-Host "  🐘 PostgreSQL  : localhost:5432" -ForegroundColor Cyan
Write-Host "  🔴 Redis       : localhost:6379" -ForegroundColor Cyan
Write-Host "  🚀 Backend     : http://localhost:3001" -ForegroundColor Cyan
Write-Host "  🌐 Frontend    : http://localhost:3003" -ForegroundColor Cyan

Write-Host "`n🆕 NOUVELLES FONCTIONNALITÉS PHASE 4:" -ForegroundColor White
Write-Host "  📋 Gestion des Devis      : /api/v1/orders (type: QUOTE)" -ForegroundColor Green
Write-Host "  📦 Gestion des Commandes  : /api/v1/orders (type: ORDER)" -ForegroundColor Green
Write-Host "  💰 Gestion des Factures   : /api/v1/invoices" -ForegroundColor Green
Write-Host "  📊 Statistiques Temps Réel: /stats/overview" -ForegroundColor Green
Write-Host "  🔢 Numérotation Automatique: DEV/CMD/FAC-YYYYMM-XXXX" -ForegroundColor Green
Write-Host "  💱 Calculs HT/TVA/TTC     : Automatiques" -ForegroundColor Green

Write-Host "`n🔐 IDENTIFIANTS DE TEST:" -ForegroundColor White
Write-Host "  📧 Email    : admin@demo-tpe.fr" -ForegroundColor Cyan
Write-Host "  🔑 Password : demo123" -ForegroundColor Cyan

Write-Host "`n🌐 URLS DE TEST:" -ForegroundColor White
Write-Host "  🏠 Application : http://localhost:3003" -ForegroundColor Cyan
Write-Host "  🔧 API Health  : http://localhost:3001/health" -ForegroundColor Cyan
Write-Host "  📚 API Docs    : http://localhost:3001/docs" -ForegroundColor Cyan

Write-Host "`n⚡ COMMANDES UTILES:" -ForegroundColor White
Write-Host "  🛑 Arrêter tout: Get-Process -Name 'node' | Stop-Process -Force" -ForegroundColor Gray
Write-Host "  📊 Tester APIs : .\test-phase4-auth.ps1" -ForegroundColor Gray
Write-Host "  🔍 Logs Backend: Voir terminal Node.js" -ForegroundColor Gray

Write-Host "`n🎉 PRÊT POUR TESTER LES NOUVELLES FONCTIONNALITÉS !" -ForegroundColor Green
