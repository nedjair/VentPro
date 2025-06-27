# Script de demarrage simple pour l'application de gestion commerciale

param(
    [switch]$Force
)

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERR] $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

Clear-Host
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  GESTION COMMERCIALE TPE - DEMARRAGE" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Verification des prerequis
Write-Info "Verification des prerequis..."

try {
    $nodeVersion = node --version
    Write-Success "Node.js: $nodeVersion"
} catch {
    Write-Error "Node.js non trouve! Installez Node.js 20+"
    exit 1
}

try {
    $npmVersion = npm --version
    Write-Success "npm: v$npmVersion"
} catch {
    Write-Error "npm non trouve!"
    exit 1
}

# Arreter les processus existants si Force
if ($Force) {
    Write-Warning "Arret des processus Node.js existants..."
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
}

# Demarrer Docker si disponible
try {
    docker ps | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Info "Verification des services Docker..."
        $runningContainers = docker ps --format "table {{.Names}}" | Select-String -Pattern "gestion-postgres|gestion-redis"
        if (-not $runningContainers) {
            Write-Info "Demarrage des services Docker..."
            docker-compose up -d
            Start-Sleep -Seconds 10
        }
        Write-Success "Services Docker actifs"
    }
} catch {
    Write-Warning "Docker non disponible - Continuons sans Docker"
}

Write-Host ""
Write-Info "Preparation du backend..."

# Aller dans le dossier backend
Set-Location "apps/backend"

# Installer les dependances si necessaire
if (-not (Test-Path "node_modules")) {
    Write-Info "Installation des dependances backend..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Echec de l'installation des dependances backend"
        exit 1
    }
}

# Generer Prisma
Write-Info "Generation du client Prisma..."
npm run prisma:generate | Out-Null

Write-Info "Demarrage du backend..."
# Demarrer le backend en arriere-plan
$backendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -WindowStyle Hidden
Write-Success "Backend demarre (PID: $($backendProcess.Id))"

# Retour au repertoire racine
Set-Location "../.."

Write-Host ""
Write-Info "Preparation du frontend..."

# Aller dans le dossier frontend
Set-Location "apps/frontend"

# Installer les dependances si necessaire
if (-not (Test-Path "node_modules")) {
    Write-Info "Installation des dependances frontend..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Echec de l'installation des dependances frontend"
        exit 1
    }
}

# Creer/Mettre a jour .env.local
$envContent = @"
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
NODE_ENV=development
"@
$envContent | Out-File -FilePath ".env.local" -Encoding utf8
Write-Success "Configuration frontend mise a jour"

Write-Info "Demarrage du frontend..."
# Demarrer le frontend en arriere-plan
$frontendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -WindowStyle Hidden
Write-Success "Frontend demarre (PID: $($frontendProcess.Id))"

# Retour au repertoire racine
Set-Location "../.."

Write-Host ""
Write-Info "Attente de l'initialisation des services..."
Start-Sleep -Seconds 15

# Test de connectivite
Write-Info "Test de connectivite..."

# Test du frontend
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Success "Frontend accessible sur http://localhost:3000"
    }
} catch {
    Write-Warning "Frontend non accessible - Verifiez les logs"
}

# Test du backend
try {
    $backendResponse = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 5
    if ($backendResponse.StatusCode -eq 200) {
        Write-Success "Backend accessible sur http://localhost:3001"
    }
} catch {
    Write-Warning "Backend non accessible - Verifiez les logs"
}

# Affichage final
Write-Host ""
Write-Host "DEMARRAGE TERMINE" -ForegroundColor Green
Write-Host "=================" -ForegroundColor Green

Write-Host ""
Write-Host "URLs d'acces:" -ForegroundColor Yellow
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Backend API: http://localhost:3001" -ForegroundColor Cyan
Write-Host "  Adminer (DB): http://localhost:8080" -ForegroundColor Cyan

Write-Host ""
Write-Host "Identifiants par defaut:" -ForegroundColor Yellow
Write-Host "  Email: admin@demo-tpe.fr" -ForegroundColor Cyan
Write-Host "  Mot de passe: demo123" -ForegroundColor Cyan

Write-Host ""
Write-Host "Processus:" -ForegroundColor Yellow
Write-Host "  Backend PID: $($backendProcess.Id)" -ForegroundColor Cyan
Write-Host "  Frontend PID: $($frontendProcess.Id)" -ForegroundColor Cyan

Write-Host ""
Write-Success "Application prete!"
Write-Host "Ouvrez http://localhost:3000 dans votre navigateur" -ForegroundColor Green

# Ouvrir automatiquement le navigateur
try {
    Start-Process "http://localhost:3000"
    Write-Success "Navigateur ouvert automatiquement"
} catch {
    Write-Warning "Impossible d'ouvrir le navigateur automatiquement"
}

Write-Host ""
Write-Host "Appuyez sur Ctrl+C pour arreter l'application..." -ForegroundColor Yellow

# Garder le script actif
try {
    while ($true) {
        Start-Sleep -Seconds 30
        
        # Verifier si les processus sont toujours actifs
        if (-not (Get-Process -Id $backendProcess.Id -ErrorAction SilentlyContinue)) {
            Write-Error "Backend arrete de maniere inattendue"
            break
        }
        
        if (-not (Get-Process -Id $frontendProcess.Id -ErrorAction SilentlyContinue)) {
            Write-Error "Frontend arrete de maniere inattendue"
            break
        }
    }
} catch {
    Write-Info "Arret de l'application..."
} finally {
    # Nettoyer les processus
    if (Get-Process -Id $backendProcess.Id -ErrorAction SilentlyContinue) {
        Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if (Get-Process -Id $frontendProcess.Id -ErrorAction SilentlyContinue) {
        Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Success "Application arretee"
}
