# Script PowerShell pour créer des données de test pour les alertes
Write-Host "🧪 Exécution du script de création d'alertes de test..." -ForegroundColor Green

# Changer vers le répertoire backend
Set-Location "D:\Gestion Commerciale\apps\Backend"

# Vérifier que Node.js est disponible
if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host "✅ Node.js trouvé" -ForegroundColor Green
    
    # Exécuter le script
    Write-Host "🚀 Exécution de create-test-alerts.js..." -ForegroundColor Yellow
    node create-test-alerts.js
    
    Write-Host "✅ Script terminé" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js non trouvé dans le PATH" -ForegroundColor Red
}

# Pause pour voir les résultats
Write-Host "Appuyez sur une touche pour continuer..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
