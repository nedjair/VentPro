# Test et initialisation PostgreSQL
Write-Host "Test de PostgreSQL..." -ForegroundColor Green

# Tester avec l'utilisateur par défaut
Write-Host "Test avec utilisateur par defaut..." -ForegroundColor Blue
docker exec gestion-postgres psql -U postgres -c "SELECT version();"

# Créer l'utilisateur et la base
Write-Host "Creation utilisateur et base..." -ForegroundColor Blue
docker exec gestion-postgres psql -U postgres -c "
CREATE USER IF NOT EXISTS gestion_user WITH PASSWORD 'gestion_password_secure_2024';
CREATE DATABASE IF NOT EXISTS gestion_commerciale OWNER gestion_user;
GRANT ALL PRIVILEGES ON DATABASE gestion_commerciale TO gestion_user;
"

# Tester avec le nouvel utilisateur
Write-Host "Test avec nouvel utilisateur..." -ForegroundColor Blue
docker exec gestion-postgres psql -U gestion_user -d gestion_commerciale -c "SELECT version();"
