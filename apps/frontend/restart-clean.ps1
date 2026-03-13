# Script PowerShell pour redémarrer proprement l'application Next.js
# Usage: .\restart-clean.ps1 [-Reinstall]

param(
    [switch]$Reinstall
)

Write-Host "🔄 Redémarrage propre de l'application Next.js..." -ForegroundColor Cyan
Write-Host "=" * 60

# 1. Arrêter tous les processus Node.js liés
Write-Host "`n🛑 Arrêt des processus existants..." -ForegroundColor Yellow
try {
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*next*" -or $_.CommandLine -like "*3002*" } | Stop-Process -Force
    Write-Host "   ✅ Processus Node.js arrêtés" -ForegroundColor Green
} catch {
    Write-Host "   ℹ️ Aucun processus à arrêter" -ForegroundColor Gray
}

# 2. Nettoyer les caches
Write-Host "`n🧹 Nettoyage des caches..." -ForegroundColor Yellow

$cacheDirs = @(".next", "node_modules\.cache", ".next\cache")
foreach ($dir in $cacheDirs) {
    if (Test-Path $dir) {
        try {
            Remove-Item -Path $dir -Recurse -Force
            Write-Host "   ✅ $dir supprimé" -ForegroundColor Green
        } catch {
            Write-Host "   ⚠️ Erreur lors de la suppression de $dir : $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "   ℹ️ $dir n'existe pas" -ForegroundColor Gray
    }
}

# 3. Réinstaller les dépendances si demandé
if ($Reinstall) {
    Write-Host "`n📦 Réinstallation des dépendances..." -ForegroundColor Yellow
    
    if (Test-Path "node_modules") {
        Remove-Item -Path "node_modules" -Recurse -Force
        Write-Host "   ✅ node_modules supprimé" -ForegroundColor Green
    }
    
    if (Test-Path "package-lock.json") {
        Remove-Item -Path "package-lock.json" -Force
        Write-Host "   ✅ package-lock.json supprimé" -ForegroundColor Green
    }
    
    Write-Host "   📥 Installation des dépendances..." -ForegroundColor Cyan
    npm install
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Dépendances installées avec succès" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Erreur lors de l'installation des dépendances" -ForegroundColor Red
        exit 1
    }
}

# 4. Vérifier la configuration
Write-Host "`n🔧 Vérification de la configuration..." -ForegroundColor Yellow

if (Test-Path "next.config.mjs") {
    Write-Host "   ✅ Configuration Next.js trouvée" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ Configuration Next.js manquante" -ForegroundColor Red
}

if (Test-Path "package.json") {
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    $nextVersion = $packageJson.dependencies.next
    Write-Host "   ℹ️ Version Next.js: $nextVersion" -ForegroundColor Gray
    
    if ($nextVersion -like "*14.2.30*") {
        Write-Host "   ⚠️ Version Next.js 14.2.30 détectée - problèmes de chunks connus" -ForegroundColor Yellow
    }
}

# 5. Redémarrer l'application
Write-Host "`n🚀 Redémarrage de l'application..." -ForegroundColor Cyan

# Attendre un peu pour s'assurer que tout est nettoyé
Start-Sleep -Seconds 2

Write-Host "   📡 Démarrage du serveur de développement..." -ForegroundColor Cyan
Write-Host "   🌐 L'application sera disponible sur http://localhost:3002" -ForegroundColor Green
Write-Host "`n" + "=" * 60
Write-Host "✅ REDÉMARRAGE TERMINÉ" -ForegroundColor Green
Write-Host "=" * 60

# Démarrer npm run dev
npm run dev
