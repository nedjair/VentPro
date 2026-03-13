@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "TITLE=VentesPro - Demarrage local"

title %TITLE%
echo ================================================
echo   VENTESPRO - LANCEUR WINDOWS
echo ================================================
echo.
echo [INFO] Preparation du lancement...
echo.

call "%SCRIPT_DIR%scripts\launch\start-local-windows.bat" %*
set "EXITCODE=%ERRORLEVEL%"

echo.
if "%EXITCODE%"=="0" (
  echo [OK] Lancement termine.
) else (
  echo [ECHEC] Le lancement a echoue avec le code %EXITCODE%.
  echo [AIDE] Verifiez Docker Desktop ou PostgreSQL sur localhost:5434.
)
echo.
echo Appuyez sur une touche pour fermer cette fenetre...
pause >nul
exit /b %EXITCODE%
