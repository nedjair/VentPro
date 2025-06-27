Write-Host "🚀 Démarrage des services Docker..." -ForegroundColor Yellow

# Démarrer PostgreSQL et Redis
Write-Host "📊 Démarrage de PostgreSQL et Redis..." -ForegroundColor Cyan
docker-compose up -d postgres redis

# Attendre que les services soient prêts
Write-Host "⏳ Attente que les services soient prêts..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

# Vérifier le statut
Write-Host "🔍 Vérification du statut des services..." -ForegroundColor Cyan
docker-compose ps

Write-Host "✅ Services démarrés !" -ForegroundColor Green
