Write-Host "🔄 REDÉMARRAGE FORCÉ DU BACKEND SUR PORT 3001" -ForegroundColor Yellow
Write-Host ""

# 1. Arrêter tous les processus Node.js
Write-Host "1️⃣ Arrêt de tous les processus Node.js..." -ForegroundColor Cyan
try {
    taskkill /F /IM node.exe 2>$null
    Write-Host "   ✅ Processus Node.js arrêtés" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️ Aucun processus Node.js à arrêter" -ForegroundColor Yellow
}

# 2. Arrêter spécifiquement les processus sur le port 3001
Write-Host ""
Write-Host "2️⃣ Libération du port 3001..." -ForegroundColor Cyan
try {
    $connections = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
        $pid = $conn.OwningProcess
        Write-Host "   🔫 Arrêt du processus PID $pid..." -ForegroundColor Red
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
    Write-Host "   ✅ Port 3001 libéré" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️ Aucun processus trouvé sur le port 3001" -ForegroundColor Yellow
}

# 3. Attendre un peu
Write-Host ""
Write-Host "3️⃣ Attente de 3 secondes..." -ForegroundColor Cyan
Start-Sleep -Seconds 3

# 4. Vérifier que le port est libre
Write-Host ""
Write-Host "4️⃣ Vérification du port 3001..." -ForegroundColor Cyan
$portCheck = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($portCheck) {
    Write-Host "   ❌ Le port 3001 est encore utilisé !" -ForegroundColor Red
    $portCheck | ForEach-Object {
        Write-Host "      PID: $($_.OwningProcess) - État: $($_.State)" -ForegroundColor White
    }
} else {
    Write-Host "   ✅ Port 3001 libre !" -ForegroundColor Green
}

# 5. Démarrer le serveur backend
Write-Host ""
Write-Host "5️⃣ Démarrage du serveur backend..." -ForegroundColor Cyan
Set-Location "apps\backend"
Write-Host "   📁 Répertoire: $(Get-Location)" -ForegroundColor White
Write-Host "   🚀 Lancement de npm run dev..." -ForegroundColor White

# Lancer npm run dev en arrière-plan
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -NoNewWindow

Write-Host ""
Write-Host "✅ REDÉMARRAGE TERMINÉ !" -ForegroundColor Green
Write-Host "🔍 Vérifiez les logs ci-dessus pour confirmer que le serveur démarre correctement." -ForegroundColor Yellow
