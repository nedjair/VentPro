# Script de demarrage de l'application avec donnees algeriennes
# Version: 1.0 - Compatible avec la structure modulaire apps/

param(
    [switch]$SkipDocker,
    [switch]$Quick,
    [switch]$Help
)

if ($Help) {
    Write-Host ""
    Write-Host "SCRIPT DE DEMARRAGE - GESTION COMMERCIALE ALGERIE" -ForegroundColor Cyan
    Write-Host "=================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "UTILISATION:"
    Write-Host "   .\start-app-algeria.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "OPTIONS:"
    Write-Host "   -SkipDocker    Ignorer le demarrage Docker (services externes)"
    Write-Host "   -Quick         Demarrage rapide sans tests approfondis"
    Write-Host "   -Help          Afficher cette aide"
    Write-Host ""
    exit 0
}

Write-Host ""
Write-Host "🇩🇿 DEMARRAGE APPLICATION GESTION COMMERCIALE ALGERIE" -ForegroundColor Magenta
Write-Host "======================================================" -ForegroundColor Magenta
Write-Host ""

# Verification des prerequis
Write-Host "Verification des prerequis..." -ForegroundColor Cyan

# Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js non installe" -ForegroundColor Red
    exit 1
}

# pnpm
try {
    $pnpmVersion = pnpm --version
    Write-Host "✅ pnpm: v$pnpmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ pnpm non installe - Installation..." -ForegroundColor Yellow
    npm install -g pnpm
    Write-Host "✅ pnpm installe" -ForegroundColor Green
}

# Docker (si requis)
if (-not $SkipDocker) {
    try {
        docker ps | Out-Null
        Write-Host "✅ Docker: Operationnel" -ForegroundColor Green
    } catch {
        Write-Host "❌ Docker non accessible" -ForegroundColor Red
        Write-Host "Demarrez Docker Desktop ou utilisez -SkipDocker" -ForegroundColor Yellow
        exit 1
    }
}

# Verification de la structure
Write-Host ""
Write-Host "Verification de la structure du projet..." -ForegroundColor Cyan

$requiredPaths = @(
    "apps/backend",
    "apps/frontend", 
    "packages/database"
)

foreach ($path in $requiredPaths) {
    if (Test-Path $path) {
        Write-Host "✅ $path" -ForegroundColor Green
    } else {
        Write-Host "❌ $path MANQUANT" -ForegroundColor Red
        exit 1
    }
}

# Creer le repertoire logs
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
}

# Demarrage des services Docker
if (-not $SkipDocker) {
    Write-Host ""
    Write-Host "Demarrage des services Docker..." -ForegroundColor Cyan
    
    # Verifier si les services sont deja actifs
    $runningContainers = docker ps --format "{{.Names}}" | Where-Object { $_ -match "gestion-" }
    if ($runningContainers) {
        Write-Host "✅ Services Docker deja actifs" -ForegroundColor Green
    } else {
        docker-compose up -d
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Services Docker demarres" -ForegroundColor Green
            Write-Host "   Attente de l'initialisation (15s)..." -ForegroundColor Yellow
            Start-Sleep -Seconds 15
        } else {
            Write-Host "❌ Echec du demarrage Docker" -ForegroundColor Red
            exit 1
        }
    }
}

# Installation des dependances
Write-Host ""
Write-Host "Installation des dependances..." -ForegroundColor Cyan
pnpm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dependances installees" -ForegroundColor Green
} else {
    Write-Host "❌ Echec de l'installation des dependances" -ForegroundColor Red
    exit 1
}

# Configuration de la base de donnees
Write-Host ""
Write-Host "Configuration de la base de donnees..." -ForegroundColor Cyan
Set-Location "packages/database"

# Generer le client Prisma
Write-Host "   Generation du client Prisma..." -ForegroundColor Yellow
npm run db:generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de la generation Prisma" -ForegroundColor Red
    Set-Location "../.."
    exit 1
}

# Synchroniser le schema
Write-Host "   Synchronisation du schema..." -ForegroundColor Yellow
npm run db:push
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de la synchronisation" -ForegroundColor Red
    Set-Location "../.."
    exit 1
}

Write-Host "✅ Base de donnees configuree" -ForegroundColor Green
Set-Location "../.."

# Demarrage du backend
Write-Host ""
Write-Host "Demarrage du backend..." -ForegroundColor Cyan

# Verifier si le port 3001 est libre
$backendPort = 3001
try {
    $connection = New-Object System.Net.Sockets.TcpClient
    $connection.Connect("localhost", $backendPort)
    $connection.Close()
    Write-Host "⚠️  Port $backendPort deja utilise - Nettoyage..." -ForegroundColor Yellow
    $processId = (Get-NetTCPConnection -LocalPort $backendPort -ErrorAction SilentlyContinue).OwningProcess
    if ($processId) {
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
    }
} catch {
    # Port libre, c'est parfait
}

# Demarrer le backend
Set-Location "apps/backend"
$backendProcess = Start-Process -FilePath "powershell" -ArgumentList "-Command", "pnpm run dev" -PassThru -WindowStyle Hidden -RedirectStandardOutput "../../logs/backend.log" -RedirectStandardError "../../logs/backend-error.log"

if ($backendProcess) {
    Write-Host "✅ Backend demarre: PID $($backendProcess.Id)" -ForegroundColor Green
    $backendProcess.Id | Out-File -FilePath "../../.backend.pid"
    
    # Attendre que le backend soit pret
    Write-Host "   Attente de l'initialisation du backend..." -ForegroundColor Yellow
    $attempt = 0
    $maxAttempts = 20
    $backendReady = $false
    
    while ($attempt -lt $maxAttempts -and -not $backendReady) {
        Start-Sleep -Seconds 3
        try {
            $healthResponse = Invoke-WebRequest -Uri "http://localhost:$backendPort/health" -UseBasicParsing -TimeoutSec 3
            if ($healthResponse.StatusCode -eq 200) {
                $backendReady = $true
                Write-Host "✅ Backend operationnel" -ForegroundColor Green
            }
        } catch {
            $attempt++
            Write-Host "   Tentative $attempt/$maxAttempts..." -ForegroundColor Gray
        }
    }
    
    if (-not $backendReady) {
        Write-Host "❌ Backend ne repond pas apres $($maxAttempts * 3) secondes" -ForegroundColor Red
        Write-Host "Verifiez les logs: Get-Content logs/backend-error.log" -ForegroundColor Yellow
        Set-Location "../.."
        exit 1
    }
} else {
    Write-Host "❌ Echec du demarrage du backend" -ForegroundColor Red
    Set-Location "../.."
    exit 1
}

Set-Location "../.."

# Demarrage du frontend
Write-Host ""
Write-Host "Demarrage du frontend..." -ForegroundColor Cyan

# Verifier si le port 3000 est libre
$frontendPort = 3000
try {
    $connection = New-Object System.Net.Sockets.TcpClient
    $connection.Connect("localhost", $frontendPort)
    $connection.Close()
    Write-Host "⚠️  Port $frontendPort deja utilise - Nettoyage..." -ForegroundColor Yellow
    $processId = (Get-NetTCPConnection -LocalPort $frontendPort -ErrorAction SilentlyContinue).OwningProcess
    if ($processId) {
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
    }
} catch {
    # Port libre, c'est parfait
}

# Demarrer le frontend
Set-Location "apps/frontend"
$frontendProcess = Start-Process -FilePath "powershell" -ArgumentList "-Command", "pnpm run dev" -PassThru -WindowStyle Hidden -RedirectStandardOutput "../../logs/frontend.log" -RedirectStandardError "../../logs/frontend-error.log"

if ($frontendProcess) {
    Write-Host "✅ Frontend demarre: PID $($frontendProcess.Id)" -ForegroundColor Green
    $frontendProcess.Id | Out-File -FilePath "../../.frontend.pid"
    
    # Attendre que le frontend soit pret
    Write-Host "   Attente de l'initialisation du frontend..." -ForegroundColor Yellow
    $attempt = 0
    $maxAttempts = 20
    $frontendReady = $false
    
    while ($attempt -lt $maxAttempts -and -not $frontendReady) {
        Start-Sleep -Seconds 3
        try {
            $frontendResponse = Invoke-WebRequest -Uri "http://localhost:$frontendPort" -UseBasicParsing -TimeoutSec 3
            if ($frontendResponse.StatusCode -eq 200) {
                $frontendReady = $true
                Write-Host "✅ Frontend operationnel" -ForegroundColor Green
            }
        } catch {
            $attempt++
            Write-Host "   Tentative $attempt/$maxAttempts..." -ForegroundColor Gray
        }
    }
    
    if (-not $frontendReady) {
        Write-Host "❌ Frontend ne repond pas apres $($maxAttempts * 3) secondes" -ForegroundColor Red
        Write-Host "Verifiez les logs: Get-Content logs/frontend-error.log" -ForegroundColor Yellow
        Set-Location "../.."
        exit 1
    }
} else {
    Write-Host "❌ Echec du demarrage du frontend" -ForegroundColor Red
    Set-Location "../.."
    exit 1
}

Set-Location "../.."

# Tests rapides (si pas en mode Quick)
if (-not $Quick) {
    Write-Host ""
    Write-Host "Tests de l'application..." -ForegroundColor Cyan
    
    # Test d'authentification avec les donnees algeriennes
    try {
        $loginBody = @{
            email = "admin@technocommerce.dz"
            password = "demo123"
        } | ConvertTo-Json
        
        $authResponse = Invoke-WebRequest -Uri "http://localhost:3001/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
        $authData = $authResponse.Content | ConvertFrom-Json
        
        if ($authData.success) {
            Write-Host "✅ Authentification avec donnees algeriennes: OK" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Authentification: Echec" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️  Test d'authentification: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Informations finales
Write-Host ""
Write-Host "🎉 APPLICATION DEMARREE AVEC SUCCES!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Write-Host "📱 URLs d'acces:" -ForegroundColor Blue
Write-Host "   🌐 Application Frontend : http://localhost:3000" -ForegroundColor White
Write-Host "   🔧 API Backend         : http://localhost:3001" -ForegroundColor White
Write-Host "   📚 Documentation API   : http://localhost:3001/docs" -ForegroundColor White
if (-not $SkipDocker) {
    Write-Host "   🗄️  Base de donnees     : http://localhost:8080 (Adminer)" -ForegroundColor White
    Write-Host "   🔴 Cache Redis         : http://localhost:8081 (Redis Commander)" -ForegroundColor White
}
Write-Host ""
Write-Host "🔐 Comptes de test algeriens:" -ForegroundColor Blue
Write-Host "   👑 Admin    : admin@technocommerce.dz / demo123" -ForegroundColor White
Write-Host "   👨‍💼 Manager  : manager@technocommerce.dz / demo123" -ForegroundColor White
Write-Host "   👨‍💻 Employe  : employee@technocommerce.dz / demo123" -ForegroundColor White
Write-Host ""
Write-Host "💰 Donnees algeriennes:" -ForegroundColor Blue
Write-Host "   • Prix en Dinar Algerien (DZD)" -ForegroundColor White
Write-Host "   • Entreprises et clients algeriens" -ForegroundColor White
Write-Host "   • Adresses dans les wilayas algeriennes" -ForegroundColor White
Write-Host "   • Numeros de telephone algeriens (+213)" -ForegroundColor White
Write-Host ""
Write-Host "📝 Logs:" -ForegroundColor Blue
Write-Host "   Backend  : Get-Content logs/backend.log -Wait" -ForegroundColor White
Write-Host "   Frontend : Get-Content logs/frontend.log -Wait" -ForegroundColor White
Write-Host ""
Write-Host "🛑 Pour arreter l'application:" -ForegroundColor Blue
Write-Host "   Get-Process -Name node | Stop-Process -Force" -ForegroundColor White
if (-not $SkipDocker) {
    Write-Host "   docker-compose down" -ForegroundColor White
}
Write-Host ""
Write-Host "L'application est maintenant prete a etre utilisee!" -ForegroundColor Green
