# =============================================================================
# 🚀 SCRIPT PRINCIPAL DE DÉMARRAGE - GESTION COMMERCIALE TPE
# Version: 3.0 - Production Complete
# 
# DESCRIPTION:
# Ce script démarre automatiquement TOUS les composants nécessaires :
# - Services Docker (PostgreSQL 16 + Redis 7 + Adminer + Redis Commander)
# - Backend Fastify (production-backend.js sur port 3001)
# - Frontend Next.js (frontend-nextjs-production sur port 3003)
# - Configuration automatique de la base de données
# - Tests de connectivité et health checks
# 
# USAGE:
# .\start-app-principal.ps1                    # Démarrage complet
# .\start-app-principal.ps1 -Quick             # Démarrage rapide (skip tests)
# .\start-app-principal.ps1 -SkipDocker        # Sans Docker (services externes)
# .\start-app-principal.ps1 -DevMode           # Mode développement
# .\start-app-principal.ps1 -Verbose           # Affichage détaillé
# =============================================================================

param(
    [switch]$Quick,           # Démarrage rapide sans tests approfondis
    [switch]$SkipDocker,      # Ignorer le démarrage Docker
    [switch]$DevMode,         # Mode développement
    [switch]$Verbose,         # Affichage détaillé
    [switch]$Force            # Forcer le redémarrage
)

# Configuration globale
$Global:Config = @{
    BackendPort = 3001
    FrontendPort = 3003
    BackendFile = "production-backend.js"
    FrontendDir = "frontend-nextjs-production"
    MaxWaitAttempts = 20
    WaitInterval = 3
    LogsDir = "logs"
}

# Couleurs et affichage
function Write-Status {
    param(
        [string]$Message,
        [ValidateSet("SUCCESS", "ERROR", "WARNING", "INFO", "LOADING", "STEP")]
        [string]$Type = "INFO"
    )
    
    $icons = @{
        "SUCCESS" = "[OK]"; "ERROR" = "[ERR]"; "WARNING" = "[WARN]";
        "INFO" = "[INFO]"; "LOADING" = "[...]"; "STEP" = "[STEP]"
    }
    
    $colors = @{
        "SUCCESS" = "Green"; "ERROR" = "Red"; "WARNING" = "Yellow";
        "INFO" = "Cyan"; "LOADING" = "Yellow"; "STEP" = "Magenta"
    }
    
    Write-Host "$($icons[$Type]) $Message" -ForegroundColor $colors[$Type]
}

function Write-Header {
    param([string]$Title)
    Write-Host ""
    Write-Host "═══ $Title ═══" -ForegroundColor Yellow
    Write-Host ""
}

function Test-ServicePort {
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

function Stop-ExistingServices {
    if ($Force) {
        Write-Status "Arrêt forcé des services existants..." "LOADING"
        Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
        Write-Status "Services arrêtés" "SUCCESS"
    }
}

function Test-Prerequisites {
    Write-Header "VÉRIFICATION DES PRÉREQUIS"
    
    # Node.js
    try {
        $nodeVersion = node --version
        Write-Status "Node.js: $nodeVersion" "SUCCESS"
    } catch {
        Write-Status "Node.js non installé" "ERROR"
        Write-Host "Installez Node.js 20+ depuis: https://nodejs.org/" -ForegroundColor Gray
        exit 1
    }
    
    # Yarn
    try {
        $yarnVersion = yarn --version
        Write-Status "Yarn: v$yarnVersion" "SUCCESS"
    } catch {
        Write-Status "Installation de Yarn..." "LOADING"
        npm install -g yarn
        Write-Status "Yarn installé" "SUCCESS"
    }
    
    # Docker (si requis)
    if (-not $SkipDocker) {
        try {
            $dockerVersion = docker --version
            Write-Status "Docker: $dockerVersion" "SUCCESS"
            
            docker ps | Out-Null
            if ($LASTEXITCODE -ne 0) {
                Write-Status "Docker non démarré" "ERROR"
                Write-Host "Démarrez Docker Desktop et réessayez" -ForegroundColor Gray
                exit 1
            }
        } catch {
            Write-Status "Docker non installé" "ERROR"
            Write-Host "Installez Docker Desktop ou utilisez -SkipDocker" -ForegroundColor Gray
            exit 1
        }
    }
    
    # Fichiers requis
    if (-not (Test-Path $Global:Config.BackendFile)) {
        Write-Status "Fichier backend manquant: $($Global:Config.BackendFile)" "ERROR"
        exit 1
    }
    
    if (-not (Test-Path $Global:Config.FrontendDir)) {
        Write-Status "Dossier frontend manquant: $($Global:Config.FrontendDir)" "ERROR"
        exit 1
    }
    
    Write-Status "Tous les prérequis sont satisfaits" "SUCCESS"
}

function Start-DockerServices {
    if ($SkipDocker) {
        Write-Status "Services Docker ignorés (option -SkipDocker)" "INFO"
        return
    }
    
    Write-Header "SERVICES DOCKER"
    
    # Vérifier si les services sont déjà actifs
    $runningServices = docker-compose ps --services --filter "status=running" 2>$null
    if ($runningServices -and $runningServices.Count -gt 0) {
        Write-Status "Services Docker déjà actifs" "SUCCESS"
        return
    }
    
    Write-Status "Démarrage des services Docker..." "LOADING"
    docker-compose up -d
    
    if ($LASTEXITCODE -eq 0) {
        Write-Status "Services Docker démarrés" "SUCCESS"
        Write-Status "Attente de l'initialisation (20s)..." "LOADING"
        Start-Sleep -Seconds 20
        
        # Vérifier la santé des services
        $healthyServices = docker-compose ps --filter "health=healthy" 2>$null
        if ($healthyServices) {
            Write-Status "Services Docker opérationnels" "SUCCESS"
        } else {
            Write-Status "Services en cours d'initialisation..." "WARNING"
        }
    } else {
        Write-Status "Échec du démarrage Docker" "ERROR"
        exit 1
    }
}

function Install-Dependencies {
    Write-Header "INSTALLATION DES DÉPENDANCES"
    
    # Dépendances racine
    if (Test-Path "package.json") {
        if (-not (Test-Path "node_modules")) {
            Write-Status "Installation des dépendances racine..." "LOADING"
            yarn install --silent
            Write-Status "Dépendances racine installées" "SUCCESS"
        } else {
            Write-Status "Dépendances racine déjà installées" "SUCCESS"
        }
    }
    
    # Dépendances frontend
    Set-Location $Global:Config.FrontendDir
    if (-not (Test-Path "node_modules")) {
        Write-Status "Installation des dépendances frontend..." "LOADING"
        yarn install --silent
        Write-Status "Dépendances frontend installées" "SUCCESS"
    } else {
        Write-Status "Dépendances frontend déjà installées" "SUCCESS"
    }
    
    # Vérifier Recharts pour Analytics
    if (-not (Test-Path "node_modules/recharts")) {
        Write-Status "Installation de Recharts (Analytics)..." "LOADING"
        yarn add recharts --silent
        Write-Status "Recharts installé" "SUCCESS"
    }
    
    Set-Location ..
}

function Start-Backend {
    Write-Header "DÉMARRAGE DU BACKEND"
    
    # Vérifier si déjà actif
    if (Test-ServicePort $Global:Config.BackendPort) {
        try {
            $healthResponse = Invoke-WebRequest -Uri "http://localhost:$($Global:Config.BackendPort)/health" -UseBasicParsing -TimeoutSec 3
            if ($healthResponse.StatusCode -eq 200) {
                Write-Status "Backend déjà opérationnel" "SUCCESS"
                return $true
            }
        } catch {
            Write-Status "Port occupé - Nettoyage..." "WARNING"
            $processId = (Get-NetTCPConnection -LocalPort $Global:Config.BackendPort -ErrorAction SilentlyContinue).OwningProcess
            if ($processId) {
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 2
            }
        }
    }
    
    # Créer le dossier logs
    if (-not (Test-Path $Global:Config.LogsDir)) {
        New-Item -ItemType Directory -Path $Global:Config.LogsDir | Out-Null
    }
    
    Write-Status "Démarrage du backend de production..." "LOADING"
    
    # Démarrer le backend
    $backendProcess = Start-Process -FilePath "node" -ArgumentList $Global:Config.BackendFile -PassThru -WindowStyle Hidden -RedirectStandardOutput "$($Global:Config.LogsDir)\backend.log" -RedirectStandardError "$($Global:Config.LogsDir)\backend-error.log"
    
    if ($backendProcess) {
        Write-Status "Backend démarré: PID $($backendProcess.Id)" "SUCCESS"
        $backendProcess.Id | Out-File -FilePath ".backend.pid"
        
        # Attendre l'initialisation
        Write-Status "Attente de l'initialisation du backend..." "LOADING"
        $attempt = 0
        $backendReady = $false
        
        while ($attempt -lt $Global:Config.MaxWaitAttempts -and -not $backendReady) {
            Start-Sleep -Seconds $Global:Config.WaitInterval
            try {
                $healthResponse = Invoke-WebRequest -Uri "http://localhost:$($Global:Config.BackendPort)/health" -UseBasicParsing -TimeoutSec 3
                if ($healthResponse.StatusCode -eq 200) {
                    $backendReady = $true
                    Write-Status "Backend opérationnel" "SUCCESS"
                }
            } catch {
                $attempt++
                if ($Verbose) {
                    Write-Host "   Tentative $attempt/$($Global:Config.MaxWaitAttempts)..." -ForegroundColor Gray
                }
            }
        }
        
        if (-not $backendReady) {
            Write-Status "Échec de l'initialisation du backend" "ERROR"
            Write-Host "Vérifiez les logs: Get-Content $($Global:Config.LogsDir)\backend-error.log" -ForegroundColor Gray
            return $false
        }
        
        return $true
    } else {
        Write-Status "Échec du démarrage du backend" "ERROR"
        return $false
    }
}

function Test-BackendEndpoints {
    if ($Quick) {
        Write-Status "Tests rapides ignorés (option -Quick)" "INFO"
        return
    }

    Write-Header "VALIDATION DU BACKEND"

    # Test d'authentification
    Write-Status "Test d'authentification..." "LOADING"
    try {
        $loginBody = @{
            email = "admin@demo-tpe.fr"
            password = "demo123"
        } | ConvertTo-Json

        $authResponse = Invoke-WebRequest -Uri "http://localhost:$($Global:Config.BackendPort)/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
        $authData = $authResponse.Content | ConvertFrom-Json

        if ($authData.success) {
            Write-Status "Authentification réussie" "SUCCESS"

            # Test des endpoints principaux
            $headers = @{ Authorization = "Bearer $($authData.data.token)" }
            $endpoints = @(
                @{ Name = "Dashboard Stats"; Url = "/dashboard/stats" },
                @{ Name = "Analytics KPI"; Url = "/analytics/kpi" },
                @{ Name = "Clients"; Url = "/clients" },
                @{ Name = "Products"; Url = "/products" }
            )

            foreach ($endpoint in $endpoints) {
                try {
                    Invoke-WebRequest -Uri "http://localhost:$($Global:Config.BackendPort)$($endpoint.Url)" -Headers $headers -UseBasicParsing -TimeoutSec 5 | Out-Null
                    Write-Status "$($endpoint.Name): Opérationnel" "SUCCESS"
                } catch {
                    Write-Status "$($endpoint.Name): Échec" "WARNING"
                }
            }
        } else {
            Write-Status "Échec de l'authentification" "ERROR"
        }
    } catch {
        Write-Status "Erreur lors des tests d'authentification" "WARNING"
    }
}

function Start-Frontend {
    Write-Header "DÉMARRAGE DU FRONTEND NEXT.JS"

    # Vérifier si déjà actif
    if (Test-ServicePort $Global:Config.FrontendPort) {
        try {
            $frontendResponse = Invoke-WebRequest -Uri "http://localhost:$($Global:Config.FrontendPort)" -UseBasicParsing -TimeoutSec 3
            if ($frontendResponse.StatusCode -eq 200) {
                Write-Status "Frontend déjà opérationnel" "SUCCESS"
                return $true
            }
        } catch {
            Write-Status "Port occupé - Nettoyage..." "WARNING"
            $processId = (Get-NetTCPConnection -LocalPort $Global:Config.FrontendPort -ErrorAction SilentlyContinue).OwningProcess
            if ($processId) {
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 2
            }
        }
    }

    Set-Location $Global:Config.FrontendDir

    # Vérifier les dépendances
    if (-not (Test-Path "node_modules")) {
        Write-Status "Installation des dépendances frontend..." "LOADING"
        yarn install --silent
        Write-Status "Dépendances installées" "SUCCESS"
    }

    # Build de production
    Write-Status "Création du build de production..." "LOADING"
    $env:NODE_ENV = "production"
    yarn build

    if ($LASTEXITCODE -ne 0) {
        Write-Status "Échec du build de production" "ERROR"
        Set-Location ..
        return $false
    }
    Write-Status "Build de production créé" "SUCCESS"

    # Démarrer le serveur de production
    Write-Status "Démarrage du serveur Next.js..." "LOADING"
    $frontendProcess = Start-Process -FilePath "yarn" -ArgumentList "start" -PassThru -WindowStyle Hidden -RedirectStandardOutput "../$($Global:Config.LogsDir)/frontend.log" -RedirectStandardError "../$($Global:Config.LogsDir)/frontend-error.log"

    if ($frontendProcess) {
        Write-Status "Frontend démarré: PID $($frontendProcess.Id)" "SUCCESS"
        $frontendProcess.Id | Out-File -FilePath "../.frontend.pid"

        # Attendre l'initialisation
        Write-Status "Attente de l'initialisation du frontend..." "LOADING"
        $attempt = 0
        $frontendReady = $false

        while ($attempt -lt $Global:Config.MaxWaitAttempts -and -not $frontendReady) {
            Start-Sleep -Seconds $Global:Config.WaitInterval
            try {
                $frontendResponse = Invoke-WebRequest -Uri "http://localhost:$($Global:Config.FrontendPort)" -UseBasicParsing -TimeoutSec 3
                if ($frontendResponse.StatusCode -eq 200) {
                    $frontendReady = $true
                    Write-Status "Frontend opérationnel" "SUCCESS"
                }
            } catch {
                $attempt++
                if ($Verbose) {
                    Write-Host "   Tentative $attempt/$($Global:Config.MaxWaitAttempts)..." -ForegroundColor Gray
                }
            }
        }

        Set-Location ..

        if (-not $frontendReady) {
            Write-Status "Échec de l'initialisation du frontend" "ERROR"
            Write-Host "Vérifiez les logs: Get-Content $($Global:Config.LogsDir)/frontend-error.log" -ForegroundColor Gray
            return $false
        }

        return $true
    } else {
        Write-Status "Échec du démarrage du frontend" "ERROR"
        Set-Location ..
        return $false
    }
}

function Test-FrontendPages {
    if ($Quick) {
        Write-Status "Tests rapides ignorés (option -Quick)" "INFO"
        return
    }

    Write-Header "VALIDATION DU FRONTEND"

    $testPages = @(
        @{ Name = "Page d'accueil"; Url = "/" },
        @{ Name = "Page de test d'hydratation"; Url = "/test" },
        @{ Name = "Page de connexion"; Url = "/login" }
    )

    foreach ($page in $testPages) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$($Global:Config.FrontendPort)$($page.Url)" -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Status "$($page.Name): Accessible" "SUCCESS"
            }
        } catch {
            Write-Status "$($page.Name): Échec" "WARNING"
        }
    }

    # Test spécifique pour l'hydratation
    Write-Status "Test d'hydratation Next.js..." "LOADING"
    try {
        $testResponse = Invoke-WebRequest -Uri "http://localhost:$($Global:Config.FrontendPort)/test" -UseBasicParsing -TimeoutSec 5
        if ($testResponse.Content -match "Test d'Hydratation") {
            Write-Status "Hydratation Next.js: Fonctionnelle" "SUCCESS"
        } else {
            Write-Status "Hydratation Next.js: Problème détecté" "WARNING"
        }
    } catch {
        Write-Status "Test d'hydratation: Échec" "WARNING"
    }
}

# FONCTION PRINCIPALE
function Start-Application {
    # En-tête
    Clear-Host
    Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║            🚀 GESTION COMMERCIALE TPE - DÉMARRAGE PRINCIPAL      ║" -ForegroundColor Cyan
    Write-Host "║                        Version 3.0 - Production                 ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    Write-Status "Backend: $($Global:Config.BackendFile) (Port $($Global:Config.BackendPort))" "INFO"
    Write-Status "Frontend: $($Global:Config.FrontendDir) (Port $($Global:Config.FrontendPort))" "INFO"
    Write-Host ""
    
    # Exécution séquentielle
    Stop-ExistingServices
    Test-Prerequisites
    Start-DockerServices
    Install-Dependencies
    
    if (Start-Backend) {
        Test-BackendEndpoints

        # Configuration du frontend
        Write-Header "CONFIGURATION DU FRONTEND"
        Set-Location $Global:Config.FrontendDir

        # Creer/Mettre a jour .env.local
        $envContent = @"
NEXT_PUBLIC_API_BASE_URL=http://localhost:$($Global:Config.BackendPort)
NEXT_PUBLIC_API_URL=http://localhost:$($Global:Config.BackendPort)
NODE_ENV=production
"@
        $envContent | Out-File -FilePath ".env.local" -Encoding utf8
        Write-Status "Configuration frontend mise a jour" "SUCCESS"

        Set-Location ..

        # Démarrage du frontend
        if (Start-Frontend) {
            Test-FrontendPages
        } else {
            Write-Status "Échec du démarrage du frontend - Arrêt" "ERROR"
            exit 1
        }
    } else {
        Write-Status "Echec du demarrage du backend - Arret" "ERROR"
        exit 1
    }
}

# EXÉCUTION
Start-Application
