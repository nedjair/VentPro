@echo off
echo ============================================
echo   GESTION COMMERCIALE TPE - DEMARRAGE
echo ============================================
echo.

echo [INFO] Verification des prerequis...

:: Verifier Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERR] Node.js non trouve! Installez Node.js 20+
    echo Telechargez depuis: https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js trouve

:: Verifier npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERR] npm non trouve!
    pause
    exit /b 1
)
echo [OK] npm trouve

:: Demarrer Docker si disponible
echo [INFO] Verification de Docker...
docker ps >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Docker actif
    echo [INFO] Demarrage des services Docker...
    docker-compose up -d
    timeout /t 10 /nobreak >nul
) else (
    echo [WARN] Docker non disponible - Continuons sans Docker
)

echo.
echo [INFO] Preparation du backend...

:: Aller dans le dossier backend
cd apps\backend

:: Installer les dependances si necessaire
if not exist "node_modules" (
    echo [INFO] Installation des dependances backend...
    npm install
    if %errorlevel% neq 0 (
        echo [ERR] Echec de l'installation des dependances backend
        pause
        exit /b 1
    )
)

:: Generer Prisma
echo [INFO] Generation du client Prisma...
npm run prisma:generate >nul 2>&1

echo [INFO] Demarrage du backend...
:: Demarrer le backend en arriere-plan
start "Backend" cmd /c "npm run dev"
echo [OK] Backend demarre

:: Retour au repertoire racine
cd ..\..

echo.
echo [INFO] Preparation du frontend...

:: Aller dans le dossier frontend
cd apps\frontend

:: Installer les dependances si necessaire
if not exist "node_modules" (
    echo [INFO] Installation des dependances frontend...
    npm install
    if %errorlevel% neq 0 (
        echo [ERR] Echec de l'installation des dependances frontend
        pause
        exit /b 1
    )
)

:: Creer/Mettre a jour .env.local
echo NEXT_PUBLIC_API_BASE_URL=http://localhost:3001> .env.local
echo NEXT_PUBLIC_API_URL=http://localhost:3001>> .env.local
echo NODE_ENV=development>> .env.local
echo [OK] Configuration frontend mise a jour

echo [INFO] Demarrage du frontend...
:: Demarrer le frontend en arriere-plan
start "Frontend" cmd /c "npm run dev"
echo [OK] Frontend demarre

:: Retour au repertoire racine
cd ..\..

echo.
echo [INFO] Attente de l'initialisation des services...
timeout /t 20 /nobreak >nul

echo.
echo =====================================
echo   DEMARRAGE TERMINE
echo =====================================
echo.
echo URLs d'acces:
echo   Frontend: http://localhost:3000
echo   Backend API: http://localhost:3001
echo   Adminer (DB): http://localhost:8080
echo.
echo Identifiants par defaut:
echo   Email: admin@demo-tpe.fr
echo   Mot de passe: demo123
echo.
echo [OK] Application prete!
echo Ouvrez http://localhost:3000 dans votre navigateur
echo.

:: Ouvrir automatiquement le navigateur
start http://localhost:3000

echo Appuyez sur une touche pour fermer cette fenetre...
echo (Les services continueront a fonctionner en arriere-plan)
pause >nul
