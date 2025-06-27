Write-Host "🔍 Recherche des processus utilisant le port 3001..." -ForegroundColor Yellow

try {
    # Trouver le processus utilisant le port 3001
    $process = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -First 1
    
    if ($process) {
        $pid = $process.OwningProcess
        Write-Host "📍 Processus trouvé: PID $pid" -ForegroundColor Cyan
        
        # Obtenir les détails du processus
        $processInfo = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($processInfo) {
            Write-Host "📋 Nom du processus: $($processInfo.ProcessName)" -ForegroundColor White
            Write-Host "🔫 Arrêt du processus..." -ForegroundColor Red
            
            # Tuer le processus
            Stop-Process -Id $pid -Force
            Write-Host "✅ Processus arrêté avec succès !" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Impossible d'obtenir les détails du processus" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✅ Aucun processus trouvé sur le port 3001" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    
    # Méthode alternative avec netstat
    Write-Host "🔄 Tentative avec netstat..." -ForegroundColor Yellow
    $netstatOutput = netstat -ano | Select-String ":3001"
    
    if ($netstatOutput) {
        Write-Host "📋 Processus trouvés:" -ForegroundColor Cyan
        $netstatOutput | ForEach-Object {
            Write-Host "   $_" -ForegroundColor White
            
            # Extraire le PID de la ligne netstat
            $parts = $_.ToString().Split(' ', [StringSplitOptions]::RemoveEmptyEntries)
            if ($parts.Length -gt 0) {
                $pid = $parts[-1]
                if ($pid -match '^\d+$') {
                    Write-Host "🔫 Arrêt du processus PID $pid..." -ForegroundColor Red
                    try {
                        Stop-Process -Id $pid -Force
                        Write-Host "✅ Processus $pid arrêté" -ForegroundColor Green
                    } catch {
                        Write-Host "❌ Erreur lors de l'arrêt du processus $pid" -ForegroundColor Red
                    }
                }
            }
        }
    } else {
        Write-Host "✅ Aucun processus trouvé sur le port 3001" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "🚀 Vous pouvez maintenant redémarrer le serveur backend." -ForegroundColor Green
