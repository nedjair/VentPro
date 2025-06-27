# Script pour exécuter la migration de base de données
# Gestion Commerciale TPE - Migration des champs clients

Write-Host "🔄 Exécution de la migration de base de données..." -ForegroundColor Yellow

# Vérifier si Docker est en cours d'exécution
$dockerRunning = docker ps -q --filter "name=postgres" 2>$null
if (-not $dockerRunning) {
    Write-Host "❌ PostgreSQL n'est pas en cours d'exécution. Démarrage..." -ForegroundColor Red
    docker-compose up -d postgres
    Start-Sleep -Seconds 10
}

# Variables de connexion
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_NAME = "gestion_commerciale"
$DB_USER = "postgres"
$DB_PASSWORD = "postgres123"

# Chemin vers le fichier de migration
$MIGRATION_FILE = "packages/database/migrations/001_add_client_fields.sql"

Write-Host "📊 Connexion à la base de données..." -ForegroundColor Blue

# Exécuter la migration
try {
    # Utiliser psql via Docker pour exécuter la migration
    $env:PGPASSWORD = $DB_PASSWORD
    
    Write-Host "🔧 Exécution de la migration..." -ForegroundColor Blue
    
    # Exécuter le fichier SQL
    docker exec -i postgres psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f /docker-entrypoint-initdb.d/001_add_client_fields.sql
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration exécutée avec succès!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erreur lors de l'exécution de la migration" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Erreur lors de l'exécution de la migration: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Vérifier que les nouvelles colonnes ont été ajoutées
Write-Host "🔍 Vérification des nouvelles colonnes..." -ForegroundColor Blue

try {
    $checkQuery = @"
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'clients' 
AND column_name IN ('website', 'fax', 'billing_address', 'credit_limit', 'is_active', 'notes', 'tags')
ORDER BY column_name;
"@

    docker exec -i postgres psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "$checkQuery"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Vérification terminée!" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Erreur lors de la vérification: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Vérifier que la table client_interactions a été créée
Write-Host "🔍 Vérification de la table client_interactions..." -ForegroundColor Blue

try {
    $checkTableQuery = @"
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'client_interactions'
ORDER BY ordinal_position;
"@

    docker exec -i postgres psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "$checkTableQuery"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Table client_interactions vérifiée!" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Erreur lors de la vérification de la table: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "🎉 Migration terminée!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Résumé des modifications:" -ForegroundColor Cyan
Write-Host "  • Ajout de nouveaux champs au modèle Client" -ForegroundColor White
Write-Host "  • Création de la table client_interactions" -ForegroundColor White
Write-Host "  • Ajout d'index pour optimiser les performances" -ForegroundColor White
Write-Host "  • Mise à jour des clients existants" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Vous pouvez maintenant utiliser les nouvelles fonctionnalités!" -ForegroundColor Green
