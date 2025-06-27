# =============================================================================
# SCRIPT DE DÉMARRAGE PHASE 5 - ANALYTICS ET REPORTING
# Gestion Commerciale TPE - Tableaux de bord avancés
# =============================================================================

Write-Host "PHASE 5 - ANALYTICS ET REPORTING AVANCES" -ForegroundColor Magenta
Write-Host "=========================================" -ForegroundColor Magenta
Write-Host "Demarrage de l'application avec fonctionnalites Analytics" -ForegroundColor White
Write-Host ""

# Fonction pour afficher un message avec icône
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
        Write-StatusMessage "Démarrage des services Docker..." "LOADING" "Yellow"
        docker-compose up -d
        Start-Sleep -Seconds 10
        Write-StatusMessage "Services Docker: DEMARRES" "SUCCESS" "Green"
    }
} catch {
    Write-StatusMessage "Docker non accessible" "ERROR" "Red"
    exit 1
}

# Vérifier les tables Phase 5
Write-StatusMessage "Vérification des tables Analytics..." "LOADING" "Yellow"
try {
    # Test simple de connexion à la base
    $testConnection = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
    if ($testConnection.StatusCode -eq 200) {
        Write-StatusMessage "Base de données: ACCESSIBLE" "SUCCESS" "Green"
    }
} catch {
    Write-StatusMessage "Base de données: EN COURS DE DÉMARRAGE" "WARNING" "Yellow"
}

# Étape 2: Démarrage du Backend Analytics
Write-Host "`n2. DÉMARRAGE DU BACKEND ANALYTICS" -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Yellow

$backendRunning = $false

# Vérifier si le backend est déjà actif
try {
    $healthCheck = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 3
    if ($healthCheck.StatusCode -eq 200) {
        Write-StatusMessage "Backend: DÉJÀ ACTIF" "SUCCESS" "Green"
        $backendRunning = $true
    }
} catch {
    Write-StatusMessage "Démarrage du backend production..." "LOADING" "Yellow"
    
    if (Test-Path "production-backend.js") {
        $backendProcess = Start-Process -FilePath "node" -ArgumentList "production-backend.js" -PassThru -WindowStyle Hidden
        Write-StatusMessage "Backend démarré: PID $($backendProcess.Id)" "SUCCESS" "Green"
        
        # Attendre que le backend soit prêt
        $maxAttempts = 15
        $attempt = 0
        
        while ($attempt -lt $maxAttempts -and -not $backendRunning) {
            Start-Sleep -Seconds 2
            try {
                $healthCheck = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 3
                if ($healthCheck.StatusCode -eq 200) {
                    $backendRunning = $true
                    Write-StatusMessage "Backend: OPÉRATIONNEL" "SUCCESS" "Green"
                }
            } catch {
                $attempt++
                Write-Host "   Tentative $attempt/$maxAttempts..." -ForegroundColor Gray
            }
        }
        
        if (-not $backendRunning) {
            Write-StatusMessage "Échec du démarrage du backend" "ERROR" "Red"
            exit 1
        }
    } else {
        Write-StatusMessage "Fichier production-backend.js non trouvé" "ERROR" "Red"
        exit 1
    }
}

# Étape 3: Test des endpoints Analytics Phase 5
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
            Write-StatusMessage "Authentification: RÉUSSIE" "SUCCESS" "Green"
            $authToken = $authData.data.token
            $headers = @{ Authorization = "Bearer $authToken" }
            
            # Test des endpoints Analytics
            Write-Host "`n   Test des endpoints Phase 5:" -ForegroundColor Cyan
            
            # KPI Metrics
            try {
                $kpiResponse = Invoke-WebRequest -Uri "http://localhost:3001/analytics/kpi" -Headers $headers -UseBasicParsing
                Write-StatusMessage "KPI Metrics: OPÉRATIONNEL" "SUCCESS" "Green"
            } catch {
                Write-StatusMessage "KPI Metrics: ÉCHEC" "ERROR" "Red"
            }
            
            # Sales Analytics
            try {
                $salesResponse = Invoke-WebRequest -Uri "http://localhost:3001/analytics/sales" -Headers $headers -UseBasicParsing
                Write-StatusMessage "Sales Analytics: OPÉRATIONNEL" "SUCCESS" "Green"
            } catch {
                Write-StatusMessage "Sales Analytics: ÉCHEC" "ERROR" "Red"
            }
            
            # Product Analytics
            try {
                $productResponse = Invoke-WebRequest -Uri "http://localhost:3001/analytics/products" -Headers $headers -UseBasicParsing
                Write-StatusMessage "Product Analytics: OPÉRATIONNEL" "SUCCESS" "Green"
            } catch {
                Write-StatusMessage "Product Analytics: ÉCHEC" "ERROR" "Red"
            }
            
            # Client Analytics
            try {
                $clientResponse = Invoke-WebRequest -Uri "http://localhost:3001/analytics/clients" -Headers $headers -UseBasicParsing
                Write-StatusMessage "Client Analytics: OPÉRATIONNEL" "SUCCESS" "Green"
            } catch {
                Write-StatusMessage "Client Analytics: ÉCHEC" "ERROR" "Red"
            }
            
            # Dashboard Stats
            try {
                $dashboardResponse = Invoke-WebRequest -Uri "http://localhost:3001/dashboard/stats" -Headers $headers -UseBasicParsing
                Write-StatusMessage "Dashboard Stats: OPÉRATIONNEL" "SUCCESS" "Green"
            } catch {
                Write-StatusMessage "Dashboard Stats: ÉCHEC" "ERROR" "Red"
            }
            
        } else {
            Write-StatusMessage "Authentification: ÉCHEC" "ERROR" "Red"
        }
    } catch {
        Write-StatusMessage "Erreur d'authentification" "ERROR" "Red"
    }
}

# Étape 4: Préparation du Frontend Analytics
Write-Host "`n4. PRÉPARATION DU FRONTEND ANALYTICS" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Yellow

if (Test-Path "frontend-nextjs-production") {
    Set-Location "frontend-nextjs-production"
    Write-StatusMessage "Dossier frontend: TROUVÉ" "SUCCESS" "Green"
    
    # Vérifier Recharts (dépendance Phase 5)
    if (Test-Path "node_modules/recharts") {
        Write-StatusMessage "Recharts (graphiques): INSTALLÉ" "SUCCESS" "Green"
    } else {
        Write-StatusMessage "Installation de Recharts..." "LOADING" "Yellow"
        npm install recharts --silent
        if ($LASTEXITCODE -eq 0) {
            Write-StatusMessage "Recharts: INSTALLÉ" "SUCCESS" "Green"
        } else {
            Write-StatusMessage "Échec installation Recharts" "ERROR" "Red"
        }
    }
    
    # Vérifier les autres dépendances
    if (Test-Path "node_modules") {
        Write-StatusMessage "Dépendances: INSTALLÉES" "SUCCESS" "Green"
    } else {
        Write-StatusMessage "Installation des dépendances..." "LOADING" "Yellow"
        npm install --silent
        if ($LASTEXITCODE -eq 0) {
            Write-StatusMessage "Dépendances: INSTALLÉES" "SUCCESS" "Green"
        } else {
            Write-StatusMessage "Échec installation" "ERROR" "Red"
            exit 1
        }
    }
} else {
    Write-StatusMessage "Dossier frontend non trouvé" "ERROR" "Red"
    exit 1
}

# Étape 5: Informations Phase 5
Write-Host "`n5. INFORMATIONS PHASE 5 - ANALYTICS" -ForegroundColor Yellow
Write-Host "====================================" -ForegroundColor Yellow

Write-Host "🎉 APPLICATION PHASE 5 PRÊTE!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 FONCTIONNALITÉS ANALYTICS DISPONIBLES:" -ForegroundColor Magenta
Write-Host "   • KPI Temps Réel (CA, marge, conversion, panier moyen)" -ForegroundColor White
Write-Host "   • Analytics de Ventes (évolution, top clients, répartition)" -ForegroundColor White
Write-Host "   • Performance Produits (top ventes, catégories)" -ForegroundColor White
Write-Host "   • Segmentation Clients (VIP/Premium/Standard/Nouveau)" -ForegroundColor White
Write-Host "   • Graphiques Interactifs (courbes, barres, secteurs)" -ForegroundColor White
Write-Host "   • Tableaux de Bord Personnalisables" -ForegroundColor White
Write-Host ""
Write-Host "🌐 URLS D'ACCÈS:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3003" -ForegroundColor White
Write-Host "   Analytics: http://localhost:3003/analytics" -ForegroundColor Magenta
Write-Host "   Backend API: http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "🔑 IDENTIFIANTS:" -ForegroundColor Cyan
Write-Host "   Email: admin@demo-tpe.fr" -ForegroundColor White
Write-Host "   Mot de passe: demo123" -ForegroundColor White
Write-Host ""

# Étape 6: Démarrage du Frontend
Write-Host "6. DÉMARRAGE DU FRONTEND ANALYTICS" -ForegroundColor Yellow
Write-Host "===================================" -ForegroundColor Yellow

Write-StatusMessage "Démarrage de Next.js avec Analytics Phase 5..." "LOADING" "Yellow"
Write-Host ""
Write-Host "📱 NAVIGATION DISPONIBLE:" -ForegroundColor Cyan
Write-Host "   Dashboard → Vue d'ensemble générale" -ForegroundColor Gray
Write-Host "   Analytics → KPI et graphiques temps réel" -ForegroundColor Magenta
Write-Host "   Clients → Gestion et segmentation" -ForegroundColor Gray
Write-Host "   Produits → Catalogue et performance" -ForegroundColor Gray
Write-Host "   Commandes → Devis et commandes" -ForegroundColor Gray
Write-Host "   Factures → Facturation et paiements" -ForegroundColor Gray
Write-Host ""
Write-Host "⚡ Appuyez sur Ctrl+C pour arrêter l'application" -ForegroundColor Yellow
Write-Host ""

# Démarrer Next.js
try {
    npm run dev
} catch {
    Write-StatusMessage "Échec du démarrage du frontend" "ERROR" "Red"
}

Write-Host "`n🛑 APPLICATION ARRÊTÉE" -ForegroundColor Yellow
Write-Host "Pour redémarrer la Phase 5:" -ForegroundColor White
Write-Host "   .\start-phase5-analytics.ps1" -ForegroundColor Magenta
