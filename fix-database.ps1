Write-Host "🔧 Correction de la base de données PostgreSQL..." -ForegroundColor Yellow
Write-Host ""

Set-Location "apps\backend"

try {
    Write-Host "1️⃣ Génération du client Prisma..." -ForegroundColor Cyan
    npx prisma generate
    
    Write-Host ""
    Write-Host "2️⃣ Synchronisation de la base de données avec le schéma..." -ForegroundColor Cyan
    npx prisma db push --force-reset
    
    Write-Host ""
    Write-Host "✅ Base de données corrigée avec succès !" -ForegroundColor Green
    Write-Host "🚀 Vous pouvez maintenant redémarrer le serveur backend." -ForegroundColor Green
    
} catch {
    Write-Host "❌ Erreur lors de la correction: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Essayez de corriger manuellement :" -ForegroundColor Yellow
    Write-Host "   cd apps\backend" -ForegroundColor White
    Write-Host "   npx prisma generate" -ForegroundColor White
    Write-Host "   npx prisma db push --force-reset" -ForegroundColor White
}

Set-Location "..\..\"
