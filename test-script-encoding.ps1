# =============================================================================
# TEST D'ENCODAGE - GESTION COMMERCIALE TPE
# Ce script teste si l'encodage fonctionne correctement
# =============================================================================

# Test des fonctions d'affichage
function Write-Status {
    param(
        [string]$Message,
        [ValidateSet("SUCCESS", "ERROR", "WARNING", "INFO", "LOADING")]
        [string]$Type = "INFO"
    )
    
    $icons = @{
        "SUCCESS" = "[OK]"; "ERROR" = "[ERR]"; "WARNING" = "[WARN]"; 
        "INFO" = "[INFO]"; "LOADING" = "[...]"
    }
    
    $colors = @{
        "SUCCESS" = "Green"; "ERROR" = "Red"; "WARNING" = "Yellow";
        "INFO" = "Cyan"; "LOADING" = "Yellow"
    }
    
    Write-Host "$($icons[$Type]) $Message" -ForegroundColor $colors[$Type]
}

# En-tête
Clear-Host
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "    TEST D'ENCODAGE - GESTION COMMERCIALE     " -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Tests d'affichage
Write-Status "Test de l'affichage SUCCESS" "SUCCESS"
Write-Status "Test de l'affichage ERROR" "ERROR"
Write-Status "Test de l'affichage WARNING" "WARNING"
Write-Status "Test de l'affichage INFO" "INFO"
Write-Status "Test de l'affichage LOADING" "LOADING"

Write-Host ""
Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "   Backend Port: 3001" -ForegroundColor White
Write-Host "   Frontend Port: 3003" -ForegroundColor White
Write-Host "   Backend File: production-backend.js" -ForegroundColor White
Write-Host "   Frontend Dir: frontend-nextjs-production" -ForegroundColor White

Write-Host ""
Write-Status "Test d'encodage réussi!" "SUCCESS"
Write-Host "Le script principal devrait maintenant fonctionner correctement." -ForegroundColor Green
Write-Host ""
Write-Host "Pour démarrer l'application:" -ForegroundColor Cyan
Write-Host "   .\start-app-principal.ps1" -ForegroundColor White
Write-Host ""
