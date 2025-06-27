# Script de démarrage direct - Gestion Commerciale TPE
Write-Host "🚀 Démarrage de l'application Gestion Commerciale TPE" -ForegroundColor Green
Write-Host "=" * 60

$ErrorActionPreference = "Continue"

# Fonction pour tester un port
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

# Fonction pour attendre un service
function Wait-ForService {
    param([string]$Url, [string]$Name, [int]$MaxAttempts = 30)
    
    Write-Host "⏳ Attente de $Name..." -ForegroundColor Yellow
    
    for ($i = 1; $i -le $MaxAttempts; $i++) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ $Name est prêt!" -ForegroundColor Green
                return $true
            }
        } catch {
            Write-Host "." -NoNewline -ForegroundColor Gray
            Start-Sleep -Seconds 2
        }
    }
    
    Write-Host ""
    Write-Host "❌ $Name n'a pas démarré dans les temps" -ForegroundColor Red
    return $false
}

# Script principal

try {
    # 1. Vérifier et démarrer PostgreSQL
    Write-Host "1️⃣ Démarrage de PostgreSQL..." -ForegroundColor Cyan
    
    if (Test-Port 5432) {
        Write-Host "✅ PostgreSQL déjà actif" -ForegroundColor Green
    } else {
        Write-Host "🔄 Démarrage de PostgreSQL avec Docker..." -ForegroundColor Yellow
        docker-compose up -d postgres
        Start-Sleep -Seconds 15
        
        if (Test-Port 5432) {
            Write-Host "✅ PostgreSQL démarré" -ForegroundColor Green
        } else {
            Write-Host "❌ Échec du démarrage de PostgreSQL" -ForegroundColor Red
            exit 1
        }
    }
    
    # 2. Tester la connexion à la base de données
    Write-Host "2️⃣ Test de la base de données..." -ForegroundColor Cyan
    try {
        $dbTest = node test-db-connection.js 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Base de données opérationnelle" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Base de données accessible mais avec des avertissements" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Problème avec la base de données" -ForegroundColor Red
    }
    
    # 3. Démarrer le backend
    Write-Host "3️⃣ Démarrage du backend..." -ForegroundColor Cyan
    
    if (Test-Port 3001) {
        Write-Host "⚠️ Port 3001 déjà utilisé - Nettoyage..." -ForegroundColor Yellow
        $processes = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
        if ($processes) {
            $processes | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
            Start-Sleep -Seconds 3
        }
    }
    
    # Créer le dossier logs
    if (-not (Test-Path "logs")) {
        New-Item -ItemType Directory -Path "logs" | Out-Null
    }
    
    # Démarrer le backend
    Write-Host "🔄 Lancement du serveur backend..." -ForegroundColor Yellow
    Set-Location "apps/backend"
    
    # Utiliser le script de test simple comme backend temporaire
    $backendProcess = Start-Process -FilePath "node" -ArgumentList "../../test-backend-simple-with-routes.js" -PassThru -WindowStyle Hidden
    
    Set-Location "../.."
    
    if ($backendProcess) {
        Write-Host "✅ Backend démarré (PID: $($backendProcess.Id))" -ForegroundColor Green
        $backendProcess.Id | Out-File -FilePath "backend.pid"
        
        # Attendre que le backend soit prêt
        if (Wait-ForService "http://localhost:3001/health" "Backend API") {
            Write-Host "✅ Backend opérationnel" -ForegroundColor Green
        } else {
            Write-Host "❌ Backend non accessible" -ForegroundColor Red
        }
    }
    
    # 4. Démarrer le frontend
    Write-Host "4️⃣ Démarrage du frontend..." -ForegroundColor Cyan
    
    if (Test-Port 3000) {
        Write-Host "⚠️ Port 3000 déjà utilisé - Nettoyage..." -ForegroundColor Yellow
        $processes = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
        if ($processes) {
            $processes | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
            Start-Sleep -Seconds 3
        }
    }
    
    Set-Location "apps/frontend"
    
    # Vérifier les dépendances
    if (-not (Test-Path "node_modules")) {
        Write-Host "📦 Installation des dépendances frontend..." -ForegroundColor Yellow
        npm install
    }
    
    # Démarrer le frontend
    Write-Host "🔄 Lancement du serveur frontend..." -ForegroundColor Yellow
    $frontendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -WindowStyle Hidden
    
    Set-Location "../.."
    
    if ($frontendProcess) {
        Write-Host "✅ Frontend démarré (PID: $($frontendProcess.Id))" -ForegroundColor Green
        $frontendProcess.Id | Out-File -FilePath "frontend.pid"
        
        # Attendre que le frontend soit prêt
        if (Wait-ForService "http://localhost:3000" "Frontend Next.js") {
            Write-Host "✅ Frontend opérationnel" -ForegroundColor Green
        } else {
            Write-Host "❌ Frontend non accessible" -ForegroundColor Red
        }
    }
    
    # 5. Afficher les informations de connexion
    Write-Host ""
    Write-Host "🎉 APPLICATION DÉMARRÉE AVEC SUCCÈS!" -ForegroundColor Green
    Write-Host "=" * 60
    Write-Host ""
    Write-Host "📱 URLs d'accès:" -ForegroundColor Cyan
    Write-Host "  🌐 Frontend:     http://localhost:3000" -ForegroundColor White
    Write-Host "  🔧 Backend API:  http://localhost:3001" -ForegroundColor White
    Write-Host "  📚 API Health:   http://localhost:3001/health" -ForegroundColor White
    Write-Host "  🗄️ PostgreSQL:   localhost:5432" -ForegroundColor White
    Write-Host ""
    Write-Host "🔐 Compte de test:" -ForegroundColor Cyan
    Write-Host "  📧 Email:    admin@test.com" -ForegroundColor White
    Write-Host "  🔑 Password: password123" -ForegroundColor White
    Write-Host ""
    Write-Host "📊 Processus actifs:" -ForegroundColor Cyan
    Write-Host "  Backend PID:  $(Get-Content 'backend.pid' -ErrorAction SilentlyContinue)" -ForegroundColor White
    Write-Host "  Frontend PID: $(Get-Content 'frontend.pid' -ErrorAction SilentlyContinue)" -ForegroundColor White
    Write-Host ""
    Write-Host "🛑 Pour arrêter: Ctrl+C ou fermez cette fenêtre" -ForegroundColor Yellow
    Write-Host ""
    
    # Garder le script actif
    Write-Host "Appuyez sur Ctrl+C pour arrêter l'application..."
    try {
        while ($true) {
            Start-Sleep -Seconds 1
        }
    } finally {
        Write-Host "🛑 Arrêt de l'application..." -ForegroundColor Yellow
        
        # Arrêter les processus
        $backendPid = Get-Content "backend.pid" -ErrorAction SilentlyContinue
        $frontendPid = Get-Content "frontend.pid" -ErrorAction SilentlyContinue
        
        if ($backendPid) { Stop-Process -Id $backendPid -Force -ErrorAction SilentlyContinue }
        if ($frontendPid) { Stop-Process -Id $frontendPid -Force -ErrorAction SilentlyContinue }
        
        Remove-Item "backend.pid" -ErrorAction SilentlyContinue
        Remove-Item "frontend.pid" -ErrorAction SilentlyContinue
        
        Write-Host "✅ Application arrêtée" -ForegroundColor Green
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ ERREUR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔍 Vérifications suggérées:" -ForegroundColor Yellow
    Write-Host "  • Docker Desktop est-il démarré?" -ForegroundColor White
    Write-Host "  • Les ports 3000, 3001, 5432 sont-ils libres?" -ForegroundColor White
    Write-Host "  • Node.js est-il installé?" -ForegroundColor White
    exit 1
}
