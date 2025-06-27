@echo off
echo.
echo ========================================
echo CONFIGURATION BASE DE DONNEES ALGERIENNE
echo ========================================
echo.

echo 1. Verification de PostgreSQL...
docker ps --filter "name=postgres" --format "table {{.Names}}\t{{.Status}}"
if %ERRORLEVEL% neq 0 (
    echo Demarrage de PostgreSQL...
    docker-compose -f docker-compose.prod.yml --env-file .env up -d postgres
    timeout /t 15 /nobreak > nul
)

echo.
echo 2. Synchronisation du schema Prisma...
cd packages\database
npx prisma db push --force-reset
if %ERRORLEVEL% neq 0 (
    echo Erreur lors de la synchronisation du schema
    pause
    exit /b 1
)

echo.
echo 3. Generation du client Prisma...
npx prisma generate
if %ERRORLEVEL% neq 0 (
    echo Erreur lors de la generation du client
    pause
    exit /b 1
)

echo.
echo 4. Execution du seeding algerien...
npm run db:seed-algerian
if %ERRORLEVEL% neq 0 (
    echo Erreur lors du seeding
    pause
    exit /b 1
)

cd ..\..

echo.
echo ========================================
echo SEEDING TERMINE AVEC SUCCES !
echo ========================================
echo.
echo Connexion admin :
echo Email: admin@gestion-dz.com
echo Mot de passe: admin123
echo.
echo Application disponible sur: http://localhost:3000
echo.
pause
