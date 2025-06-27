# =============================================================================
# SCRIPT DE DÉMARRAGE - FRONTEND NEXT.JS
# Gestion Commerciale TPE - Connexion au backend de production
# =============================================================================

Write-Host "DEMARRAGE DU FRONTEND NEXT.JS" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host "Frontend: Next.js (Port 3003)" -ForegroundColor Gray
Write-Host "Backend: production-backend.js (Port 3001)" -ForegroundColor Gray
Write-Host ""

# Vérifier les prérequis
Write-Host "1. VERIFICATION DES PREREQUIS" -ForegroundColor Yellow

# Vérifier Node.js
try {
    $nodeVersion = node --version
    Write-Host "OK Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERREUR Node.js non installe" -ForegroundColor Red
    exit 1
}

# Vérifier npm
try {
    $npmVersion = npm --version
    Write-Host "OK npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "ERREUR npm non installe" -ForegroundColor Red
    exit 1
}

# Vérifier que le backend est accessible
Write-Host "`n2. VERIFICATION DU BACKEND" -ForegroundColor Yellow
try {
    $healthCheck = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 5
    if ($healthCheck.StatusCode -eq 200) {
        Write-Host "OK Backend: ACCESSIBLE" -ForegroundColor Green
        Write-Host "   URL: http://localhost:3001" -ForegroundColor Gray
        Write-Host "   Status: $($healthCheck.StatusCode)" -ForegroundColor Gray
    } else {
        Write-Host "ATTENTION Backend: Probleme detecte" -ForegroundColor Yellow
    }
} catch {
    Write-Host "ERREUR Backend: NON ACCESSIBLE" -ForegroundColor Red
    Write-Host "Veuillez demarrer le backend avec: .\start-production-backend.ps1" -ForegroundColor Red
    
    $response = Read-Host "Voulez-vous continuer quand meme? (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        exit 1
    }
}

# Vérifier le dossier frontend
Write-Host "`n3. VERIFICATION DU FRONTEND" -ForegroundColor Yellow
if (Test-Path "frontend-nextjs-production") {
    Write-Host "OK Dossier frontend: TROUVE" -ForegroundColor Green
    Set-Location "frontend-nextjs-production"
} else {
    Write-Host "ERREUR Dossier frontend-nextjs-production non trouve" -ForegroundColor Red
    exit 1
}

# Vérifier les dépendances
if (Test-Path "node_modules") {
    Write-Host "OK Dependencies: INSTALLEES" -ForegroundColor Green
} else {
    Write-Host "ATTENTION Dependencies manquantes - Installation..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERREUR Installation des dependances echouee" -ForegroundColor Red
        exit 1
    }
    Write-Host "OK Dependencies: INSTALLEES" -ForegroundColor Green
}

# Vérifier la configuration
Write-Host "`n4. VERIFICATION DE LA CONFIGURATION" -ForegroundColor Yellow
if (Test-Path ".env.local") {
    $envContent = Get-Content ".env.local" -Raw
    if ($envContent -match "NEXT_PUBLIC_API_BASE_URL=http://localhost:3001") {
        Write-Host "OK Configuration API: CORRECTE" -ForegroundColor Green
        Write-Host "   Backend URL: http://localhost:3001" -ForegroundColor Gray
    } else {
        Write-Host "ATTENTION Configuration API: A VERIFIER" -ForegroundColor Yellow
    }
} else {
    Write-Host "ATTENTION Fichier .env.local non trouve" -ForegroundColor Yellow
}

# Vérifier si le port 3003 est libre
Write-Host "`n5. VERIFICATION DU PORT 3003" -ForegroundColor Yellow
try {
    $portCheck = Get-NetTCPConnection -LocalPort 3003 -ErrorAction SilentlyContinue
    if ($portCheck) {
        Write-Host "ATTENTION Port 3003: OCCUPE" -ForegroundColor Yellow
        Write-Host "Arret du processus existant..." -ForegroundColor Yellow
        
        # Arrêter les processus sur le port 3003
        $processes = Get-Process | Where-Object { $_.ProcessName -eq "node" }
        foreach ($proc in $processes) {
            try {
                $connections = netstat -ano | Select-String ":3003"
                if ($connections -match $proc.Id) {
                    Stop-Process -Id $proc.Id -Force
                    Write-Host "OK Processus $($proc.Id) arrete" -ForegroundColor Green
                }
            } catch {
                # Ignorer les erreurs
            }
        }
        
        Start-Sleep -Seconds 2
    } else {
        Write-Host "OK Port 3003: LIBRE" -ForegroundColor Green
    }
} catch {
    Write-Host "OK Port 3003: LIBRE" -ForegroundColor Green
}

# Démarrer le frontend Next.js
Write-Host "`n6. DEMARRAGE DU FRONTEND NEXT.JS" -ForegroundColor Yellow
Write-Host "=================================" -ForegroundColor Yellow

Write-Host "Demarrage de Next.js en mode developpement..." -ForegroundColor White
Write-Host "   Port: 3003" -ForegroundColor Gray
Write-Host "   Mode: Development" -ForegroundColor Gray
Write-Host "   Backend: http://localhost:3001" -ForegroundColor Gray

# Démarrer Next.js
try {
    Write-Host "`nDemarrage en cours..." -ForegroundColor Yellow
    Write-Host "Appuyez sur Ctrl+C pour arreter le serveur" -ForegroundColor Gray
    Write-Host ""
    
    # Démarrer le serveur de développement
    npm run dev
    
} catch {
    Write-Host "`nERREUR Echec du demarrage du frontend" -ForegroundColor Red
    Write-Host "Verifiez les logs ci-dessus pour plus de details" -ForegroundColor Red
    exit 1
}

Write-Host "`nFRONTEND ARRETE" -ForegroundColor Yellow
