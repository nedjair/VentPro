# Script PowerShell pour synchroniser les données products et stocks
Write-Host "🔄 SYNCHRONISATION PRODUCTS ↔ STOCKS" -ForegroundColor Cyan
Write-Host "=" * 40 -ForegroundColor Cyan

# Vérifier le répertoire
$backendPath = "D:\Gestion Commerciale\apps\Backend"
if (Test-Path $backendPath) {
    Set-Location $backendPath
    Write-Host "✅ Répertoire backend trouvé: $backendPath" -ForegroundColor Green
} else {
    Write-Host "❌ Répertoire backend non trouvé: $backendPath" -ForegroundColor Red
    exit 1
}

# Vérifier Node.js
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node --version
    Write-Host "✅ Node.js trouvé: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js non trouvé dans le PATH" -ForegroundColor Red
    exit 1
}

# Vérifier le fichier de synchronisation
if (Test-Path "sync-products-stocks.js") {
    Write-Host "✅ Script de synchronisation trouvé" -ForegroundColor Green
} else {
    Write-Host "❌ Script sync-products-stocks.js non trouvé" -ForegroundColor Red
    exit 1
}

# Exécuter la synchronisation
Write-Host "`n🚀 Exécution de la synchronisation..." -ForegroundColor Yellow
Write-Host "-" * 40 -ForegroundColor Yellow

try {
    node sync-products-stocks.js
    Write-Host "`n✅ Synchronisation terminée avec succès!" -ForegroundColor Green
} catch {
    Write-Host "`n❌ Erreur lors de la synchronisation:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "`n🔗 Prochaines étapes:" -ForegroundColor Cyan
Write-Host "   1. Ouvrir le tableau de bord: http://localhost:3002/dashboard" -ForegroundColor White
Write-Host "   2. Vérifier les alertes de stock" -ForegroundColor White
Write-Host "   3. Consulter les logs de la console (F12)" -ForegroundColor White

Write-Host "`nAppuyez sur une touche pour continuer..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
