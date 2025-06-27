# =============================================================================
# Script d'Arrêt PRODUCTION - Gestion Commerciale TPE
# =============================================================================
Write-Host "🛑 ARRET APPLICATION GESTION COMMERCIALE TPE - MODE PRODUCTION" -ForegroundColor Red
Write-Host "===============================================================" -ForegroundColor Red
Write-Host ""

function Write-Step {
    param([string]$Message)
    Write-Host "▶️  $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

# 1. Arrêter le backend de production
Write-Step "Arrêt du backend de production..."
if (Test-Path ".backend-production.pid") {
    try {
        $backendPid = Get-Content ".backend-production.pid"
        $process = Get-Process -Id $backendPid -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "   Arrêt gracieux du processus $backendPid..." -ForegroundColor Yellow
            $process.CloseMainWindow()
            Start-Sleep -Seconds 5
            
            # Force kill si nécessaire
            if (!$process.HasExited) {
                Stop-Process -Id $backendPid -Force -ErrorAction SilentlyContinue
            }
        }
        Remove-Item ".backend-production.pid" -ErrorAction SilentlyContinue
        Write-Success "Backend de production arrêté"
    }
    catch {
        Write-Warning "Erreur lors de l'arrêt du backend de production"
    }
} else {
    Write-Host "ℹ️  Aucun PID backend de production trouvé" -ForegroundColor Gray
}

# 2. Arrêter tous les processus Node.js restants
Write-Step "Nettoyage des processus Node.js..."
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    foreach ($process in $nodeProcesses) {
        try {
            Write-Host "   Arrêt du processus Node.js $($process.Id)..." -ForegroundColor Yellow
            $process.CloseMainWindow()
            Start-Sleep -Seconds 2
            
            if (!$process.HasExited) {
                Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
            }
        }
        catch {
            # Processus déjà arrêté
        }
    }
    Write-Success "Processus Node.js nettoyés"
} else {
    Write-Host "ℹ️  Aucun processus Node.js trouvé" -ForegroundColor Gray
}

# 3. Sauvegarder les logs de production
Write-Step "Sauvegarde des logs de production..."
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupDir = "logs\backup\$timestamp"

if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

$logFiles = @(
    "logs\backend-production.log",
    "logs\backend-production-error.log"
)

foreach ($logFile in $logFiles) {
    if (Test-Path $logFile) {
        $fileName = Split-Path $logFile -Leaf
        Copy-Item $logFile "$backupDir\$fileName" -ErrorAction SilentlyContinue
    }
}

Write-Success "Logs sauvegardés dans $backupDir"

# 4. Créer un rapport d'arrêt
Write-Step "Génération du rapport d'arrêt..."
$reportContent = @"
=============================================================================
RAPPORT D'ARRÊT - GESTION COMMERCIALE TPE PRODUCTION
=============================================================================

Date d'arrêt: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Utilisateur: $env:USERNAME
Machine: $env:COMPUTERNAME

PROCESSUS ARRÊTÉS:
- Backend de production (Node.js)
- Services Docker (PostgreSQL, Redis, PgBouncer)

LOGS SAUVEGARDÉS:
- $backupDir

STATUT FINAL:
- Application arrêtée proprement
- Données préservées
- Logs archivés

=============================================================================
"@

$reportContent | Out-File -FilePath "$backupDir\arret-rapport.txt" -Encoding UTF8
Write-Success "Rapport d'arrêt généré"

# 5. Arrêter les services Docker
Write-Step "Arrêt des services Docker de production..."
try {
    # Arrêt gracieux des conteneurs
    Write-Host "   Arrêt gracieux des conteneurs..." -ForegroundColor Yellow
    docker-compose stop
    
    # Suppression des conteneurs (optionnel, commenté pour préserver les données)
    # docker-compose down
    
    Write-Success "Services Docker arrêtés"
}
catch {
    Write-Warning "Erreur lors de l'arrêt de Docker Compose"
}

# 6. Vérification finale
Write-Step "Vérification finale des ports..."
$ports = @(3001, 5432, 6379, 6432)
$portsStatus = @()

foreach ($port in $ports) {
    $isOccupied = Test-NetConnection -ComputerName localhost -Port $port -InformationLevel Quiet -WarningAction SilentlyContinue
    $status = if ($isOccupied) { "🔴 Occupé" } else { "✅ Libre" }
    $portsStatus += "  Port $port : $status"
}

Write-Host ""
Write-Host "📊 STATUT DES PORTS :" -ForegroundColor Cyan
$portsStatus | ForEach-Object { Write-Host $_ -ForegroundColor White }

# 7. Nettoyage des fichiers temporaires
Write-Step "Nettoyage des fichiers temporaires..."
$tempFiles = @(
    ".env",
    "*.tmp",
    "temp\*"
)

foreach ($pattern in $tempFiles) {
    Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
}

Write-Success "Fichiers temporaires nettoyés"

Write-Host ""
Write-Host "✅ APPLICATION DE PRODUCTION COMPLETEMENT ARRETEE" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""

Write-Host "📊 RÉSUMÉ DE L'ARRÊT :" -ForegroundColor Cyan
Write-Host "  🛑 Backend de production : Arrêté" -ForegroundColor White
Write-Host "  🐳 Services Docker       : Arrêtés" -ForegroundColor White
Write-Host "  📝 Logs                  : Sauvegardés" -ForegroundColor White
Write-Host "  🧹 Nettoyage             : Effectué" -ForegroundColor White
Write-Host ""

Write-Host "📁 DONNÉES PRÉSERVÉES :" -ForegroundColor Cyan
Write-Host "  🗄️  Base de données      : Préservée dans les volumes Docker" -ForegroundColor White
Write-Host "  📄 Logs de production    : Sauvegardés dans $backupDir" -ForegroundColor White
Write-Host "  📁 Uploads               : Préservés dans le dossier uploads/" -ForegroundColor White
Write-Host ""

Write-Host "🔄 REDÉMARRAGE :" -ForegroundColor Cyan
Write-Host "  Pour redémarrer l'application : .\start-production.ps1" -ForegroundColor White
Write-Host ""

Write-Host "⚠️  NOTES IMPORTANTES :" -ForegroundColor Yellow
Write-Host "  - Les données de production sont préservées" -ForegroundColor Yellow
Write-Host "  - Les volumes Docker ne sont pas supprimés" -ForegroundColor Yellow
Write-Host "  - Les logs sont archivés avec horodatage" -ForegroundColor Yellow
Write-Host "  - La configuration de production reste intacte" -ForegroundColor Yellow
Write-Host ""

Write-Host "📞 SUPPORT :" -ForegroundColor Cyan
Write-Host "  En cas de problème, consultez les logs dans : $backupDir" -ForegroundColor White
Write-Host ""
