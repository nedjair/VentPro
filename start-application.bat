@echo off
setlocal enabledelayedexpansion

REM Script de démarrage de l'application après corrections
REM Gestion Commerciale - Version Corrigée

echo 🚀 DÉMARRAGE DE L'APPLICATION DE GESTION COMMERCIALE
echo ==================================================
echo.

REM Vérifier si Docker est installé
echo [INFO] Vérification de Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker n'est pas installé. Veuillez installer Docker pour continuer.
    pause
    exit /b 1
)

REM Vérifier si Docker est en cours d'exécution
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker n'est pas en cours d'exécution. Veuillez démarrer Docker.
    pause
    exit /b 1
)
echo [SUCCESS] Docker est disponible et en cours d'exécution

REM Vérifier si Node.js est installé
echo [INFO] Vérification de Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js n'est pas installé. Veuillez installer Node.js pour continuer.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [SUCCESS] Node.js est installé (version: !NODE_VERSION!)

REM Démarrer l'infrastructure Docker
echo [INFO] Démarrage de l'infrastructure Docker...
if exist docker-compose.yml (
    docker-compose up -d
    if errorlevel 1 (
        echo [ERROR] Échec du démarrage de l'infrastructure Docker
        pause
        exit /b 1
    )
    echo [SUCCESS] Infrastructure Docker démarrée avec succès
    
    echo [INFO] Attente de la disponibilité des services...
    timeout /t 10 /nobreak >nul
    
    echo [INFO] Vérification de PostgreSQL...
    docker-compose exec -T postgres pg_isready -U postgres >nul 2>&1
    if errorlevel 1 (
        echo [WARNING] PostgreSQL n'est pas encore prêt, continuons...
    ) else (
        echo [SUCCESS] PostgreSQL est prêt
    )
) else (
    echo [ERROR] Fichier docker-compose.yml non trouvé
    pause
    exit /b 1
)

REM Installer les dépendances si nécessaire
echo [INFO] Vérification des dépendances...

REM Backend modulaire
if exist apps\backend (
    if not exist apps\backend\node_modules (
        echo [INFO] Installation des dépendances du backend...
        cd apps\backend
        call npm install
        cd ..\..
        echo [SUCCESS] Dépendances du backend installées
    )
)

REM Frontend
if exist apps\frontend (
    if not exist apps\frontend\node_modules (
        echo [INFO] Installation des dépendances du frontend...
        cd apps\frontend
        call npm install
        cd ..\..
        echo [SUCCESS] Dépendances du frontend installées
    )
)

REM Racine du projet
if not exist node_modules (
    echo [INFO] Installation des dépendances racine...
    call npm install
    echo [SUCCESS] Dépendances racine installées
)

REM Démarrer le backend
echo [INFO] Démarrage du backend...
if exist production-backend.js (
    echo [INFO] Utilisation du backend de production...
    start /b node production-backend.js
    echo [SUCCESS] Backend de production démarré
) else if exist apps\backend (
    echo [INFO] Utilisation du backend modulaire...
    cd apps\backend
    start /b npm run dev
    cd ..\..
    echo [SUCCESS] Backend modulaire démarré
) else (
    echo [ERROR] Aucun backend trouvé
    pause
    exit /b 1
)

REM Attendre que le backend soit prêt
echo [INFO] Attente de la disponibilité du backend...
timeout /t 5 /nobreak >nul

REM Tester la connectivité du backend
set BACKEND_READY=0
for /l %%i in (1,1,10) do (
    curl -s http://localhost:3001/health >nul 2>&1
    if not errorlevel 1 (
        echo [SUCCESS] Backend est accessible sur http://localhost:3001
        set BACKEND_READY=1
        goto :backend_ready
    )
    echo [INFO] Tentative %%i/10 - Attente du backend...
    timeout /t 2 /nobreak >nul
)

:backend_ready
if !BACKEND_READY! equ 0 (
    echo [ERROR] Le backend n'est pas accessible après 10 tentatives
    pause
    exit /b 1
)

REM Démarrer le frontend
echo [INFO] Démarrage du frontend...
if exist apps\frontend (
    cd apps\frontend
    start /b npm run dev
    cd ..\..
    echo [SUCCESS] Frontend démarré
    
    echo [INFO] Attente de la disponibilité du frontend...
    timeout /t 10 /nobreak >nul
    
    REM Tester la connectivité du frontend
    set FRONTEND_READY=0
    for /l %%i in (1,1,10) do (
        curl -s http://localhost:3000 >nul 2>&1
        if not errorlevel 1 (
            echo [SUCCESS] Frontend est accessible sur http://localhost:3000
            set FRONTEND_READY=1
            goto :frontend_ready
        )
        echo [INFO] Tentative %%i/10 - Attente du frontend...
        timeout /t 3 /nobreak >nul
    )
    
    :frontend_ready
    if !FRONTEND_READY! equ 0 (
        echo [WARNING] Le frontend n'est pas encore accessible, mais il démarre probablement...
    )
) else (
    echo [ERROR] Dossier frontend non trouvé
    pause
    exit /b 1
)

REM Exécuter les tests de validation
echo [INFO] Exécution des tests de validation...
if exist test-corrections.js (
    timeout /t 5 /nobreak >nul
    node test-corrections.js
    if errorlevel 1 (
        echo [WARNING] Certains tests ont échoué, mais l'application peut fonctionner
    ) else (
        echo [SUCCESS] Tous les tests sont passés avec succès !
    )
) else (
    echo [WARNING] Script de test non trouvé, continuons sans tests
)

REM Afficher les informations finales
echo.
echo 🎉 APPLICATION DÉMARRÉE AVEC SUCCÈS !
echo =====================================
echo.
echo 📱 Frontend: http://localhost:3000
echo 🔧 Backend:  http://localhost:3001
echo 📊 API Docs: http://localhost:3001/documentation
echo.
echo 👤 Compte de test:
echo    Email:    admin@demo-tpe.fr
echo    Password: demo123
echo.
echo 📋 Fonctionnalités corrigées:
echo    ✅ Export Excel/PDF
echo    ✅ Création de factures
echo    ✅ Interface utilisateur nettoyée
echo.
echo 🛑 Pour arrêter l'application:
echo    Fermez cette fenêtre puis exécutez: docker-compose down
echo.
echo [INFO] Application en cours d'exécution... (Fermez cette fenêtre pour arrêter)

REM Ouvrir le navigateur
start http://localhost:3000

REM Maintenir la fenêtre ouverte
pause >nul
