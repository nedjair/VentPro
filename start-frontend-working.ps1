Write-Host "🚀 Demarrage Frontend Next.js - Methode Alternative" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Verification de l'environnement
Write-Host "Verification de l'environnement..." -ForegroundColor Yellow

if (-not (Test-Path "frontend-nextjs-production")) {
    Write-Host "❌ Repertoire frontend non trouve!" -ForegroundColor Red
    exit 1
}

# Nettoyer les processus Node.js existants
Write-Host "Nettoyage des processus existants..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

# Nettoyer le port 3003
$portCheck = netstat -ano | Select-String ":3003"
if ($portCheck) {
    $pid = ($portCheck -split '\s+')[-1]
    taskkill /PID $pid /F 2>$null
}

# Nettoyer le cache Next.js
Write-Host "Nettoyage du cache..." -ForegroundColor Yellow
if (Test-Path "frontend-nextjs-production\.next") {
    Remove-Item -Recurse -Force "frontend-nextjs-production\.next" -ErrorAction SilentlyContinue
}

# Methode 1: Utiliser PowerShell avec chemin complet
Write-Host "Tentative de demarrage..." -ForegroundColor Yellow

try {
    # Changer vers le repertoire frontend
    Push-Location "frontend-nextjs-production"
    
    # Verifier que Next.js est installe
    if (Test-Path "node_modules\.bin\next.cmd") {
        Write-Host "✅ Next.js trouve" -ForegroundColor Green
        
        # Demarrer Next.js
        Write-Host "Demarrage de Next.js sur le port 3003..." -ForegroundColor Cyan
        Write-Host "URL: http://localhost:3003" -ForegroundColor Cyan
        
        # Utiliser Start-Process pour un meilleur controle
        $nextProcess = Start-Process -FilePath "cmd" -ArgumentList "/c", "node_modules\.bin\next.cmd", "dev", "-p", "3003" -PassThru -WindowStyle Hidden
        
        if ($nextProcess) {
            Write-Host "✅ Processus Next.js demarre (PID: $($nextProcess.Id))" -ForegroundColor Green
            
            # Attendre que Next.js soit pret
            Write-Host "Attente du demarrage..." -ForegroundColor Yellow
            $attempts = 0
            $maxAttempts = 20
            
            do {
                Start-Sleep -Seconds 3
                $attempts++
                Write-Host "Tentative $attempts/$maxAttempts..." -ForegroundColor Gray
                
                try {
                    $response = Invoke-WebRequest -Uri "http://localhost:3003" -TimeoutSec 2
                    if ($response.StatusCode -eq 200) {
                        Write-Host "🎉 Next.js operationnel!" -ForegroundColor Green
                        Write-Host "✅ Frontend accessible sur http://localhost:3003" -ForegroundColor Green
                        
                        # Ouvrir dans le navigateur
                        Start-Process "http://localhost:3003"
                        
                        Write-Host "`n📊 Informations du processus:" -ForegroundColor Cyan
                        Write-Host "  PID: $($nextProcess.Id)" -ForegroundColor White
                        Write-Host "  URL: http://localhost:3003" -ForegroundColor White
                        Write-Host "  Status: Operationnel" -ForegroundColor Green
                        
                        Pop-Location
                        exit 0
                    }
                } catch {
                    # Continue la boucle
                }
            } while ($attempts -lt $maxAttempts -and -not $nextProcess.HasExited)
            
            if ($nextProcess.HasExited) {
                Write-Host "❌ Le processus Next.js s'est arrete" -ForegroundColor Red
            } else {
                Write-Host "⚠️ Next.js demarre mais ne repond pas encore" -ForegroundColor Yellow
                Write-Host "Le processus continue en arriere-plan (PID: $($nextProcess.Id))" -ForegroundColor Cyan
                Write-Host "Essayez d'acceder manuellement a http://localhost:3003" -ForegroundColor Cyan
            }
        } else {
            Write-Host "❌ Impossible de demarrer le processus Next.js" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Next.js non trouve dans node_modules" -ForegroundColor Red
        Write-Host "Reinstallation necessaire..." -ForegroundColor Yellow
        
        # Essayer de reinstaller
        npm install --force
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Dependances reinstallees" -ForegroundColor Green
            Write-Host "Relancez le script pour demarrer Next.js" -ForegroundColor Cyan
        }
    }
    
    Pop-Location
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    Pop-Location
}

Write-Host "`n💡 Solutions alternatives:" -ForegroundColor Yellow
Write-Host "1. Verifier les logs dans le repertoire frontend" -ForegroundColor Cyan
Write-Host "2. Essayer manuellement: cd frontend-nextjs-production && npm run dev" -ForegroundColor Cyan
Write-Host "3. Reinstaller les dependances: cd frontend-nextjs-production && npm install --force" -ForegroundColor Cyan
