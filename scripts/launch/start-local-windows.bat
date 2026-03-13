@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..\..") do set "PROJECT_ROOT=%%~fI"
set "LOG_DIR=%PROJECT_ROOT%\logs"
set "LOG_FILE=%LOG_DIR%\start-local-windows.log"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" >nul 2>&1

cd /d "%PROJECT_ROOT%"

echo ================================================
echo   DEMARRAGE LOCAL WINDOWS - VENTESPRO
echo ================================================
echo.
echo [INFO] Repertoire du projet : %CD%
echo [INFO] Journal : %LOG_FILE%
echo.

(
  echo ===============================================================
  echo [%date% %time%] Debut du lancement
  echo ===============================================================
) >> "%LOG_FILE%"

if not exist package.json (
  echo [ERREUR] package.json introuvable. Lancez ce script depuis la racine du depot.
  echo [%date% %time%] package.json introuvable>> "%LOG_FILE%"
  exit /b 1
)

if not exist scripts\launch\start-application.js (
  echo [ERREUR] Le script principal scripts\launch\start-application.js est introuvable.
  echo [%date% %time%] start-application.js introuvable>> "%LOG_FILE%"
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo [ERREUR] Node.js est introuvable dans le PATH.
  echo [%date% %time%] Node.js introuvable dans le PATH>> "%LOG_FILE%"
  exit /b 1
)
echo [OK] Node.js detecte.

where pnpm >nul 2>&1
if errorlevel 1 (
  echo [ERREUR] pnpm est introuvable dans le PATH.
  echo [%date% %time%] pnpm introuvable dans le PATH>> "%LOG_FILE%"
  exit /b 1
)
echo [OK] pnpm detecte.
echo.

node scripts\launch\start-application.js %* 1>> "%LOG_FILE%" 2>&1
set "EXITCODE=%ERRORLEVEL%"

if not "%EXITCODE%"=="0" (
  echo.
  echo [ECHEC] Le demarrage local Windows n'a pas pu etre execute proprement.
  echo [INFO] Consultez le journal : %LOG_FILE%
  echo [%date% %time%] Echec avec code %EXITCODE%>> "%LOG_FILE%"
  exit /b %EXITCODE%
)

echo.
echo [OK] Script termine.
echo [%date% %time%] Lancement termine avec succes>> "%LOG_FILE%"
exit /b 0

