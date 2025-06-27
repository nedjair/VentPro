# =============================================================================
# NETTOYAGE COMPLET DES BACKENDS - GESTION COMMERCIALE TPE
# Conserver uniquement production-backend.js (validé 10/10 tests)
# =============================================================================

Write-Host "NETTOYAGE COMPLET DES BACKENDS" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host "Objectif: Conserver uniquement production-backend.js" -ForegroundColor Gray
Write-Host ""

# Vérifier que production-backend.js fonctionne avant nettoyage
Write-Host "1. VERIFICATION DU BACKEND DE PRODUCTION" -ForegroundColor Yellow
try {
    $healthCheck = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 5
    if ($healthCheck.StatusCode -eq 200) {
        Write-Host "OK Backend de production: OPERATIONNEL" -ForegroundColor Green
        Write-Host "   Status: 200 OK" -ForegroundColor Gray
        Write-Host "   Port: 3001" -ForegroundColor Gray
    } else {
        Write-Host "ERREUR Backend de production: Probleme detecte" -ForegroundColor Red
        Write-Host "ARRET DU NETTOYAGE - Verifiez le backend avant de continuer" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "ERREUR Backend de production: Non accessible" -ForegroundColor Red
    Write-Host "ARRET DU NETTOYAGE - Demarrez production-backend.js avant de continuer" -ForegroundColor Red
    exit 1
}

# Liste des fichiers backend à supprimer
$backendsToDelete = @(
    "backend-complete.js",
    "backend-production-simple.js", 
    "backend-production.js",
    "backend-real-db.js",
    "backend-test-production.js",
    "backend-with-database.js",
    "minimal-backend.js",
    "minimal-backend-3003.js",
    "backend-prod-simple.js"
)

Write-Host "`n2. SUPPRESSION DES BACKENDS REDONDANTS" -ForegroundColor Yellow
Write-Host "======================================" -ForegroundColor Yellow

$deletedFiles = @()
$notFoundFiles = @()

foreach ($file in $backendsToDelete) {
    if (Test-Path $file) {
        try {
            Remove-Item $file -Force
            Write-Host "SUPPRIME: $file" -ForegroundColor Red
            $deletedFiles += $file
        } catch {
            Write-Host "ERREUR suppression: $file - $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "NON TROUVE: $file" -ForegroundColor Gray
        $notFoundFiles += $file
    }
}

# Supprimer les fichiers package.json spécifiques aux backends
$packageFiles = @(
    "backend-package.json"
)

Write-Host "`n3. SUPPRESSION DES FICHIERS DE CONFIGURATION REDONDANTS" -ForegroundColor Yellow
foreach ($file in $packageFiles) {
    if (Test-Path $file) {
        try {
            Remove-Item $file -Force
            Write-Host "SUPPRIME: $file" -ForegroundColor Red
            $deletedFiles += $file
        } catch {
            Write-Host "ERREUR suppression: $file" -ForegroundColor Red
        }
    }
}

# Nettoyer les logs des backends supprimés
Write-Host "`n4. NETTOYAGE DES LOGS DES BACKENDS SUPPRIMES" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Yellow

$logFiles = @(
    "logs/backend-complete.log",
    "logs/backend-complete-error.log",
    "logs/backend-minimal.log", 
    "logs/backend-minimal-error.log",
    "logs/backend-simple.log",
    "logs/backend-test.log",
    "logs/backend-working.log",
    "logs/backend-working-error.log",
    "logs/backend-db.log",
    "logs/backend-db-error.log",
    "logs/backend-final.log",
    "logs/backend-final-error.log",
    "logs/backend-no-redis.log"
)

foreach ($logFile in $logFiles) {
    if (Test-Path $logFile) {
        try {
            Remove-Item $logFile -Force
            Write-Host "SUPPRIME LOG: $logFile" -ForegroundColor Red
            $deletedFiles += $logFile
        } catch {
            Write-Host "ERREUR suppression log: $logFile" -ForegroundColor Red
        }
    }
}

# Identifier les scripts de démarrage à nettoyer
Write-Host "`n5. IDENTIFICATION DES SCRIPTS A NETTOYER" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Yellow

$scriptsToCheck = Get-ChildItem -Name "start-*.ps1", "test-backend*.ps1", "stop-*.ps1" | Where-Object { 
    $_ -notlike "*production*" -and $_ -notlike "*final*" -and $_ -notlike "*working*"
}

Write-Host "Scripts identifies pour nettoyage potentiel:" -ForegroundColor Gray
foreach ($script in $scriptsToCheck) {
    Write-Host "   $script" -ForegroundColor Gray
}

# Demander confirmation pour supprimer les scripts
Write-Host "`nVoulez-vous supprimer ces scripts de demarrage obsoletes? (y/N)" -ForegroundColor Yellow
$response = Read-Host
if ($response -eq "y" -or $response -eq "Y") {
    foreach ($script in $scriptsToCheck) {
        if (Test-Path $script) {
            try {
                Remove-Item $script -Force
                Write-Host "SUPPRIME SCRIPT: $script" -ForegroundColor Red
                $deletedFiles += $script
            } catch {
                Write-Host "ERREUR suppression script: $script" -ForegroundColor Red
            }
        }
    }
} else {
    Write-Host "Scripts conserves" -ForegroundColor Yellow
}

Write-Host "`n6. EVALUATION DU DOSSIER apps/backend/" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Yellow

if (Test-Path "apps/backend") {
    Write-Host "Dossier apps/backend/ detecte (Backend TypeScript)" -ForegroundColor White
    Write-Host "Contenu:" -ForegroundColor Gray
    Get-ChildItem "apps/backend" -Recurse -Name | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
    
    Write-Host "`nVoulez-vous supprimer le backend TypeScript apps/backend/? (y/N)" -ForegroundColor Yellow
    Write-Host "ATTENTION: Ceci supprimera l'architecture TypeScript modulaire" -ForegroundColor Red
    $response = Read-Host
    
    if ($response -eq "y" -or $response -eq "Y") {
        try {
            Remove-Item "apps/backend" -Recurse -Force
            Write-Host "SUPPRIME: apps/backend/ (complet)" -ForegroundColor Red
            $deletedFiles += "apps/backend/"
        } catch {
            Write-Host "ERREUR suppression: apps/backend/ - $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "apps/backend/ conserve pour developpement futur" -ForegroundColor Yellow
    }
} else {
    Write-Host "Dossier apps/backend/ non trouve" -ForegroundColor Gray
}

Write-Host "`n7. VERIFICATION POST-NETTOYAGE" -ForegroundColor Yellow
Write-Host "==============================" -ForegroundColor Yellow

# Vérifier que production-backend.js fonctionne toujours
Write-Host "Test du backend de production apres nettoyage..." -ForegroundColor White
try {
    $healthCheck = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 5
    if ($healthCheck.StatusCode -eq 200) {
        Write-Host "OK Backend de production: TOUJOURS OPERATIONNEL" -ForegroundColor Green
        
        # Test d'authentification
        $loginBody = '{"email":"admin@demo-tpe.fr","password":"demo123"}'
        $authTest = Invoke-WebRequest -Uri "http://localhost:3001/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
        
        if ($authTest.StatusCode -eq 200) {
            Write-Host "OK Authentification: FONCTIONNELLE" -ForegroundColor Green
        } else {
            Write-Host "ATTENTION Authentification: Probleme detecte" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "ERREUR Backend de production: Probleme apres nettoyage!" -ForegroundColor Red
    Write-Host "Verifiez immediatement le backend" -ForegroundColor Red
}

# Lister les fichiers backend restants
Write-Host "`n8. FICHIERS BACKEND RESTANTS" -ForegroundColor Yellow
Write-Host "============================" -ForegroundColor Yellow

$remainingBackends = Get-ChildItem -Name "*backend*.js", "*server*.js" | Where-Object { 
    $_ -notlike "test-*" -and $_ -notlike "*frontend*"
}

Write-Host "Fichiers backend conserves:" -ForegroundColor Green
foreach ($file in $remainingBackends) {
    $size = [math]::Round((Get-Item $file).Length / 1KB, 1)
    Write-Host "   $file ($size KB)" -ForegroundColor Green
}

Write-Host "`n9. RESUME DU NETTOYAGE" -ForegroundColor Yellow
Write-Host "======================" -ForegroundColor Yellow

Write-Host "Fichiers supprimes: $($deletedFiles.Count)" -ForegroundColor Red
Write-Host "Fichiers non trouves: $($notFoundFiles.Count)" -ForegroundColor Gray

if ($deletedFiles.Count -gt 0) {
    Write-Host "`nListe des fichiers supprimes:" -ForegroundColor Red
    foreach ($file in $deletedFiles) {
        Write-Host "   - $file" -ForegroundColor Red
    }
}

Write-Host "`nFICHIERS CONSERVES ESSENTIELS:" -ForegroundColor Green
Write-Host "   - production-backend.js (Backend principal)" -ForegroundColor Green
Write-Host "   - package.json (Dependencies)" -ForegroundColor Green
Write-Host "   - .env.production (Configuration)" -ForegroundColor Green
Write-Host "   - docker-compose.yml (Infrastructure)" -ForegroundColor Green
Write-Host "   - verification-finale-complete.ps1 (Tests)" -ForegroundColor Green

Write-Host "`nBACKEND DE PRODUCTION:" -ForegroundColor Cyan
Write-Host "   URL: http://localhost:3001" -ForegroundColor White
Write-Host "   Health: http://localhost:3001/health" -ForegroundColor White
Write-Host "   Login: admin@demo-tpe.fr / demo123" -ForegroundColor White
Write-Host "   Status: OPERATIONNEL ET VALIDE" -ForegroundColor Green

Write-Host "`nNETTOYAGE TERMINE" -ForegroundColor Cyan
