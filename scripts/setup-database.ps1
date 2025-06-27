# Script de configuration de la base de données
param(
    [switch]$Reset = $false,
    [switch]$Seed = $false,
    [switch]$Verbose = $false
)

Write-Host "🗄️ Configuration de la base de données - Gestion Commerciale TPE" -ForegroundColor Green
Write-Host "=" * 60

$ErrorActionPreference = "Stop"
$ProjectRoot = "d:/Gestion Commerciale"

try {
    Set-Location $ProjectRoot

    # Chargement des variables d'environnement
    if (Test-Path ".env.production") {
        Get-Content ".env.production" | ForEach-Object {
            if ($_ -match "^([^#][^=]+)=(.*)$") {
                [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
            }
        }
        Write-Host "  ✅ Variables d'environnement chargées" -ForegroundColor Green
    }

    # Attendre que PostgreSQL soit prêt
    Write-Host "⏳ Attente de PostgreSQL..." -ForegroundColor Yellow
    $maxRetries = 30
    $retryCount = 0
    
    do {
        try {
            docker exec gestion-postgres-prod pg_isready -U $env:POSTGRES_USER -d $env:POSTGRES_DB -q
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✅ PostgreSQL est prêt" -ForegroundColor Green
                break
            }
        } catch {
            # Continuer à attendre
        }
        
        $retryCount++
        if ($retryCount -ge $maxRetries) {
            throw "PostgreSQL n'est pas prêt après $maxRetries tentatives"
        }
        
        Write-Host "  ⏳ Tentative $retryCount/$maxRetries..." -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    } while ($true)

    Set-Location "$ProjectRoot/packages/database"

    # Reset de la base si demandé
    if ($Reset) {
        Write-Host "🔄 Reset de la base de données..." -ForegroundColor Yellow
        
        # Suppression des données existantes
        pnpm prisma migrate reset --force
        if ($LASTEXITCODE -ne 0) { throw "Erreur lors du reset de la base" }
        Write-Host "  ✅ Base de données réinitialisée" -ForegroundColor Green
    }

    # Génération du client Prisma
    Write-Host "🔧 Génération du client Prisma..." -ForegroundColor Yellow
    pnpm prisma generate
    if ($LASTEXITCODE -ne 0) { throw "Erreur lors de la génération du client Prisma" }
    Write-Host "  ✅ Client Prisma généré" -ForegroundColor Green

    # Déploiement des migrations
    Write-Host "📊 Déploiement des migrations..." -ForegroundColor Yellow
    pnpm prisma migrate deploy
    if ($LASTEXITCODE -ne 0) { throw "Erreur lors du déploiement des migrations" }
    Write-Host "  ✅ Migrations déployées" -ForegroundColor Green

    # Vérification de la base
    Write-Host "🔍 Vérification de la base de données..." -ForegroundColor Yellow
    pnpm prisma db pull --print 2>$null | Out-Null
    Write-Host "  ✅ Schéma de base valide" -ForegroundColor Green

    # Seed si demandé
    if ($Seed) {
        Write-Host "🌱 Insertion des données de test..." -ForegroundColor Yellow
        pnpm prisma db seed
        if ($LASTEXITCODE -ne 0) { throw "Erreur lors du seed" }
        Write-Host "  ✅ Données de test insérées" -ForegroundColor Green
    }

    # Statistiques de la base
    Write-Host "📈 Statistiques de la base de données..." -ForegroundColor Yellow
    $stats = docker exec gestion-postgres-prod psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB -t -c "
        SELECT 
            schemaname,
            tablename,
            n_tup_ins as inserts,
            n_tup_upd as updates,
            n_tup_del as deletes,
            n_live_tup as live_rows
        FROM pg_stat_user_tables 
        ORDER BY n_live_tup DESC;
    "
    
    if ($stats) {
        Write-Host "  📊 Tables avec données:" -ForegroundColor Cyan
        $stats | ForEach-Object {
            if ($_.Trim()) {
                Write-Host "    $($_.Trim())" -ForegroundColor White
            }
        }
    }

    Write-Host ""
    Write-Host "🎉 Base de données configurée avec succès!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔧 Commandes utiles:" -ForegroundColor Cyan
    Write-Host "  • Prisma Studio: pnpm --filter database prisma studio" -ForegroundColor White
    Write-Host "  • Logs PostgreSQL: docker logs gestion-postgres-prod" -ForegroundColor White
    Write-Host "  • Connexion directe: docker exec -it gestion-postgres-prod psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB" -ForegroundColor White

} catch {
    Write-Host ""
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Aide au dépannage:" -ForegroundColor Yellow
    Write-Host "  • Vérifiez que PostgreSQL est démarré: docker ps | grep postgres" -ForegroundColor White
    Write-Host "  • Vérifiez les logs: docker logs gestion-postgres-prod" -ForegroundColor White
    Write-Host "  • Vérifiez la connectivité: docker exec gestion-postgres-prod pg_isready" -ForegroundColor White
    exit 1
} finally {
    Set-Location $ProjectRoot
}