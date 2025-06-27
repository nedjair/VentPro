Write-Host "🔄 MISE À JOUR DE POWERSHELL" -ForegroundColor Yellow
Write-Host ""

# Vérifier la version actuelle
Write-Host "📊 Version actuelle de PowerShell:" -ForegroundColor Cyan
$PSVersionTable.PSVersion

Write-Host ""
Write-Host "🔄 Installation de la dernière version de PowerShell..." -ForegroundColor Cyan

try {
    # Méthode 1: Via winget (recommandée)
    Write-Host "   Tentative via winget..." -ForegroundColor White
    winget install --id Microsoft.Powershell --source winget
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ PowerShell mis à jour via winget" -ForegroundColor Green
    } else {
        throw "Échec de winget"
    }
} catch {
    Write-Host "   ⚠️ winget non disponible, tentative alternative..." -ForegroundColor Yellow
    
    try {
        # Méthode 2: Via Chocolatey
        Write-Host "   Tentative via Chocolatey..." -ForegroundColor White
        choco install powershell-core -y
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ PowerShell mis à jour via Chocolatey" -ForegroundColor Green
        } else {
            throw "Échec de Chocolatey"
        }
    } catch {
        Write-Host "   ⚠️ Chocolatey non disponible" -ForegroundColor Yellow
        
        # Méthode 3: Téléchargement manuel
        Write-Host "   📥 Téléchargement manuel..." -ForegroundColor White
        Write-Host "   🌐 Ouvrez: https://github.com/PowerShell/PowerShell/releases/latest" -ForegroundColor Cyan
        Write-Host "   📦 Téléchargez le fichier .msi pour Windows x64" -ForegroundColor White
        Write-Host "   🔧 Exécutez l'installateur" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "🔄 Mise à jour des modules PowerShell..." -ForegroundColor Cyan

try {
    # Mettre à jour PowerShellGet
    Install-Module -Name PowerShellGet -Force -AllowClobber -Scope CurrentUser
    Write-Host "✅ PowerShellGet mis à jour" -ForegroundColor Green
    
    # Mettre à jour PackageManagement
    Install-Module -Name PackageManagement -Force -AllowClobber -Scope CurrentUser
    Write-Host "✅ PackageManagement mis à jour" -ForegroundColor Green
    
} catch {
    Write-Host "⚠️ Erreur lors de la mise à jour des modules: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ MISE À JOUR TERMINÉE" -ForegroundColor Green
Write-Host "🔄 Redémarrez votre terminal pour appliquer les changements" -ForegroundColor Yellow
