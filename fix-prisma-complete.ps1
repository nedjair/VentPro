Write-Host "🔧 Correction complète du client Prisma..." -ForegroundColor Yellow
Write-Host ""

Set-Location "apps\backend"

try {
    Write-Host "1️⃣ Suppression du cache Prisma..." -ForegroundColor Cyan
    if (Test-Path "node_modules\.prisma") {
        Remove-Item -Recurse -Force "node_modules\.prisma"
        Write-Host "   ✅ Cache Prisma supprimé" -ForegroundColor Green
    }
    
    if (Test-Path "node_modules\@prisma") {
        Remove-Item -Recurse -Force "node_modules\@prisma"
        Write-Host "   ✅ Modules Prisma supprimés" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "2️⃣ Réinstallation des dépendances Prisma..." -ForegroundColor Cyan
    npm install prisma @prisma/client
    
    Write-Host ""
    Write-Host "3️⃣ Génération du client Prisma..." -ForegroundColor Cyan
    npx prisma generate --force
    
    Write-Host ""
    Write-Host "4️⃣ Synchronisation de la base de données..." -ForegroundColor Cyan
    npx prisma db push --force-reset
    
    Write-Host ""
    Write-Host "✅ Correction complète terminée !" -ForegroundColor Green
    Write-Host "🚀 Vous pouvez maintenant redémarrer le serveur backend." -ForegroundColor Green
    
} catch {
    Write-Host "❌ Erreur lors de la correction: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Essayez de corriger manuellement :" -ForegroundColor Yellow
    Write-Host "   cd apps\backend" -ForegroundColor White
    Write-Host "   Remove-Item -Recurse -Force node_modules\.prisma" -ForegroundColor White
    Write-Host "   npm install prisma @prisma/client" -ForegroundColor White
    Write-Host "   npx prisma generate --force" -ForegroundColor White
    Write-Host "   npx prisma db push --force-reset" -ForegroundColor White
}

Set-Location "..\..\"
