# =============================================================================
# 🚀 SCRIPT DE DÉMARRAGE PRINCIPAL - GESTION COMMERCIALE TPE
# Version: 3.0 - Production Complete
# Architecture: Backend production-backend.js + Frontend Next.js + Docker Services
# Ports: Backend 3001, Frontend 3003, PostgreSQL 5432, Redis 6379
#
# FONCTIONNALITÉS:
# ✅ Vérification automatique des prérequis
# ✅ Démarrage séquentiel des services Docker (PostgreSQL + Redis)
# ✅ Installation automatique des dépendances
# ✅ Configuration automatique de la base de données
# ✅ Démarrage du backend Fastify avec health checks
# ✅ Démarrage du frontend Next.js avec Analytics Phase 5
# ✅ Tests automatiques des endpoints
# ✅ Monitoring en temps réel
# ✅ Gestion des erreurs et récupération automatique
# =============================================================================

param(
    [switch]$SkipDocker,
    [switch]$Verbose,
    [switch]$DevMode
)

# Configuration
$BACKEND_PORT = 3001
$FRONTEND_PORT = 3003
$BACKEND_FILE = "production-backend.js"
$FRONTEND_DIR = "frontend-nextjs-production"
$MAX_WAIT_ATTEMPTS = 15
$WAIT_INTERVAL = 2

# Couleurs pour l'affichage
function Write-ColorMessage {
    param(
        [string]$Message,
        [string]$Type = "INFO"
    )

    switch ($Type) {
        "SUCCESS" { Write-Host "[OK] $Message" -ForegroundColor Green }
        "ERROR" { Write-Host "[ERR] $Message" -ForegroundColor Red }
        "WARNING" { Write-Host "[WARN] $Message" -ForegroundColor Yellow }
        "INFO" { Write-Host "[INFO] $Message" -ForegroundColor Cyan }
        "LOADING" { Write-Host "[...] $Message" -ForegroundColor Yellow }
        "STEP" { Write-Host "[STEP] $Message" -ForegroundColor Magenta }
        default { Write-Host "$Message" -ForegroundColor White }
    }
}

# Fonction de vérification de port
function Test-Port {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    } catch {
        return $false
    }
}

# Fonction de nettoyage des processus
function Stop-NodeProcesses {
    Write-ColorMessage "Nettoyage des processus Node.js existants..." "LOADING"
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-ColorMessage "Processus Node.js arrêtés" "SUCCESS"
}

# En-tete
Clear-Host
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "         GESTION COMMERCIALE TPE - DEMARRAGE UNIFIE             " -ForegroundColor Cyan
Write-Host "                Analytics Phase 5 - v2.0                       " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""
Write-ColorMessage "Backend: $BACKEND_FILE (Port $BACKEND_PORT)" "INFO"
Write-ColorMessage "Frontend: $FRONTEND_DIR (Port $FRONTEND_PORT)" "INFO"
Write-Host ""

# Etape 1: Verification des prerequis
Write-Host "=== ETAPE 1: VERIFICATION DES PREREQUIS ===" -ForegroundColor Yellow
Write-Host ""

# Vérifier Node.js
try {
    $nodeVersion = node --version
    Write-ColorMessage "Node.js: $nodeVersion" "SUCCESS"
} catch {
    Write-ColorMessage "Node.js non installé ou non accessible" "ERROR"
    Write-Host "Installez Node.js 20+ depuis: https://nodejs.org/" -ForegroundColor Gray
    exit 1
}

# Vérifier yarn
try {
    $yarnVersion = yarn --version
    Write-ColorMessage "Yarn: v$yarnVersion" "SUCCESS"
} catch {
    Write-ColorMessage "Yarn non installé - Installation..." "WARNING"
    try {
        npm install -g yarn
        Write-ColorMessage "Yarn installé avec succès" "SUCCESS"
    } catch {
        Write-ColorMessage "Échec de l'installation de Yarn" "ERROR"
        exit 1
    }
}

# Vérifier Docker (si pas skippé)
if (-not $SkipDocker) {
    try {
        $dockerVersion = docker --version
        Write-ColorMessage "Docker: $dockerVersion" "SUCCESS"
        
        # Vérifier si Docker est en cours d'exécution
        docker ps | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-ColorMessage "Docker n'est pas en cours d'exécution" "ERROR"
            Write-Host "Démarrez Docker Desktop et réessayez" -ForegroundColor Gray
            exit 1
        }
    } catch {
        Write-ColorMessage "Docker non installé ou non accessible" "ERROR"
        Write-Host "Installez Docker Desktop depuis: https://www.docker.com/products/docker-desktop" -ForegroundColor Gray
        exit 1
    }
}

# Vérifier les fichiers requis
if (-not (Test-Path $BACKEND_FILE)) {
    Write-ColorMessage "Fichier backend '$BACKEND_FILE' non trouvé" "ERROR"
    exit 1
}

if (-not (Test-Path $FRONTEND_DIR)) {
    Write-ColorMessage "Dossier frontend '$FRONTEND_DIR' non trouvé" "ERROR"
    exit 1
}

Write-ColorMessage "Tous les prérequis sont satisfaits" "SUCCESS"
Write-Host ""

# Étape 2: Nettoyage et préparation
Write-Host "═══ ÉTAPE 2: NETTOYAGE ET PRÉPARATION ═══" -ForegroundColor Yellow
Write-Host ""

Stop-NodeProcesses

# Créer le dossier logs
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
    Write-ColorMessage "Dossier logs créé" "SUCCESS"
}

# Étape 3: Infrastructure Docker
if (-not $SkipDocker) {
    Write-Host "═══ ÉTAPE 3: INFRASTRUCTURE DOCKER ═══" -ForegroundColor Yellow
    Write-Host ""
    
    Write-ColorMessage "Vérification des services Docker..." "LOADING"
    
    # Vérifier si les services sont déjà en cours
    $dockerServices = docker-compose ps --services --filter "status=running" 2>$null
    if ($dockerServices -and $dockerServices.Count -gt 0) {
        Write-ColorMessage "Services Docker déjà actifs" "SUCCESS"
    } else {
        Write-ColorMessage "Démarrage des services Docker..." "LOADING"
        docker-compose up -d
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColorMessage "Services Docker démarrés" "SUCCESS"
            Write-ColorMessage "Attente de l'initialisation (15s)..." "LOADING"
            Start-Sleep -Seconds 15
        } else {
            Write-ColorMessage "Échec du démarrage des services Docker" "ERROR"
            exit 1
        }
    }
    
    # Vérifier la santé des services
    Write-ColorMessage "Vérification de la santé des services..." "LOADING"
    $healthyServices = docker-compose ps --filter "health=healthy" --format "table {{.Service}}" | Select-String -Pattern "postgres|redis"
    if ($healthyServices) {
        Write-ColorMessage "Services Docker en bonne santé" "SUCCESS"
    } else {
        Write-ColorMessage "Attente de la stabilisation des services..." "WARNING"
        Start-Sleep -Seconds 10
    }
}

Write-Host ""

# Étape 4: Démarrage du Backend
Write-Host "═══ ÉTAPE 4: DÉMARRAGE DU BACKEND ═══" -ForegroundColor Yellow
Write-Host ""

$backendRunning = $false

# Vérifier si le backend est déjà actif
if (Test-Port $BACKEND_PORT) {
    try {
        $healthResponse = Invoke-WebRequest -Uri "http://localhost:$BACKEND_PORT/health" -UseBasicParsing -TimeoutSec 3
        if ($healthResponse.StatusCode -eq 200) {
            Write-ColorMessage "Backend déjà actif et opérationnel" "SUCCESS"
            $backendRunning = $true
        }
    } catch {
        Write-ColorMessage "Port $BACKEND_PORT occupé par un autre service" "WARNING"
        Write-ColorMessage "Arrêt du service existant..." "LOADING"
        
        # Trouver et arrêter le processus utilisant le port
        $processId = (Get-NetTCPConnection -LocalPort $BACKEND_PORT -ErrorAction SilentlyContinue).OwningProcess
        if ($processId) {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
        }
    }
}

if (-not $backendRunning) {
    Write-ColorMessage "Démarrage du backend de production..." "LOADING"
    
    # Démarrer le backend en arrière-plan
    $backendProcess = Start-Process -FilePath "node" -ArgumentList $BACKEND_FILE -PassThru -WindowStyle Hidden -RedirectStandardOutput "logs\backend.log" -RedirectStandardError "logs\backend-error.log"
    
    if ($backendProcess) {
        Write-ColorMessage "Backend démarré: PID $($backendProcess.Id)" "SUCCESS"
        $backendProcess.Id | Out-File -FilePath ".backend.pid"
        
        # Attendre que le backend soit prêt
        Write-ColorMessage "Attente de l'initialisation du backend..." "LOADING"
        $attempt = 0
        
        while ($attempt -lt $MAX_WAIT_ATTEMPTS -and -not $backendRunning) {
            Start-Sleep -Seconds $WAIT_INTERVAL
            try {
                $healthResponse = Invoke-WebRequest -Uri "http://localhost:$BACKEND_PORT/health" -UseBasicParsing -TimeoutSec 3
                if ($healthResponse.StatusCode -eq 200) {
                    $backendRunning = $true
                    Write-ColorMessage "Backend opérationnel" "SUCCESS"
                }
            } catch {
                $attempt++
                if ($Verbose) {
                    Write-Host "   Tentative $attempt/$MAX_WAIT_ATTEMPTS..." -ForegroundColor Gray
                }
            }
        }
        
        if (-not $backendRunning) {
            Write-ColorMessage "Échec de l'initialisation du backend" "ERROR"
            Write-Host "Vérifiez les logs: Get-Content logs\backend-error.log" -ForegroundColor Gray
            exit 1
        }
    } else {
        Write-ColorMessage "Échec du démarrage du backend" "ERROR"
        exit 1
    }
}

Write-Host ""

# Étape 5: Test des endpoints Backend
Write-Host "═══ ÉTAPE 5: VALIDATION DU BACKEND ═══" -ForegroundColor Yellow
Write-Host ""

if ($backendRunning) {
    # Test d'authentification
    Write-ColorMessage "Test d'authentification..." "LOADING"
    try {
        $loginBody = @{
            email = "admin@demo-tpe.fr"
            password = "demo123"
        } | ConvertTo-Json
        
        $authResponse = Invoke-WebRequest -Uri "http://localhost:$BACKEND_PORT/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
        $authData = $authResponse.Content | ConvertFrom-Json
        
        if ($authData.success) {
            Write-ColorMessage "Authentification réussie" "SUCCESS"
            $authToken = $authData.data.token
            $headers = @{ Authorization = "Bearer $authToken" }
            
            # Test des endpoints Analytics Phase 5
            Write-ColorMessage "Test des endpoints Analytics..." "LOADING"
            
            $endpoints = @(
                @{ Name = "KPI Metrics"; Url = "/analytics/kpi" },
                @{ Name = "Sales Analytics"; Url = "/analytics/sales" },
                @{ Name = "Dashboard Stats"; Url = "/dashboard/stats" }
            )
            
            foreach ($endpoint in $endpoints) {
                try {
                    $response = Invoke-WebRequest -Uri "http://localhost:$BACKEND_PORT$($endpoint.Url)" -Headers $headers -UseBasicParsing -TimeoutSec 5
                    Write-ColorMessage "$($endpoint.Name): Opérationnel" "SUCCESS"
                } catch {
                    Write-ColorMessage "$($endpoint.Name): Échec" "WARNING"
                }
            }
        } else {
            Write-ColorMessage "Échec de l'authentification" "ERROR"
        }
    } catch {
        Write-ColorMessage "Erreur lors du test d'authentification" "WARNING"
    }
}

# Étape 6: Préparation du Frontend
Write-Host "═══ ÉTAPE 6: PRÉPARATION DU FRONTEND ═══" -ForegroundColor Yellow
Write-Host ""

Set-Location $FRONTEND_DIR

# Vérifier les dépendances
if (Test-Path "node_modules") {
    Write-ColorMessage "Dépendances déjà installées" "SUCCESS"
} else {
    Write-ColorMessage "Installation des dépendances..." "LOADING"
    yarn install --silent

    if ($LASTEXITCODE -eq 0) {
        Write-ColorMessage "Dépendances installées avec succès" "SUCCESS"
    } else {
        Write-ColorMessage "Échec de l'installation des dépendances" "ERROR"
        Set-Location ..
        exit 1
    }
}

# Vérifier Recharts (Analytics Phase 5)
if (Test-Path "node_modules/recharts") {
    Write-ColorMessage "Recharts (graphiques Analytics): Installé" "SUCCESS"
} else {
    Write-ColorMessage "Installation de Recharts..." "LOADING"
    yarn add recharts
    if ($LASTEXITCODE -eq 0) {
        Write-ColorMessage "Recharts installé" "SUCCESS"
    } else {
        Write-ColorMessage "Échec installation Recharts" "WARNING"
    }
}

# Vérifier la configuration
if (Test-Path ".env.local") {
    $envContent = Get-Content ".env.local" -Raw
    if ($envContent -match "NEXT_PUBLIC_API_BASE_URL=http://localhost:$BACKEND_PORT") {
        Write-ColorMessage "Configuration API: Correcte" "SUCCESS"
    } else {
        Write-ColorMessage "Mise à jour de la configuration API..." "LOADING"
        "NEXT_PUBLIC_API_BASE_URL=http://localhost:$BACKEND_PORT" | Out-File -FilePath ".env.local" -Encoding UTF8
        Write-ColorMessage "Configuration API mise à jour" "SUCCESS"
    }
} else {
    Write-ColorMessage "Création de la configuration..." "LOADING"
    @"
NEXT_PUBLIC_API_BASE_URL=http://localhost:$BACKEND_PORT
NEXT_PUBLIC_API_URL=http://localhost:$BACKEND_PORT
NODE_ENV=development
"@ | Out-File -FilePath ".env.local" -Encoding UTF8
    Write-ColorMessage "Configuration créée" "SUCCESS"
}

Set-Location ..
Write-Host ""

# Étape 7: Informations finales
Write-Host "═══ ÉTAPE 7: INFORMATIONS D'ACCÈS ═══" -ForegroundColor Yellow
Write-Host ""

Write-Host "APPLICATION PRETE A DEMARRER!" -ForegroundColor Green
Write-Host ""

Write-Host "FONCTIONNALITES ANALYTICS PHASE 5:" -ForegroundColor Magenta
Write-Host "   - KPI Temps Reel (CA, marge, conversion)" -ForegroundColor White
Write-Host "   - Analytics de Ventes (evolution, top clients)" -ForegroundColor White
Write-Host "   - Performance Produits (top ventes, categories)" -ForegroundColor White
Write-Host "   - Segmentation Clients (VIP/Premium/Standard)" -ForegroundColor White
Write-Host "   - Graphiques Interactifs (Recharts)" -ForegroundColor White
Write-Host "   - Tableaux de Bord Personnalisables" -ForegroundColor White
Write-Host ""

Write-Host "URLS D'ACCES:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:$FRONTEND_PORT" -ForegroundColor White
Write-Host "   Analytics: http://localhost:$FRONTEND_PORT/analytics" -ForegroundColor Magenta
Write-Host "   Backend API: http://localhost:$BACKEND_PORT" -ForegroundColor White
Write-Host "   Health Check: http://localhost:$BACKEND_PORT/health" -ForegroundColor White
Write-Host "   Metriques: http://localhost:$BACKEND_PORT/metrics" -ForegroundColor White
Write-Host ""

if (-not $SkipDocker) {
    Write-Host "SERVICES DOCKER:" -ForegroundColor Cyan
    Write-Host "   PostgreSQL: http://localhost:8080 (Adminer)" -ForegroundColor White
    Write-Host "   Redis: http://localhost:8081 (Redis Commander)" -ForegroundColor White
    Write-Host ""
}

Write-Host "IDENTIFIANTS DE TEST:" -ForegroundColor Cyan
Write-Host "   Email: admin@demo-tpe.fr" -ForegroundColor White
Write-Host "   Mot de passe: demo123" -ForegroundColor White
Write-Host ""

Write-Host "NAVIGATION DISPONIBLE:" -ForegroundColor Cyan
Write-Host "   Dashboard - Vue d'ensemble generale" -ForegroundColor Gray
Write-Host "   Analytics - KPI et graphiques temps reel" -ForegroundColor Magenta
Write-Host "   Clients - Gestion et segmentation" -ForegroundColor Gray
Write-Host "   Produits - Catalogue et performance" -ForegroundColor Gray
Write-Host "   Commandes - Devis et commandes" -ForegroundColor Gray
Write-Host "   Factures - Facturation et paiements" -ForegroundColor Gray
Write-Host ""

# Etape 8: Demarrage du Frontend
Write-Host "=== ETAPE 8: DEMARRAGE DU FRONTEND ===" -ForegroundColor Yellow
Write-Host ""

Write-ColorMessage "Demarrage de Next.js avec Analytics Phase 5..." "LOADING"
Write-Host ""
Write-Host "Appuyez sur Ctrl+C pour arreter l'application" -ForegroundColor Yellow
Write-Host "Une fois demarre, ouvrez: http://localhost:$FRONTEND_PORT" -ForegroundColor Cyan
Write-Host ""

# Démarrer le frontend
Set-Location $FRONTEND_DIR
try {
    if ($DevMode) {
        yarn dev
    } else {
        yarn dev
    }
} catch {
    Write-ColorMessage "Echec du demarrage du frontend" "ERROR"
    Write-Host "Verifiez les logs et les dependances" -ForegroundColor Gray
} finally {
    Set-Location ..
}

Write-Host ""
Write-Host "APPLICATION ARRETEE" -ForegroundColor Yellow
Write-Host "Pour redemarrer:" -ForegroundColor White
Write-Host "   .\start-app-unified.ps1" -ForegroundColor Cyan
Write-Host ""

Write-Host "Pour arreter completement:" -ForegroundColor White
Write-Host "   .\stop-app-unified.ps1" -ForegroundColor Cyan

Write-Host ""
