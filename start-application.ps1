param(
    [switch]$SkipDocker,
    [switch]$TestOnly
)

Write-Host "🚀 Démarrage de l'Application Gestion Commerciale TPE" -ForegroundColor Yellow
Write-Host "=================================================" -ForegroundColor Yellow

# 1. Démarrage des services Docker (si pas skippé)
if (-not $SkipDocker) {
    Write-Host "1. 📊 Démarrage des services Docker..." -ForegroundColor Cyan
    try {
        docker-compose up -d postgres redis
        Write-Host "   ✅ Services Docker démarrés" -ForegroundColor Green
        
        # Attendre que PostgreSQL soit prêt
        Write-Host "   ⏳ Attente de PostgreSQL..." -ForegroundColor Yellow
        $pgReady = $false
        $attempts = 0
        while (-not $pgReady -and $attempts -lt 15) {
            try {
                $result = docker exec gestion-postgres pg_isready -U gestion_user -d gestion_commerciale 2>$null
                if ($result -like "*accepting connections*") {
                    $pgReady = $true
                    Write-Host "   ✅ PostgreSQL est prêt" -ForegroundColor Green
                }
            } catch {
                Start-Sleep -Seconds 2
                $attempts++
            }
        }
        
        if (-not $pgReady) {
            Write-Host "   ❌ PostgreSQL n'est pas prêt après 30 secondes" -ForegroundColor Red
            Write-Host "   💡 Vérifiez que Docker Desktop est démarré" -ForegroundColor Yellow
            exit 1
        }
    } catch {
        Write-Host "   ❌ Erreur lors du démarrage Docker: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "1. ⏭️  Services Docker skippés" -ForegroundColor Yellow
}

# 2. Démarrage du Backend
Write-Host "2. 🔧 Démarrage du Backend..." -ForegroundColor Cyan
try {
    $backendProcess = Start-Process -FilePath "node" -ArgumentList "production-backend.js" -PassThru -WindowStyle Hidden
    Start-Sleep -Seconds 8
    
    # Vérifier que le backend répond
    $backendReady = $false
    $attempts = 0
    while (-not $backendReady -and $attempts -lt 10) {
        try {
            $healthResponse = Invoke-WebRequest -Uri "http://localhost:3001/health" -Method GET -TimeoutSec 3
            if ($healthResponse.StatusCode -eq 200) {
                $backendReady = $true
                Write-Host "   ✅ Backend démarré sur le port 3001" -ForegroundColor Green
            }
        } catch {
            Start-Sleep -Seconds 2
            $attempts++
        }
    }
    
    if (-not $backendReady) {
        Write-Host "   ❌ Backend ne répond pas après 20 secondes" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ Erreur lors du démarrage du backend: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. Test de l'authentification
Write-Host "3. 🔐 Test de l'authentification..." -ForegroundColor Cyan
try {
    $loginBody = @{
        email = "admin@demo-tpe.fr"
        password = "demo123"
    } | ConvertTo-Json
    
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -TimeoutSec 5
    $loginData = $loginResponse.Content | ConvertFrom-Json
    
    if ($loginData.success) {
        Write-Host "   ✅ Authentification fonctionnelle" -ForegroundColor Green
        $token = $loginData.data.token
        
        # Test de la route clients
        Write-Host "   🧪 Test de la route /api/clients..." -ForegroundColor Gray
        $headers = @{ "Authorization" = "Bearer $token" }
        $clientsResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/clients" -Method GET -Headers $headers -TimeoutSec 5
        $clientsData = $clientsResponse.Content | ConvertFrom-Json
        
        if ($clientsData.success) {
            Write-Host "   ✅ Route /api/clients fonctionnelle ($($clientsData.data.Count) clients)" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Erreur route /api/clients" -ForegroundColor Red
        }
    } else {
        Write-Host "   ❌ Échec de l'authentification" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Erreur lors du test d'authentification: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Démarrage du Frontend (si pas en mode test uniquement)
if (-not $TestOnly) {
    Write-Host "4. 🌐 Démarrage du Frontend..." -ForegroundColor Cyan
    try {
        Set-Location "frontend-nextjs-production"
        $frontendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -WindowStyle Hidden
        Set-Location ".."
        Start-Sleep -Seconds 5
        Write-Host "   ✅ Frontend démarré sur le port 3003" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Erreur lors du démarrage du frontend: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "4. ⏭️  Frontend skippé (mode test)" -ForegroundColor Yellow
}

# 5. Résumé
Write-Host ""
Write-Host "🎉 Application démarrée avec succès !" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host "🌐 Frontend Next.js : http://localhost:3003" -ForegroundColor Cyan
Write-Host "🔧 Backend Fastify  : http://localhost:3001" -ForegroundColor Cyan
Write-Host "📊 Health Check     : http://localhost:3001/health" -ForegroundColor Cyan
Write-Host "🗄️  Base de données : PostgreSQL sur port 5432" -ForegroundColor Cyan
Write-Host "🔐 Identifiants     : admin@demo-tpe.fr / demo123" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Pour arrêter l'application :" -ForegroundColor Yellow
Write-Host "   - Ctrl+C dans cette fenêtre" -ForegroundColor Gray
Write-Host "   - docker-compose down (pour arrêter les services)" -ForegroundColor Gray
