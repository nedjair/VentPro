# =============================================================================
# SCRIPT DE DEMARRAGE PHASE 5 - ANALYTICS ET REPORTING (VERSION SIMPLE)
# Gestion Commerciale TPE - Tableaux de bord avances
# =============================================================================

Write-Host "PHASE 5 - ANALYTICS ET REPORTING AVANCES" -ForegroundColor Magenta
Write-Host "=========================================" -ForegroundColor Magenta
Write-Host "Demarrage de l'application avec fonctionnalites Analytics" -ForegroundColor White
Write-Host ""

# Fonction pour afficher un message avec statut
function Write-StatusMessage {
    param(
        [string]$Message,
        [string]$Status = "INFO",
        [string]$Color = "White"
    )
    
    $icon = switch ($Status) {
        "SUCCESS" { "[OK]" }
        "ERROR" { "[ERR]" }
        "WARNING" { "[WARN]" }
        "INFO" { "[INFO]" }
        "LOADING" { "[...]" }
        default { "[-]" }
    }
    
    Write-Host "$icon $Message" -ForegroundColor $Color
}

# Etape 1: Verification des prerequis Phase 5
Write-Host "1. VERIFICATION DES PREREQUIS PHASE 5" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Yellow

# Verifier Node.js
try {
    $nodeVersion = node --version
    Write-StatusMessage "Node.js: $nodeVersion" "SUCCESS" "Green"
} catch {
    Write-StatusMessage "Node.js non installe" "ERROR" "Red"
    exit 1
}

# Verifier les services Docker
Write-StatusMessage "Verification des services Docker..." "LOADING" "Yellow"
try {
    $dockerStatus = docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "gestion-"
    if ($dockerStatus) {
        Write-StatusMessage "Services Docker: ACTIFS" "SUCCESS" "Green"
        Write-Host "   PostgreSQL 16: Port 5432" -ForegroundColor Gray
        Write-Host "   Redis 7: Port 6379" -ForegroundColor Gray
    } else {
        Write-StatusMessage "Demarrage des services Docker..." "LOADING" "Yellow"
        docker-compose up -d
        Start-Sleep -Seconds 10
        Write-StatusMessage "Services Docker: DEMARRES" "SUCCESS" "Green"
    }
} catch {
    Write-StatusMessage "Docker non accessible" "ERROR" "Red"
    exit 1
}

# Verifier les tables Phase 5
Write-StatusMessage "Verification des tables Analytics..." "LOADING" "Yellow"
try {
    # Test simple de connexion a la base
    $testConnection = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
    if ($testConnection.StatusCode -eq 200) {
        Write-StatusMessage "Base de donnees: ACCESSIBLE" "SUCCESS" "Green"
    }
} catch {
    Write-StatusMessage "Base de donnees: EN COURS DE DEMARRAGE" "WARNING" "Yellow"
}

# Etape 2: Demarrage du Backend Analytics
Write-Host "`n2. DEMARRAGE DU BACKEND ANALYTICS" -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Yellow

$backendRunning = $false

# Verifier si le backend est deja actif
try {
    $healthCheck = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 3
    if ($healthCheck.StatusCode -eq 200) {
        Write-StatusMessage "Backend: DEJA ACTIF" "SUCCESS" "Green"
        $backendRunning = $true
    }
} catch {
    Write-StatusMessage "Demarrage du backend production..." "LOADING" "Yellow"
    
    if (Test-Path "production-backend.js") {
        $backendProcess = Start-Process -FilePath "node" -ArgumentList "production-backend.js" -PassThru -WindowStyle Hidden
        Write-StatusMessage "Backend demarre: PID $($backendProcess.Id)" "SUCCESS" "Green"
        
        # Attendre que le backend soit pret
        $maxAttempts = 15
        $attempt = 0
        
        while ($attempt -lt $maxAttempts -and -not $backendRunning) {
            Start-Sleep -Seconds 2
            try {
                $healthCheck = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 3
                if ($healthCheck.StatusCode -eq 200) {
                    $backendRunning = $true
                    Write-StatusMessage "Backend: OPERATIONNEL" "SUCCESS" "Green"
                }
            } catch {
                $attempt++
                Write-Host "   Tentative $attempt/$maxAttempts..." -ForegroundColor Gray
            }
        }
        
        if (-not $backendRunning) {
            Write-StatusMessage "Echec du demarrage du backend" "ERROR" "Red"
            exit 1
        }
    } else {
        Write-StatusMessage "Fichier production-backend.js non trouve" "ERROR" "Red"
        exit 1
    }
}

# Etape 3: Test des endpoints Analytics Phase 5
Write-Host "`n3. VALIDATION DES ENDPOINTS ANALYTICS" -ForegroundColor Yellow
Write-Host "======================================" -ForegroundColor Yellow

if ($backendRunning) {
    # Test d'authentification
    Write-StatusMessage "Test d'authentification..." "LOADING" "Yellow"
    try {
        $loginBody = @{
            email = "admin@demo-tpe.fr"
            password = "demo123"
        } | ConvertTo-Json
        
        $authResponse = Invoke-WebRequest -Uri "http://localhost:3001/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
        $authData = $authResponse.Content | ConvertFrom-Json
        
        if ($authData.success) {
            Write-StatusMessage "Authentification: REUSSIE" "SUCCESS" "Green"
            $authToken = $authData.data.token
            $headers = @{ Authorization = "Bearer $authToken" }
            
            # Test des endpoints Analytics
            Write-Host "`n   Test des endpoints Phase 5:" -ForegroundColor Cyan
            
            # KPI Metrics
            try {
                $kpiResponse = Invoke-WebRequest -Uri "http://localhost:3001/analytics/kpi" -Headers $headers -UseBasicParsing
                Write-StatusMessage "KPI Metrics: OPERATIONNEL" "SUCCESS" "Green"
            } catch {
                Write-StatusMessage "KPI Metrics: ECHEC" "ERROR" "Red"
            }
            
            # Sales Analytics
            try {
                $salesResponse = Invoke-WebRequest -Uri "http://localhost:3001/analytics/sales" -Headers $headers -UseBasicParsing
                Write-StatusMessage "Sales Analytics: OPERATIONNEL" "SUCCESS" "Green"
            } catch {
                Write-StatusMessage "Sales Analytics: ECHEC" "ERROR" "Red"
            }
            
            # Product Analytics
            try {
                $productResponse = Invoke-WebRequest -Uri "http://localhost:3001/analytics/products" -Headers $headers -UseBasicParsing
                Write-StatusMessage "Product Analytics: OPERATIONNEL" "SUCCESS" "Green"
            } catch {
                Write-StatusMessage "Product Analytics: ECHEC" "ERROR" "Red"
            }
            
            # Client Analytics
            try {
                $clientResponse = Invoke-WebRequest -Uri "http://localhost:3001/analytics/clients" -Headers $headers -UseBasicParsing
                Write-StatusMessage "Client Analytics: OPERATIONNEL" "SUCCESS" "Green"
            } catch {
                Write-StatusMessage "Client Analytics: ECHEC" "ERROR" "Red"
            }
            
            # Dashboard Stats
            try {
                $dashboardResponse = Invoke-WebRequest -Uri "http://localhost:3001/dashboard/stats" -Headers $headers -UseBasicParsing
                Write-StatusMessage "Dashboard Stats: OPERATIONNEL" "SUCCESS" "Green"
            } catch {
                Write-StatusMessage "Dashboard Stats: ECHEC" "ERROR" "Red"
            }
            
        } else {
            Write-StatusMessage "Authentification: ECHEC" "ERROR" "Red"
        }
    } catch {
        Write-StatusMessage "Erreur d'authentification" "ERROR" "Red"
    }
}

# Etape 4: Preparation du Frontend Analytics
Write-Host "`n4. PREPARATION DU FRONTEND ANALYTICS" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Yellow

if (Test-Path "frontend-nextjs-production") {
    Set-Location "frontend-nextjs-production"
    Write-StatusMessage "Dossier frontend: TROUVE" "SUCCESS" "Green"
    
    # Verifier Recharts (dependance Phase 5)
    if (Test-Path "node_modules/recharts") {
        Write-StatusMessage "Recharts (graphiques): INSTALLE" "SUCCESS" "Green"
    } else {
        Write-StatusMessage "Installation de Recharts..." "LOADING" "Yellow"
        npm install recharts --silent
        if ($LASTEXITCODE -eq 0) {
            Write-StatusMessage "Recharts: INSTALLE" "SUCCESS" "Green"
        } else {
            Write-StatusMessage "Echec installation Recharts" "ERROR" "Red"
        }
    }
    
    # Verifier les autres dependances
    if (Test-Path "node_modules") {
        Write-StatusMessage "Dependances: INSTALLEES" "SUCCESS" "Green"
    } else {
        Write-StatusMessage "Installation des dependances..." "LOADING" "Yellow"
        npm install --silent
        if ($LASTEXITCODE -eq 0) {
            Write-StatusMessage "Dependances: INSTALLEES" "SUCCESS" "Green"
        } else {
            Write-StatusMessage "Echec installation" "ERROR" "Red"
            exit 1
        }
    }
} else {
    Write-StatusMessage "Dossier frontend non trouve" "ERROR" "Red"
    exit 1
}

# Etape 5: Informations Phase 5
Write-Host "`n5. INFORMATIONS PHASE 5 - ANALYTICS" -ForegroundColor Yellow
Write-Host "====================================" -ForegroundColor Yellow

Write-Host "APPLICATION PHASE 5 PRETE!" -ForegroundColor Green
Write-Host ""
Write-Host "FONCTIONNALITES ANALYTICS DISPONIBLES:" -ForegroundColor Magenta
Write-Host "   • KPI Temps Reel (CA, marge, conversion, panier moyen)" -ForegroundColor White
Write-Host "   • Analytics de Ventes (evolution, top clients, repartition)" -ForegroundColor White
Write-Host "   • Performance Produits (top ventes, categories)" -ForegroundColor White
Write-Host "   • Segmentation Clients (VIP/Premium/Standard/Nouveau)" -ForegroundColor White
Write-Host "   • Graphiques Interactifs (courbes, barres, secteurs)" -ForegroundColor White
Write-Host "   • Tableaux de Bord Personnalisables" -ForegroundColor White
Write-Host ""
Write-Host "URLS D'ACCES:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3003" -ForegroundColor White
Write-Host "   Analytics: http://localhost:3003/analytics" -ForegroundColor Magenta
Write-Host "   Backend API: http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "IDENTIFIANTS:" -ForegroundColor Cyan
Write-Host "   Email: admin@demo-tpe.fr" -ForegroundColor White
Write-Host "   Mot de passe: demo123" -ForegroundColor White
Write-Host ""

# Etape 6: Demarrage du Frontend
Write-Host "6. DEMARRAGE DU FRONTEND ANALYTICS" -ForegroundColor Yellow
Write-Host "===================================" -ForegroundColor Yellow

Write-StatusMessage "Demarrage de Next.js avec Analytics Phase 5..." "LOADING" "Yellow"
Write-Host ""
Write-Host "NAVIGATION DISPONIBLE:" -ForegroundColor Cyan
Write-Host "   Dashboard → Vue d'ensemble generale" -ForegroundColor Gray
Write-Host "   Analytics → KPI et graphiques temps reel" -ForegroundColor Magenta
Write-Host "   Clients → Gestion et segmentation" -ForegroundColor Gray
Write-Host "   Produits → Catalogue et performance" -ForegroundColor Gray
Write-Host "   Commandes → Devis et commandes" -ForegroundColor Gray
Write-Host "   Factures → Facturation et paiements" -ForegroundColor Gray
Write-Host ""
Write-Host "Appuyez sur Ctrl+C pour arreter l'application" -ForegroundColor Yellow
Write-Host ""

# Demarrer Next.js
try {
    npm run dev
} catch {
    Write-StatusMessage "Echec du demarrage du frontend" "ERROR" "Red"
}

Write-Host "`nAPPLICATION ARRETEE" -ForegroundColor Yellow
Write-Host "Pour redemarrer la Phase 5:" -ForegroundColor White
Write-Host "   .\start-phase5-simple.ps1" -ForegroundColor Magenta
