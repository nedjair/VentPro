# =============================================================================
# SCRIPT DE DÉMARRAGE COMPLET - APPLICATION GESTION COMMERCIALE TPE
# Phase 5 - Analytics et Reporting Avancés
# Backend + Frontend + Tests de validation
# =============================================================================

Write-Host "DEMARRAGE COMPLET - GESTION COMMERCIALE TPE - PHASE 5" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "Backend: production-backend.js (Port 3001)" -ForegroundColor Gray
Write-Host "Frontend: Next.js (Port 3003)" -ForegroundColor Gray
Write-Host "Analytics: Tableaux de bord avancés" -ForegroundColor Magenta
Write-Host "Reporting: KPI temps réel et graphiques interactifs" -ForegroundColor Magenta
Write-Host ""

# Étape 1: Vérifier les prérequis
Write-Host "1. VERIFICATION DES PREREQUIS" -ForegroundColor Yellow
Write-Host "=============================" -ForegroundColor Yellow

# Vérifier Node.js
try {
    $nodeVersion = node --version
    Write-Host "OK Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERREUR Node.js non installe" -ForegroundColor Red
    exit 1
}

# Vérifier Docker
try {
    $dockerStatus = docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "gestion-"
    if ($dockerStatus) {
        Write-Host "OK Services Docker: ACTIFS" -ForegroundColor Green
    } else {
        Write-Host "ATTENTION Services Docker: DEMARRAGE..." -ForegroundColor Yellow
        docker-compose up -d
        Start-Sleep -Seconds 10
    }
} catch {
    Write-Host "ERREUR Docker non accessible" -ForegroundColor Red
    exit 1
}

# Étape 2: Démarrer le backend
Write-Host "`n2. DEMARRAGE DU BACKEND" -ForegroundColor Yellow
Write-Host "=======================" -ForegroundColor Yellow

# Vérifier si le backend est déjà en cours
try {
    $healthCheck = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 3
    if ($healthCheck.StatusCode -eq 200) {
        Write-Host "OK Backend: DEJA ACTIF" -ForegroundColor Green
        $backendRunning = $true
    }
} catch {
    Write-Host "Backend: NON ACTIF - Demarrage..." -ForegroundColor Yellow
    
    # Démarrer le backend
    if (Test-Path "production-backend.js") {
        $backendProcess = Start-Process -FilePath "node" -ArgumentList "production-backend.js" -PassThru -WindowStyle Hidden
        Write-Host "Backend demarre: PID $($backendProcess.Id)" -ForegroundColor Green
        
        # Attendre que le backend soit prêt
        $maxAttempts = 10
        $attempt = 0
        $backendRunning = $false
        
        while ($attempt -lt $maxAttempts -and -not $backendRunning) {
            Start-Sleep -Seconds 2
            try {
                $healthCheck = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 3
                if ($healthCheck.StatusCode -eq 200) {
                    $backendRunning = $true
                    Write-Host "OK Backend: OPERATIONNEL" -ForegroundColor Green
                }
            } catch {
                $attempt++
                Write-Host "   Tentative $attempt/$maxAttempts..." -ForegroundColor Gray
            }
        }
        
        if (-not $backendRunning) {
            Write-Host "ERREUR Backend: ECHEC DU DEMARRAGE" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "ERREUR Fichier production-backend.js non trouve" -ForegroundColor Red
        exit 1
    }
}

# Étape 3: Tester les connexions backend
Write-Host "`n3. TEST DES CONNEXIONS BACKEND" -ForegroundColor Yellow
Write-Host "===============================" -ForegroundColor Yellow

if ($backendRunning) {
    # Test authentification
    try {
        $loginBody = @{
            email = "admin@demo-tpe.fr"
            password = "demo123"
        } | ConvertTo-Json

        $authResponse = Invoke-WebRequest -Uri "http://localhost:3001/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
        $authData = $authResponse.Content | ConvertFrom-Json

        if ($authData.success) {
            Write-Host "OK Authentification: FONCTIONNELLE" -ForegroundColor Green
            Write-Host "   Email: $($authData.data.user.email)" -ForegroundColor Gray
            Write-Host "   Role: $($authData.data.user.role)" -ForegroundColor Gray
            $authToken = $authData.data.token
            $authOK = $true

            # Test des nouveaux endpoints Analytics Phase 5
            Write-Host "`n   Test des endpoints Analytics Phase 5:" -ForegroundColor Cyan
            $headers = @{ Authorization = "Bearer $authToken" }

            try {
                $kpiResponse = Invoke-WebRequest -Uri "http://localhost:3001/analytics/kpi" -Headers $headers -UseBasicParsing
                Write-Host "   ✓ KPI Metrics: OPERATIONNEL" -ForegroundColor Green
            } catch {
                Write-Host "   ✗ KPI Metrics: ECHEC" -ForegroundColor Red
            }

            try {
                $salesResponse = Invoke-WebRequest -Uri "http://localhost:3001/analytics/sales" -Headers $headers -UseBasicParsing
                Write-Host "   ✓ Sales Analytics: OPERATIONNEL" -ForegroundColor Green
            } catch {
                Write-Host "   ✗ Sales Analytics: ECHEC" -ForegroundColor Red
            }

            try {
                $dashboardResponse = Invoke-WebRequest -Uri "http://localhost:3001/dashboard/stats" -Headers $headers -UseBasicParsing
                Write-Host "   ✓ Dashboard Stats: OPERATIONNEL" -ForegroundColor Green
            } catch {
                Write-Host "   ✗ Dashboard Stats: ECHEC" -ForegroundColor Red
            }
        }
    } catch {
        Write-Host "ERREUR Authentification: ECHEC" -ForegroundColor Red
        $authOK = $false
    }
}

# Étape 4: Préparer le frontend
Write-Host "`n4. PREPARATION DU FRONTEND" -ForegroundColor Yellow
Write-Host "===========================" -ForegroundColor Yellow

if (Test-Path "frontend-nextjs-production") {
    Set-Location "frontend-nextjs-production"
    Write-Host "OK Dossier frontend: TROUVE" -ForegroundColor Green
    
    # Vérifier les dépendances
    if (Test-Path "node_modules") {
        Write-Host "OK Dependencies: INSTALLEES" -ForegroundColor Green
    } else {
        Write-Host "Installation des dependencies..." -ForegroundColor Yellow
        npm install --silent
        if ($LASTEXITCODE -eq 0) {
            Write-Host "OK Dependencies: INSTALLEES" -ForegroundColor Green
        } else {
            Write-Host "ERREUR Installation echouee" -ForegroundColor Red
            exit 1
        }
    }
    
    # Vérifier la configuration
    if (Test-Path ".env.local") {
        $envContent = Get-Content ".env.local" -Raw
        if ($envContent -match "NEXT_PUBLIC_API_BASE_URL=http://localhost:3001") {
            Write-Host "OK Configuration API: CORRECTE" -ForegroundColor Green
        } else {
            Write-Host "ATTENTION Configuration API: A VERIFIER" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "ERREUR Dossier frontend non trouve" -ForegroundColor Red
    exit 1
}

# Étape 5: Informations finales
Write-Host "`n5. INFORMATIONS DE CONNEXION" -ForegroundColor Yellow
Write-Host "=============================" -ForegroundColor Yellow

Write-Host "APPLICATION PHASE 5 PRETE A DEMARRER!" -ForegroundColor Green
Write-Host ""
Write-Host "URLs de l'application:" -ForegroundColor White
Write-Host "   Backend API: http://localhost:3001" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3003" -ForegroundColor Cyan
Write-Host "   Analytics: http://localhost:3003/analytics" -ForegroundColor Magenta
Write-Host ""
Write-Host "Identifiants de connexion:" -ForegroundColor White
Write-Host "   Email: admin@demo-tpe.fr" -ForegroundColor Cyan
Write-Host "   Mot de passe: demo123" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services actifs:" -ForegroundColor White
Write-Host "   PostgreSQL 16: Port 5432/6432" -ForegroundColor Green
Write-Host "   Redis 7: Port 6379" -ForegroundColor Green
Write-Host "   Backend Fastify: Port 3001" -ForegroundColor Green
Write-Host ""
Write-Host "Fonctionnalités Phase 5 disponibles:" -ForegroundColor Magenta
Write-Host "   ✓ KPI temps réel (CA, marge, conversion)" -ForegroundColor Green
Write-Host "   ✓ Analytics de ventes avancées" -ForegroundColor Green
Write-Host "   ✓ Segmentation clients automatique" -ForegroundColor Green
Write-Host "   ✓ Performance produits par catégorie" -ForegroundColor Green
Write-Host "   ✓ Graphiques interactifs (Recharts)" -ForegroundColor Green
Write-Host "   ✓ Tableaux de bord personnalisables" -ForegroundColor Green
Write-Host ""

# Étape 6: Démarrage du frontend
Write-Host "6. DEMARRAGE DU FRONTEND" -ForegroundColor Yellow
Write-Host "========================" -ForegroundColor Yellow

Write-Host "Demarrage de Next.js avec Analytics Phase 5..." -ForegroundColor White
Write-Host "Appuyez sur Ctrl+C pour arreter l'application" -ForegroundColor Gray
Write-Host ""
Write-Host "Une fois demarre, ouvrez votre navigateur sur:" -ForegroundColor Yellow
Write-Host "   Dashboard principal: http://localhost:3003" -ForegroundColor Cyan
Write-Host "   Analytics avancés: http://localhost:3003/analytics" -ForegroundColor Magenta
Write-Host ""
Write-Host "Navigation disponible:" -ForegroundColor White
Write-Host "   • Dashboard - Vue d'ensemble" -ForegroundColor Gray
Write-Host "   • Analytics - KPI et graphiques temps réel" -ForegroundColor Gray
Write-Host "   • Clients - Gestion et segmentation" -ForegroundColor Gray
Write-Host "   • Produits - Catalogue et performance" -ForegroundColor Gray
Write-Host "   • Commandes - Devis et commandes" -ForegroundColor Gray
Write-Host "   • Factures - Facturation et paiements" -ForegroundColor Gray
Write-Host ""

# Démarrer Next.js (bloquant)
try {
    npm run dev
} catch {
    Write-Host "`nERREUR Echec du demarrage du frontend" -ForegroundColor Red
}

Write-Host "`nAPPLICATION ARRETEE" -ForegroundColor Yellow
Write-Host "Pour redemarrer:" -ForegroundColor White
Write-Host "   .\start-application-complete.ps1" -ForegroundColor Cyan
