# Script de démarrage du serveur backend
Write-Host "🚀 Démarrage du serveur backend..." -ForegroundColor Green

# Aller dans le répertoire backend
Set-Location "d:/Gestion Commerciale/apps/backend"

# Démarrer le serveur
Write-Host "📦 Lancement de l'application..." -ForegroundColor Yellow
try {
    & npx tsx src/index.ts
} catch {
    Write-Host "❌ Erreur lors du démarrage: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "🛑 Serveur arrêté." -ForegroundColor Yellow