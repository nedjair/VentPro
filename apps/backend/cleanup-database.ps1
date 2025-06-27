# Script PowerShell pour le nettoyage sécurisé de la base de données PostgreSQL
param(
    [switch]$DryRun,
    [switch]$NoBackup,
    [switch]$Quiet,
    [switch]$Analysis,
    [string]$Company,
    [switch]$Help
)

if ($Help) {
    Write-Host "🧹 Script de nettoyage sécurisé de la base de données PostgreSQL" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Cyan
    Write-Host "  .\cleanup-database.ps1                # Nettoyage complet avec sauvegarde"
    Write-Host "  .\cleanup-database.ps1 -DryRun        # Simulation sans modifications"
    Write-Host "  .\cleanup-database.ps1 -NoBackup      # Sans créer de sauvegarde"
    Write-Host "  .\cleanup-database.ps1 -Analysis      # Analyse seulement"
    Write-Host "  .\cleanup-database.ps1 -Quiet         # Mode silencieux"
    Write-Host "  .\cleanup-database.ps1 -Company <id>  # Entreprise spécifique"
    Write-Host "  .\cleanup-database.ps1 -Help          # Afficher cette aide"
    Write-Host ""
    Write-Host "Exemples:" -ForegroundColor Green
    Write-Host "  .\cleanup-database.ps1 -DryRun        # Voir ce qui serait nettoyé"
    Write-Host "  .\cleanup-database.ps1 -Analysis      # Analyser l'état actuel"
    Write-Host ""
    exit 0
}

Write-Host "🧹 NETTOYAGE SÉCURISÉ DE LA BASE DE DONNÉES POSTGRESQL" -ForegroundColor Yellow
Write-Host "=" * 70 -ForegroundColor Yellow

# Vérifier que nous sommes dans le bon répertoire
$currentPath = Get-Location
Write-Host "📁 Répertoire actuel: $currentPath" -ForegroundColor Cyan

if (-not (Test-Path "package.json")) {
    Write-Host "❌ Fichier package.json non trouvé" -ForegroundColor Red
    Write-Host "💡 Assurez-vous d'être dans le répertoire apps/backend" -ForegroundColor Yellow
    exit 1
}

# Vérifier que les scripts existent
$scriptsToCheck = @(
    "scripts/analyze-database-integrity.js",
    "scripts/cleanup-database.js"
)

$allScriptsExist = $true
foreach ($script in $scriptsToCheck) {
    if (Test-Path $script) {
        Write-Host "✅ $script" -ForegroundColor Green
    } else {
        Write-Host "❌ $script manquant" -ForegroundColor Red
        $allScriptsExist = $false
    }
}

if (-not $allScriptsExist) {
    Write-Host "⚠️ Certains scripts sont manquants. Installation incomplète." -ForegroundColor Yellow
    exit 1
}

# Étape 1: Analyse de l'état actuel
Write-Host "`n1️⃣ ANALYSE DE L'ÉTAT ACTUEL" -ForegroundColor Green
Write-Host "-" * 35 -ForegroundColor Green

try {
    if ($Analysis) {
        Write-Host "🔍 Analyse complète de l'intégrité..." -ForegroundColor Cyan
        node scripts/analyze-database-integrity.js
    } else {
        Write-Host "⚡ Rapport rapide..." -ForegroundColor Cyan
        node scripts/analyze-database-integrity.js --quick
    }
    
    Write-Host "✅ Analyse terminée" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de l'analyse: $_" -ForegroundColor Red
    Write-Host "💡 Vérifiez la connexion à PostgreSQL" -ForegroundColor Yellow
    exit 1
}

# Si c'est juste une analyse, s'arrêter ici
if ($Analysis) {
    Write-Host "`n📊 ANALYSE TERMINÉE" -ForegroundColor Green
    Write-Host "Pour effectuer le nettoyage, exécutez sans -Analysis" -ForegroundColor White
    exit 0
}

# Étape 2: Confirmation avant nettoyage
if (-not $DryRun -and -not $Quiet) {
    Write-Host "`n⚠️ ATTENTION: OPÉRATION DE NETTOYAGE" -ForegroundColor Yellow
    Write-Host "Cette opération va modifier la base de données." -ForegroundColor Yellow
    
    if (-not $NoBackup) {
        Write-Host "✅ Une sauvegarde sera créée automatiquement." -ForegroundColor Green
    } else {
        Write-Host "⚠️ Aucune sauvegarde ne sera créée." -ForegroundColor Red
    }
    
    $confirmation = Read-Host "`nContinuer? (o/N)"
    if ($confirmation -ne "o" -and $confirmation -ne "O" -and $confirmation -ne "oui") {
        Write-Host "❌ Opération annulée par l'utilisateur" -ForegroundColor Red
        exit 0
    }
}

# Étape 3: Nettoyage de la base de données
Write-Host "`n2️⃣ NETTOYAGE DE LA BASE DE DONNÉES" -ForegroundColor Green
Write-Host "-" * 40 -ForegroundColor Green

# Construire les arguments pour le script de nettoyage
$cleanupArgs = @()

if ($DryRun) {
    $cleanupArgs += "--dry-run"
    Write-Host "🔍 MODE SIMULATION - Aucune modification ne sera effectuée" -ForegroundColor Blue
}

if ($NoBackup) {
    $cleanupArgs += "--no-backup"
}

if ($Quiet) {
    $cleanupArgs += "--quiet"
}

if ($Company) {
    $cleanupArgs += "--company"
    $cleanupArgs += $Company
    Write-Host "🏢 Nettoyage pour l'entreprise: $Company" -ForegroundColor Cyan
}

try {
    Write-Host "🧹 Exécution du nettoyage..." -ForegroundColor Cyan
    
    if ($cleanupArgs.Count -gt 0) {
        $argsString = $cleanupArgs -join " "
        Write-Host "📝 Arguments: $argsString" -ForegroundColor Gray
        
        # Exécuter avec les arguments
        $process = Start-Process -FilePath "node" -ArgumentList "scripts/cleanup-database.js", $cleanupArgs -Wait -PassThru -NoNewWindow
        
        if ($process.ExitCode -eq 0) {
            Write-Host "✅ Nettoyage terminé avec succès" -ForegroundColor Green
        } else {
            Write-Host "❌ Erreur lors du nettoyage (code: $($process.ExitCode))" -ForegroundColor Red
        }
    } else {
        # Exécuter sans arguments
        node scripts/cleanup-database.js
        Write-Host "✅ Nettoyage terminé" -ForegroundColor Green
    }
    
} catch {
    Write-Host "❌ Erreur lors du nettoyage: $_" -ForegroundColor Red
    Write-Host "💡 Vérifiez les logs pour plus de détails" -ForegroundColor Yellow
    exit 1
}

# Étape 4: Vérification post-nettoyage
if (-not $DryRun) {
    Write-Host "`n3️⃣ VÉRIFICATION POST-NETTOYAGE" -ForegroundColor Green
    Write-Host "-" * 40 -ForegroundColor Green

    try {
        Write-Host "🔍 Vérification de l'état après nettoyage..." -ForegroundColor Cyan
        node scripts/analyze-database-integrity.js --quick
        Write-Host "✅ Vérification terminée" -ForegroundColor Green
    } catch {
        Write-Host "❌ Erreur lors de la vérification: $_" -ForegroundColor Red
    }
}

# Étape 5: Recommandations
Write-Host "`n4️⃣ RECOMMANDATIONS" -ForegroundColor Green
Write-Host "-" * 20 -ForegroundColor Green

if ($DryRun) {
    Write-Host "💡 PROCHAINES ÉTAPES:" -ForegroundColor Cyan
    Write-Host "   1. Examinez les résultats de la simulation" -ForegroundColor White
    Write-Host "   2. Si tout semble correct, exécutez sans -DryRun" -ForegroundColor White
    Write-Host "   3. Commande: .\cleanup-database.ps1" -ForegroundColor White
} else {
    Write-Host "🎯 ACTIONS RECOMMANDÉES:" -ForegroundColor Cyan
    Write-Host "   1. Testez les pages /products et /stocks" -ForegroundColor White
    Write-Host "   2. Vérifiez la cohérence via /test-stock-consistency" -ForegroundColor White
    Write-Host "   3. Activez la synchronisation automatique" -ForegroundColor White
    Write-Host "   4. Surveillez les logs pour détecter de futurs problèmes" -ForegroundColor White
}

Write-Host "`n🔗 LIENS UTILES:" -ForegroundColor Cyan
Write-Host "   • Interface de nettoyage: http://localhost:3001/database-cleanup" -ForegroundColor White
Write-Host "   • Synchronisation auto: http://localhost:3001/auto-sync" -ForegroundColor White
Write-Host "   • Test de cohérence: http://localhost:3001/test-stock-consistency" -ForegroundColor White
Write-Host "   • Page produits: http://localhost:3001/products" -ForegroundColor White
Write-Host "   • Page stocks: http://localhost:3001/stocks" -ForegroundColor White

# Résumé final
Write-Host "`n🎉 NETTOYAGE TERMINÉ!" -ForegroundColor Green
if ($DryRun) {
    Write-Host "Mode simulation - Aucune modification effectuée" -ForegroundColor Blue
} else {
    Write-Host "Base de données nettoyée et optimisée" -ForegroundColor Green
}

Write-Host "`n📝 COMMANDES UTILES:" -ForegroundColor Cyan
Write-Host "   • Analyse: .\cleanup-database.ps1 -Analysis" -ForegroundColor White
Write-Host "   • Simulation: .\cleanup-database.ps1 -DryRun" -ForegroundColor White
Write-Host "   • Nettoyage: .\cleanup-database.ps1" -ForegroundColor White
Write-Host "   • Aide: .\cleanup-database.ps1 -Help" -ForegroundColor White
