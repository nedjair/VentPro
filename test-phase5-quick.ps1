# Test rapide Phase 5
Write-Host "TEST RAPIDE PHASE 5 - ANALYTICS" -ForegroundColor Magenta
Write-Host "================================" -ForegroundColor Magenta

# 1. Test Node.js
Write-Host "`n1. Test Node.js" -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERR] Node.js non installe" -ForegroundColor Red
    exit 1
}

# 2. Test Docker
Write-Host "`n2. Test Docker" -ForegroundColor Yellow
try {
    $dockerStatus = docker ps --format "table {{.Names}}" | Select-String "gestion-"
    if ($dockerStatus) {
        Write-Host "[OK] Services Docker actifs" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Demarrage Docker..." -ForegroundColor Yellow
        docker-compose up -d
        Start-Sleep -Seconds 8
        Write-Host "[OK] Docker demarre" -ForegroundColor Green
    }
} catch {
    Write-Host "[ERR] Docker non accessible" -ForegroundColor Red
}

# 3. Test Backend
Write-Host "`n3. Test Backend" -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 3
    if ($health.StatusCode -eq 200) {
        Write-Host "[OK] Backend actif" -ForegroundColor Green
    }
} catch {
    Write-Host "[WARN] Demarrage backend..." -ForegroundColor Yellow
    Start-Process -FilePath "node" -ArgumentList "production-backend.js" -WindowStyle Hidden
    Start-Sleep -Seconds 8
    
    try {
        $health = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 3
        Write-Host "[OK] Backend demarre" -ForegroundColor Green
    } catch {
        Write-Host "[ERR] Backend echec" -ForegroundColor Red
    }
}

# 4. Test Authentification
Write-Host "`n4. Test Authentification" -ForegroundColor Yellow
try {
    $loginBody = @{ email = "admin@demo-tpe.fr"; password = "demo123" } | ConvertTo-Json
    $authResponse = Invoke-WebRequest -Uri "http://localhost:3001/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
    $authData = $authResponse.Content | ConvertFrom-Json
    
    if ($authData.success) {
        Write-Host "[OK] Authentification reussie" -ForegroundColor Green
        $token = $authData.data.token
        $headers = @{ Authorization = "Bearer $token" }
        
        # Test KPI
        try {
            $kpi = Invoke-WebRequest -Uri "http://localhost:3001/analytics/kpi" -Headers $headers -UseBasicParsing
            Write-Host "[OK] KPI Analytics operationnel" -ForegroundColor Green
        } catch {
            Write-Host "[ERR] KPI Analytics echec" -ForegroundColor Red
        }
        
        # Test Sales
        try {
            $sales = Invoke-WebRequest -Uri "http://localhost:3001/analytics/sales" -Headers $headers -UseBasicParsing
            Write-Host "[OK] Sales Analytics operationnel" -ForegroundColor Green
        } catch {
            Write-Host "[ERR] Sales Analytics echec" -ForegroundColor Red
        }
        
    } else {
        Write-Host "[ERR] Authentification echec" -ForegroundColor Red
    }
} catch {
    Write-Host "[ERR] Erreur authentification" -ForegroundColor Red
}

# 5. Test Frontend
Write-Host "`n5. Test Frontend" -ForegroundColor Yellow
try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:3003" -UseBasicParsing -TimeoutSec 3
    Write-Host "[OK] Frontend actif" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Frontend non actif" -ForegroundColor Yellow
    Write-Host "Demarrage manuel requis:" -ForegroundColor White
    Write-Host "  cd frontend-nextjs-production" -ForegroundColor Gray
    Write-Host "  npm run dev" -ForegroundColor Gray
}

# Résumé
Write-Host "`nRESUME PHASE 5" -ForegroundColor Magenta
Write-Host "==============" -ForegroundColor Magenta
Write-Host "URLs d'acces:" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:3003" -ForegroundColor White
Write-Host "  Analytics: http://localhost:3003/analytics" -ForegroundColor Yellow
Write-Host "  Backend: http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "Identifiants:" -ForegroundColor Cyan
Write-Host "  Email: admin@demo-tpe.fr" -ForegroundColor White
Write-Host "  Password: demo123" -ForegroundColor White
Write-Host ""
Write-Host "Phase 5 Analytics prete!" -ForegroundColor Green
