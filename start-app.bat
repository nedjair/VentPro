@echo off
echo ========================================
echo   GESTION COMMERCIALE TPE - DEMARRAGE
echo ========================================
echo.

REM Changer vers le dossier du script
cd /d "%~dp0"

REM Vérifier si PowerShell est disponible
where powershell >nul 2>nul
if %errorlevel% neq 0 (
    echo ERREUR: PowerShell n'est pas installe ou accessible
    pause
    exit /b 1
)

echo Demarrage de l'application...
echo.

REM Exécuter le script PowerShell principal
powershell.exe -ExecutionPolicy Bypass -WindowStyle Normal -File "start-app-principal.ps1"

echo.
echo Application arretee.
pause
