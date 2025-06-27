Write-Host "🔍 Demarrage Next.js avec Debug" -ForegroundColor Green
Write-Host "===============================" -ForegroundColor Green

# Aller dans le repertoire frontend
Set-Location "frontend-nextjs-production"

# Nettoyer le cache
Write-Host "Nettoyage du cache..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
    Write-Host "✅ Cache .next supprime" -ForegroundColor Green
}

# Verifier le port
Write-Host "Verification du port 3003..." -ForegroundColor Yellow
$portCheck = netstat -ano | Select-String ":3003"
if ($portCheck) {
    Write-Host "⚠️ Port 3003 encore occupe, liberation..." -ForegroundColor Yellow
    $pid = ($portCheck -split '\s+')[-1]
    taskkill /PID $pid /F
    Start-Sleep -Seconds 2
}
Write-Host "✅ Port 3003 libre" -ForegroundColor Green

# Verifier les dependances critiques
Write-Host "Verification des dependances..." -ForegroundColor Yellow
if (Test-Path "node_modules/next") {
    Write-Host "✅ Next.js installe" -ForegroundColor Green
} else {
    Write-Host "❌ Next.js manquant, installation..." -ForegroundColor Red
    npm install next react react-dom
}

if (Test-Path "node_modules/react") {
    Write-Host "✅ React installe" -ForegroundColor Green
} else {
    Write-Host "❌ React manquant" -ForegroundColor Red
}

# Demarrer avec logs detailles
Write-Host "Demarrage de Next.js avec logs..." -ForegroundColor Yellow
Write-Host "Commande: npm run dev" -ForegroundColor Cyan

# Utiliser cmd pour capturer les erreurs
$logFile = "nextjs-debug.log"
$errorFile = "nextjs-error.log"

Write-Host "Logs sauvegardes dans: $logFile et $errorFile" -ForegroundColor Cyan

# Demarrer le processus avec redirection
$process = Start-Process -FilePath "cmd" -ArgumentList "/c", "npm run dev > $logFile 2> $errorFile" -PassThru -NoNewWindow

if ($process) {
    Write-Host "✅ Processus demarre (PID: $($process.Id))" -ForegroundColor Green
    
    # Attendre un peu puis verifier les logs
    Start-Sleep -Seconds 5
    
    # Lire les logs d'erreur
    if (Test-Path $errorFile) {
        $errorContent = Get-Content $errorFile -Raw
        if ($errorContent -and $errorContent.Trim() -ne "") {
            Write-Host "`n❌ Erreurs detectees:" -ForegroundColor Red
            Write-Host $errorContent -ForegroundColor Red
        }
    }
    
    # Lire les logs normaux
    if (Test-Path $logFile) {
        $logContent = Get-Content $logFile -Raw
        if ($logContent -and $logContent.Trim() -ne "") {
            Write-Host "`n📋 Logs de demarrage:" -ForegroundColor Cyan
            Write-Host $logContent -ForegroundColor White
        }
    }
    
    # Tester la connectivite
    Write-Host "`nTest de connectivite..." -ForegroundColor Yellow
    $attempts = 0
    $maxAttempts = 10
    
    do {
        Start-Sleep -Seconds 3
        $attempts++
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3003" -TimeoutSec 3
            if ($response.StatusCode -eq 200) {
                Write-Host "🎉 Next.js operationnel sur http://localhost:3003" -ForegroundColor Green
                
                # Ouvrir dans le navigateur
                Start-Process "http://localhost:3003"
                
                Write-Host "`n✅ Frontend Next.js demarre avec succes!" -ForegroundColor Green
                Write-Host "PID: $($process.Id)" -ForegroundColor Cyan
                exit 0
            }
        } catch {
            Write-Host "Tentative $attempts/$maxAttempts..." -ForegroundColor Gray
        }
    } while ($attempts -lt $maxAttempts -and -not $process.HasExited)
    
    if ($process.HasExited) {
        Write-Host "❌ Le processus s'est arrete" -ForegroundColor Red
        Write-Host "Code de sortie: $($process.ExitCode)" -ForegroundColor Red
    } else {
        Write-Host "⚠️ Next.js demarre mais ne repond pas encore" -ForegroundColor Yellow
        Write-Host "Processus actif (PID: $($process.Id))" -ForegroundColor Cyan
    }
} else {
    Write-Host "❌ Impossible de demarrer le processus" -ForegroundColor Red
}

Set-Location ..
