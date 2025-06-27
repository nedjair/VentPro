# Script de configuration complète de la synchronisation automatique
param(
    [switch]$SkipDeps,
    [switch]$SkipTriggers,
    [switch]$SkipTest,
    [switch]$Help
)

if ($Help) {
    Write-Host "🔧 Script de configuration de la synchronisation automatique des stocks" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Cyan
    Write-Host "  .\setup-auto-sync.ps1                # Configuration complète"
    Write-Host "  .\setup-auto-sync.ps1 -SkipDeps      # Ignorer l'installation des dépendances"
    Write-Host "  .\setup-auto-sync.ps1 -SkipTriggers  # Ignorer les triggers PostgreSQL"
    Write-Host "  .\setup-auto-sync.ps1 -SkipTest      # Ignorer les tests"
    Write-Host "  .\setup-auto-sync.ps1 -Help          # Afficher cette aide"
    Write-Host ""
    exit 0
}

Write-Host "🚀 CONFIGURATION DE LA SYNCHRONISATION AUTOMATIQUE DES STOCKS" -ForegroundColor Yellow
Write-Host "=" * 80 -ForegroundColor Yellow

# Vérifier que nous sommes dans le bon répertoire
$currentPath = Get-Location
Write-Host "📁 Répertoire actuel: $currentPath" -ForegroundColor Cyan

if (-not (Test-Path "package.json")) {
    Write-Host "❌ Fichier package.json non trouvé" -ForegroundColor Red
    Write-Host "💡 Assurez-vous d'être dans le répertoire apps/backend" -ForegroundColor Yellow
    exit 1
}

# Étape 1: Installation des dépendances
if (-not $SkipDeps) {
    Write-Host "`n1️⃣ INSTALLATION DES DÉPENDANCES" -ForegroundColor Green
    Write-Host "-" * 40 -ForegroundColor Green

    try {
        Write-Host "📦 Installation de node-cron..." -ForegroundColor Cyan
        npm install node-cron --silent
        
        Write-Host "📦 Installation de @types/node-cron..." -ForegroundColor Cyan
        npm install --save-dev @types/node-cron --silent
        
        Write-Host "✅ Dépendances installées avec succès" -ForegroundColor Green
    } catch {
        Write-Host "❌ Erreur lors de l'installation des dépendances: $_" -ForegroundColor Red
        Write-Host "💡 Essayez d'exécuter manuellement: npm install node-cron @types/node-cron" -ForegroundColor Yellow
    }
} else {
    Write-Host "`n1️⃣ INSTALLATION DES DÉPENDANCES (IGNORÉE)" -ForegroundColor Yellow
}

# Étape 2: Configuration des triggers PostgreSQL
if (-not $SkipTriggers) {
    Write-Host "`n2️⃣ CONFIGURATION DES TRIGGERS POSTGRESQL" -ForegroundColor Green
    Write-Host "-" * 45 -ForegroundColor Green

    if (Test-Path "scripts/setup-stock-triggers.js") {
        try {
            Write-Host "🔧 Installation des triggers PostgreSQL..." -ForegroundColor Cyan
            node scripts/setup-stock-triggers.js
            Write-Host "✅ Triggers PostgreSQL configurés" -ForegroundColor Green
        } catch {
            Write-Host "❌ Erreur lors de l'installation des triggers: $_" -ForegroundColor Red
            Write-Host "💡 Vérifiez la connexion à PostgreSQL" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Script setup-stock-triggers.js non trouvé" -ForegroundColor Red
    }
} else {
    Write-Host "`n2️⃣ CONFIGURATION DES TRIGGERS POSTGRESQL (IGNORÉE)" -ForegroundColor Yellow
}

# Étape 3: Vérification de la configuration
Write-Host "`n3️⃣ VÉRIFICATION DE LA CONFIGURATION" -ForegroundColor Green
Write-Host "-" * 40 -ForegroundColor Green

# Vérifier les fichiers créés
$files = @(
    "src/services/auto-sync.service.ts",
    "src/middleware/prisma-sync.middleware.ts", 
    "src/services/scheduler.service.ts",
    "src/routes/auto-sync.ts",
    "database/triggers/stock-sync-triggers.sql",
    "scripts/setup-stock-triggers.js",
    "scripts/test-auto-sync.js"
)

$allFilesExist = $true
foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "❌ $file" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if ($allFilesExist) {
    Write-Host "✅ Tous les fichiers de synchronisation sont présents" -ForegroundColor Green
} else {
    Write-Host "⚠️ Certains fichiers sont manquants" -ForegroundColor Yellow
}

# Vérifier les dépendances
Write-Host "`n📦 Vérification des dépendances..." -ForegroundColor Cyan
$packageJson = Get-Content "package.json" | ConvertFrom-Json

$hasNodeCron = $packageJson.dependencies."node-cron" -ne $null
$hasNodeCronTypes = $packageJson.devDependencies."@types/node-cron" -ne $null

if ($hasNodeCron) {
    Write-Host "✅ node-cron: $($packageJson.dependencies.'node-cron')" -ForegroundColor Green
} else {
    Write-Host "❌ node-cron manquant" -ForegroundColor Red
}

if ($hasNodeCronTypes) {
    Write-Host "✅ @types/node-cron: $($packageJson.devDependencies.'@types/node-cron')" -ForegroundColor Green
} else {
    Write-Host "❌ @types/node-cron manquant" -ForegroundColor Red
}

# Étape 4: Tests de fonctionnement
if (-not $SkipTest) {
    Write-Host "`n4️⃣ TESTS DE FONCTIONNEMENT" -ForegroundColor Green
    Write-Host "-" * 30 -ForegroundColor Green

    if (Test-Path "scripts/test-auto-sync.js") {
        try {
            Write-Host "🧪 Exécution des tests de synchronisation..." -ForegroundColor Cyan
            node scripts/test-auto-sync.js
            Write-Host "✅ Tests terminés" -ForegroundColor Green
        } catch {
            Write-Host "❌ Erreur lors des tests: $_" -ForegroundColor Red
            Write-Host "💡 Vérifiez que la base de données est accessible" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Script de test non trouvé" -ForegroundColor Red
    }
} else {
    Write-Host "`n4️⃣ TESTS DE FONCTIONNEMENT (IGNORÉS)" -ForegroundColor Yellow
}

# Étape 5: Configuration des variables d'environnement
Write-Host "`n5️⃣ CONFIGURATION DES VARIABLES D'ENVIRONNEMENT" -ForegroundColor Green
Write-Host "-" * 50 -ForegroundColor Green

$envVars = @{
    "ENABLE_AUTO_SYNC" = "true"
    "ENABLE_SCHEDULER" = "true"
    "STOCK_SYNC_CRON" = "0 * * * *"
    "DATA_CLEANUP_CRON" = "0 2 * * *"
    "CONSISTENCY_CHECK_CRON" = "0 */6 * * *"
}

Write-Host "📝 Variables d'environnement recommandées:" -ForegroundColor Cyan
foreach ($var in $envVars.GetEnumerator()) {
    Write-Host "   $($var.Key)=$($var.Value)" -ForegroundColor White
}

if (Test-Path ".env") {
    Write-Host "`n💡 Ajoutez ces variables à votre fichier .env si nécessaire" -ForegroundColor Yellow
} else {
    Write-Host "`n⚠️ Fichier .env non trouvé. Créez-le avec les variables ci-dessus" -ForegroundColor Yellow
}

# Résumé final
Write-Host "`n🎯 RÉSUMÉ DE LA CONFIGURATION" -ForegroundColor Green
Write-Host "=" * 35 -ForegroundColor Green

Write-Host "✅ Fonctionnalités configurées:" -ForegroundColor Green
Write-Host "   • Middleware Prisma pour synchronisation automatique" -ForegroundColor White
Write-Host "   • Triggers PostgreSQL pour synchronisation au niveau DB" -ForegroundColor White
Write-Host "   • Service de planification pour tâches périodiques" -ForegroundColor White
Write-Host "   • API REST pour gestion de la synchronisation" -ForegroundColor White
Write-Host "   • Page frontend de monitoring (/auto-sync)" -ForegroundColor White

Write-Host "`n📋 Prochaines étapes:" -ForegroundColor Cyan
Write-Host "   1. Redémarrez le serveur backend" -ForegroundColor White
Write-Host "   2. Visitez http://localhost:3001/auto-sync pour le monitoring" -ForegroundColor White
Write-Host "   3. Testez la synchronisation en modifiant des produits" -ForegroundColor White
Write-Host "   4. Vérifiez les logs pour confirmer le bon fonctionnement" -ForegroundColor White

Write-Host "`n🔧 Commandes utiles:" -ForegroundColor Cyan
Write-Host "   • Tests: node scripts/test-auto-sync.js" -ForegroundColor White
Write-Host "   • Triggers: node scripts/setup-stock-triggers.js" -ForegroundColor White
Write-Host "   • Supprimer triggers: node scripts/setup-stock-triggers.js --remove" -ForegroundColor White

Write-Host "`n🎉 CONFIGURATION TERMINÉE!" -ForegroundColor Green
Write-Host "La synchronisation automatique des stocks est maintenant active." -ForegroundColor White
