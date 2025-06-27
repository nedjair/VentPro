@echo off
echo.
echo ========================================
echo CORRECTION DU SCHEMA PRISMA
echo ========================================
echo.

echo 1. Verification de PostgreSQL...
docker ps --filter "name=postgres"
if %ERRORLEVEL% neq 0 (
    echo Demarrage de PostgreSQL...
    docker-compose -f docker-compose.prod.yml --env-file .env up -d postgres
    timeout /t 15 /nobreak > nul
)

echo.
echo 2. Nettoyage des migrations...
cd packages\database
if exist "migrations" (
    echo Suppression du dossier migrations...
    rmdir /s /q migrations
)

echo.
echo 3. Reset complet de la base de donnees...
npx prisma migrate reset --force --skip-seed
if %ERRORLEVEL% neq 0 (
    echo Tentative avec db push...
    npx prisma db push --force-reset
)

echo.
echo 4. Creation d'une nouvelle migration...
npx prisma migrate dev --name init_algerian_schema --create-only
npx prisma migrate deploy

echo.
echo 5. Generation du client Prisma...
npx prisma generate

echo.
echo 6. Verification du schema...
npx prisma db pull --print

cd ..\..

echo.
echo ========================================
echo SCHEMA PRISMA CORRIGE !
echo ========================================
echo.
echo Vous pouvez maintenant executer:
echo setup-database-algerian.bat
echo.
pause
