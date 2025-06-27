# Script d'installation des dépendances pour la synchronisation automatique
Write-Host "🔧 Installation des dépendances pour la synchronisation automatique" -ForegroundColor Yellow
Write-Host "=" * 70 -ForegroundColor Yellow

# Vérifier que nous sommes dans le bon répertoire
$currentPath = Get-Location
Write-Host "📁 Répertoire actuel: $currentPath" -ForegroundColor Cyan

if (-not (Test-Path "package.json")) {
    Write-Host "❌ Fichier package.json non trouvé dans le répertoire actuel" -ForegroundColor Red
    Write-Host "💡 Assurez-vous d'être dans le répertoire apps/backend" -ForegroundColor Yellow
    exit 1
}

# Installer les dépendances
Write-Host "`n📦 Installation de node-cron..." -ForegroundColor Green
try {
    npm install node-cron
    Write-Host "✅ node-cron installé avec succès" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de l'installation de node-cron: $_" -ForegroundColor Red
}

Write-Host "`n📦 Installation de @types/node-cron..." -ForegroundColor Green
try {
    npm install --save-dev @types/node-cron
    Write-Host "✅ @types/node-cron installé avec succès" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de l'installation de @types/node-cron: $_" -ForegroundColor Red
}

# Vérifier l'installation
Write-Host "`n🔍 Vérification des dépendances installées..." -ForegroundColor Cyan

$packageJson = Get-Content "package.json" | ConvertFrom-Json

$hasNodeCron = $packageJson.dependencies."node-cron" -ne $null
$hasNodeCronTypes = $packageJson.devDependencies."@types/node-cron" -ne $null

if ($hasNodeCron) {
    Write-Host "✅ node-cron: $($packageJson.dependencies.'node-cron')" -ForegroundColor Green
} else {
    Write-Host "❌ node-cron non trouvé dans les dépendances" -ForegroundColor Red
}

if ($hasNodeCronTypes) {
    Write-Host "✅ @types/node-cron: $($packageJson.devDependencies.'@types/node-cron')" -ForegroundColor Green
} else {
    Write-Host "❌ @types/node-cron non trouvé dans les devDependencies" -ForegroundColor Red
}

Write-Host "`n🎯 Installation terminée!" -ForegroundColor Green
Write-Host "📝 Prochaines étapes:" -ForegroundColor Yellow
Write-Host "   1. Configurer les triggers PostgreSQL: node scripts/setup-stock-triggers.js" -ForegroundColor White
Write-Host "   2. Redémarrer le serveur pour activer la synchronisation automatique" -ForegroundColor White
Write-Host "   3. Tester la synchronisation avec les pages /products et /stocks" -ForegroundColor White
