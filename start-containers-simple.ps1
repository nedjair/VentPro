Write-Host "=== DEMARRAGE CONTENEURS SIMPLE ===" -ForegroundColor Green

# Aller dans le bon répertoire
cd "d:/Gestion Commerciale"

# 1. Arrêter d'éventuels conteneurs
Write-Host "1. Arrêt des anciens conteneurs..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml down 2>$null

# 2. Vérifier que le fichier .env.production existe
Write-Host "2. Vérification du fichier .env.production..." -ForegroundColor Yellow
if (-not (Test-Path ".env.production")) {
    Write-Host "ERREUR: Fichier .env.production manquant!" -ForegroundColor Red
    exit 1
}

# 3. Démarrer seulement la base de données d'abord
Write-Host "3. Démarrage de la base de données..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d postgres

# Attendre que postgres soit prêt
Write-Host "4. Attente de PostgreSQL (30s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# 5. Démarrer Redis
Write-Host "5. Démarrage de Redis..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d redis

# 6. Vérifier l'état
Write-Host "6. Vérification de l'état..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml ps

Write-Host ""
Write-Host "=== RESULTAT ===" -ForegroundColor Cyan
$containers = docker-compose -f docker-compose.prod.yml ps --format "table {{.Service}}\t{{.State}}\t{{.Ports}}"
if ($containers) {
    Write-Host $containers
} else {
    Write-Host "Aucun conteneur trouvé - Problème de configuration" -ForegroundColor Red
}

Write-Host ""
Write-Host "Commandes de test:" -ForegroundColor Yellow
Write-Host "  docker ps                                    # Voir tous les conteneurs" -ForegroundColor White
Write-Host "  docker-compose -f docker-compose.prod.yml ps # Voir les conteneurs du projet" -ForegroundColor White
Write-Host "  docker logs gestion-postgres-prod            # Voir les logs postgres" -ForegroundColor White