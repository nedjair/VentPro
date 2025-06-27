# =============================================================================
# SCRIPT DE NETTOYAGE PHASE 5
# Suppression des fichiers temporaires et de test
# =============================================================================

Write-Host "🧹 NETTOYAGE PHASE 5 - ANALYTICS" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Fonction pour supprimer un fichier en toute sécurité
function Remove-SafeFile {
    param([string]$FilePath, [string]$Description)
    
    if (Test-Path $FilePath) {
        try {
            Remove-Item $FilePath -Force
            Write-Host "✅ Supprimé: $Description" -ForegroundColor Green
        } catch {
            Write-Host "❌ Erreur suppression: $Description" -ForegroundColor Red
        }
    } else {
        Write-Host "ℹ️ Absent: $Description" -ForegroundColor Gray
    }
}

Write-Host "`n1. SUPPRESSION DES FICHIERS DE TEST" -ForegroundColor Yellow
Write-Host "====================================" -ForegroundColor Yellow

# Fichiers de test temporaires
Remove-SafeFile "test-backend-simple.js" "Backend de test simple"
Remove-SafeFile "test-analytics-api.js" "Test API Analytics"
Remove-SafeFile "create-test-data.js" "Script de données de test"
Remove-SafeFile "create-tables-phase5.js" "Script de création tables"
Remove-SafeFile "check-database-structure.js" "Vérification structure DB"

Write-Host "`n2. NETTOYAGE DES LOGS" -ForegroundColor Yellow
Write-Host "=====================" -ForegroundColor Yellow

# Nettoyage des logs anciens
if (Test-Path "logs") {
    $logFiles = Get-ChildItem "logs" -Filter "*.log" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) }
    foreach ($logFile in $logFiles) {
        Remove-SafeFile $logFile.FullName "Log ancien: $($logFile.Name)"
    }
}

Write-Host "`n3. NETTOYAGE NODE_MODULES" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

# Optionnel : nettoyage des node_modules pour économiser l'espace
$cleanNodeModules = Read-Host "Nettoyer les node_modules ? (y/N)"
if ($cleanNodeModules -eq "y" -or $cleanNodeModules -eq "Y") {
    if (Test-Path "node_modules") {
        Write-Host "🗑️ Suppression node_modules racine..." -ForegroundColor Yellow
        Remove-Item "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "✅ node_modules racine supprimé" -ForegroundColor Green
    }
    
    if (Test-Path "frontend-nextjs-production/node_modules") {
        Write-Host "🗑️ Suppression node_modules frontend..." -ForegroundColor Yellow
        Remove-Item "frontend-nextjs-production/node_modules" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "✅ node_modules frontend supprimé" -ForegroundColor Green
    }
}

Write-Host "`n4. NETTOYAGE DOCKER" -ForegroundColor Yellow
Write-Host "===================" -ForegroundColor Yellow

$cleanDocker = Read-Host "Nettoyer les volumes Docker ? (y/N)"
if ($cleanDocker -eq "y" -or $cleanDocker -eq "Y") {
    Write-Host "🐳 Nettoyage Docker..." -ForegroundColor Yellow
    docker system prune -f
    Write-Host "✅ Docker nettoyé" -ForegroundColor Green
}

Write-Host "`n5. RÉSUMÉ DU NETTOYAGE" -ForegroundColor Yellow
Write-Host "======================" -ForegroundColor Yellow

Write-Host "🎯 FICHIERS CONSERVÉS (Phase 5):" -ForegroundColor Green
Write-Host "   ✓ start-phase5-analytics.ps1" -ForegroundColor Gray
Write-Host "   ✓ quick-start-phase5.ps1" -ForegroundColor Gray
Write-Host "   ✓ test-phase5-analytics.ps1" -ForegroundColor Gray
Write-Host "   ✓ start-application-complete.ps1" -ForegroundColor Gray
Write-Host "   ✓ production-backend.js" -ForegroundColor Gray
Write-Host "   ✓ frontend-nextjs-production/" -ForegroundColor Gray
Write-Host "   ✓ PHASE5_ANALYTICS_COMPLETE.md" -ForegroundColor Gray
Write-Host ""

Write-Host "🧹 NETTOYAGE TERMINÉ!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Pour démarrer la Phase 5:" -ForegroundColor Cyan
Write-Host "   .\start-phase5-analytics.ps1" -ForegroundColor White
